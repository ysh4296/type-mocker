function buildError(fn: string): Error {
  const isServer = typeof window === "undefined"
  const env      = isServer ? "server (SSR)" : "browser"

  let msg = `[unplugin-ts-mock] ${fn} was not replaced at build time.\n`
  msg    += `  Runtime env : ${env}\n`

  if (isServer) {
    msg += `  Likely cause: the plugin's webpack loader did not run on this file\n`
    msg += `                during the SSR compilation (Next.js child compiler issue).\n`
    msg += `  Fix options :\n`
    msg += `    1. Use dynamic import so the file is excluded from SSR:\n`
    msg += `       if (isMock) { const m = await import('./mockData'); ... }\n`
    msg += `    2. Guard with typeof window !== 'undefined' before using mock values.\n`
  } else {
    msg += `  Likely cause: the plugin is not registered in your bundler config,\n`
    msg += `                or the TypeScript type could not be resolved.\n`
    msg += `  Check the build output for [unplugin-ts-mock] warnings.\n`
  }

  return new Error(msg)
}

export function createMock<T>(): T {
  throw buildError("createMock()")
}

export function createMockList<T>(_count: number): T[] {
  throw buildError("createMockList()")
}
