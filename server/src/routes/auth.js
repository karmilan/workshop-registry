import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../db.js'
import { HttpError } from '../lib/errors.js'
import { authenticate, signToken } from '../middleware/auth.js'
import { normalizeEmail } from '../lib/email.js'

const router = Router()

router.post('/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email ?? '')
    const password = req.body?.password
    if (!email || !password) {
      throw new HttpError(400, 'Email and password are required.')
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new HttpError(401, 'Invalid email or password.')
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new HttpError(401, 'Invalid email or password.')
    }

    const token = signToken(user)
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    next(err)
  }
})

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user })
})

export default router
