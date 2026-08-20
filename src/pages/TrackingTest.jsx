import { useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Crosshair from '../components/Crosshair.jsx'
import TargetBall from '../components/TargetBall.jsx'
import HUD from '../components/HUD.jsx'
import { useTrackingTest } from '../hooks/useTrackingTest.js'
import { usePointerAim } from '../hooks/usePointerAim.js'

const SPEEDS = [300, 600, 900]

export default function TrackingTest({ onFinish, onExit, eDPI, sensMultiplier }) {
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
              <li>按 ESC 可随时解除锁定并暂停 / 退出</li>
            </ul>
            <button className="btn btn-primary" onClick={handleStart}>
              开始测试 <Icon name="arrow-right" size={15} />
            </button>
            {onExit && (
              <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={onExit}>
                返回首页
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'running' && !aim.locked && (
        <div className="overlay">
          <div className="overlay-card">
            <span className="overlay-icon overlay-icon-tracking">
              <Icon name="crosshair" size={28} />
            </span>
            <h2>已暂停</h2>
            <p className="overlay-sub">按 ESC 已解除鼠标锁定，测试已暂停</p>
            {aim.lockHint && <p className="overlay-hint">{aim.lockHint}</p>}
            <div className="overlay-actions">
              <button className="btn btn-primary" onClick={aim.lock}>
                重新锁定 <Icon name="arrow-right" size={15} />
              </button>
              <button className="btn btn-secondary" onClick={onExit}>
                退出测试
              </button>
            </div>
            <p className="overlay-tip">提示：按 ESC 解除锁定后，可选择继续或退出</p>
          </div>
        </div>
      )}

      {phase === 'running' && (
        <>
          <HUD left={`第 ${round + 1} / 3 轮`} right={`${eDPI} eDPI`}>
            {Math.max(0, timeLeft).toFixed(1)}s · {Math.round(speed)} px/s
          </HUD>
          {aim.locked && <div className="esc-hint">按 ESC 解除鼠标锁定</div>}
          {ball && <TargetBall x={ball.x} y={ball.y} diameter={diameter} />}
          <Crosshair x={aim.pos.x} y={aim.pos.y} />
        </>
      )}
    </div>
  )
}
