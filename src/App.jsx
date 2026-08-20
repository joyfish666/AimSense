import { useCallback, useEffect, useRef, useState } from 'react'
import Settings from './pages/Settings.jsx'
import ClickingTest from './pages/ClickingTest.jsx'
import TrackingTest from './pages/TrackingTest.jsx'
import Result from './pages/Result.jsx'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { calcEDPI } from './logic/sensitivity.js'
import { analyzeTest } from './logic/analyze.js'
import { dbg } from './logic/debugLog.js'

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

// 跟枪采样 60Hz -> 10Hz 降采样，减小 localStorage 体积（约 1/6）
function downsampleTrackingSamples(samples, keepEvery = 6) {
  if (!samples || samples.length <= keepEvery) return samples
  const out = []
  for (let i = 0; i < samples.length; i += keepEvery) out.push(samples[i])
  const last = samples[samples.length - 1]
  if (out[out.length - 1] !== last) out.push(last)
  return out
}

export default function App() {
  const [settings, setSettings] = useLocalStorage('aimsense.settings', {
    dpi: 800,
    sensMultiplier: 1,
  })
  const [records, setRecords] = useLocalStorage('aimsense.records', [])
  const [route, setRoute] = useState({ page: 'settings' })
  const recordsRef = useRef(records)
  useEffect(() => { recordsRef.current = records }, [records])

  useEffect(() => {
    dbg('app:settings-state', settings)
  }, [settings])

  useEffect(() => {
    dbg('app:records-count', { count: records.length, last: records.at(-1)?.eDPI ?? null })
  }, [records])

  const handleStart = (type, snap) => {
    dbg('app:start', { type, snap })
    setRoute({ page: type, settings: snap ?? settings })
  }
  const handleFinish = useCallback(
    (metrics) => {
      const snap = route.settings ?? settings
      const { dpi, sensMultiplier } = snap
      const edpi = calcEDPI(dpi, sensMultiplier)
      const type = route.page
      dbg('app:finish', { type, snap, eDPI: edpi })
      // 使用 recordsRef 避免闭包 stale，同时对跟枪样本 10Hz 降采样落盘
      const history = recordsRef.current
      const analysis = analyzeTest({ [type]: { metrics }, type, eDPI: edpi, history, sensMultiplier })
      let clickingData
      let trackingData
      if (type === 'clicking') {
        clickingData = { metrics, shots: metrics.shots, radius: metrics.radius }
      } else {
        const downsampled = downsampleTrackingSamples(metrics.samples, 6)
        const metricsDown = { ...metrics, samples: downsampled }
        trackingData = { metrics: metricsDown, samples: downsampled, radius: metrics.radius }
      }
      const record = {
        id: newId(),
        type,
        timestamp: Date.now(),
        dpi,
        sensMultiplier,
        eDPI: edpi,
        clicking: clickingData,
        tracking: trackingData,
        score: analysis.total,
        suggestion: analysis.suggestion.action,
        analysis,
      }
      setRecords((prev) => {
        const next = [...prev, record]
        // 配额保护：超 100 条自动驱逐最旧的 20 条
        if (next.length > 100) return next.slice(next.length - 100)
        return next
      })
      setRoute({ page: 'result', record })
    },
    [route, settings, setRecords],
  )

  const handleDeleteRecord = (id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const handleRetest = () => {
    if (document.pointerLockElement) document.exitPointerLock()
    setRoute({ page: 'settings' })
  }
  const handleExitTest = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock()
    setRoute({ page: 'settings' })
  }, [])
  const handleRestartSame = useCallback(() => {
    const r = route.record
    if (!r) return setRoute({ page: 'settings' })
    const snap = { dpi: r.dpi, sensMultiplier: r.sensMultiplier }
    setRoute({ page: r.type, settings: snap })
  }, [route.record])
  const handleSwitchTest = useCallback(() => {
    const r = route.record
    if (!r) return setRoute({ page: 'settings' })
    const nextType = r.type === 'clicking' ? 'tracking' : 'clicking'
    const snap = { dpi: r.dpi, sensMultiplier: r.sensMultiplier }
    setRoute({ page: nextType, settings: snap })
  }, [route.record])
  const handleAdjustRetest = useCallback(
    (delta) => {
      const r = route.record
      if (!r) return setRoute({ page: 'settings' })
      const cur = Number(r.sensMultiplier) || 1
      const nextSens = Math.max(0.05, Math.min(5, Math.round((cur + delta) * 100) / 100))
      const snap = { dpi: r.dpi, sensMultiplier: nextSens }
      setSettings(snap)
      dbg('app:adjust-retest', { delta, from: cur, to: nextSens, type: r.type })
      setRoute({ page: r.type, settings: snap })
    },
    [route.record, setSettings],
  )

  if (route.page === 'clicking') {
    return (
      <ClickingTest
        onFinish={handleFinish}
        onExit={handleExitTest}
        eDPI={calcEDPI(route.settings.dpi, route.settings.sensMultiplier)}
        sensMultiplier={route.settings.sensMultiplier}
      />
    )
  }
  if (route.page === 'tracking') {
    return (
      <TrackingTest
        onFinish={handleFinish}
        onExit={handleExitTest}
        eDPI={calcEDPI(route.settings.dpi, route.settings.sensMultiplier)}
        sensMultiplier={route.settings.sensMultiplier}
      />
    )
  }
  if (route.page === 'result') {
    return (
      <div className="route" key="result">
        <Result
          record={route.record}
          records={records}
          onRetest={handleRetest}
          onRestartSame={handleRestartSame}
          onSwitchTest={handleSwitchTest}
          onAdjustRetest={handleAdjustRetest}
        />
      </div>
    )
  }
  return (
    <div className="route" key="settings">
      <Settings
        settings={settings}
        setSettings={setSettings}
        records={records}
        onDeleteRecord={handleDeleteRecord}
        onStart={handleStart}
      />
    </div>
  )
}
