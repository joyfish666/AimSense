const MAX = 400
const logs = []

export function dbg(msg, data) {
  try {
    logs.push({
      t: new Date().toISOString().slice(11, 23),
      msg,
      data: data === undefined ? null : JSON.parse(JSON.stringify(data)),
    })
  } catch {
    logs.push({ t: new Date().toISOString().slice(11, 23), msg, data: null })
  }
  if (logs.length > MAX) logs.shift()
}

export const getLogs = () => logs

export function clearLogs() {
  logs.length = 0
}

export function buildDebugReport() {
  const safe = (fn) => {
    try {
      return fn()
    } catch {
      return null
    }
  }
  return {
    browser: {
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      dpr: window.devicePixelRatio,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    },
    localStorage: {
      settings: safe(() => localStorage.getItem('aimsense.settings')),
      records: safe(() => localStorage.getItem('aimsense.records')),
    },
    logs: logs.map((l) => `${l.t} ${l.msg}${l.data ? ' ' + JSON.stringify(l.data) : ''}`),
  }
}
