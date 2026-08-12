export default function ScoreChart({ records }) {
  if (!records.length) return null
  const W = 720
  const H = 300
  const PAD = { t: 24, r: 16, b: 36, l: 48 }
  const sorted = [...records].sort((a, b) => a.eDPI - b.eDPI)
  const minEDPI = Math.min(...sorted.map((r) => r.eDPI))
  const maxEDPI = Math.max(...sorted.map((r) => r.eDPI))
  const range = Math.max(1, maxEDPI - minEDPI)
  const best = sorted.reduce((a, r) => (r.score > a.score ? r : a), sorted[0])
  const baseY = H - PAD.b

  const px = (e) => PAD.l + ((e - minEDPI) / range) * (W - PAD.l - PAD.r)
  const py = (s) => PAD.t + (1 - s / 100) * (H - PAD.t - PAD.b)

  const yTicks = [0, 25, 50, 75, 100]
  const xTicks = 5

  const areaPath =
    sorted.length > 1
      ? `${sorted.map((r, i) => `${i === 0 ? 'M' : 'L'}${px(r.eDPI)} ${py(r.score)}`).join(' ')} L${px(sorted.at(-1).eDPI)} ${baseY} L${px(sorted[0].eDPI)} ${baseY} Z`
      : ''

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="score-chart" role="img" aria-label="得分 vs eDPI 折线图">
        <defs>
          <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={py(t)} y2={py(t)} className="grid-line" />
            <text x={PAD.l - 8} y={py(t) + 4} className="axis-text" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {Array.from({ length: xTicks + 1 }, (_, i) => {
          const e = minEDPI + (range * i) / xTicks
          return (
            <text key={i} x={px(e)} y={H - 10} className="axis-text" textAnchor="middle">
              {Math.round(e)}
            </text>
          )
        })}
        {areaPath && <path d={areaPath} className="chart-area" />}
        {sorted.map((r, i) => (
          <g key={r.id}>
            {i > 0 && (
              <line
                x1={px(sorted[i - 1].eDPI)}
                y1={py(sorted[i - 1].score)}
                x2={px(r.eDPI)}
                y2={py(r.score)}
                className={r.id === best.id ? 'chart-line-bright' : 'chart-line'}
              />
            )}
            <circle
              cx={px(r.eDPI)}
              cy={py(r.score)}
              r={r.id === best.id ? 6 : 4}
              className={r.id === best.id ? 'chart-point-best' : 'chart-point'}
            >
              <title>{`${r.eDPI} eDPI · ${r.score} 分`}</title>
            </circle>
          </g>
        ))}
        {best && (
          <g>
            <circle cx={px(best.eDPI)} cy={py(best.score)} r={14} className="chart-halo" />
            <text x={px(best.eDPI)} y={py(best.score) - 14} textAnchor="middle" className="chart-label">
              最佳 {best.eDPI} eDPI
            </text>
          </g>
        )}
      </svg>
      <p className="chart-caption">横轴 eDPI · 纵轴得分（0-100）· 光环标记个人最佳</p>
    </div>
  )
}
