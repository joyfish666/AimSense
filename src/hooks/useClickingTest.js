import { useRef, useState } from 'react'
import { computeClickingMetrics } from '../logic/metrics.js'

function countOvershoots(traj, ball, radius) {
  if (traj.length < 4) return 0
  // 改进：jitter 按半径 15% 且结合最小穿越幅度，避免高频抖动误判
  const jitter = radius * 0.15
  const minExcursion = radius * 0.45 // 必须曾进入 0.45r 内再折返才算过冲
  let prevD = Math.hypot(traj[0].x - ball.x, traj[0].y - ball.y)
  let prevDir = 0 // -1 接近 / +1 远离
  let approachRun = 0
  let minDInApproach = prevD
  let overshoots = 0
  for (let i = 1; i < traj.length; i++) {
    const d = Math.hypot(traj[i].x - ball.x, traj[i].y - ball.y)
    const diff = d - prevD
    const dir = Math.abs(diff) < jitter ? prevDir : diff > 0 ? 1 : -1
    if (dir !== prevDir) {
      if (prevDir === -1 && dir === 1 && approachRun >= 2 && minDInApproach < minExcursion) {
        overshoots++
      }
      if (dir === -1) {
        approachRun = 1
        minDInApproach = d
      } else {
        approachRun = 0
        minDInApproach = Infinity
      }
    } else if (dir === -1) {
      approachRun++
      if (d < minDInApproach) minDInApproach = d
    }
    prevD = d
    prevDir = dir
  }
  return overshoots
}

export function useClickingTest({ radius, minDist, margin, targetCount = 20, onFinish }) {
  const [phase, setPhase] = useState('idle') // idle | running | done
  const [hits, setHits] = useState(0)
  const [ball, setBall] = useState(null)
  const ballRef = useRef(null)
  const shotsRef = useRef([])
  const clicksRef = useRef(0)
  const trajRef = useRef([])
  const startRef = useRef(0)
  const sizeRef = useRef({ w: window.innerWidth, h: window.innerHeight })

  const genBall = () => {
    const { w, h } = sizeRef.current
    const prev = ballRef.current
    for (let i = 0; i < 300; i++) {
      const x = margin + Math.random() * (w - 2 * margin)
      const y = margin + Math.random() * (h - 2 * margin)
      if (!prev || Math.hypot(x - prev.x, y - prev.y) >= minDist) return { x, y }
    }
    return { x: margin, y: margin }
  }

  const start = () => {
    sizeRef.current = { w: window.innerWidth, h: window.innerHeight }
    shotsRef.current = []
    trajRef.current = []
    clicksRef.current = 0
    ballRef.current = null
    const b = genBall()
    ballRef.current = b
    setBall(b)
    setHits(0)
    startRef.current = performance.now()
    setPhase('running')
  }

  const handlePointerMove = (x, y) => {
    if (phase !== 'running') return
    const now = performance.now()
    trajRef.current.push({ x, y, t: now })
    const cutoff = now - 500
    while (trajRef.current.length && trajRef.current[0].t < cutoff) trajRef.current.shift()
  }

  const handlePointerDown = (x, y) => {
    if (phase !== 'running' || !ballRef.current) return
    const b = ballRef.current
    const dist = Math.hypot(x - b.x, y - b.y)
    clicksRef.current += 1
    if (dist > radius) return
    const shot = {
      x: b.x,
      y: b.y,
      clicks: clicksRef.current,
      offset: dist,
      angle: Math.atan2(y - b.y, x - b.x),
      overshoots: countOvershoots(trajRef.current, b, radius),
      traj: trajRef.current.slice(),
    }
    shotsRef.current.push(shot)
    const done = shotsRef.current.length >= targetCount
    if (done) {
      const totalMs = performance.now() - startRef.current
      const metrics = computeClickingMetrics(shotsRef.current, totalMs, radius)
      setPhase('done')
      onFinish?.(metrics)
    } else {
      const nb = genBall()
      ballRef.current = nb
      setBall(nb)
      setHits(shotsRef.current.length)
      clicksRef.current = 0
      trajRef.current = []
    }
  }

  return { phase, hits, ball, targetCount, start, handlePointerDown, handlePointerMove }
}
