import { create } from "zustand"
import { apiFetch } from "@/utils/api"

export interface Pack {
  // '' when the server could not read the pack's content.xml (it can still be deleted)
  name: string
  file: string
}

interface PacksState {
  packs: Pack[]

  fetchPacks: () => Promise<void>
  removePack: (file: string) => Promise<void>
}

const usePacksStore = create<PacksState>()((set, get) => ({
  packs: [],
  fetchPacks: async () => {
    const response = await apiFetch('/api/packs')
    const packs: unknown = await response.json()
    set({
      packs: Array.isArray(packs) ? packs : [],
    })
  },
  removePack: async (file) => {
    await apiFetch(`/api/packs?file=${encodeURIComponent(file)}`, { method: 'DELETE' }, { admin: true })
    await get().fetchPacks()
  },
}))

export default usePacksStore
