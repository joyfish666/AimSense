import { useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Crosshair from '../components/Crosshair.jsx'
import TargetBall from '../components/TargetBall.jsx'
import HUD from '../components/HUD.jsx'
import { useTrackingTest } from '../hooks/useTrackingTest.js'
import { usePointerAim } from '../hooks/usePointerAim.js'

const SPEEDS = [300, 600, 900]

export default function TrackingTest({ onFinish, eDPI, sensMultiplier }) {
  const s = window.innerHeight / 1080
  const diameter = Math.max(30, 50 * s)
  const margin = Math.max(40, 60 * s)

  const [cursor, setCursor] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const cursorRef = useRef(cursor)

  const aim = usePointerAim({ sensMultiplier })

  const { phase, round, timeLeft, ball, speed, start, handlePointerMove } = useTrackingTest({
    radius: diameter / 2,
    margin,
    speeds: SPEEDS,
    onFinish,
    active: aim.locked,
  })

  const onMove = (e) => {
    if (!aim.locked) return
    const p = aim.handleMove(e)
    cursorRef.current = p
    setCursor(p)
    handlePointerMove(p.x, p.y)
  }

  const handleStart = () => {
    aim.reset()
    start()
    aim.lock()
  }

  return (
    <div
      className="test-screen"
      ref={aim.screenRef}
      onPointerMove={onMove}
      onContextMenu={(e) => e.preventDefault()}
    >
      {phase === 'idle' && (
        <div className="overlay">
          <div className="overlay-card">
            <span className="overlay-icon overlay-icon-tracking">
              <Icon name="track" size={28} />
            </span>
            <h2>跟枪测试</h2>
            <p className="overlay-sub">eDPI {eDPI} · 准星速度 = 倍率 × 鼠标移动</p>
            <ul className="overlay-steps">
              <li>3 轮 × 10 秒，速度 {SPEEDS.join(' / ')} px/s 递增</li>
              <li>跟随球心移动，保持准星压在球内</li>
              <li>开始后鼠标被锁定，按 ESC 可暂停</li>
            </ul>
            <button className="btn btn-primary" onClick={handleStart}>
              开始测试 <Icon name="arrow-right" size={15} />
            </button>
          </div>
        </div>
      )}

      {phase === 'running' && !aim.locked && (
        <div className="overlay">
          <div className="overlay-card">
            <span className="overlay-icon overlay-icon-tracking">
              <Icon name="crosshair" size={28} />
            </span>
            <h2>鼠标已解锁</h2>
            <p className="overlay-sub">{aim.lockHint || '按 ESC 会退出锁定，测试已暂停'}</p>
            <button className="btn btn-primary" onClick={aim.lock}>
              重新锁定 <Icon name="arrow-right" size={15} />
            </button>
          </div>
        </div>
      )}

      {phase === 'running' && (
        <>
          <HUD left={`第 ${round + 1} / 3 轮`} right={`${eDPI} eDPI`}>
            {Math.max(0, timeLeft).toFixed(1)}s · {Math.round(speed)} px/s
          </HUD>
          {ball && <TargetBall x={ball.x} y={ball.y} diameter={diameter} />}
          <Crosshair x={aim.pos.x} y={aim.pos.y} />
        </>
      )}
    </div>
  )
}
