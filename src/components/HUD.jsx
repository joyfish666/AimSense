export default function HUD({ children, left, right }) {
  return (
    <div className="hud">
      {left && <span className="hud-chip">{left}</span>}
      {children && <span className="hud-chip hud-chip-center">{children}</span>}
      {right && <span className="hud-chip">{right}</span>}
    </div>
  )
}
