import React from "react"
import { PlayerScreen } from "@/components/screens/PlayerScreen"
import { useRouteGameId } from "@/utils/route"

const PlayerPage = () => {
  const { gameId, resolved } = useRouteGameId('player')
  return <PlayerScreen gameId={gameId} resolved={resolved} />
}

export default PlayerPage
