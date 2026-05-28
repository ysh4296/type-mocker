/** Fixture types used exclusively by unit tests. */

export enum Role {
  Admin  = "ADMIN",
  Member = "MEMBER",
  Guest  = "GUEST",
}

export enum Priority {
  Low    = 0,
  Medium = 1,
  High   = 2,
}

export interface Address {
  street:   string
  city:     string
  country:  string
  zipCode?: string
}

export interface User {
  id:        string
  name:      string
  email:     string
  age:       number
  role:      Role
  active:    boolean
  address:   Address
  tags:      string[]
  createdAt: string
  deletedAt?: string
}

export interface Post {
  id:        string
  title:     string
  body:      string
  published: boolean
  likes:     number
  authorId:  string
  createdAt: string
}

export type Tags = string[]

export type StringOrNumber = string | number

export type PaginatedUsers = {
  items:    User[]
  total:    number
  page:     number
  pageSize: number
}

export type PickedUser = Pick<User, "id" | "name" | "email">

export type OmitUser = Omit<User, "deletedAt">
