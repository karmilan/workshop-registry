import jwt from 'jsonwebtoken'
import { prisma } from '../db.js'
import { HttpError } from '../lib/errors.js'

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }
  return secret
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    getJwtSecret(),
    { expiresIn: '8h' },
  )
}

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Authentication required.')
    }
    const token = header.slice('Bearer '.length)
    let payload
    try {
      payload = jwt.verify(token, getJwtSecret())
    } catch {
      throw new HttpError(401, 'Invalid or expired token.')
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, createdAt: true },
    })
    if (!user) {
      throw new HttpError(401, 'Invalid or expired token.')
    }
    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

export function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication required.'))
    }
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Insufficient permissions.'))
    }
    next()
  }
}
