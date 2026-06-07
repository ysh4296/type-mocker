function buildError(fn: string): Error {
  let msg = `[ts-to-mock] ${fn} was not replaced.\n`
  msg    += `  Run: npx ts-mock generate\n`
  msg    += `  Or:  add ts-to-mock plugin to your bundler config.\n`
  return new Error(msg)
}

export function createMock<T>(mock?: T): T {
  if (mock !== undefined) return mock
  throw buildError("createMock()")
}

export function createMockList<T>(count: number, list?: T[]): T[] {
  if (list !== undefined) return list.slice(0, count)
  throw buildError("createMockList()")
}
