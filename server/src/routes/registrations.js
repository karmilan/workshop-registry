import { Router } from 'express'
import { prisma } from '../db.js'
import { HttpError } from '../lib/errors.js'
import { authenticate, requireRoles } from '../middleware/auth.js'
import {
  cancelRegistration,
  serializeRegistration,
} from '../services/registrationService.js'

const router = Router()

router.use(authenticate, requireRoles('ADMIN', 'MANAGER', 'STAFF'))

router.get('/:id', async (req, res, next) => {
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, email: true, role: true } },
        cancelledBy: { select: { id: true, email: true, role: true } },
        workshop: true,
      },
    })
    if (!registration) {
      throw new HttpError(404, 'Registration not found.')
    }
    res.json({ registration: serializeRegistration(registration) })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/cancel', requireRoles('MANAGER', 'STAFF'), async (req, res, next) => {
  try {
    const registration = await cancelRegistration(
      prisma,
      req.params.id,
      req.user.id,
    )
    res.json({ registration: serializeRegistration(registration) })
  } catch (err) {
    next(err)
  }
})

export default router
