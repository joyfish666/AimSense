import Icon from './Icon.jsx'

function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" className="logo-mark" aria-hidden="true">
      <circle cx="16" cy="16" r="12.5" className="logo-ring" />
      <circle cx="16" cy="16" r="2.6" className="logo-dot" />
      <path d="M16 1.5v6M16 24.5v6M1.5 16h6M24.5 16h6" className="logo-lines" />
    </svg>
  )
}

export default function Nav({ onHome }) {
  const Brand = onHome ? 'button' : 'span'
  return (
    <header className="nav">
      <Brand className="nav-brand" onClick={onHome} aria-label="瞄感 AimSense">
        <LogoMark />
        <span className="nav-brand-text">
          瞄感 <em>AimSense</em>
        </span>
      </Brand>
      {onHome && (
        <button className="btn btn-ghost" onClick={onHome}>
          <Icon name="home" size={15} /> 返回设置
        </button>
      )}
    </header>
  )
}
