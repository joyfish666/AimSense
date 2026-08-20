/**
 * 二次拟合 y = a*x^2 + b*x + c  (x = eDPI, y = score)
 * 最小二乘法求解正规方程，返回顶点（甜蜜点）与拟合质量
 */
function parabolicFitCore(points) {
  if (points.length < 4) return null
  const xs = points.map((p) => p.x)
  const uniq = new Set(xs).size
  if (uniq < 3) return null
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  if (maxX - minX < 40) return null

  const mid = (minX + maxX) / 2
  const half = (maxX - minX) / 2 || 1
  const norm = points.map((p) => ({ xn: (p.x - mid) / half, y: p.y }))

  let s_x = 0, s_x2 = 0, s_x3 = 0, s_x4 = 0, s_y = 0, s_xy = 0, s_x2y = 0
  const n = norm.length
  for (const { xn: x, y } of norm) {
    const x2 = x * x
    const x3 = x2 * x
    const x4 = x2 * x2
    s_x += x; s_x2 += x2; s_x3 += x3; s_x4 += x4
    s_y += y; s_xy += x * y; s_x2y += x2 * y
  }
  const M = [
    [n, s_x, s_x2],
    [s_x, s_x2, s_x3],
    [s_x2, s_x3, s_x4],
  ]
  const B = [s_y, s_xy, s_x2y]
  const sol = solve3(M, B)
  if (!sol) return null
  const [c_n, b_n, a_n] = sol
  if (!Number.isFinite(a_n) || !Number.isFinite(b_n) || !Number.isFinite(c_n)) return null
  if (a_n >= -1e-6) return null

  const xnStar = -b_n / (2 * a_n)
  const vertexX = xnStar * half + mid
  const vertexY = a_n * xnStar * xnStar + b_n * xnStar + c_n

  const yMean = s_y / n
  let ssTot = 0, ssRes = 0
  for (const { xn: x, y } of norm) {
    const yPred = a_n * x * x + b_n * x + c_n
    ssTot += (y - yMean) ** 2
    ssRes += (y - yPred) ** 2
  }
  const r2 = ssTot > 1e-9 ? 1 - ssRes / ssTot : 0
  if (r2 < 0.42) return null

  const a = a_n / (half * half)
  const b = b_n / half - (2 * a_n * mid) / (half * half)
  const c = a_n * (mid * mid) / (half * half) - b_n * mid / half + c_n

  const ext = (maxX - minX) * 0.15
  if (vertexX < minX - ext || vertexX > maxX + ext) return null
  if (vertexY < 0 || vertexY > 110) return null

  return {
    a, b, c,
    vertexX: Math.round(vertexX),
    vertexY: Math.round(Math.max(0, Math.min(100, vertexY))),
    r2,
    minX, maxX,
  }
}

export function parabolicFit(points) {
  const core = parabolicFitCore(points)
  if (!core) return null
  if (points.length >= 5) {
    let drift = 0
    for (let k = 0; k < points.length; k++) {
      const sub = points.filter((_, i) => i !== k)
      const subFit = parabolicFitCore(sub)
      if (!subFit) return null
      drift = Math.max(drift, Math.abs(subFit.vertexX - core.vertexX))
    }
    if (drift > (core.maxX - core.minX) * 0.18) return null
  }
  return core
}

function solve3(M, B) {
  const A = M.map((row, i) => [...row, B[i]])
  const n = 3
  for (let i = 0; i < n; i++) {
    let maxRow = i
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[maxRow][i])) maxRow = r
    if (Math.abs(A[maxRow][i]) < 1e-9) return null
    ;[A[i], A[maxRow]] = [A[maxRow], A[i]]
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i]
      for (let c = i; c <= n; c++) A[r][c] -= f * A[i][c]
    }
  }
  const x = [0, 0, 0]
  for (let i = n - 1; i >= 0; i--) {
    let s = A[i][n]
    for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j]
    x[i] = s / A[i][i]
  }
  return x
}

export function sampleFit(fit, count = 60) {
  if (!fit) return []
  const { a, b, c, minX, maxX } = fit
  const span = maxX - minX
  const lo = minX - span * 0.05
  const hi = maxX + span * 0.05
  const pts = []
  for (let i = 0; i < count; i++) {
    const x = lo + ((hi - lo) * i) / (count - 1)
    const y = a * x * x + b * x + c
    pts.push({ x, y: Math.max(0, Math.min(100, y)) })
  }
  return pts
}
