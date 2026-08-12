import { computeScore, stdDev } from './metrics.js'

export const THRESHOLDS = {
  bias: 0.4, // |signedBias| > 0.4 球半径 → 方向信号
  overshootHigh: 0.6, // 平均每球过冲次数
  oneShotLow: 0.6, // 一次命中率低于此 + 过冲 → 偏高
  closeMissRatio: 0.2, // 差一点球占比 ≥ 20%
  closeMissOffset: 0.35, // 平均偏移（半径倍数）低于此才算差一点
  errStable: 0.35, // 平均误差 < 0.35 半径
  stableStd: 0.3, // 误差标准差 < 0.3 半径 → 稳定
  jitteryStd: 0.35,
  biasZeroBand: 0.2, // |偏差| < 0.2 半径 → 无方向
  halfTrendFatigue: 0.3, // 后半程偏移恶化 > 30%
  lowScoreFloor: 25,
  sameEDPIStd: 8, // 同 eDPI 得分标准差 > 8 → 不稳定
  voteMargin: 0.5, // 净票数 ≥ 0.5 才出方向结论
  confCap: 0.9,
}

const pct = (v) => `${(v * 100).toFixed(0)}%`
const dirText = (l) => (l === 'high' ? '调低' : l === 'low' ? '调高' : '保持')

export function analyzeTest({ clicking, tracking, type, eDPI, history = [] }) {
  const c = clicking?.metrics ?? null
  const t = tracking?.metrics ?? null
  const score = computeScore(c, t)
  const signals = []
  const votes = { high: 0, low: 0 }
  let speedBoost = 0
  const sampleN = c ? c.shots.length : t ? t.samples.length : 0

  if (t) {
    const biasRatio = t.signedBias / t.radius
    if (biasRatio > THRESHOLDS.bias) {
      votes.high += 1
      signals.push({ name: '光标超前', detail: `有符号误差均值 +${(biasRatio * 100).toFixed(0)}% 球半径` })
    } else if (biasRatio < -THRESHOLDS.bias) {
      votes.low += 1
      signals.push({ name: '光标落后', detail: `有符号误差均值 ${(biasRatio * 100).toFixed(0)}% 球半径` })
    }
    if (t.rounds.length >= 3) {
      const bs = [t.rounds[0].signedBias, t.rounds[1].signedBias, t.rounds[2].signedBias]
      const signs = bs.map(Math.sign)
      const mags = bs.map(Math.abs)
      const floor = t.radius * 0.05
      if (
        signs[0] !== 0 &&
        signs.every((s) => s === signs[0]) &&
        mags[2] > mags[1] && mags[1] > mags[0] && mags[0] > floor
      ) {
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

  if (speedBoost !== 0) {
    suggestion.confidence =
      speedBoost > 0
        ? Math.min(THRESHOLDS.confCap, suggestion.confidence + speedBoost)
        : Math.max(0.2, suggestion.confidence + speedBoost)
  }

  if (score.total < THRESHOLDS.lowScoreFloor && suggestion.level !== 'keep') {
    suggestion = { level: 'keep', action: '得分过低，方向信号不可靠 → 先练基础，多测几组', confidence: 0.3 }
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
        suggestion = { level: 'keep', action: '前后两次建议方向矛盾 → 多测几组再定', confidence: 0.3 }
      } else if (lastLevel && lastLevel !== 'keep' && suggestion.level === lastLevel) {
        suggestion.confidence = Math.min(THRESHOLDS.confCap, suggestion.confidence + 0.1)
        signals.push({ name: '方向一致', detail: '与上次建议方向一致，信号增强' })
      }
    }
  }

  return { ...score, suggestion, signals }
}
