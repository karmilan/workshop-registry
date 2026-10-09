import { HttpError } from '../lib/errors.js'
import { Prisma } from '@prisma/client'

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message })
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = err.meta?.target
      const fields = Array.isArray(target) ? target.join(', ') : 'field'
      return res.status(409).json({
        message: `A record with this ${fields} already exists.`,
      })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Resource not found.' })
    }
  }

  console.error(err)
  return res.status(500).json({ message: 'Internal server error.' })
}
