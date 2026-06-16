import type { User } from "../types"

const BASE    = "https://jsonplaceholder.typicode.com"
const isMock  = process.env.MOCK === "true"

export async function fetchUsers(): Promise<User[]> {
  if (isMock) {
    const { mockUsers } = await import("../mocks")
    return mockUsers
  }
  const res  = await fetch(`${BASE}/users`)
  const data = await res.json()
  return data.map((u: any) => ({
    id:      u.id,
    name:    u.name,
    email:   u.email,
    phone:   u.phone,
    company: u.company.name,
  }))
}
