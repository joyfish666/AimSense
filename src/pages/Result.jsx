import ScoreChart from '../components/ScoreChart.jsx'
import Icon from '../components/Icon.jsx'
import Nav from '../components/Nav.jsx'
import { useCountUp } from '../hooks/useCountUp.js'

function TrajChart({ shots, radius }) {
  const W = 720
  const H = 300
  const CX = W / 2
  const CY = H / 2
  const maxDist = Math.max(radius * 2.5, 60)
  const k = (H / 2 - 12) / maxDist
  const px = (d) => CX + d * k
  const py = (d) => CY + d * k

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="score-chart" role="img" aria-label="定位轨迹过冲分析">
        <circle cx={CX} cy={CY} r={radius * k} className="traj-radius" />
        <circle cx={CX} cy={CY} r={(radius * 0.5) * k} className="traj-radius-inner" />
        {shots.map((shot, i) => (
          <path
            key={i}
            d={shot.traj
              .map((p, j) => `${j === 0 ? 'M' : 'L'}${px(p.x - shot.x)} ${py(p.y - shot.y)}`)
              .join(' ')}
            className="traj-line"
          />
        ))}
        <text x={CX} y={14} textAnchor="middle" className="axis-text">
          轨迹以球心为原点（所有目标叠加）
        </text>
      </svg>
      <p className="chart-caption">曲线越过内圈又折返的次数 = 过冲次数</p>
    </div>
  )
}

