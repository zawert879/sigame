const isLogShown = Boolean(process.env.SIGAME_TEST_LOGS)

for (const method of ['log', 'info', 'warn', 'error'] as const) {
  const spy = jest.spyOn(console, method)
  if (!isLogShown) {
    spy.mockImplementation(() => undefined)
  }
}
