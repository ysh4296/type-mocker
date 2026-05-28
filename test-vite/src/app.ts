import { createMock, createMockList } from 'ts-to-mock'
import type { User, Post, PaginatedUsers } from './types'

const user = createMock<User>()
const post = createMock<Post>()
const page = createMock<PaginatedUsers>()
const users = createMockList<User>(3)

console.log({ user, post, page, users })
