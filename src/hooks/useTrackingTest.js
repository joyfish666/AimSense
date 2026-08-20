import { useEffect, useRef, useState } from 'react'
import { computeTrackingMetrics } from '../logic/metrics.js'

export function useTrackingTest({
  radius,
  margin,
  speeds = [150, 300, 600, 900],
  repeats = 3,
  hoverMs = 900,
  segmentTrackMs = 4000,
  mode = 'horizontal', // 'horizontal' | 'random'
  onFinish,
  active = true,
}) {
  const [phase, setPhase] = useState('idle') // idle | running | done
  const [tier, setTier] = useState(0) // 0..speeds.length-1
  const [rep, setRep] = useState(0) // 0..repeats-1
  const [ball, setBall] = useState(null)
  const [speed, setSpeed] = useState(0)
  const [hovering, setHovering] = useState(false)
  const [hoverProgress, setHoverProgress] = useState(0) // 0..1
  const [timeLeft, setTimeLeft] = useState(0)

  const cursorRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const ballRef = useRef(null)
  const speedRef = useRef(0)
  const tierSamplesRef = useRef([])
  const roundsRef = useRef([])
  const rafRef = useRef(0)
  const lastFrameRef = useRef(0)
  const hoverEndRef = useRef(0)
  const segmentEndRef = useRef(0)

  const createBall = (tierIdx) => {
    const { innerWidth: w, innerHeight: h } = window
    const s = speeds[Math.min(tierIdx, speeds.length - 1)] * (h / 1080)
    let x, y, vx, vy
    if (mode === 'horizontal') {
      // 左右跟枪：水平移动，随机起始在中线偏左/右，垂直位置随机
      const fromLeft = Math.random() > 0.5
      x = fromLeft ? margin + (w - 2 * margin) * 0.15 : w - margin - (w - 2 * margin) * 0.15
      y = h * 0.5 + (Math.random() - 0.5) * (h * 0.35)
      y = Math.max(margin, Math.min(h - margin, y))
      vx = fromLeft ? s : -s
      vy = 0
    } else {
      const angle = Math.random() * Math.PI * 2
      x = w / 2 + (Math.random() * w * 0.4 - w * 0.2)
      y = h / 2 + (Math.random() * h * 0.4 - h * 0.2)
      vx = Math.cos(angle) * s
      vy = Math.sin(angle) * s
    }
    const b = { x, y, vx, vy }
    ballRef.current = b
    speedRef.current = s
    setBall({ ...b, hovering: true, hoverProgress: 0 })
    setSpeed(s)
    setHovering(true)
    setHoverProgress(0)
    return b
  }

  const start = () => {
    roundsRef.current = []
    tierSamplesRef.current = []
    cursorRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    setTier(0)
    setRep(0)
    const now = performance.now()
    createBall(0)
    hoverEndRef.current = now + hoverMs
    // segmentEnd will be set after hover ends
    segmentEndRef.current = 0
    lastFrameRef.current = now
    // total tier time left for HUD
    setTimeLeft(repeats * (hoverMs + segmentTrackMs) / 1000)
    setPhase('running')
  }

  useEffect(() => {
    if (phase !== 'running') return
    const loop = (now) => {
      if (!active) {
        lastFrameRef.current = now
        rafRef.current = requestAnimationFrame(loop)
        return
      }
      const dt = Math.min(50, now - lastFrameRef.current)
      lastFrameRef.current = now
      let b = ballRef.current
      if (!b) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      if (hovering) {
        const prog = Math.min(1, 1 - (hoverEndRef.current - now) / hoverMs)
        setHoverProgress(prog)
        setBall({ ...b, hovering: true, hoverProgress: prog })
        // update tier time left
        const tierIdx = tier
        const repIdx = rep
        const elapsedInTier = repIdx * (hoverMs + segmentTrackMs) + prog * hoverMs
        const totalTier = repeats * (hoverMs + segmentTrackMs)
        setTimeLeft(Math.max(0, (totalTier - elapsedInTier) / 1000))
        if (now >= hoverEndRef.current) {
          setHovering(false)
          setHoverProgress(1)
          setBall({ ...b, hovering: false, hoverProgress: 1 })
          segmentEndRef.current = now + segmentTrackMs
        }
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      // moving phase
      const { innerWidth: w, innerHeight: h } = window
      b.x += (b.vx * dt) / 1000
      b.y += (b.vy * dt) / 1000
      if (b.x < margin || b.x > w - margin) {
        b.x = Math.max(margin, Math.min(w - margin, b.x))
        b.vx = -b.vx
      }
      if (b.y < margin || b.y > h - margin) {
        b.y = Math.max(margin, Math.min(h - margin, b.y))
        b.vy = -b.vy
      }

      const c = cursorRef.current
      const dist = Math.hypot(c.x - b.x, c.y - b.y)
      const vlen = Math.hypot(b.vx, b.vy)
      const signedError = vlen > 0 ? ((c.x - b.x) * b.vx + (c.y - b.y) * b.vy) / vlen : 0
      // only sample during moving (not hover)
      tierSamplesRef.current.push({
        t: now,
        ballX: b.x,
        ballY: b.y,
        cursorX: c.x,
        cursorY: c.y,
        error: dist,
        signedError,
        radius,
        tier,
        rep,
      })

      // progress within segment for timeLeft
      const elapsedInTier = rep * (hoverMs + segmentTrackMs) + hoverMs + (now - (segmentEndRef.current - segmentTrackMs))
      const totalTier = repeats * (hoverMs + segmentTrackMs)
      setTimeLeft(Math.max(0, (totalTier - elapsedInTier) / 1000))
      setBall({ ...b, hovering: false, hoverProgress: 1 })

      if (now >= segmentEndRef.current) {
        const nextRep = rep + 1
        if (nextRep < repeats) {
          // next ball in same tier
          setRep(nextRep)
          createBall(tier)
          hoverEndRef.current = now + hoverMs
          setHovering(true)
          setHoverProgress(0)
        } else {
          // tier finished, push tier aggregate
          roundsRef.current.push({
            speed: speedRef.current,
            radius,
            samples: tierSamplesRef.current.slice(),
          })
          tierSamplesRef.current = []
          const nextTier = tier + 1
          if (nextTier >= speeds.length) {
            const metrics = computeTrackingMetrics(roundsRef.current)
            setPhase('done')
            onFinish?.(metrics)
            return
          }
          setTier(nextTier)
          setRep(0)
          createBall(nextTier)
          hoverEndRef.current = now + hoverMs
          setHovering(true)
          setHoverProgress(0)
          setTimeLeft(repeats * (hoverMs + segmentTrackMs) / 1000)
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, active, hovering, tier, rep, hoverMs, segmentTrackMs, repeats, mode])

  const handlePointerMove = (x, y) => {
    cursorRef.current = { x, y }
  }

  return {
    phase,
    tier,
    round: tier, // alias for backward compat
    rep,
    repeats,
    speeds,
    hovering,
    hoverProgress,
    timeLeft,
    ball,
    speed,
    start,
    handlePointerMove,
  }
}
