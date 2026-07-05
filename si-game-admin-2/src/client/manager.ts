import { serverUrl } from "@/config"
import { Manager } from "socket.io-client"

export const manager = serverUrl ? new Manager(serverUrl) : new Manager()