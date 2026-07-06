import * as ts from "typescript"

/**
 * Wraps an enum member reference so the serializer emits `Role.Admin`
 * instead of the string `"ADMIN"`.
 */
export class EnumRef {
  constructor(readonly ref: string) {}
}

/** Describes a single exported TypeScript type entry in the type registry. */
export type TypeEntry =
  | { kind: "type";      node: ts.TypeNode }
  | { kind: "interface"; node: ts.InterfaceDeclaration }
  | { kind: "enum";      node: ts.EnumDeclaration }

/** Registry mapping type names to their AST entries. */
export type TypeMap = Map<string, TypeEntry>

/**
 * Runtime context threaded through recursive mock generation.
 * Carries the TypeChecker for cross-file resolution and a resolving set
 * to prevent infinite recursion on self-referential types.
 */
export type Ctx = {
  checker?:  ts.TypeChecker
  resolving: Set<ts.Node>
}
