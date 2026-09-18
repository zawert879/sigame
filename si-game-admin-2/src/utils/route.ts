import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export type RouteName = 'admin' | 'player'

export const getRouteId = (queryId: string | string[] | undefined, routeName: string): string | undefined => {
  if (typeof queryId === 'string') {
    return queryId
  }

  if (typeof window === 'undefined') {
    return undefined
  }

  const segments = window.location.pathname.split('/').filter(Boolean)
  const routeIndex = segments.indexOf(routeName)

  return routeIndex >= 0 ? segments[routeIndex + 1] : undefined
}

// Game id of /admin/<id> and /player/<id>. In production both are served by the SPA fallback as admin.html /
// player.html, so the id comes from window.location; in `next dev` the [id] pages get it from the query.
// `resolved` turns true after mount, so the prerendered markup never depends on the id.
export const useRouteGameId = (routeName: RouteName): { gameId: string | undefined, resolved: boolean } => {
  const router = useRouter()
  const queryId = router.query.id
  const [state, setState] = useState<{ gameId: string | undefined, resolved: boolean }>({ gameId: undefined, resolved: false })

  useEffect(() => {
    const gameId = getRouteId(queryId, routeName) || undefined
    setState(prev => (prev.resolved && prev.gameId === gameId ? prev : { gameId, resolved: true }))
  }, [queryId, routeName])

  return state
}
