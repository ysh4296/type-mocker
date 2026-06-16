import type { Order } from "../types"

const isMock = process.env.MOCK === "true"

export async function fetchOrders(): Promise<Order[]> {
  if (isMock) {
    const { mockOrders } = await import("../mocks")
    return mockOrders
  }
  // 실제 API 없음 — npm run dev:mock 으로 실행하세요
  return []
}
