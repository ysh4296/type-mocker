import type { Post } from "../types"

const BASE   = "https://jsonplaceholder.typicode.com"
const isMock = process.env.MOCK === "true"

export async function fetchPosts(): Promise<Post[]> {
  if (isMock) {
    const { mockPosts } = await import("../mocks")
    return mockPosts
  }
  const res = await fetch(`${BASE}/posts?_limit=5`)
  return res.json()
}
