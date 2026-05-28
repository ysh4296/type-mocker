export enum Role {
  Admin = "ADMIN",
  Member = "MEMBER",
  Guest = "GUEST",
}

export enum Status {
  Active = 0,
  Inactive = 1,
  Banned = 2,
}

export interface Address {
  street: string
  city: string
  country: string
  zipCode?: string
}

export interface User {
  id: string
  name: string
  email: string
  age: number
  role: Role
  status: Status
  address: Address
  tags: string[]
  createdAt: string
  deletedAt?: string
}

export interface Post {
  id: string
  title: string
  body: string
  authorId: string
  published: boolean
  likes: number
  createdAt: string
}

export type PaginatedUsers = {
  items: User[]
  total: number
  page: number
  pageSize: number
}
