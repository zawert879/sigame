import { useSyncExternalStore } from "react"
import { client, type ConnectionStatus } from "@/client"

const getServerSnapshot = (): ConnectionStatus => 'connecting'

// Socket connection state: 'connecting' until the first connect, then 'connected' / 'disconnected'.
export const useConnectionStatus = (): ConnectionStatus =>
  useSyncExternalStore(client.subscribeStatus, client.getStatus, getServerSnapshot)
