export const getRouteId = (queryId: string | string[] | undefined, routeName: string): string | undefined => {
  if (typeof queryId === 'string') {
    return queryId
  }

  if (typeof window === 'undefined') {
    return undefined
  }

  const [pathname] = window.location.pathname.split('?')
  const segments = pathname.split('/').filter(Boolean)
  const routeIndex = segments.indexOf(routeName)

  return routeIndex >= 0 ? segments[routeIndex + 1] : undefined
}

export const getGameIdFromPath = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }

  const [pathname] = window.location.pathname.split('?')
  const segments = pathname.split('/').filter(Boolean)
  const routeIndex = segments.findIndex(segment => segment === 'admin' || segment === 'player')

  return routeIndex >= 0 ? segments[routeIndex + 1] : undefined
}