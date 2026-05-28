export function createMock<T>(): T {
  throw new Error(
    "[ts-to-mock] createMock() was not replaced by the Vite plugin.\n" +
    "Add the plugin to your vite.config.ts:\n\n" +
    "  import tsMock from 'ts-to-mock/vite'\n" +
    "  export default { plugins: [tsMock()] }"
  )
}

export function createMockList<T>(_count: number): T[] {
  throw new Error(
    "[ts-to-mock] createMockList() was not replaced by the Vite plugin.\n" +
    "Add the plugin to your vite.config.ts:\n\n" +
    "  import tsMock from 'ts-to-mock/vite'\n" +
    "  export default { plugins: [tsMock()] }"
  )
}
