import { useState } from 'react'
import { calcEDPI, validateDPI, validateSens } from '../logic/sensitivity.js'
import { useCountUp } from '../hooks/useCountUp.js'
import { dbg } from '../logic/debugLog.js'
import Icon from '../components/Icon.jsx'
import Nav from '../components/Nav.jsx'
import RecordList from '../components/RecordList.jsx'
import DebugPanel from '../components/DebugPanel.jsx'

const SENS_STEPS = [-0.2, -0.1, -0.05, 0.05, 0.1, 0.2]
const DPI_STEPS = [-400, -100, 100, 400]

export default function Settings({ settings, setSettings, records, onDeleteRecord, onStart }) {
  const [dpi, setDpi] = useState(String(settings.dpi ?? 800))
  const [sens, setSens] = useState(String(settings.sensMultiplier ?? 1))
  const [debugOpen, setDebugOpen] = useState(false)

  const dpiTrim = dpi.trim()
  const sensTrim = sens.trim()
  const dpiNum = dpiTrim === '' ? null : Number(dpiTrim)
  const sensNum = sensTrim === '' ? null : Number(sensTrim)
  const dpiErr = dpiTrim === '' ? null : validateDPI(dpiNum)
  const sensErr = sensTrim === '' ? null : validateSens(sensNum)
  // 空值视为未填写，不阻断测试；仅非空且校验失败才阻断
  const canStart = !dpiErr && !sensErr
  const eDPI = dpiNum != null && sensNum != null && !dpiErr && !sensErr ? calcEDPI(dpiNum, sensNum) : null
  const shownEDPI = useCountUp(eDPI ?? 0, 500)

  const setDpi2 = (v) => {
    setDpi(v)
    dbg('settings:dpi-input', { value: v, parsed: Number(v) })
  }
  const setSens2 = (v) => {
    setSens(v)
    dbg('settings:sens-input', { value: v, parsed: Number(v) })
  }

  const adjustSens = (delta) => {
    const cur = sensTrim === '' || Number.isNaN(Number(sensTrim)) ? 1 : Number(sensTrim)
    const next = Math.max(0.05, Math.min(5, Math.round((cur + delta) * 100) / 100))
    const str = String(next).replace(/\.0+$/, '')
    setSens(str)
    dbg('settings:sens-quick', { delta, from: cur, to: next })
  }

  const adjustDpi = (delta) => {
    const cur = dpiTrim === '' || Number.isNaN(Number(dpiTrim)) ? 800 : Number(dpiTrim)
    const next = Math.max(100, Math.min(30000, cur + delta))
    setDpi(String(next))
    dbg('settings:dpi-quick', { delta, from: cur, to: next })
  }

  const handleStart = (type) => {
    if (!canStart) return
    // 空值回落到默认值：DPI 800 / 倍率 1，供测试内「页面灵敏度」使用
    const finalDpi = dpiNum ?? 800
    const finalSens = sensNum ?? 1
    const finalEDPI = calcEDPI(finalDpi, finalSens)
    dbg('settings:start', { type, dpi: finalDpi, sensMultiplier: finalSens, eDPI: finalEDPI, dpiEmpty: dpiTrim === '', sensEmpty: sensTrim === '' })
    setSettings({ dpi: finalDpi, sensMultiplier: finalSens })
    onStart(type, { dpi: finalDpi, sensMultiplier: finalSens })
  }

  const sensSliderValue = sensNum != null && sensNum > 0 && sensNum <= 5 ? sensNum : 1

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
            <Icon name="mouse" size={17} /> 鼠标设置 <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>（选填，不填也能直接测试）</span>
          </h2>
          <p className="muted" style={{ fontSize: 12.5, margin: '-8px 0 14px' }}>
            填了用于计算 eDPI；不填则按页面灵敏度 <b>1.0</b> 测试，结束后仍会给出“调高/调低”方向建议与页面灵敏度推荐。
          </p>
          <div className="field-row">
            <label htmlFor="dpi-input">鼠标 DPI</label>
            <div className="field-ctl">
              <div className={`input-wrap ${dpiErr ? 'invalid' : ''}`}>
                <input id="dpi-input" type="number" min="100" step="50" value={dpi} onChange={(e) => setDpi2(e.target.value)} placeholder="选填，如 800" />
                <span className="input-suffix">DPI</span>
              </div>
              <div className="quick-group">
                {DPI_STEPS.map((d) => (
                  <button key={d} type="button" className="btn btn-secondary btn-quick" onClick={() => adjustDpi(d)}>
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
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
                value={sensSliderValue}
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
                  placeholder="选填，如 1"
                />
                <span className="input-suffix">×</span>
              </div>
              {sensErr && <span className="field-err">{sensErr}</span>}
            </div>
          </div>
          <div className="quick-row">
            <span className="quick-label">快速调节灵敏度：</span>
            <div className="quick-group">
              {SENS_STEPS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`btn btn-secondary btn-quick ${s > 0 ? 'btn-quick-up' : 'btn-quick-down'}`}
                  onClick={() => adjustSens(s)}
                  title={`灵敏度 ${s > 0 ? '+' : ''}${s}`}
                >
                  {s > 0 ? `+${s.toFixed(2).replace('0.', '.')}` : s.toFixed(2).replace('0.', '.').replace('-0', '-.')}
                </button>
              ))}
            </div>
            <span className="muted" style={{ fontSize: 11.5 }}>步进 0.05 / 0.1 / 0.2，实时生效</span>
          </div>

          <div className="edpi-display">
            <div>
              <div className="edpi-label">eDPI</div>
              <div className="edpi-value">{eDPI != null ? shownEDPI : '--'}</div>
            </div>
            <span className="muted edpi-formula">
              {eDPI != null ? `= ${dpiNum} DPI × ${sensNum}` : '未填写 = 800 DPI × 1 （页面灵敏度）'}
            </span>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">
            <Icon name="crosshair" size={17} /> 选择测试
          </h2>
          <div className="test-choice">
            <button className="test-card" disabled={!canStart} onClick={() => handleStart('clicking')}>
              <span className="test-card-icon">
                <Icon name="target" size={20} />
              </span>
              <span className="test-card-title">定位测试</span>
              <span className="test-card-desc">20 个目标 · 点击精度与过冲分析，约 1 分钟</span>
            </button>
            <button className="test-card test-card-tracking" disabled={!canStart} onClick={() => handleStart('tracking')}>
              <span className="test-card-icon">
                <Icon name="track" size={20} />
              </span>
              <span className="test-card-title">跟枪测试</span>
              <span className="test-card-desc">3 轮 × 10s · 误差曲线与方向偏差，约 1 分钟</span>
            </button>
          </div>
          {!canStart && (
            <p className="field-err" style={{ marginTop: 12 }}>
              请先修正输入：{dpiErr || sensErr}
            </p>
          )}
          {canStart && eDPI == null && (
            <p className="muted" style={{ marginTop: 10, fontSize: 12.5 }}>
              未填写 DPI/灵敏度，将以页面灵敏度 1.0 开始测试，测试后可用上方快速按钮微调再测。
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
            <li>（可选）设置鼠标 DPI 与游戏内灵敏度倍率，系统自动计算 eDPI</li>
            <li>分别完成定位与跟枪测试，得出技能无关的表现分析</li>
            <li>用快速按钮微调灵敏度（±0.05/0.1/0.2）重复测试，对比得分曲线，找出最佳 eDPI</li>
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
