import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../db.js'
import { assert } from '../lib/errors.js'
import { authenticate, requireRoles } from '../middleware/auth.js'
import { normalizeEmail, validateEmail } from '../lib/email.js'

const router = Router()
const ROLES = new Set(['ADMIN', 'MANAGER', 'STAFF'])

router.use(authenticate, requireRoles('ADMIN'))

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  }
}

router.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, role: true, createdAt: true },
    })
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const email = validateEmail(req.body?.email)
    const password = req.body?.password
    const role = req.body?.role

    assert(email, 400, 'A valid email is required.')
    assert(password && String(password).length >= 8, 400, 'Password must be at least 8 characters.')
    assert(ROLES.has(role), 400, 'Role must be ADMIN, MANAGER, or STAFF.')

    const passwordHash = await bcrypt.hash(String(password), 12)
    const user = await prisma.user.create({
      data: { email, passwordHash, role },
      select: { id: true, email: true, role: true, createdAt: true },
    })
    res.status(201).json({ user })
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const { role, password } = req.body ?? {}
    const data = {}

    if (role !== undefined) {
      assert(ROLES.has(role), 400, 'Role must be ADMIN, MANAGER, or STAFF.')
      data.role = role
    }
    if (password !== undefined) {
      assert(String(password).length >= 8, 400, 'Password must be at least 8 characters.')
      data.passwordHash = await bcrypt.hash(String(password), 12)
    }
    assert(Object.keys(data).length > 0, 400, 'No valid fields to update.')

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, role: true, createdAt: true },
    })
    res.json({ user })
  } catch (err) {
    next(err)
  }
})

export default router
