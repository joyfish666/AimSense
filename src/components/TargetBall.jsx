export default function TargetBall({ x, y, diameter }) {
  return (
    <div
      className="target-ball"
      style={{
        width: diameter,
        height: diameter,
        transform: `translate(${x - diameter / 2}px, ${y - diameter / 2}px)`,
      }}
      aria-hidden="true"
    >
      <div className="target-ball-visual" />
    </div>
  )
}
