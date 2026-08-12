import Icon from '../components/Icon.jsx'
import Crosshair from '../components/Crosshair.jsx'
import TargetBall from '../components/TargetBall.jsx'
import HUD from '../components/HUD.jsx'
import { useClickingTest } from '../hooks/useClickingTest.js'
import { usePointerAim } from '../hooks/usePointerAim.js'

const TARGET_COUNT = 20

export default function ClickingTest({ onFinish, eDPI, sensMultiplier }) {
  const s = window.innerHeight / 1080
  const diameter = Math.max(24, 40 * s)
  const margin = Math.max(40, 80 * s)
  const minDist = 300 * s

  const { phase, hits, ball, start, handlePointerDown, handlePointerMove } = useClickingTest({
    radius: diameter / 2,
    minDist,
    margin,
    targetCount: TARGET_COUNT,
    onFinish,
  })

  const aim = usePointerAim({ sensMultiplier })

  const onMove = (e) => {
    if (!aim.locked) return
    const p = aim.handleMove(e)
    handlePointerMove(p.x, p.y)
  }

  const onDown = () => {
    if (!aim.locked) return
    handlePointerDown(aim.posRef.current.x, aim.posRef.current.y)
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
      onPointerDown={onDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {phase === 'idle' && (
        <div className="overlay">
          <div className="overlay-card">
            <span className="overlay-icon">
              <Icon name="target" size={28} />
            </span>
            <h2>定位测试</h2>
            <p className="overlay-sub">eDPI {eDPI} · 准星速度 = 倍率 × 鼠标移动</p>
            <ul className="overlay-steps">
              <li>共 {TARGET_COUNT} 个目标，点击球体中心</li>
              <li>开始后鼠标被锁定，移动鼠标控制准星</li>
              <li>未点中不计分，可继续点直到命中</li>
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
            <span className="overlay-icon">
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
          <HUD left={`${hits} / ${TARGET_COUNT}`} right={`${eDPI} eDPI`} />
          {ball && <TargetBall x={ball.x} y={ball.y} diameter={diameter} />}
          <Crosshair x={aim.pos.x} y={aim.pos.y} />
        </>
      )}
    </div>
  )
}
