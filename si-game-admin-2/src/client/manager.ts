import { serverUrl } from "@/config"
import { Manager } from "socket.io-client"

export const manager = new Manager(serverUrl || undefined, { autoConnect: typeof window !== 'undefined' })
