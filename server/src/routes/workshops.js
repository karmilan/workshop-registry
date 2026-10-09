import { Router } from 'express'
import { prisma } from '../db.js'
import { HttpError, assert } from '../lib/errors.js'
import { authenticate, requireRoles } from '../middleware/auth.js'
import {
  countActiveRegistrations,
  withWorkshopAvailability,
  workshopAvailability,
} from '../services/workshopStats.js'
import {
  registerAttendee,
  serializeRegistration,
} from '../services/registrationService.js'

const router = Router()
const WORKSHOP_STATUSES = new Set(['SCHEDULED', 'COMPLETED', 'CANCELLED'])

router.use(authenticate)

function parseDate(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `Invalid ${fieldName} date.`)
  }
  return date
}

function parsePositiveInt(value, fieldName) {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive integer.`)
  }
  return n
}

function parseWorkshopStatus(value) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const status = String(value).toUpperCase()
  if (!WORKSHOP_STATUSES.has(status)) {
    throw new HttpError(400, 'Invalid workshop status.')
  }
  return status
}

function parseBooleanQuery(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return false
  }
  const normalized = String(value).toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  throw new HttpError(400, `Invalid ${fieldName} value.`)
}

function serializeWorkshop(workshop, activeCount) {
  const availability = workshopAvailability(workshop, activeCount)
  return {
    id: workshop.id,
    code: workshop.code,
    title: workshop.title,
    instructor: workshop.instructor,
    scheduledAt: workshop.scheduledAt,
    status: workshop.status,
    createdAt: workshop.createdAt,
    updatedAt: workshop.updatedAt,
    ...availability,
  }
}

router.get('/', requireRoles('ADMIN', 'MANAGER', 'STAFF'), async (req, res, next) => {
  try {
    const from = parseDate(req.query.from, 'from')
    const to = parseDate(req.query.to, 'to')
    const status = parseWorkshopStatus(req.query.status)
    const availableOnly = parseBooleanQuery(req.query.availableOnly, 'availableOnly')

    const where = {}
    if (from || to) {
      where.scheduledAt = {}
      if (from) where.scheduledAt.gte = from
      if (to) where.scheduledAt.lte = to
    }
    if (status) {
      where.status = status
    }

    const workshops = await prisma.workshop.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
    })

    const withCounts = await Promise.all(
      workshops.map(async (workshop) => {
        const activeCount = await countActiveRegistrations(prisma, workshop.id)
        return serializeWorkshop(workshop, activeCount)
      }),
    )

    const filtered = availableOnly
      ? withCounts.filter((w) => w.remainingSeats > 0 && w.status === 'SCHEDULED')
      : withCounts

    res.json({ workshops: filtered })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', requireRoles('ADMIN', 'MANAGER', 'STAFF'), async (req, res, next) => {
  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id: req.params.id },
    })
    if (!workshop) {
      throw new HttpError(404, 'Workshop not found.')
    }
    const enriched = await withWorkshopAvailability(prisma, workshop)
    res.json({
      workshop: {
        id: enriched.id,
        code: enriched.code,
        title: enriched.title,
        instructor: enriched.instructor,
        scheduledAt: enriched.scheduledAt,
        status: enriched.status,
        createdAt: enriched.createdAt,
        updatedAt: enriched.updatedAt,
        capacity: enriched.capacity,
        activeRegistrationCount: enriched.activeRegistrationCount,
        remainingSeats: enriched.remainingSeats,
        isAvailable: enriched.isAvailable,
      },
    })
  } catch (err) {
    next(err)
  }
})

router.post('/', requireRoles('MANAGER'), async (req, res, next) => {
  try {
    const code = String(req.body?.code ?? '').trim()
    const title = String(req.body?.title ?? '').trim()
    const instructor = String(req.body?.instructor ?? '').trim()
    const scheduledAt = parseDate(req.body?.scheduledAt ?? req.body?.dateTime, 'scheduledAt')
    const capacity = req.body?.capacity !== undefined
      ? parsePositiveInt(req.body.capacity, 'capacity')
      : null
    const status = parseWorkshopStatus(req.body?.status) ?? 'SCHEDULED'

    assert(code, 400, 'Workshop code is required.')
    assert(title, 400, 'Title is required.')
    assert(instructor, 400, 'Instructor is required.')
    assert(scheduledAt, 400, 'Scheduled date and time is required.')
    assert(capacity, 400, 'Capacity is required.')

    const workshop = await prisma.workshop.create({
      data: { code, title, instructor, scheduledAt, capacity, status },
    })
    res.status(201).json({
      workshop: serializeWorkshop(workshop, 0),
    })
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', requireRoles('MANAGER'), async (req, res, next) => {
  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id: req.params.id },
    })
    if (!workshop) {
      throw new HttpError(404, 'Workshop not found.')
    }

    const data = {}
    if (req.body?.code !== undefined) {
      const code = String(req.body.code).trim()
      assert(code, 400, 'Workshop code cannot be empty.')
      data.code = code
    }
    if (req.body?.title !== undefined) {
      const title = String(req.body.title).trim()
      assert(title, 400, 'Title cannot be empty.')
      data.title = title
    }
    if (req.body?.instructor !== undefined) {
      const instructor = String(req.body.instructor).trim()
      assert(instructor, 400, 'Instructor cannot be empty.')
      data.instructor = instructor
    }
    if (req.body?.scheduledAt !== undefined || req.body?.dateTime !== undefined) {
      data.scheduledAt = parseDate(
        req.body.scheduledAt ?? req.body.dateTime,
        'scheduledAt',
      )
    }
    if (req.body?.status !== undefined) {
      data.status = parseWorkshopStatus(req.body.status)
    }
    if (req.body?.capacity !== undefined) {
      const capacity = parsePositiveInt(req.body.capacity, 'capacity')
      const activeCount = await countActiveRegistrations(prisma, workshop.id)
      if (capacity < activeCount) {
        throw new HttpError(
          409,
          'Capacity cannot be reduced below the number of active registrations.',
        )
      }
      data.capacity = capacity
    }

    assert(Object.keys(data).length > 0, 400, 'No valid fields to update.')

    const updated = await prisma.workshop.update({
      where: { id: workshop.id },
      data,
    })
    const activeCount = await countActiveRegistrations(prisma, updated.id)
    res.json({ workshop: serializeWorkshop(updated, activeCount) })
  } catch (err) {
    next(err)
  }
})

router.get(
  '/:id/registrations',
  requireRoles('ADMIN', 'MANAGER', 'STAFF'),
  async (req, res, next) => {
    try {
      const workshop = await prisma.workshop.findUnique({
        where: { id: req.params.id },
      })
      if (!workshop) {
        throw new HttpError(404, 'Workshop not found.')
      }

      const registrations = await prisma.registration.findMany({
        where: { workshopId: workshop.id },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, email: true, role: true } },
          cancelledBy: { select: { id: true, email: true, role: true } },
        },
      })

      res.json({
        registrations: registrations.map(serializeRegistration),
      })
    } catch (err) {
      next(err)
    }
  },
)

router.post(
  '/:id/registrations',
  requireRoles('MANAGER', 'STAFF'),
  async (req, res, next) => {
    try {
      const registration = await registerAttendee(prisma, {
        workshopId: req.params.id,
        attendeeName: req.body?.attendeeName ?? req.body?.name,
        attendeeEmail: req.body?.attendeeEmail ?? req.body?.email,
        createdByUserId: req.user.id,
      })
      res.status(201).json({ registration: serializeRegistration(registration) })
    } catch (err) {
      next(err)
    }
  },
)

export default router
