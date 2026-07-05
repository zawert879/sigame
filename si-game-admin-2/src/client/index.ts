import { Socket } from "./Socket"
import { manager } from "./manager"
import { Client } from "./Client"

const socket = new Socket(manager.socket("/"))

export const client = new Client(socket)
