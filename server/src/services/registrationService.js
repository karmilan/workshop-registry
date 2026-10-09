import { Prisma } from '@prisma/client'
import { HttpError } from '../lib/errors.js'
import { normalizeEmail, validateEmail } from '../lib/email.js'

export async function registerAttendee(prisma, {
  workshopId,
  attendeeName,
  attendeeEmail,
  createdByUserId,
}) {
  const name = String(attendeeName ?? '').trim()
  if (!name) {
    throw new HttpError(400, 'Attendee name is required.')
  }

  const normalizedEmail = validateEmail(attendeeEmail)
  if (!normalizedEmail) {
    throw new HttpError(400, 'A valid attendee email is required.')
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw`
        SELECT id, capacity, status
        FROM "Workshop"
        WHERE id = ${workshopId}
        FOR UPDATE
      `
      const workshop = locked[0]
      if (!workshop) {
        throw new HttpError(404, 'Workshop not found.')
      }
      if (workshop.status !== 'SCHEDULED') {
        throw new HttpError(409, 'Workshop is not open for registration.')
      }

      const activeCount = await tx.registration.count({
        where: { workshopId, status: 'ACTIVE' },
      })
      if (activeCount >= workshop.capacity) {
        throw new HttpError(409, 'Workshop is full.')
      }

      return tx.registration.create({
        data: {
          workshopId,
          attendeeName: name,
          attendeeEmail: String(attendeeEmail).trim(),
          attendeeEmailNormalized: normalizedEmail,
          createdByUserId,
          status: 'ACTIVE',
        },
        include: {
          createdBy: { select: { id: true, email: true, role: true } },
        },
      })
    })
  } catch (err) {
    if (err instanceof HttpError) {
      throw err
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw new HttpError(
        409,
        'An active registration already exists for this attendee and workshop.',
      )
    }
    throw err
  }
}

export async function cancelRegistration(prisma, registrationId, cancelledByUserId) {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw`
      SELECT id, status, "workshopId", "cancelledAt", "cancelledByUserId"
      FROM "Registration"
      WHERE id = ${registrationId}
      FOR UPDATE
    `
    const row = locked[0]
    if (!row) {
      throw new HttpError(404, 'Registration not found.')
    }

    if (row.status === 'CANCELLED') {
      return tx.registration.findUniqueOrThrow({
        where: { id: registrationId },
        include: {
          createdBy: { select: { id: true, email: true, role: true } },
          cancelledBy: { select: { id: true, email: true, role: true } },
          workshop: true,
        },
      })
    }

    return tx.registration.update({
      where: { id: registrationId },
      data: {
        status: 'CANCELLED',
        cancelledByUserId,
        cancelledAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, email: true, role: true } },
        cancelledBy: { select: { id: true, email: true, role: true } },
        workshop: true,
      },
    })
  })
}

export function serializeRegistration(registration) {
  return {
    id: registration.id,
    workshopId: registration.workshopId,
    attendeeName: registration.attendeeName,
    attendeeEmail: registration.attendeeEmail,
    status: registration.status,
    createdAt: registration.createdAt,
    cancelledAt: registration.cancelledAt,
    createdBy: registration.createdBy,
    cancelledBy: registration.cancelledBy ?? null,
    workshop: registration.workshop
      ? {
          id: registration.workshop.id,
          code: registration.workshop.code,
          title: registration.workshop.title,
        }
      : undefined,
  }
}
