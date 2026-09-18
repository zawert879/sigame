import { useEffect, useMemo, useRef } from "react"
import debounce from "lodash/debounce"

export const useDebouncedCallback = <Args extends unknown[]>(callback: (...args: Args) => unknown, wait: number) => {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const debounced = useMemo(
    () => debounce((...args: Args) => {
      void callbackRef.current(...args)
    }, wait),
    [wait],
  )

  useEffect(() => () => {
    debounced.flush()
  }, [debounced])

  return debounced
}
