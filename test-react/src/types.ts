export type User = {
  id: number
  name: string
  email: string
  phone: string
  company: string
}

export type Post = {
  id: number
  userId: number
  title: string
  body: string
}

export type Product = {
  id: number
  name: string
  price: number
  description: string
  category: string
}

export type Order = {
  id: number
  userId: number
  productId: number
  quantity: number
  status: string
  createdAt: string
}

export type Comment = {
  id: number
  postId: number
  name: string
  email: string
  body: string
}
