import { FC, useEffect } from "react"
import { SoundOutlined } from "@ant-design/icons"
import { eventEmitter } from "@/eventEmitter"
import { useAudioStore } from "@/store/audio"
import { canAutoplaySound } from "@/utils/autoplay"

export const UNLOCK_SOUND_EVENT = "unlockSound"

const UNLOCK_EVENTS = ["pointerup", "keydown"] as const

const isMediaControl = (target: EventTarget | null): boolean =>
  target instanceof Element && !!target.closest("media-controller")

export const SoundUnlock: FC<{ hint?: boolean }> = ({ hint }) => {
  const locked = useAudioStore(state => state.soundLocked)

  useEffect(() => {
    if (!hint) {
      return
    }
    let active = true
    void canAutoplaySound().then(allowed => {
      if (active && !allowed && !navigator.userActivation?.hasBeenActive) {
        useAudioStore.getState().setSoundLocked(true)
      }
    })
    return () => {
      active = false
    }
  }, [hint])

  useEffect(() => {
    if (!locked) {
      return
    }
    const unlock = (event: Event) => {
      if (isMediaControl(event.target)) {
        return
      }
      useAudioStore.getState().setSoundLocked(false)
      eventEmitter.emit(UNLOCK_SOUND_EVENT)
    }
    for (const type of UNLOCK_EVENTS) {
      window.addEventListener(type, unlock, { capture: true })
    }
    return () => {
      for (const type of UNLOCK_EVENTS) {
        window.removeEventListener(type, unlock, { capture: true })
      }
    }
  }, [locked])

  if (!hint || !locked) {
    return null
  }

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[3vh] z-[1400] flex justify-center px-4"
    >
      <div className="flex max-w-full items-center gap-[0.6em] rounded-full bg-black/75 px-[1.2em] py-[0.5em] text-[length:clamp(1rem,3vh,2.5rem)] font-semibold text-yellow-100 shadow-2xl ring-2 ring-yellow-300/70 animate-pulse">
        <SoundOutlined className="shrink-0" />
        <span>Браузер выключил звук — нажмите на экран или любую клавишу</span>
      </div>
    </div>
  )
}