function SignedErrorChart({ samples, radius }) {
  const W = 720
  const H = 240
  const PAD = { t: 20, r: 12, b: 24, l: 48 }
  const t0 = samples[0]?.t ?? 0
  const tMax = Math.max(0.001, samples[samples.length - 1]?.t - t0)
  const yMax = Math.max(Math.abs(radius) * 1.8, ...samples.map((s) => Math.abs(s.signedError) * 1.05))
  const px = (t) => PAD.l + ((t - t0) / tMax) * (W - PAD.l - PAD.r)
  const py = (v) => PAD.t + (0.5 - v / (2 * yMax)) * (H - PAD.t - PAD.b)
  const colors = ['#6366f1', '#e11d48', '#f59e0b']
  const rounds = [...new Set(samples.map((s) => s.round))]

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="score-chart" role="img" aria-label="跟枪有符号误差曲线">
        <line x1={PAD.l} x2={W - PAD.r} y1={py(0)} y2={py(0)} className="grid-line-zero" />
        {[radius, -radius].map((v, i) => (
          <line key={i} x1={PAD.l} x2={W - PAD.r} y1={py(v)} y2={py(v)} className="grid-line-band" />
        ))}
        {rounds.map((r) => {
          const pts = samples.filter((s) => s.round === r)
          if (!pts.length) return null
          return (
            <path
              key={r}
              d={pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.t)} ${py(p.signedError)}`).join(' ')}
              className="err-line"
              style={{ stroke: colors[r % colors.length] }}
            />
          )
        })}
        {[radius, 0, -radius].map((v, i) => (
          <text key={i} x={PAD.l - 8} y={py(v) + 4} textAnchor="end" className="axis-text">
            {v > 0 ? `+${v}` : v}
          </text>
        ))}
      </svg>
      <p className="chart-caption">
        正 = 光标超前（灵敏度可能偏高），负 = 光标落后（可能偏低），虚线带 = 目标半径
      </p>
    </div>
  )
}

function fmtPct(v) {
  return `${(v * 100).toFixed(0)}%`
}

export default function Result({ record, records, onRetest, onRestartSame, onSwitchTest, onAdjustRetest }) {
  const { score, suggestion, signals } = record.analysis
  const shownScore = useCountUp(score, 900)
  const best = records.reduce((a, r) => (r.score > a.score ? r : a), record)
  const isBest = best.id === record.id

  const pct = (v) => `${Math.round(v)}%`
  const conf = suggestion.confidence ?? 0.5
  const confPct = pct(conf * 100)
  const confW = pct(conf)
  const tagText =
    suggestion.level === 'high'
      ? conf < 0.5
        ? '可能偏高'
        : '偏高'
      : suggestion.level === 'low'
        ? conf < 0.5
          ? '可能偏低'
          : '偏低'
        : '保持'
  const otherLabel = record.type === 'clicking' ? '去做跟枪测试' : '去做定位测试'
  const sameLabel = record.type === 'clicking' ? '重测定位' : '重测跟枪'
  const curSens = Number(record.sensMultiplier) || 1
  const quickSteps = [-0.2, -0.1, -0.05, 0.05, 0.1, 0.2]
  const recommendedDelta =
    suggestion.level === 'high' ? -0.1 : suggestion.level === 'low' ? 0.1 : null

  return (
    <>
      <Nav onHome={onRetest} />
      <main className="page result-page">
        <header className="page-header result-header">
          <div>
            <h2>测试结果</h2>
            <p className="muted">
              {record.type === 'clicking' ? '定位测试' : '跟枪测试'} · {record.dpi} DPI × {record.sensMultiplier} ={' '}
              <b>{record.eDPI} eDPI</b> · {new Date(record.timestamp).toLocaleString('zh-CN')}
            </p>
          </div>
          <div className="result-header-actions">
            <button className="btn btn-secondary" onClick={onRestartSame}>
              <Icon name="refresh" size={15} /> {sameLabel}
            </button>
            <button className="btn btn-secondary" onClick={onSwitchTest}>
              <Icon name="track" size={15} /> {otherLabel}
            </button>
            <button className="btn btn-primary" onClick={onRetest}>
              <Icon name="sliders" size={15} /> 修改灵敏度再测
            </button>
          </div>
        </header>

        <section className={`card result-hero ${isBest ? 'card-best' : ''}`}>
          <div className="result-score">
            <span className="score-num">{shownScore}</span>
            <span className="score-max">/ 100</span>
          </div>
          <div className="result-suggestion">
            <div className="suggestion-line">
              <span className={`suggestion-tag tag-${suggestion.level}`}>{tagText}</span>
              <span>{suggestion.action}</span>
            </div>
            <div className="conf">
              <div className="conf-bar">
                <div className="conf-fill" style={{ width: confW }} />
              </div>
              <span className="muted conf-text">置信度 {confPct}</span>
            </div>
          </div>
          {isBest && <div className="badge-best result-best-badge">历史最佳</div>}
        </section>

        <section className="card">
          <h3 className="card-title">
            <Icon name="sliders" size={16} /> 页面灵敏度快速微调
          </h3>
          <p className="muted" style={{ fontSize: 12.5, margin: '0 0 10px' }}>
            当前页面灵敏度 <b>{curSens.toFixed(2)}</b> × {record.dpi} DPI = <b>{record.eDPI} eDPI</b>
            {recommendedDelta != null && ` · 推荐 ${recommendedDelta > 0 ? '升高' : '降低'} ${Math.abs(recommendedDelta).toFixed(2)} 试试`}
            （点击直接以新灵敏度重测本项）
          </p>
          <div className="quick-group">
            {quickSteps.map((d) => {
              const next = Math.max(0.05, Math.min(5, Math.round((curSens + d) * 100) / 100))
              const isRecommended = d === recommendedDelta
              return (
                <button
                  key={d}
                  type="button"
                  className={`btn ${isRecommended ? 'btn-primary' : 'btn-secondary'} btn-quick`}
                  onClick={() => onAdjustRetest?.(d)}
                  title={`调至 ${next.toFixed(2)} 再测`}
                >
                  {d > 0 ? `+${d.toFixed(2)}` : d.toFixed(2)} → {next.toFixed(2)}
                </button>
              )
            })}
          </div>
          {recommendedDelta != null && (
            <p className="muted" style={{ fontSize: 11.5, margin: '8px 0 0' }}>
              建议：检测到灵敏度{suggestion.level === 'high' ? '偏高' : '偏低'}，可先点上方高亮按钮一键微调重测。
            </p>
          )}
        </section>

        {signals.length > 0 && (
          <section className="card">
            <h3 className="card-title">
              <Icon name="chart" size={16} /> 方向信号
            </h3>
            <ul className="signal-list">
              {signals.map((s) => (
                <li key={s.name}>
                  <Icon name="info" size={15} />
                  <span>
                    <b>{s.name}</b>：{s.detail}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {record.type === 'clicking' && (
          <>
            <section className="card">
              <h3 className="card-title">
                <Icon name="crosshair" size={16} /> 过冲 / 欠冲分析
              </h3>
              <TrajChart shots={record.clicking.shots} radius={record.clicking.radius} />
              <div className="stat-grid">
                <div className="stat">
                  <span className="stat-label">一次命中率</span>
                  <span className="stat-value">{fmtPct(record.clicking.metrics.oneShotRate)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">平均偏移</span>
                  <span className="stat-value">{record.clicking.metrics.avgOffset.toFixed(2)} r</span>
                </div>
                <div className="stat">
                  <span className="stat-label">平均过冲</span>
                  <span className="stat-value">{record.clicking.metrics.avgOvershoot.toFixed(2)} 次/球</span>
                </div>
                <div className="stat">
                  <span className="stat-label">总用时</span>
                  <span className="stat-value">{(record.clicking.metrics.totalMs / 1000).toFixed(1)} s</span>
                </div>
              </div>
            </section>
            <section className="card">
              <h3 className="card-title">
                <Icon name="target" size={16} /> 逐球明细
              </h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>点击次数</th>
                      <th>偏移 (r)</th>
                      <th>过冲</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.clicking.shots.map((s, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{s.clicks}</td>
                        <td>{(s.offset / record.clicking.radius).toFixed(2)}</td>
                        <td>{s.overshoots}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {record.type === 'tracking' && (
          <>
            <section className="card">
              <h3 className="card-title">
                <Icon name="track" size={16} /> 误差曲线
              </h3>
              <SignedErrorChart samples={record.tracking.samples} radius={record.tracking.radius} />
              <div className="stat-grid">
                <div className="stat">
                  <span className="stat-label">平均误差</span>
                  <span className="stat-value">{(record.tracking.metrics.avgError / record.tracking.radius).toFixed(2)} r</span>
                </div>
                <div className="stat">
                  <span className="stat-label">on-target 占比</span>
                  <span className="stat-value">{fmtPct(record.tracking.metrics.onTargetRate)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">方向偏差</span>
                  <span className="stat-value">
                    {record.tracking.metrics.signedBias > 0 ? '+' : ''}
                    {(record.tracking.metrics.signedBias / record.tracking.radius).toFixed(2)} r
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">误差标准差</span>
                  <span className="stat-value">{(record.tracking.metrics.errorStd / record.tracking.radius).toFixed(2)} r</span>
                </div>
              </div>
            </section>
            <section className="card">
              <h3 className="card-title">
                <Icon name="sliders" size={16} /> 分轮表现
              </h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>轮次</th>
                      <th>速度</th>
                      <th>平均误差 (r)</th>
                      <th>on-target</th>
                      <th>方向偏差 (r)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.tracking.metrics.rounds.map((r, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{Math.round(r.speed)} px/s</td>
                        <td>{r.avgError.toFixed(2)}</td>
                        <td>{fmtPct(r.onTargetRate)}</td>
                        <td>
                          {r.signedBias > 0 ? '+' : ''}
                          {r.signedBias.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <section className="card">
          <h3 className="card-title">
            <Icon name="history" size={16} /> 历史最佳对比
          </h3>
          {best.id === record.id ? (
            <p>
              本次 {record.eDPI} eDPI（{score} 分）就是你的<b>历史最佳</b> 🎉
            </p>
          ) : (
            <p>
              历史最佳是 <b>{best.eDPI} eDPI</b>（{best.score} 分，{best.type === 'clicking' ? '定位' : '跟枪'}测试）。
              本次 {record.eDPI} eDPI 得 {score} 分，{score > best.score ? '已超越' : '尚未超过'}最佳。
            </p>
          )}
          <ScoreChart records={records} />
        </section>
      </main>
    </>
  )
}
