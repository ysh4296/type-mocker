import { resolve } from "node:path"
import { parseTypesFromProject } from "../core/ast-to-mock"
import { toMock } from "../core/mock-generator"
import { serialize } from "../core/serialize"

interface Options {
  dir?: string
  exclude?: string[]
}

type ProjectState = ReturnType<typeof parseTypesFromProject>

let cachedState: ProjectState | null = null
let cachedDir:   string | null = null

function getState(opts: Options, cwd: string): ProjectState {
  // Babel passes cwd (project root) via pass.cwd — use that as the default
  const dir = resolve(opts.dir ? resolve(cwd, opts.dir) : cwd)
  if (!cachedState || cachedDir !== dir) {
    cachedDir   = dir
    cachedState = parseTypesFromProject(dir, { excludeDirs: opts.exclude })
  }
  return cachedState
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function tsMockBabelPlugin(babel: any) {
  const { types: t } = babel

  return {
    name: "unplugin-ts-mock",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visitor: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      CallExpression(path: any, pass: any) {
        const opts: Options = pass.opts ?? {}
        const callee = path.node.callee

        const isMock     = t.isIdentifier(callee, { name: "createMock" })
        const isMockList = t.isIdentifier(callee, { name: "createMockList" })
        if (!isMock && !isMockList) return

        // TypeScript generics live in typeParameters before @babel/preset-typescript strips them
        const typeParams = path.node.typeParameters
        if (!typeParams?.params?.length) return

        const typeRef = typeParams.params[0]
        if (!t.isTSTypeReference(typeRef)) return

        const typeName = t.isIdentifier(typeRef.typeName) ? typeRef.typeName.name : null
        if (!typeName) return

        try {
          const { typeMap, checker } = getState(opts, pass.cwd ?? process.cwd())

          let serialized: string
          if (isMock) {
            const mock = toMock(typeName, typeMap, checker)
            serialized = serialize(mock, 0)
          } else {
            const countArg = path.node.arguments[0]
            const count    = t.isNumericLiteral(countArg) ? countArg.value : 3
            const mocks    = Array.from({ length: count }, () => toMock(typeName, typeMap, checker))
            serialized     = serialize(mocks, 0)
          }

          // Parse serialized expression back to Babel AST
          const file = babel.parse(`(${serialized})`, {
            plugins:    ["typescript"],
            sourceType: "module",
          })
          const expr = file.program.body[0].expression
          path.replaceWith(expr)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.warn(`[unplugin-ts-mock] createMock<${typeName}>() — ${msg}`)
        }
      },
    },
  }
}
