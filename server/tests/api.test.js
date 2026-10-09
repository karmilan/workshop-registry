import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import {
  app,
  authHeader,
  createUser,
  login,
  resetDatabase,
} from './helpers.js'
import { prisma } from '../src/db.js'

const ADMIN_EMAIL = 'admin@test.local'
const ADMIN_PASSWORD = 'admin-pass-123'

before(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set to run API tests.')
  }
})

beforeEach(async () => {
  await resetDatabase()
  await createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'ADMIN',
  })
})

after(async () => {
  await prisma.$disconnect()
})

describe('Workshop registration API', () => {
  it('admin login succeeds with valid credentials', async () => {
    const res = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert.equal(res.status, 200)
    assert.ok(res.body.token)
    assert.equal(res.body.user.role, 'ADMIN')
  })

  it('invalid login credentials return 401', async () => {
    const res = await login(ADMIN_EMAIL, 'wrong-password')
    assert.equal(res.status, 401)
  })

  it('admin creates manager and staff users', async () => {
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
    const token = adminLogin.body.token

    const managerRes = await request(app)
      .post('/api/users')
      .set(authHeader(token))
      .send({
        email: 'manager@test.local',
        password: 'manager-pass',
        role: 'MANAGER',
      })
    assert.equal(managerRes.status, 201)

    const staffRes = await request(app)
      .post('/api/users')
      .set(authHeader(token))
      .send({
        email: 'staff@test.local',
        password: 'staff-pass',
        role: 'STAFF',
      })
    assert.equal(staffRes.status, 201)
  })

  it('happy path: workshop lifecycle and registration history', async () => {
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
    const adminToken = adminLogin.body.token

    await request(app)
      .post('/api/users')
      .set(authHeader(adminToken))
      .send({ email: 'manager@test.local', password: 'manager-pass', role: 'MANAGER' })
    await request(app)
      .post('/api/users')
      .set(authHeader(adminToken))
      .send({ email: 'staff@test.local', password: 'staff-pass', role: 'STAFF' })

    const managerLogin = await login('manager@test.local', 'manager-pass')
    const staffLogin = await login('staff@test.local', 'staff-pass')
    const managerToken = managerLogin.body.token
    const staffToken = staffLogin.body.token

    const createWorkshop = await request(app)
      .post('/api/workshops')
      .set(authHeader(managerToken))
      .send({
        code: 'WS-TEST-001',
        title: 'Test Workshop',
        instructor: 'Instructor One',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        capacity: 2,
      })
    assert.equal(createWorkshop.status, 201)
    const workshopId = createWorkshop.body.workshop.id

    const list = await request(app)
      .get('/api/workshops')
      .set(authHeader(staffToken))
    assert.equal(list.status, 200)
    assert.ok(list.body.workshops.some((w) => w.id === workshopId))

    const register = await request(app)
      .post(`/api/workshops/${workshopId}/registrations`)
      .set(authHeader(staffToken))
      .send({ attendeeName: 'Pat Lee', attendeeEmail: 'pat@example.com' })
    assert.equal(register.status, 201)

    const detail = await request(app)
      .get(`/api/workshops/${workshopId}`)
      .set(authHeader(staffToken))
    assert.equal(detail.body.workshop.activeRegistrationCount, 1)
    assert.equal(detail.body.workshop.remainingSeats, 1)

    const cancel = await request(app)
      .post(`/api/registrations/${register.body.registration.id}/cancel`)
      .set(authHeader(staffToken))
    assert.equal(cancel.status, 200)
    assert.equal(cancel.body.registration.status, 'CANCELLED')
    assert.ok(cancel.body.registration.cancelledAt)
    assert.equal(cancel.body.registration.cancelledBy.email, 'staff@test.local')

    const afterCancel = await request(app)
      .get(`/api/workshops/${workshopId}`)
      .set(authHeader(staffToken))
    assert.equal(afterCancel.body.workshop.activeRegistrationCount, 0)
    assert.equal(afterCancel.body.workshop.remainingSeats, 2)

    const history = await request(app)
      .get(`/api/workshops/${workshopId}/registrations`)
      .set(authHeader(staffToken))
    assert.equal(history.body.registrations.length, 1)
    assert.equal(history.body.registrations[0].status, 'CANCELLED')
  })

  it('authorization and validation errors', async () => {
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
    const adminToken = adminLogin.body.token

    await request(app)
      .post('/api/users')
      .set(authHeader(adminToken))
      .send({ email: 'staff@test.local', password: 'staff-pass', role: 'STAFF' })
    const staffLogin = await login('staff@test.local', 'staff-pass')
    const staffToken = staffLogin.body.token

    const unauth = await request(app).get('/api/workshops')
    assert.equal(unauth.status, 401)

    const staffCreateWorkshop = await request(app)
      .post('/api/workshops')
      .set(authHeader(staffToken))
      .send({
        code: 'X',
        title: 'T',
        instructor: 'I',
        scheduledAt: new Date().toISOString(),
        capacity: 1,
      })
    assert.equal(staffCreateWorkshop.status, 403)

    const staffCreateUser = await request(app)
      .post('/api/users')
      .set(authHeader(staffToken))
      .send({ email: 'x@test.local', password: 'password1', role: 'STAFF' })
    assert.equal(staffCreateUser.status, 403)

    const managerLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
    const workshopRes = await request(app)
      .post('/api/workshops')
      .set(authHeader(managerLogin.body.token))
    assert.equal(workshopRes.status, 403)

    await request(app)
      .post('/api/users')
      .set(authHeader(adminToken))
      .send({ email: 'manager@test.local', password: 'manager-pass', role: 'MANAGER' })
    const managerToken = (await login('manager@test.local', 'manager-pass')).body.token

    const workshop = await request(app)
      .post('/api/workshops')
      .set(authHeader(managerToken))
      .send({
        code: 'WS-BAD',
        title: 'Bad',
        instructor: 'I',
        scheduledAt: new Date().toISOString(),
        capacity: 1,
      })
    const workshopId = workshop.body.workshop.id

    const badRegister = await request(app)
      .post(`/api/workshops/${workshopId}/registrations`)
      .set(authHeader(staffToken))
      .send({ attendeeName: '', attendeeEmail: 'not-an-email' })
    assert.equal(badRegister.status, 400)

    const missingWorkshop = await request(app)
      .get('/api/workshops/00000000-0000-0000-0000-000000000099')
      .set(authHeader(staffToken))
    assert.equal(missingWorkshop.status, 404)

    const dupCode = await request(app)
      .post('/api/workshops')
      .set(authHeader(managerToken))
      .send({
        code: 'WS-BAD',
        title: 'Dup',
        instructor: 'I',
        scheduledAt: new Date().toISOString(),
        capacity: 5,
      })
    assert.equal(dupCode.status, 409)

    const negativeCap = await request(app)
      .post('/api/workshops')
      .set(authHeader(managerToken))
      .send({
        code: 'WS-NEG',
        title: 'Neg',
        instructor: 'I',
        scheduledAt: new Date().toISOString(),
        capacity: 0,
      })
    assert.equal(negativeCap.status, 400)

    await request(app)
      .post(`/api/workshops/${workshopId}/registrations`)
      .set(authHeader(staffToken))
      .send({ attendeeName: 'A', attendeeEmail: 'a@example.com' })

    const reduceCapacity = await request(app)
      .patch(`/api/workshops/${workshopId}`)
      .set(authHeader(managerToken))
      .send({ capacity: 0 })
    assert.equal(reduceCapacity.status, 400)
  })

  it('filters workshops by date, status, and availability', async () => {
    const adminToken = (await login(ADMIN_EMAIL, ADMIN_PASSWORD)).body.token
    await request(app)
      .post('/api/users')
      .set(authHeader(adminToken))
      .send({ email: 'manager@test.local', password: 'manager-pass', role: 'MANAGER' })
    const managerToken = (await login('manager@test.local', 'manager-pass')).body.token

    const full = await request(app)
      .post('/api/workshops')
      .set(authHeader(managerToken))
      .send({
        code: 'WS-FULL',
        title: 'Full',
        instructor: 'I',
        scheduledAt: '2030-06-01T10:00:00.000Z',
        capacity: 1,
      })
    const open = await request(app)
      .post('/api/workshops')
      .set(authHeader(managerToken))
      .send({
        code: 'WS-OPEN',
        title: 'Open',
        instructor: 'I',
        scheduledAt: '2030-07-01T10:00:00.000Z',
        capacity: 5,
      })

    await request(app)
      .patch(`/api/workshops/${full.body.workshop.id}`)
      .set(authHeader(managerToken))
      .send({ status: 'CANCELLED' })

    const staffToken = adminToken
    const filtered = await request(app)
      .get('/api/workshops')
      .query({
        from: '2030-01-01T00:00:00.000Z',
        to: '2030-12-31T23:59:59.000Z',
        status: 'SCHEDULED',
        availableOnly: 'true',
      })
      .set(authHeader(staffToken))

    assert.equal(filtered.status, 200)
    assert.equal(filtered.body.workshops.length, 1)
    assert.equal(filtered.body.workshops[0].code, open.body.workshop.code)
  })

  it('double cancel is idempotent and does not change history', async () => {
    const adminToken = (await login(ADMIN_EMAIL, ADMIN_PASSWORD)).body.token
    await request(app)
      .post('/api/users')
      .set(authHeader(adminToken))
      .send({ email: 'manager@test.local', password: 'manager-pass', role: 'MANAGER' })
    await request(app)
      .post('/api/users')
      .set(authHeader(adminToken))
      .send({ email: 'staff@test.local', password: 'staff-pass', role: 'STAFF' })

    const managerToken = (await login('manager@test.local', 'manager-pass')).body.token
    const staffToken = (await login('staff@test.local', 'staff-pass')).body.token

    const workshop = await request(app)
      .post('/api/workshops')
      .set(authHeader(managerToken))
      .send({
        code: 'WS-CANCEL',
        title: 'Cancel',
        instructor: 'I',
        scheduledAt: new Date().toISOString(),
        capacity: 3,
      })

    const reg = await request(app)
      .post(`/api/workshops/${workshop.body.workshop.id}/registrations`)
      .set(authHeader(staffToken))
      .send({ attendeeName: 'Sam', attendeeEmail: 'sam@example.com' })

    const firstCancel = await request(app)
      .post(`/api/registrations/${reg.body.registration.id}/cancel`)
      .set(authHeader(staffToken))
    const secondCancel = await request(app)
      .post(`/api/registrations/${reg.body.registration.id}/cancel`)
      .set(authHeader(staffToken))

    assert.equal(firstCancel.status, 200)
    assert.equal(secondCancel.status, 200)
    assert.equal(
      secondCancel.body.registration.cancelledAt,
      firstCancel.body.registration.cancelledAt,
    )
    assert.equal(
      secondCancel.body.registration.cancelledBy.id,
      firstCancel.body.registration.cancelledBy.id,
    )
  })

  it('concurrent registration respects capacity 1', async () => {
    const adminToken = (await login(ADMIN_EMAIL, ADMIN_PASSWORD)).body.token
    await request(app)
      .post('/api/users')
      .set(authHeader(adminToken))
      .send({ email: 'manager@test.local', password: 'manager-pass', role: 'MANAGER' })
    await request(app)
      .post('/api/users')
      .set(authHeader(adminToken))
      .send({ email: 'staff@test.local', password: 'staff-pass', role: 'STAFF' })

    const managerToken = (await login('manager@test.local', 'manager-pass')).body.token
    const staffToken = (await login('staff@test.local', 'staff-pass')).body.token

    const workshop = await request(app)
      .post('/api/workshops')
      .set(authHeader(managerToken))
      .send({
        code: 'WS-RACE',
        title: 'Race',
        instructor: 'I',
        scheduledAt: new Date().toISOString(),
        capacity: 1,
      })
    const workshopId = workshop.body.workshop.id

    const [a, b] = await Promise.all([
      request(app)
        .post(`/api/workshops/${workshopId}/registrations`)
        .set(authHeader(staffToken))
        .send({ attendeeName: 'A', attendeeEmail: 'a@example.com' }),
      request(app)
        .post(`/api/workshops/${workshopId}/registrations`)
        .set(authHeader(staffToken))
        .send({ attendeeName: 'B', attendeeEmail: 'b@example.com' }),
    ])

    const statuses = [a.status, b.status].sort()
    assert.deepEqual(statuses, [201, 409])

    const active = await prisma.registration.count({
      where: { workshopId, status: 'ACTIVE' },
    })
    assert.equal(active, 1)
  })

  it('concurrent duplicate email registration allows only one active', async () => {
    const adminToken = (await login(ADMIN_EMAIL, ADMIN_PASSWORD)).body.token
    await request(app)
      .post('/api/users')
      .set(authHeader(adminToken))
      .send({ email: 'manager@test.local', password: 'manager-pass', role: 'MANAGER' })
    await request(app)
      .post('/api/users')
      .set(authHeader(adminToken))
      .send({ email: 'staff@test.local', password: 'staff-pass', role: 'STAFF' })

    const managerToken = (await login('manager@test.local', 'manager-pass')).body.token
    const staffToken = (await login('staff@test.local', 'staff-pass')).body.token

    const workshop = await request(app)
      .post('/api/workshops')
      .set(authHeader(managerToken))
      .send({
        code: 'WS-DUP',
        title: 'Dup',
        instructor: 'I',
        scheduledAt: new Date().toISOString(),
        capacity: 10,
      })
    const workshopId = workshop.body.workshop.id

    const [a, b] = await Promise.all([
      request(app)
        .post(`/api/workshops/${workshopId}/registrations`)
        .set(authHeader(staffToken))
        .send({ attendeeName: 'Pat', attendeeEmail: 'Pat@Example.com' }),
      request(app)
        .post(`/api/workshops/${workshopId}/registrations`)
        .set(authHeader(staffToken))
        .send({ attendeeName: 'Pat Other', attendeeEmail: 'pat@example.com' }),
    ])

    const success = [a, b].filter((r) => r.status === 201)
    const conflict = [a, b].filter((r) => r.status === 409)
    assert.equal(success.length, 1)
    assert.equal(conflict.length, 1)

    const active = await prisma.registration.count({
      where: { workshopId, status: 'ACTIVE' },
    })
    assert.equal(active, 1)
  })
})
