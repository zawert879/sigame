import { useCallback, useEffect, useState } from "react"
import { notifyErrorText } from "@/utils/notify"

type FullscreenState = {
  supported: boolean
  active: boolean
}

const readState = (): FullscreenState => ({
  supported: document.fullscreenEnabled !== false && typeof document.documentElement.requestFullscreen === 'function',
  active: !!document.fullscreenElement || window.matchMedia('(display-mode: fullscreen)').matches,
})

export const useFullscreen = () => {
  const [state, setState] = useState<FullscreenState>({ supported: false, active: false })

  useEffect(() => {
    const update = () => {
      const next = readState()
      setState(prev => (prev.supported === next.supported && prev.active === next.active ? prev : next))
    }
    update()
    document.addEventListener('fullscreenchange', update)
    window.addEventListener('resize', update)
    return () => {
      document.removeEventListener('fullscreenchange', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const enter = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    } catch {
      notifyErrorText('Не удалось перейти в полноэкранный режим')
    }
  }, [])

  return { ...state, enter }
}
