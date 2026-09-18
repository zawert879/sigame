import { create } from "zustand"
import { apiFetch } from "@/utils/api"
import type { PackInfo } from "@/types"

const parsePack = (value: unknown): PackInfo | null => {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const { name, file, isBroken } = value as Record<string, unknown>
  if (typeof file !== 'string' || typeof name !== 'string') {
    return null
  }
  return { name, file, isBroken: isBroken === true }
}

interface PacksState {
  packs: PackInfo[]

  fetchPacks: () => Promise<void>
  removePack: (file: string) => Promise<void>
}

const usePacksStore = create<PacksState>()((set, get) => ({
  packs: [],
  fetchPacks: async () => {
    const response = await apiFetch('/api/packs')
    const packs: unknown = await response.json()
    set({
      packs: Array.isArray(packs) ? packs.map(parsePack).filter((pack): pack is PackInfo => pack !== null) : [],
    })
  },
  removePack: async (file) => {
    await apiFetch(`/api/packs?file=${encodeURIComponent(file)}`, { method: 'DELETE' }, { admin: true })
    await get().fetchPacks()
  },
}))

export default usePacksStore
