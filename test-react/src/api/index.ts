import type { User, Post, Product, Order, Comment } from "../types"

const isMock = import.meta.env.VITE_MOCK === "true"
const BASE    = "https://jsonplaceholder.typicode.com"

export async function fetchUsers(): Promise<User[]> {
  if (isMock) {
    const { mockUsers } = await import("../mocks")
    return mockUsers
  }
  const res = await fetch(`${BASE}/users`)
  const data = await res.json()
  return data.map((u: any) => ({
    id:      u.id,
    name:    u.name,
    email:   u.email,
    phone:   u.phone,
    company: u.company.name,
  }))
}

export async function fetchPosts(): Promise<Post[]> {
  if (isMock) {
    const { mockPosts } = await import("../mocks")
    return mockPosts
  }
  const res = await fetch(`${BASE}/posts?_limit=5`)
  return res.json()
}

export async function fetchProducts(): Promise<Product[]> {
  if (isMock) {
    const { mockProducts } = await import("../mocks")
    return mockProducts
  }
  // 실제 API 없음 — mock 모드로 실행하세요
  return []
}

export async function fetchOrders(): Promise<Order[]> {
  if (isMock) {
    const { mockOrders } = await import("../mocks")
    return mockOrders
  }
  // 실제 API 없음 — mock 모드로 실행하세요
  return []
}

export async function fetchComments(): Promise<Comment[]> {
  if (isMock) {
    const { mockComments } = await import("../mocks")
    return mockComments
  }
  const res = await fetch(`${BASE}/comments?_limit=5`)
  return res.json()
}
