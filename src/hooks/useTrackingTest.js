import { useEffect, useRef, useState } from 'react'
import { computeTrackingMetrics } from '../logic/metrics.js'

export function useTrackingTest({ radius, margin, speeds = [300, 600, 900], roundMs = 10000, onFinish, active = true }) {
  const [phase, setPhase] = useState('idle') // idle | running | done
  const [round, setRound] = useState(0) // 0..2
  const [timeLeft, setTimeLeft] = useState(roundMs / 1000)
  const [ball, setBall] = useState(null)
  const [speed, setSpeed] = useState(0)

  const cursorRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const ballRef = useRef(null)
  const speedRef = useRef(0)
  const roundSamplesRef = useRef([])
  const roundsRef = useRef([])
  const rafRef = useRef(0)
  const lastFrameRef = useRef(0)
  const roundEndRef = useRef(0)

  const newBall = (r) => {
    const { innerWidth: w, innerHeight: h } = window
    const angle = Math.random() * Math.PI * 2
    const s = speeds[Math.min(r, speeds.length - 1)] * (h / 1080)
    const b = {
      x: w / 2 + (Math.random() * w * 0.4 - w * 0.2),
      y: h / 2 + (Math.random() * h * 0.4 - h * 0.2),
      vx: Math.cos(angle) * s,
      vy: Math.sin(angle) * s,
    }
    ballRef.current = b
    speedRef.current = s
    setBall(b)
    setSpeed(s)
  }

  const start = () => {
    roundsRef.current = []
    roundSamplesRef.current = []
    cursorRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    setRound(0)
    newBall(0)
    roundEndRef.current = performance.now() + roundMs
    lastFrameRef.current = performance.now()
    setPhase('running')
  }

  useEffect(() => {
    if (phase !== 'running') return
    const loop = (now) => {
      if (!active) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }
      const dt = Math.min(50, now - lastFrameRef.current)
      lastFrameRef.current = now
      const b = ballRef.current
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
      roundSamplesRef.current.push({
        t: now,
        ballX: b.x,
        ballY: b.y,
        cursorX: c.x,
        cursorY: c.y,
        error: dist,
        signedError,
        radius,
      })

      const left = roundEndRef.current - now
      setTimeLeft(left / 1000)
      setBall({ ...b })

      if (left <= 0) {
        roundsRef.current.push({
          speed: speedRef.current,
          radius,
          samples: roundSamplesRef.current,
        })
        roundSamplesRef.current = []
        const next = roundsRef.current.length
        if (next >= speeds.length) {
          const metrics = computeTrackingMetrics(roundsRef.current)
          setPhase('done')
          onFinish?.(metrics)
          return
        }
        setRound(next)
        newBall(next)
        roundEndRef.current = now + roundMs
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, active])

  const handlePointerMove = (x, y) => {
    cursorRef.current = { x, y }
  }

  return { phase, round, timeLeft, ball, speed, start, handlePointerMove }
}
