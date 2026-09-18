import { FC, useCallback, useEffect, useRef, useState } from "react"
import { Button } from "antd"
import { FullscreenOutlined } from "@ant-design/icons"
import { useFullscreen } from "@/hooks/useFullscreen"
import { NO_BUZZER_ATTRIBUTE } from "@/hooks/useKeyPress"

const LABEL = "На весь экран"
const HIDE_DELAY_MS = 3000
const noBuzzer = { [NO_BUZZER_ATTRIBUTE]: "" }

export const FullscreenButton: FC = () => {
  const { supported, active, enter } = useFullscreen()

  if (!supported || active) {
    return null
  }

  return (
    <Button
      {...noBuzzer}
      size="large"
      icon={<FullscreenOutlined />}
      onClick={() => { void enter() }}
    >
      {LABEL}
    </Button>
  )
}

export const FullscreenCornerButton: FC = () => {
  const { supported, active, enter } = useFullscreen()
  const [visible, setVisible] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const hideTimerRef = useRef<number | null>(null)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const show = useCallback(() => {
    setVisible(true)
    clearHideTimer()
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null
      setVisible(false)
      if (buttonRef.current && document.activeElement === buttonRef.current) {
        buttonRef.current.blur()
      }
    }, HIDE_DELAY_MS)
  }, [clearHideTimer])

  useEffect(() => {
    if (!supported || active) {
      return
    }
    window.addEventListener("pointermove", show)
    window.addEventListener("pointerdown", show)
    return () => {
      window.removeEventListener("pointermove", show)
      window.removeEventListener("pointerdown", show)
      clearHideTimer()
      setVisible(false)
    }
  }, [supported, active, show, clearHideTimer])

  if (!supported || active) {
    return null
  }

  return (
    <button
      {...noBuzzer}
      ref={buttonRef}
      type="button"
      aria-label={LABEL}
      title={LABEL}
      onFocus={show}
      onClick={() => { void enter() }}
      className={`fixed bottom-4 right-4 z-[1500] flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-3xl text-white shadow-lg transition-opacity duration-300 hover:bg-black/70 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <FullscreenOutlined />
    </button>
  )
}
