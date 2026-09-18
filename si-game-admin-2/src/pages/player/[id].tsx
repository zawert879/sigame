import React from "react"
import { PlayerScreen } from "@/components/screens/PlayerScreen"
import { useRouteGameId } from "@/utils/route"

// /player/<id> in `next dev` (the static export serves player.html instead).
const PlayerByIdPage = () => {
  const { gameId, resolved } = useRouteGameId('player')
  return <PlayerScreen gameId={gameId} resolved={resolved} />
}

export default PlayerByIdPage

export const getStaticPaths = async () => ({ paths: [], fallback: false })
export const getStaticProps = async () => ({ props: {} })
