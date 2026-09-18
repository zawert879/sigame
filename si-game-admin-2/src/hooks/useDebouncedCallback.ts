import { useEffect, useMemo, useRef } from "react"
import debounce from "lodash/debounce"

// A debounced callback created once per component instance. It always calls the latest `callback`;
// a pending call is flushed on unmount so that the user's last edit is not lost.
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
