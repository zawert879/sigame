import { FC } from "react"
import { useConnectionStatus } from "@/hooks/useConnectionStatus"

// Small unobtrusive notice shown while the socket is disconnected; socket.io reconnects by itself.
export const ConnectionBanner: FC = () => {
  const status = useConnectionStatus()
  if (status !== 'disconnected') {
    return null
  }
  return (
    <div className="fixed top-0 inset-x-0 z-[2000] flex justify-center pointer-events-none" role="status" aria-live="polite">
      <div className="bg-red-600/90 text-white text-sm px-3 py-1 rounded-b shadow">
        Нет соединения с сервером… переподключаемся
      </div>
    </div>
  )
}
