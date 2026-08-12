import { useState } from 'react'
import { calcEDPI, validateDPI, validateSens } from '../logic/sensitivity.js'
import { useCountUp } from '../hooks/useCountUp.js'
import { dbg } from '../logic/debugLog.js'
import Icon from '../components/Icon.jsx'
import Nav from '../components/Nav.jsx'
import RecordList from '../components/RecordList.jsx'
import DebugPanel from '../components/DebugPanel.jsx'

export default function Settings({ settings, setSettings, records, onDeleteRecord, onStart }) {
  const [dpi, setDpi] = useState(String(settings.dpi))
  const [sens, setSens] = useState(String(settings.sensMultiplier))
  const [debugOpen, setDebugOpen] = useState(false)

  const dpiNum = Number(dpi)
  const sensNum = Number(sens)
  const dpiErr = validateDPI(dpiNum)
  const sensErr = validateSens(sensNum)
  const valid = !dpiErr && !sensErr
  const eDPI = valid ? calcEDPI(dpiNum, sensNum) : 0
  const shownEDPI = useCountUp(eDPI, 500)

  const setDpi2 = (v) => {
    setDpi(v)
    dbg('settings:dpi-input', { value: v, parsed: Number(v) })
  }
  const setSens2 = (v) => {
    setSens(v)
    dbg('settings:sens-input', { value: v, parsed: Number(v) })
  }

  const handleStart = (type) => {
    if (!valid) return
    dbg('settings:start', { type, dpi: dpiNum, sensMultiplier: sensNum, eDPI })
    setSettings({ dpi: dpiNum, sensMultiplier: sensNum })
    onStart(type, { dpi: dpiNum, sensMultiplier: sensNum })
  }

  return (
    <>
      <Nav />
      <main className="page settings-page">
        <header className="page-header">
          <h1>灵敏度校准</h1>
          <p className="muted">通过技能无关的表现测试，找出最适合你的 eDPI</p>
        </header>

        <section className="card">
          <h2 className="card-title">
            <Icon name="mouse" size={17} /> 鼠标设置
          </h2>
          <div className="field-row">
            <label htmlFor="dpi-input">鼠标 DPI</label>
            <div className="field-ctl">
              <div className={`input-wrap ${dpiErr ? 'invalid' : ''}`}>
                <input id="dpi-input" type="number" min="100" step="50" value={dpi} onChange={(e) => setDpi2(e.target.value)} />
                <span className="input-suffix">DPI</span>
              </div>
              {dpiErr && <span className="field-err">{dpiErr}</span>}
            </div>
          </div>

          <div className="field-row">
            <label htmlFor="sens-input">游戏灵敏度倍率</label>
            <div className="field-ctl">
              <input
                id="sens-slider"
                type="range"
                min="0.05"
                max="5"
                step="0.01"
                value={Number(sens) > 0 && Number(sens) <= 5 ? sens : 1}
                onChange={(e) => setSens2(e.target.value)}
              />
              <div className={`input-wrap ${sensErr ? 'invalid' : ''}`}>
                <input
                  id="sens-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={sens}
                  onChange={(e) => setSens2(e.target.value)}
                />
                <span className="input-suffix">×</span>
              </div>
              {sensErr && <span className="field-err">{sensErr}</span>}
            </div>
          </div>

          <div className="edpi-display">
            <div>
              <div className="edpi-label">eDPI</div>
              <div className="edpi-value">{valid ? shownEDPI : '--'}</div>
            </div>
            <span className="muted edpi-formula">
              = {valid ? dpiNum : '–'} DPI × {valid ? sensNum : '–'}
            </span>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">
            <Icon name="crosshair" size={17} /> 选择测试
          </h2>
          <div className="test-choice">
            <button className="test-card" disabled={!valid} onClick={() => handleStart('clicking')}>
              <span className="test-card-icon">
                <Icon name="target" size={20} />
              </span>
              <span className="test-card-title">定位测试</span>
              <span className="test-card-desc">20 个目标 · 点击精度与过冲分析，约 1 分钟</span>
            </button>
            <button className="test-card test-card-tracking" disabled={!valid} onClick={() => handleStart('tracking')}>
              <span className="test-card-icon">
                <Icon name="track" size={20} />
              </span>
              <span className="test-card-title">跟枪测试</span>
              <span className="test-card-desc">3 轮 × 10s · 误差曲线与方向偏差，约 1 分钟</span>
            </button>
          </div>
          {!valid && (
            <p className="field-err" style={{ marginTop: 12 }}>
              请先修正输入：{dpiErr || sensErr}
            </p>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">
            <Icon name="history" size={17} /> 历史记录
          </h2>
          <RecordList records={records} onDelete={onDeleteRecord} />
        </section>

        <section className="card card-info">
          <h2 className="card-title">
            <Icon name="info" size={17} /> 使用说明
          </h2>
          <ol className="steps">
            <li>设置鼠标 DPI 与游戏内灵敏度倍率，系统自动计算 eDPI</li>
            <li>分别完成定位与跟枪测试，得出技能无关的表现分析</li>
            <li>换灵敏度重复测试，对比得分曲线，找出你的最佳 eDPI</li>
          </ol>
        </section>

        <button
          className="btn btn-ghost debug-toggle"
          onClick={() => setDebugOpen((v) => !v)}
          aria-expanded={debugOpen}
        >
          <Icon name="sliders" size={14} /> {debugOpen ? '关闭调试模式' : '调试模式'}
        </button>
        {debugOpen && <DebugPanel settings={settings} records={records} />}
      </main>
    </>
  )
}
