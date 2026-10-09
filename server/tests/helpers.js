import 'dotenv/config'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'

export const app = createApp()

export async function resetDatabase() {
  await prisma.registration.deleteMany()
  await prisma.workshop.deleteMany()
  await prisma.user.deleteMany()
}

export async function createUser({ email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 12)
  return prisma.user.create({
    data: { email, passwordHash, role },
  })
}

export async function login(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password })
  return res
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` }
}
