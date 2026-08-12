export const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

export const stdDev = (arr) => {
  if (arr.length < 2) return 0
  const m = mean(arr)
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1))
}

export function computeClickingMetrics(shots, totalMs, radius) {
  const firstTryHits = shots.filter((s) => s.clicks === 1).length
  const oneShotRate = shots.length ? firstTryHits / shots.length : 0

  const avgOffset = radius > 0 ? mean(shots.map((s) => s.offset)) / radius : 0

  const totalRetries = shots.reduce((a, s) => a + Math.max(0, s.clicks - 1), 0)
  const avgClicks = shots.length ? shots.reduce((a, s) => a + s.clicks, 0) / shots.length : 0

  const overshootCount = shots.reduce((a, s) => a + (s.overshoots || 0), 0)
  const avgOvershoot = shots.length ? overshootCount / shots.length : 0

  const half = Math.ceil(shots.length / 2)
  const firstHalfAvg = mean(shots.slice(0, half).map((s) => s.offset))
  const secondHalfAvg = mean(shots.slice(half).map((s) => s.offset))
  const halfTrend =
    shots.length >= 4 && firstHalfAvg > 0
      ? (secondHalfAvg - firstHalfAvg) / firstHalfAvg
      : 0

  const closeMisses = shots.filter((s) => s.clicks >= 2 && s.offset < 0.8 * radius).length

  return {
    shots,
    oneShotRate,
    avgOffset,
    avgOvershoot,
    totalRetries,
    avgClicks,
    totalMs,
    halfTrend,
    closeMisses,
    radius,
  }
}

export function computeTrackingMetrics(rounds) {
  const flat = rounds.flatMap((r, i) =>
    r.samples.map((s) => ({ ...s, round: i })),
  )
  const errors = flat.map((s) => s.error)
  const signedErrors = flat.map((s) => s.signedError)
  const radius = rounds.length ? rounds[0].radius : 0

  const avgError = mean(errors)
  const errorStd = stdDev(errors)
  const onTargetRate = radius > 0 ? errors.filter((e) => e < radius).length / errors.length : 0
  const signedBias = mean(signedErrors)

  const perRound = rounds.map((r) => {
    const e = r.samples.map((s) => s.error)
    const se = r.samples.map((s) => s.signedError)
    return {
      speed: r.speed,
      avgError: mean(e),
      stdDev: stdDev(e),
      onTargetRate: r.radius > 0 ? e.filter((v) => v < r.radius).length / e.length : 0,
      signedBias: mean(se),
    }
  })

  const stability = errorStd / Math.max(radius, 1)

  return {
    rounds: perRound,
    samples: flat,
    avgError,
    errorStd,
    stability,
    onTargetRate,
    signedBias,
    radius,
  }
}

export function computeScore(clickingMetrics, trackingMetrics) {
  const part = { clicking: null, tracking: null }

  if (clickingMetrics) {
    const c = clickingMetrics
    const oneShotScore = c.oneShotRate * 30

    const offsetScore = Math.max(0, (1 - c.avgOffset / 0.9) * 10)

    const clicksPenalty = Math.max(0, (1 - Math.max(0, c.avgClicks - 1) / 3) * 8)
    const speedBonus = Math.max(0, Math.min(1, (12000 - c.totalMs) / 9000)) * 2
    const speedScore = clicksPenalty + speedBonus

    part.clicking = Math.max(0, Math.min(50, oneShotScore + offsetScore + speedScore))
  }

  if (trackingMetrics) {
    const t = trackingMetrics
    const onTargetScore = t.onTargetRate * 30
    const stableScore = Math.max(0, (1 - t.stability / 0.7) * 20)
    part.tracking = Math.max(0, Math.min(50, onTargetScore + stableScore))
  }

  const both = part.clicking != null && part.tracking != null
  const raw = (part.clicking ?? 0) + (part.tracking ?? 0)
  const total = both ? raw : raw * 2

  return {
    total: Math.round(total),
    parts: { clicking: part.clicking, tracking: part.tracking },
  }
}
