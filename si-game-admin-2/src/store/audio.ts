import { create } from "zustand"

const ADMIN_MUTED_KEY = "sigame.adminMediaMuted"

const readAdminMuted = (): boolean => {
  try {
    return window.localStorage.getItem(ADMIN_MUTED_KEY) !== "0"
  } catch {
    return true
  }
}

const saveAdminMuted = (muted: boolean) => {
  try {
    window.localStorage.setItem(ADMIN_MUTED_KEY, muted ? "1" : "0")
  } catch {
  }
}

type AudioState = {
  adminMuted: boolean
  soundLocked: boolean
  setAdminMuted: (muted: boolean) => void
  setSoundLocked: (locked: boolean) => void
}

export const useAudioStore = create<AudioState>()((set) => ({
  adminMuted: typeof window === "undefined" ? true : readAdminMuted(),
  soundLocked: false,
  setAdminMuted: (adminMuted) => {
    saveAdminMuted(adminMuted)
    set({ adminMuted })
  },
  setSoundLocked: (soundLocked) => set({ soundLocked }),
}))
