import type { Comment } from "../types"

const BASE   = "https://jsonplaceholder.typicode.com"
const isMock = process.env.MOCK === "true"

export async function fetchComments(): Promise<Comment[]> {
  if (isMock) {
    const { mockComments } = await import("../mocks")
    return mockComments
  }
  const res = await fetch(`${BASE}/comments?_limit=5`)
  return res.json()
}
