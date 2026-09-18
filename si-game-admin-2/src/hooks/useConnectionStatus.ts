import { useSyncExternalStore } from "react"
import { client, type ConnectionStatus } from "@/client"

const getServerSnapshot = (): ConnectionStatus => 'connecting'

export const useConnectionStatus = (): ConnectionStatus =>
  useSyncExternalStore(client.subscribeStatus, client.getStatus, getServerSnapshot)
