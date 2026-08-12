export default function Crosshair({ x, y }) {
  return (
    <div className="crosshair" style={{ transform: `translate(${x}px, ${y}px)` }} aria-hidden="true">
      <div className="crosshair-h" />
      <div className="crosshair-v" />
      <div className="crosshair-dot" />
    </div>
  )
}
