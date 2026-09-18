import { serverUrl } from "@/config"
import { Manager } from "socket.io-client"

// No connection attempts while the static export is prerendered.
export const manager = new Manager(serverUrl || undefined, { autoConnect: typeof window !== 'undefined' })
