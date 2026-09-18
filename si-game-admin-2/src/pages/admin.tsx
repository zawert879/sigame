import React from "react"
import { AdminScreen } from "@/components/screens/AdminScreen"
import { useRouteGameId } from "@/utils/route"

// Production route: /admin/<id> is served as admin.html by the service's SPA fallback.
const AdminPage = () => {
  const { gameId, resolved } = useRouteGameId('admin')
  return <AdminScreen gameId={gameId} resolved={resolved} />
}

export default AdminPage
