import Icon from './Icon.jsx'
import { edpiToCm360 } from '../logic/sensitivity.js'

export default function RecordList({ records, onDelete }) {
  if (!records.length) {
    return <p className="muted empty-note">暂无测试记录，完成一次测试后会自动保存。</p>
  }
  const bestByType = {
    clicking: records.filter((r) => r.type === 'clicking').reduce((a, r) => (!a || r.score > a.score ? r : a), null),
    tracking: records.filter((r) => r.type === 'tracking').reduce((a, r) => (!a || r.score > a.score ? r : a), null),
  }
  return (
    <div className="record-list">
      {records.map((r) => {
        const isBestType = bestByType[r.type]?.id === r.id
        return (
          <div key={r.id} className={`record-item ${isBestType ? 'record-best' : ''}`}>
            <span className={`type-badge type-${r.type}`}>
              <Icon name={r.type === 'clicking' ? 'target' : 'track'} size={13} />
              {r.type === 'clicking' ? '定位' : '跟枪'}
            </span>
            <div className="record-main">
              <div className="record-title">
                {r.dpi} DPI × {r.sensMultiplier} · <b>{r.eDPI} eDPI</b>
                <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>{edpiToCm360(r.eDPI)?.toFixed(1)} cm/360</span>
                {isBestType && <span className="badge-best">分榜最佳</span>}
              </div>
              <div className="record-suggestion" title={r.suggestion}>
                {r.suggestion}
              </div>
              <div className="record-meta">{new Date(r.timestamp).toLocaleString('zh-CN')}</div>
            </div>
            <span className="record-score" title="测试得分">
              {r.score}
            </span>
            <button className="btn-ghost btn-del" onClick={() => onDelete(r.id)} aria-label="删除记录">
              <Icon name="trash" size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
