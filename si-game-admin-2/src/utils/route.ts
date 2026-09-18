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

export const useRouteGameId = (routeName: RouteName): { gameId: string | undefined, resolved: boolean } => {
  const router = useRouter()
  const queryId = router.query.id
  const asPath = router.asPath
  const [state, setState] = useState<{ gameId: string | undefined, resolved: boolean }>({ gameId: undefined, resolved: false })

  useEffect(() => {
    const gameId = getRouteId(queryId, routeName) || undefined
    setState(prev => (prev.resolved && prev.gameId === gameId ? prev : { gameId, resolved: true }))
  }, [queryId, routeName, asPath])

  return state
}
