import { useCallback, useEffect, useRef, useState } from "react"

export const useCooldown = (ms: number) => {
  const until = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [cooling, setCooling] = useState(false)

  const start = useCallback(() => {
    until.current = Date.now() + ms
    setCooling(true)
    if (timer.current) {
      clearTimeout(timer.current)
    }
    timer.current = setTimeout(() => {
      timer.current = null
      setCooling(false)
    }, ms)
  }, [ms])

  const isCooling = useCallback(() => Date.now() < until.current, [])

  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current)
    }
  }, [])

  return { cooling, start, isCooling }
}
