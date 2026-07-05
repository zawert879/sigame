import { create } from "zustand"
import { devtools } from "zustand/middleware"
interface Pack {
  name: string
  file: string
}

interface RewardState {
  packs: Pack[]

  fetchPacks: () => Promise<void>
  removePacks: (path: string) => Promise<void>
}

const usePacksStore = create<RewardState>()(
  devtools((set,get) => ({
    packs: [],
    fetchPacks: async () => {
      const response = await fetch('/api/packs')
      set({
        packs: await response.json()
      })
    },
    removePacks: async (path) => {
      await fetch((`/api/packs/?file=${path}`),{
        method: 'DELETE',
      })
      get().fetchPacks()
    }
  }))
)

export default usePacksStore
