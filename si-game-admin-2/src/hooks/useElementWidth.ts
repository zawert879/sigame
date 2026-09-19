import { RefObject, useEffect, useLayoutEffect, useState } from "react"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

export const useElementWidth = (ref: RefObject<HTMLElement>): number => {
  const [width, setWidth] = useState(0)

  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }
    const update = () => setWidth(Math.round(element.clientWidth))
    update()
    if (typeof ResizeObserver === "undefined") {
      return
    }
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return width
}
