export function calcEDPI(dpi, sensMultiplier) {
  return Math.round(dpi * sensMultiplier)
}

export function validateDPI(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 100) return 'DPI 至少 100'
  if (n > 30000) return 'DPI 过大'
  return null
}

export function validateSens(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return '灵敏度必须大于 0'
  if (n > 20) return '灵敏度过大'
  return null
}
