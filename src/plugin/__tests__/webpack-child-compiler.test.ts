import { describe, it, expect } from "vitest"
import { resolve } from "node:path"
import { webpack as TsMock } from "../index"

const FIXTURES_DIR = resolve(__dirname, "../../core/__tests__/fixtures")

function makeTapHook() {
  const listeners: Array<(...args: any[]) => void> = []
  return {
    tap:        (_: string, fn: (...args: any[]) => void) => listeners.push(fn),
    tapAsync:   (_: string, fn: (...args: any[]) => void) => listeners.push(fn),
    tapPromise: (_: string, fn: (...args: any[]) => void) => listeners.push(fn),
    fire:       (...args: any[]) => listeners.forEach(fn => fn(...args)),
  }
}

function makeChildHook() {
  // Also needs tap so unplugin doesn't throw when accessing compilation.hooks.childCompiler
  return makeTapHook()
}

function makeCompiler() {
  return {
    $unpluginContext: {} as Record<string, any>,
    options: { module: { rules: [] as any[] } },
    hooks: {
      thisCompilation: makeTapHook(),
      make:            makeTapHook(),
      emit:            makeTapHook(),
    },
  }
}

function makeCompilation(withChildHook = true) {
  return {
    hooks: {
      childCompiler: withChildHook ? makeChildHook() : undefined,
    },
    fileDependencies:        new Set<string>(),
    compilationDependencies: new Set<string>(),
  }
}

function applyAndFireChild(dir = FIXTURES_DIR) {
  const compiler = makeCompiler()
  const plugin   = TsMock({ dir })
  plugin.apply(compiler as any)

  const compilation  = makeCompilation(true)
  const childCompiler: any = {
    $unpluginContext: undefined,
    options: { module: { rules: [] as any[] } },
  }

  compiler.hooks.thisCompilation.fire(compilation)
  ;(compilation.hooks.childCompiler as ReturnType<typeof makeTapHook>).fire(childCompiler)

  return { compiler, childCompiler }
}

describe("webpack child compiler propagation", () => {
  it("copies loader rules (function use) from parent to child compiler", () => {
    const { compiler, childCompiler } = applyAndFireChild()

    // unplugin adds a rule with `typeof use === "function"` for the transform loader
    const parentLoaderRules = compiler.options.module.rules.filter(
      (r: any) => typeof r.use === "function"
    )
    expect(parentLoaderRules.length).toBeGreaterThan(0)

    const childLoaderRules = childCompiler.options.module.rules.filter(
      (r: any) => typeof r.use === "function"
    )
    expect(childLoaderRules.length).toBe(parentLoaderRules.length)
  })

  it("does not duplicate rules already present in the child compiler", () => {
    const compiler = makeCompiler()
    const plugin   = TsMock({ dir: FIXTURES_DIR })
    plugin.apply(compiler as any)

    const existingRule = compiler.options.module.rules.find(
      (r: any) => typeof r.use === "function"
    )
    expect(existingRule).toBeDefined()

    const childCompiler: any = {
      $unpluginContext: undefined,
      options: { module: { rules: [existingRule] } },
    }

    const compilation = makeCompilation(true)
    compiler.hooks.thisCompilation.fire(compilation)
    ;(compilation.hooks.childCompiler as ReturnType<typeof makeTapHook>).fire(childCompiler)

    const count = childCompiler.options.module.rules.filter(
      (r: any) => r === existingRule
    ).length
    expect(count).toBe(1)
  })

  it("sets $unpluginContext on child compiler", () => {
    const { childCompiler } = applyAndFireChild()
    expect(childCompiler.$unpluginContext).toBeDefined()
    expect(typeof childCompiler.$unpluginContext).toBe("object")
  })

  it("leaves $unpluginContext set by unplugin untouched", () => {
    // unplugin's thisCompilation handler sets $unpluginContext on child compiler first.
    // Our handler runs after and should not overwrite it (if (!childCompiler.$unpluginContext)).
    const { childCompiler } = applyAndFireChild()

    // After the full hook chain, $unpluginContext should be unplugin's injected object
    // (containing our plugin), NOT null or replaced by our fallback.
    expect(childCompiler.$unpluginContext).toBeDefined()
    expect(childCompiler.$unpluginContext["ts-to-mock"]).toBeDefined()
  })
})
