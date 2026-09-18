import { message } from "antd"
import { useEffect } from "react"
import { HttpError } from "./api"
import { isRequestError } from "@/client/errors"

type MessageApi = ReturnType<typeof message.useMessage>[0]

let messageApi: MessageApi | null = null

export const MessageHolder = () => {
  const [api, contextHolder] = message.useMessage()
  useEffect(() => {
    messageApi = api
    return () => {
      if (messageApi === api) {
        messageApi = null
      }
    }
  }, [api])
  return contextHolder
}

const getApi = () => messageApi ?? message

export const errorText = (error: unknown, fallback = 'Что-то пошло не так'): string => {
  if (isRequestError(error) || error instanceof HttpError) {
    return error.message
  }
  return fallback
}

export const notifyError = (error: unknown, action?: string) => {
  const reason = errorText(error)
  getApi().error(action ? `${action}: ${reason}` : reason)
}

export const notifyErrorText = (text: string) => {
  getApi().error(text)
}

export const notifySuccess = (text: string) => {
  getApi().success(text)
}
