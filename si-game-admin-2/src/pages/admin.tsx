import React from "react"
import { AdminScreen } from "@/components/screens/AdminScreen"
import { useRouteGameId } from "@/utils/route"

const AdminPage = () => {
  const { gameId, resolved } = useRouteGameId('admin')
  return <AdminScreen gameId={gameId} resolved={resolved} />
}

export default AdminPage
