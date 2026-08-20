export function calcEDPI(dpi, sensMultiplier) {
  return Math.round(dpi * sensMultiplier)
}

// eDPI <-> cm/360 换算（按 CS:GO m_yaw 0.022 近似，仅供参考）
// 经验常数 20400 来自：400 eDPI ≈ 51 cm/360 ，800 eDPI ≈ 25.5 cm/360
const CM360_CONSTANT = 20400

export function edpiToCm360(edpi) {
  const n = Number(edpi)
  if (!Number.isFinite(n) || n <= 0) return null
  return CM360_CONSTANT / n
}

export function cm360ToEdpi(cm) {
  const n = Number(cm)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(CM360_CONSTANT / n)
}

export function edpiToSens(edpi, dpi) {
  const d = Number(dpi)
  if (!Number.isFinite(d) || d <= 0) return null
  return Math.round((Number(edpi) / d) * 100) / 100
}

export function getEDPIWarning(edpi) {
  const n = Number(edpi)
  if (!Number.isFinite(n)) return null
  if (n < 200) return { level: 'low', text: 'eDPI 偏低（<200），需大幅度拉鼠标，适合大范围摆动' }
  if (n < 300) return { level: 'low', text: 'eDPI 偏低，桌面空间需求大' }
  if (n > 2000) return { level: 'high', text: 'eDPI 偏高（>2000），微小抖动即大幅偏移，难精控' }
  if (n > 1600) return { level: 'high', text: 'eDPI 偏高，精细瞄准压力大' }
  return null
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
