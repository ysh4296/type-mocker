/**
 * Public re-export barrel for the core mock-generation library.
 *
 * External consumers (plugin, CLI, tests) import from this single entry point
 * so internal module layout can change without breaking callers.
 */

export { EnumRef }             from "./types"
export type { TypeMap, TypeEntry, Ctx } from "./types"

export { getStringHint }       from "./faker-hints"
export { expandCheckerType }   from "./type-checker"
export {
  resolveSymbolToMock,
  interfaceToMock,
  typeElementsToMock,
  typeNodeToMock,
  extractLiteralKeys,
}                              from "./ast-resolver"
export { toMock, toMockList } from "./mock-generator"
export { parseTypes, parseTypesFromProject, scanProjectFiles, buildCompilerOptions } from "./project-scanner"
