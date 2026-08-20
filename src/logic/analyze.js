import { computeScore, stdDev } from './metrics.js'

export const THRESHOLDS = {
  bias: 0.4, // 全局兜底，实际按速度分层
  overshootHigh: 0.6,
  oneShotLow: 0.6,
  closeMissRatio: 0.2,
  closeMissOffset: 0.35,
  errStable: 0.35,
  stableStd: 0.3,
  jitteryStd: 0.35,
  biasZeroBand: 0.2,
  halfTrendFatigue: 0.3,
  lowScoreFloor: 25,
  sameEDPIStd: 8,
  voteMargin: 0.5,
  confCap: 0.9,
}

// 速度分层 bias 阈值（r 为单位）
const SPEED_BIAS_THRESH = [
  { speed: 150, thresh: 0.55 },
  { speed: 300, thresh: 0.45 },
  { speed: 600, thresh: 0.35 },
  { speed: 900, thresh: 0.30 },
]

function threshForSpeed(speed) {
  // 分段线性插值
  if (speed <= SPEED_BIAS_THRESH[0].speed) return SPEED_BIAS_THRESH[0].thresh
  if (speed >= SPEED_BIAS_THRESH.at(-1).speed) return SPEED_BIAS_THRESH.at(-1).thresh
  for (let i = 0; i < SPEED_BIAS_THRESH.length - 1; i++) {
    const a = SPEED_BIAS_THRESH[i]
    const b = SPEED_BIAS_THRESH[i + 1]
    if (speed >= a.speed && speed <= b.speed) {
      const t = (speed - a.speed) / (b.speed - a.speed)
      return a.thresh + (b.thresh - a.thresh) * t
    }
  }
  return THRESHOLDS.bias
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function computeDelta({ level, trackingBiasRatio, weightedBiasRatio, c, sensMultiplier }) {
  const sens = Number(sensMultiplier) || 1
  let delta = 0
  if (level === 'high') {
    if (trackingBiasRatio != null) {
      const r = Math.abs(weightedBiasRatio ?? trackingBiasRatio)
      const thresh = 0.32 // 加权阈值近似
      const excess = Math.max(0, r - thresh)
      // 0.05 基础 + 每 0.1r 超量 +0.035，封顶 0.4
      delta = -(0.05 + excess * 0.35)
      delta = clamp(delta, -0.4, -0.05)
    } else if (c) {
      // 定位过冲：overshoot 越高、oneShot 越低 → 幅度越大
      const overshootExcess = Math.max(0, c.avgOvershoot - THRESHOLDS.overshootHigh)
      const missPenalty = Math.max(0, THRESHOLDS.oneShotLow - c.oneShotRate)
      delta = -(0.06 + overshootExcess * 0.10 + missPenalty * 0.12)
      delta = clamp(delta, -0.35, -0.06)
    }
  } else if (level === 'low') {
    if (trackingBiasRatio != null) {
      const r = Math.abs(weightedBiasRatio ?? trackingBiasRatio)
      const thresh = 0.32
      const excess = Math.max(0, r - thresh)
      delta = 0.05 + excess * 0.35
      delta = clamp(delta, 0.05, 0.4)
    } else if (c) {
      const ratio = c.closeMisses / Math.max(1, c.shots.length)
      const offsetFactor = Math.max(0, THRESHOLDS.closeMissOffset - c.avgOffset) / THRESHOLDS.closeMissOffset
      delta = 0.06 + ratio * 0.25 + offsetFactor * 0.05
      delta = clamp(delta, 0.06, 0.30)
    }
  }
  // 按当前 sens 等比微调，避免高敏时步长相对过小：高敏时放大 10%
  if (sens > 2) delta *= 1.1
  if (sens < 0.5) delta *= 0.9
  // 量化到 0.01
  delta = Math.round(delta * 100) / 100
  if (Math.abs(delta) < 0.04) delta = delta > 0 ? 0.05 : -0.05
  return delta
}

const pct = (v) => `${(v * 100).toFixed(0)}%`
const dirText = (l) => (l === 'high' ? '调低' : l === 'low' ? '调高' : '保持')

export function analyzeTest({ clicking, tracking, type, eDPI, history = [], sensMultiplier }) {
  const c = clicking?.metrics ?? null
  const t = tracking?.metrics ?? null
  const score = computeScore(c, t)
  const signals = []
  const votes = { high: 0, low: 0 }
  let speedBoost = 0
  const sampleN = c ? c.shots.length : t ? t.samples.length : 0

  // 跟枪：加权 bias 与分速阈值
  let weightedBiasRatio = null
  let biasRatio = null
  if (t) {
    biasRatio = t.signedBias / t.radius
    // 加权平均（权重 = speed）
    if (t.rounds.length) {
      const sumW = t.rounds.reduce((a, r) => a + r.speed, 0) || 1
      let wBias = 0
      let wThresh = 0
      for (const r of t.rounds) {
        const w = r.speed / sumW
        const br = r.signedBias / t.radius
        wBias += br * w
        wThresh += threshForSpeed(r.speed) * w
      }
      weightedBiasRatio = wBias
      const absW = Math.abs(wBias)
      if (absW > wThresh) {
        if (wBias > 0) {
          votes.high += 1
          signals.push({ name: '光标超前（加权）', detail: `加权偏差 ${ (wBias * 100).toFixed(0)}% r，阈值 ${(wThresh * 100).toFixed(0)}%` })
        } else {
          votes.low += 1
          signals.push({ name: '光标落后（加权）', detail: `加权偏差 ${(wBias * 100).toFixed(0)}% r，阈值 ${(wThresh * 100).toFixed(0)}%` })
        }
      } else {
        // 未超阈值但记录原始 bias 供 delta 使用
        // 仍检查全局 bias 作为弱信号
        if (biasRatio > THRESHOLDS.bias) {
          votes.high += 0.6
          signals.push({ name: '光标超前', detail: `有符号误差均值 +${(biasRatio * 100).toFixed(0)}% 球半径` })
        } else if (biasRatio < -THRESHOLDS.bias) {
          votes.low += 0.6
          signals.push({ name: '光标落后', detail: `有符号误差均值 ${(biasRatio * 100).toFixed(0)}% 球半径` })
        }
      }
    } else {
      if (biasRatio > THRESHOLDS.bias) {
        votes.high += 1
        signals.push({ name: '光标超前', detail: `有符号误差均值 +${(biasRatio * 100).toFixed(0)}% 球半径` })
      } else if (biasRatio < -THRESHOLDS.bias) {
        votes.low += 1
        signals.push({ name: '光标落后', detail: `有符号误差均值 ${(biasRatio * 100).toFixed(0)}% 球半径` })
      }
    }

    // 速度梯度：支持任意轮次（≥2），用单调性 + 相关性放宽判定
    if (t.rounds.length >= 2) {
      const sorted = [...t.rounds].sort((a, b) => a.speed - b.speed)
      const bs = sorted.map((r) => r.signedBias)
      const signs = bs.map(Math.sign)
      const mags = bs.map(Math.abs)
      const floor = t.radius * 0.05
      const nonZero = signs.filter((s) => s !== 0)
      const allSameSign = nonZero.length === signs.length && nonZero.every((s) => s === nonZero[0])
      const monotonicInc = mags.every((v, i) => i === 0 || v >= mags[i - 1] - 1e-9)
      const strictlyIncCount = mags.filter((v, i) => i > 0 && v > mags[i - 1]).length
      if (allSameSign && monotonicInc && mags[0] > floor && (strictlyIncCount >= Math.max(1, Math.floor(mags.length / 2)))) {
        speedBoost += 0.1
        signals.push({ name: '速度梯度', detail: '方向偏差随球速增大而增大 → 信号增强' })
      } else if (signs.includes(1) && signs.includes(-1)) {
        speedBoost -= 0.1
        signals.push({ name: '速度冲突', detail: '不同速度轮次方向偏差不一致 → 信号减弱' })
      }
    }
  }

  if (c) {
    if (c.oneShotRate < THRESHOLDS.oneShotLow && c.avgOvershoot > THRESHOLDS.overshootHigh) {
      votes.high += 0.8
      signals.push({
        name: '过冲震荡',
        detail: `一次命中率 ${pct(c.oneShotRate)}，平均每球过冲 ${c.avgOvershoot.toFixed(1)} 次`,
      })
    } else if (
      c.closeMisses / c.shots.length >= THRESHOLDS.closeMissRatio &&
      c.avgOffset < THRESHOLDS.closeMissOffset
    ) {
      votes.low += 0.7
      signals.push({
        name: '差一点',
        detail: `${c.closeMisses} 球偏移极小但多次重试（占比 ${pct(c.closeMisses / c.shots.length)}）`,
      })
    }
    if (c.halfTrend > THRESHOLDS.halfTrendFatigue) {
      signals.push({ name: '疲劳/波动', detail: `后半程偏移平均恶化 ${(c.halfTrend * 100).toFixed(0)}%，建议休息后复测` })
    }
  }

  const sampleFactor = c
    ? Math.min(1, Math.max(0.5, sampleN / 25))
    : t
      ? Math.min(1, Math.max(0.5, sampleN / 300))
      : 1

  const smallSample = c ? sampleN < 10 : t ? sampleN < 150 : true
  const netHigh = votes.high - votes.low
  let suggestion

  if (!smallSample && netHigh >= THRESHOLDS.voteMargin) {
    suggestion = {
      level: 'high',
      action: '灵敏度偏高 → 建议调低',
      confidence: Math.min(THRESHOLDS.confCap, (0.55 + netHigh * 0.15) * sampleFactor),
    }
  } else if (!smallSample && netHigh <= -THRESHOLDS.voteMargin) {
    suggestion = {
      level: 'low',
      action: '灵敏度偏低 → 建议调高',
      confidence: Math.min(THRESHOLDS.confCap, (0.55 - netHigh * 0.15) * sampleFactor),
    }
  } else if (t) {
    const errRatio = t.avgError / t.radius
    if (errRatio < THRESHOLDS.errStable && t.stability < THRESHOLDS.stableStd) {
      suggestion = { level: 'keep', action: '误差小而稳定 → 当前灵敏度合适', confidence: 0.8 }
    } else if (
      errRatio >= THRESHOLDS.errStable &&
      t.stability >= THRESHOLDS.jitteryStd &&
      Math.abs(t.signedBias) / t.radius < THRESHOLDS.biasZeroBand
    ) {
      suggestion = { level: 'keep', action: '误差大且抖动、方向无偏 → 先练基础再复测', confidence: 0.5 }
    } else {
      suggestion = { level: 'keep', action: '信号不明显 → 建议多测几组对比', confidence: 0.3 }
    }
  } else if (c) {
    if (c.oneShotRate >= 0.8 && c.avgOffset < 0.4) {
      suggestion = { level: 'keep', action: '一次命中率高、偏移小 → 当前灵敏度合适', confidence: 0.7 }
    } else if (c.oneShotRate < 0.5) {
      suggestion = { level: 'keep', action: '命中率低且无方向性信号 → 多测几组再判断', confidence: 0.3 }
    } else {
      suggestion = { level: 'keep', action: '信号不明显 → 建议多测几组对比', confidence: 0.3 }
    }
  } else {
    suggestion = { level: 'keep', action: '信号不明显 → 建议多测几组对比', confidence: 0.3 }
  }

  // 计算幅度 delta（仅 high/low）
  if (suggestion.level !== 'keep') {
    const effSens = sensMultiplier ?? 1
    const delta = computeDelta({
      level: suggestion.level,
      trackingBiasRatio: biasRatio,
      weightedBiasRatio,
      c,
      sensMultiplier: effSens,
    })
    const dpiForCalc = eDPI && effSens ? Math.round(eDPI / effSens) : null
    const targetSens = clamp(Math.round((effSens + delta) * 100) / 100, 0.05, 5)
    const targetEDPI = dpiForCalc ? Math.round(dpiForCalc * targetSens) : null
    const deltaEDPI = targetEDPI != null && eDPI != null ? targetEDPI - eDPI : null
    suggestion.delta = delta
    suggestion.targetSens = targetSens
    suggestion.targetEDPI = targetEDPI
    suggestion.deltaEDPI = deltaEDPI
    // 丰富 action 文案
    const dir = delta < 0 ? '调低' : '调高'
    const mag = Math.abs(delta).toFixed(2)
    const edpiPart = deltaEDPI != null ? `（${deltaEDPI > 0 ? '+' : ''}${deltaEDPI} eDPI → ${targetEDPI}）` : ''
    suggestion.action = `灵敏度偏${suggestion.level === 'high' ? '高' : '低'} → 建议${dir} ${mag} 至 ${targetSens.toFixed(2)} ${edpiPart}`
  } else {
    suggestion.delta = 0
    suggestion.targetSens = sensMultiplier ?? null
    suggestion.targetEDPI = eDPI ?? null
    suggestion.deltaEDPI = 0
  }

  if (speedBoost !== 0) {
    suggestion.confidence =
      speedBoost > 0
        ? Math.min(THRESHOLDS.confCap, suggestion.confidence + speedBoost)
        : Math.max(0.2, suggestion.confidence + speedBoost)
  }

  if (score.total < THRESHOLDS.lowScoreFloor && suggestion.level !== 'keep') {
    suggestion = { level: 'keep', action: '得分过低，方向信号不可靠 → 先练基础，多测几组', confidence: 0.3, delta: 0, targetSens: sensMultiplier ?? null, targetEDPI: eDPI ?? null, deltaEDPI: 0 }
    signals.push({ name: '低分提示', detail: `得分 ${score.total}，低于 ${THRESHOLDS.lowScoreFloor} 分阈值` })
  }

  if (history.length && type) {
    const prev = history.filter((r) => r.type === type)
    if (prev.length) {
      const sameEDPI = prev.filter((r) => r.eDPI === eDPI)
      if (sameEDPI.length >= 2) {
        const sd = stdDev(sameEDPI.map((r) => r.score))
        if (sd > THRESHOLDS.sameEDPIStd) {
          signals.push({ name: '同 eDPI 波动', detail: `${sameEDPI.length} 次测试得分标准差 ${sd.toFixed(1)}，结果不稳定` })
          suggestion.confidence = Math.max(0.2, suggestion.confidence - 0.1)
        } else {
          signals.push({ name: '同 eDPI 稳定', detail: `${sameEDPI.length} 次测试得分标准差 ${sd.toFixed(1)}，数据可靠` })
        }
      }
      const last = prev[prev.length - 1]
      const lastLevel = last.analysis?.suggestion?.level
      if (lastLevel && lastLevel !== 'keep' && suggestion.level !== 'keep' && lastLevel !== suggestion.level) {
        signals.push({ name: '方向矛盾', detail: `上次建议${dirText(lastLevel)}，本次建议${dirText(suggestion.level)}` })
        suggestion = { level: 'keep', action: '前后两次建议方向矛盾 → 多测几组再定', confidence: 0.3, delta: 0, targetSens: sensMultiplier ?? null, targetEDPI: eDPI ?? null, deltaEDPI: 0 }
      } else if (lastLevel && lastLevel !== 'keep' && suggestion.level === lastLevel) {
        suggestion.confidence = Math.min(THRESHOLDS.confCap, suggestion.confidence + 0.1)
        signals.push({ name: '方向一致', detail: '与上次建议方向一致，信号增强' })
      }
    }
  }

  return { ...score, suggestion, signals }
}
