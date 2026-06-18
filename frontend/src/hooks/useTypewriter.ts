import { useEffect, useState } from 'react'

/**
 * 打字机效果 Hook
 * @param text 完整文本
 * @param speed 速度（ms/字符）
 * @param enabled 是否启用
 */
export function useTypewriter(text: string, speed = 30, enabled = true) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text)
      return
    }
    setDisplayed('')
    if (!text) return
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(timer)
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed, enabled])

  return displayed
}
