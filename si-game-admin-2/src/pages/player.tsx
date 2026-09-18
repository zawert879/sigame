import React from "react"
import { PlayerScreen } from "@/components/screens/PlayerScreen"
import { useRouteGameId } from "@/utils/route"

// Production route: /player/<id> is served as player.html by the service's SPA fallback.
const PlayerPage = () => {
  const { gameId, resolved } = useRouteGameId('player')
  return <PlayerScreen gameId={gameId} resolved={resolved} />
}

export default PlayerPage
