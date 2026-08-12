import { useCallback, useState } from 'react'
import Icon from './Icon.jsx'
import { buildDebugReport, clearLogs, getLogs } from '../logic/debugLog.js'

export default function DebugPanel({ settings, records }) {
  const [report, setReport] = useState(() => buildDebugReport())
  const [copied, setCopied] = useState(false)

  const refresh = useCallback(() => setReport(buildDebugReport()), [])

  const copy = async () => {
    const text = JSON.stringify(report, null, 2)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className="card debug-panel">
      <h3 className="card-title">
        <Icon name="info" size={16} /> 调试模式
      </h3>

      <div className="debug-actions">
        <button className="btn btn-secondary" onClick={refresh}>
          刷新
        </button>
        <button className="btn btn-primary" onClick={copy}>
          <Icon name="check" size={14} /> {copied ? '已复制' : '复制日志'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            clearLogs()
            refresh()
          }}
        >
          清空日志
        </button>
      </div>

      <div className="debug-section">
        <div className="debug-label">App 设置状态（localStorage 解析值）</div>
        <pre className="debug-pre">{JSON.stringify(settings, null, 2)}</pre>
      </div>

      <div className="debug-section">
        <div className="debug-label">记录列表摘要（eDPI / 得分）</div>
        <pre className="debug-pre">
          {JSON.stringify(
            records.map((r) => ({ type: r.type, dpi: r.dpi, sens: r.sensMultiplier, eDPI: r.eDPI, score: r.score })),
            null,
            2,
          )}
        </pre>
      </div>

      <div className="debug-section">
        <div className="debug-label">localStorage 原始值</div>
        <pre className="debug-pre">
          settings: {report.localStorage.settings}
          {'\n'}records: {report.localStorage.records}
        </pre>
      </div>

      <div className="debug-section">
        <div className="debug-label">事件日志（灵敏度数据流）</div>
        <div className="debug-log">
          {getLogs().length === 0 && <span className="muted">暂无日志 —— 去修改灵敏度并开始一次测试，日志会自动记录</span>}
          {getLogs().map((l, i) => (
            <div key={i} className="debug-log-line">
              <span className="debug-log-t">{l.t}</span> {l.msg}
              {l.data != null && <span className="debug-log-data"> {JSON.stringify(l.data)}</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
