import { createMock, createMockList } from "ts-to-mock"
import type { User, Post, Product, Order, Comment } from "../types"
import * as mocks from "../../__mocks__"

export const mockUser     = createMock<User>(mocks.UserMock)
export const mockUsers    = createMockList<User>(1, mocks.UserMockList)

export const mockPost     = createMock<Post>(mocks.PostMock)
export const mockPosts    = createMockList<Post>(5, mocks.PostMockList)

export const mockProduct  = createMock<Product>(mocks.ProductMock)
export const mockProducts = createMockList<Product>(5, mocks.ProductMockList)

export const mockOrder    = createMock<Order>(mocks.OrderMock)
export const mockOrders   = createMockList<Order>(5, mocks.OrderMockList)

export const mockComment  = createMock<Comment>(mocks.CommentMock)
export const mockComments = createMockList<Comment>(5, mocks.CommentMockList)
