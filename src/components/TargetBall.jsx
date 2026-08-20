export default function TargetBall({ x, y, diameter, hovering = false, hoverProgress = 1 }) {
  // hovering 时显示外圈从 3x 直径收缩到 1x
  const outerScale = hovering ? Math.max(1, 3 - hoverProgress * 2) : 1
  const outerOpacity = hovering ? 0.9 - hoverProgress * 0.6 : 0
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
      {hovering && (
        <div
          className="target-ball-hover-ring"
          style={{
            width: diameter * outerScale,
            height: diameter * outerScale,
            left: (diameter - diameter * outerScale) / 2,
            top: (diameter - diameter * outerScale) / 2,
            opacity: outerOpacity,
          }}
        />
      )}
    </div>
  )
}
