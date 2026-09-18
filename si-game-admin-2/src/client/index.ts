import { Socket } from "./Socket"
import { manager } from "./manager"
import { Client } from "./Client"
import { adminToken } from "@/config"

const socket = new Socket(manager.socket("/", { auth: adminToken ? { token: adminToken } : {} }))

export const client = new Client(socket)

export type { ConnectionStatus } from "./Client"
export { ClientErrorCode, RequestError, hasErrorCode, isRequestError } from "./errors"
