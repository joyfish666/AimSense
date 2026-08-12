import { useCallback, useEffect, useRef, useState } from 'react'

export function usePointerAim({ sensMultiplier }) {
  const [locked, setLocked] = useState(false)
  const [lockHint, setLockHint] = useState('')
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const posRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const sensRef = useRef(sensMultiplier)
  sensRef.current = sensMultiplier
  const screenRef = useRef(null)

  const lock = useCallback(() => {
    const el = screenRef.current
    if (!el || document.pointerLockElement === el) return
    try {
      const p = el.requestPointerLock()
      if (p && typeof p.catch === 'function') {
        p.catch(() => setLockHint('锁定失败，请稍等片刻再点击重试'))
      }
    } catch {
      setLockHint('锁定失败，请点击重试')
    }
  }, [])

  const unlock = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock()
  }, [])

  const reset = useCallback(() => {
    posRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    setPos(posRef.current)
  }, [])

  useEffect(() => {
    const el = screenRef.current
    const onChange = () => {
      const isLocked = document.pointerLockElement === el
      setLocked(isLocked)
      setLockHint(isLocked ? '' : '鼠标已解锁（可能按了 ESC）')
    }
    const onError = () => setLockHint('锁定失败，请点击重试')
    document.addEventListener('pointerlockchange', onChange)
    document.addEventListener('pointerlockerror', onError)
    return () => {
      document.removeEventListener('pointerlockchange', onChange)
      document.removeEventListener('pointerlockerror', onError)
      if (document.pointerLockElement) document.exitPointerLock()
    }
  }, [])

  const handleMove = useCallback((e) => {
    const sens = sensRef.current
    const p = posRef.current
    const nx = Math.max(0, Math.min(window.innerWidth, p.x + e.movementX * sens))
    const ny = Math.max(0, Math.min(window.innerHeight, p.y + e.movementY * sens))
    posRef.current = { x: nx, y: ny }
    setPos(posRef.current)
    return posRef.current
  }, [])

  return { locked, lockHint, pos, posRef, screenRef, lock, unlock, reset, handleMove }
}
