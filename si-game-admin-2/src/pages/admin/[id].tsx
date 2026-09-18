import React from "react"
import { AdminScreen } from "@/components/screens/AdminScreen"
import { useRouteGameId } from "@/utils/route"

const AdminByIdPage = () => {
  const { gameId, resolved } = useRouteGameId('admin')
  return <AdminScreen gameId={gameId} resolved={resolved} />
}

export default AdminByIdPage

export const getStaticPaths = async () => ({ paths: [], fallback: false })
export const getStaticProps = async () => ({ props: {} })
