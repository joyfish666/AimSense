import { useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Crosshair from '../components/Crosshair.jsx'
import TargetBall from '../components/TargetBall.jsx'
import HUD from '../components/HUD.jsx'
import { useTrackingTest } from '../hooks/useTrackingTest.js'
import { usePointerAim } from '../hooks/usePointerAim.js'

const ALL_SPEEDS = [150, 300, 600, 900]
const REPEATS = 3
const DEFAULT_SPEEDS = [150, 300, 600]

export default function TrackingTest({ onFinish, onExit, eDPI, sensMultiplier }) {
  const s = window.innerHeight / 1080
  const diameter = Math.max(30, 50 * s)
  const margin = Math.max(40, 60 * s)

  const [mode, setMode] = useState('horizontal') // horizontal | random
  const [selectedSpeeds, setSelectedSpeeds] = useState(DEFAULT_SPEEDS)

  const [cursor, setCursor] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const cursorRef = useRef(cursor)

  const aim = usePointerAim({ sensMultiplier })

  const sortedSpeeds = [...selectedSpeeds].sort((a, b) => a - b)
  const canStart = sortedSpeeds.length > 0

  const { phase, tier, rep, hovering, hoverProgress, timeLeft, ball, speed, start, handlePointerMove } = useTrackingTest({
    radius: diameter / 2,
    margin,
    speeds: sortedSpeeds.length ? sortedSpeeds : ALL_SPEEDS,
    repeats: REPEATS,
    hoverMs: 1300,
    segmentTrackMs: 4200,
    mode,
    onFinish,
    active: aim.locked,
  })

  const toggleSpeed = (sp) => {
    setSelectedSpeeds((prev) => {
      if (prev.includes(sp)) {
        if (prev.length <= 1) return prev
        return prev.filter((v) => v !== sp)
      }
      return [...prev, sp].sort((a, b) => a - b)
    })
  }

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
              <li>{sortedSpeeds.length} 档 × {REPEATS} 次 × 4 秒，速度 {sortedSpeeds.join(' / ')} px/s 递增</li>
              <li>每球先悬停约 1.3 秒：外圈收缩至与球重合时开始移动，才算跟枪</li>
              <li>按 ESC 可随时解除锁定并暂停 / 退出</li>
            </ul>
            <div className="mode-toggle" role="group" aria-label="跟枪模式">
              <button
                type="button"
                className={`mode-btn ${mode === 'horizontal' ? 'active' : ''}`}
                onClick={() => setMode('horizontal')}
              >
                ↔ 左右跟枪 <span className="badge-rec">推荐</span>
              </button>
              <button type="button" className={`mode-btn ${mode === 'random' ? 'active' : ''}`} onClick={() => setMode('random')}>
                ✦ 随机跟枪
              </button>
            </div>
            <div className="speed-select" role="group" aria-label="选择档位">
              {ALL_SPEEDS.map((sp) => (
                <label key={sp} className={`speed-chip ${selectedSpeeds.includes(sp) ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedSpeeds.includes(sp)}
                    onChange={() => toggleSpeed(sp)}
                  />
                  {sp} px/s
                </label>
              ))}
            </div>
            <p className="hover-hint">档位可多选，默认勾选前三档（150/300/600），至少保留一档 · 悬停外圈缩至红球再跟</p>
            <button className="btn btn-primary" disabled={!canStart} onClick={handleStart}>
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
          <HUD
            left={`第 ${tier + 1}/${sortedSpeeds.length} 档 · 第 ${rep + 1}/${REPEATS} 次`}
            right={`${eDPI} eDPI`}
          >
            {hovering ? '准备…' : `${Math.max(0, timeLeft).toFixed(1)}s · ${Math.round(speed)} px/s`}
          </HUD>
          {aim.locked && <div className="esc-hint">按 ESC 解除鼠标锁定</div>}
          {ball && (
            <TargetBall
              x={ball.x}
              y={ball.y}
              diameter={diameter}
              hovering={hovering}
              hoverProgress={hoverProgress}
            />
          )}
          <Crosshair x={aim.pos.x} y={aim.pos.y} />
        </>
      )}
    </div>
  )
}
