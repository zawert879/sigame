import { useEffect, useRef } from "react"
import { isEditableTarget, isNextKey } from "./useKeyPress"

const DIALOG_SELECTOR = '.ant-modal-wrap, [role="dialog"][aria-modal="true"]'

const hasOpenDialog = (): boolean =>
  Array.from(document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR)).some(element => element.getClientRects().length > 0)

export const useNextKey = (enabled: boolean, onNext: () => unknown) => {
  const state = useRef({ enabled, onNext })

  useEffect(() => {
    state.current = { enabled, onNext }
  }, [enabled, onNext])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isNextKey(event.code, event.key) || event.defaultPrevented) {
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return
      }
      if (!state.current.enabled || isEditableTarget(event.target) || hasOpenDialog()) {
        return
      }
      event.preventDefault()
      if (!event.repeat) {
        void state.current.onNext()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])
}
