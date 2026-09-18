// The server logs expected situations (pack warnings, handled request errors) to the console. The output is
// hidden unless SIGAME_TEST_LOGS=1; the spies stay in place either way, so a test can assert on them.
const isLogShown = Boolean(process.env.SIGAME_TEST_LOGS)

for (const method of ['log', 'info', 'warn', 'error'] as const) {
  const spy = jest.spyOn(console, method)
  if (!isLogShown) {
    spy.mockImplementation(() => undefined)
  }
}
