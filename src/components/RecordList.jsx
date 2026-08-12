import Icon from './Icon.jsx'

export default function RecordList({ records, onDelete }) {
  if (!records.length) {
    return <p className="muted empty-note">暂无测试记录，完成一次测试后会自动保存。</p>
  }
  const best = records.reduce((a, r) => (r.score > a.score ? r : a), records[0])
  return (
    <div className="record-list">
      {records.map((r) => (
        <div key={r.id} className={`record-item ${r.id === best.id ? 'record-best' : ''}`}>
          <span className={`type-badge type-${r.type}`}>
            <Icon name={r.type === 'clicking' ? 'target' : 'track'} size={13} />
            {r.type === 'clicking' ? '定位' : '跟枪'}
          </span>
          <div className="record-main">
            <div className="record-title">
              {r.dpi} DPI × {r.sensMultiplier} · <b>{r.eDPI} eDPI</b>
              {r.id === best.id && <span className="badge-best">最佳</span>}
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
      ))}
    </div>
  )
}
