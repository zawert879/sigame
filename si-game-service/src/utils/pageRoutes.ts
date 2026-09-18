export const isPageRequest = (requestPath: string): boolean => {
  if (requestPath.startsWith('/api') || requestPath.startsWith('/socket.io') || requestPath.startsWith('/_next/')) {
    return false
  }

  const lastSegment = requestPath.split('/').filter(Boolean).pop() ?? ''
  return !/\.[\da-z]+$/i.test(lastSegment)
}
