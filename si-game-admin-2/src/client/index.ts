import { Socket } from "./Socket"
import { manager } from "./manager"
import { Client } from "./Client"
import { adminToken } from "@/config"

type SocketRole = 'player' | 'admin'

const socketRole = (): SocketRole =>
  typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') ? 'admin' : 'player'

const socket = new Socket(manager.socket("/", {
  auth: callback => {
    const role = socketRole()
    callback(adminToken ? { token: adminToken, role } : { role })
  },
}))

export const client = new Client(socket)

export type { ConnectionStatus } from "./Client"
export { ClientErrorCode, RequestError, hasErrorCode, isRequestError } from "./errors"
