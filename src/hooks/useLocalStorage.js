import { useEffect, useState } from 'react'

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw != null) return JSON.parse(raw)
    } catch {
      /* ignore */
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      // 配额超限时尝试驱逐旧记录（仅对 records 生效）
      if (e && e.name === 'QuotaExceededError' && key === 'aimsense.records' && Array.isArray(value) && value.length > 20) {
        try {
          const trimmed = value.slice(Math.floor(value.length / 2))
          localStorage.setItem(key, JSON.stringify(trimmed))
        } catch {
          /* ignore */
        }
      }
    }
  }, [key, value])

  return [value, setValue]
}
