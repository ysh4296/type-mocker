export function createMock<T>(): T {
  throw new Error(
    "[unplugin-ts-mock] createMock() was not replaced at build time.\n" +
    "Check the build output for [unplugin-ts-mock] warnings to see which type failed."
  )
}

export function createMockList<T>(_count: number): T[] {
  throw new Error(
    "[unplugin-ts-mock] createMockList() was not replaced at build time.\n" +
    "Check the build output for [unplugin-ts-mock] warnings to see which type failed."
  )
}
