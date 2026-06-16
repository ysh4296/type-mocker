import type { Product } from "../types"

const isMock = process.env.MOCK === "true"

export async function fetchProducts(): Promise<Product[]> {
  if (isMock) {
    const { mockProducts } = await import("../mocks")
    return mockProducts
  }
  // 실제 API 없음 — npm run dev:mock 으로 실행하세요
  return []
}
