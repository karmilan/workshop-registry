import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { normalizeEmail } from '../src/lib/email.js'

const prisma = new PrismaClient()

async function main() {
  const email = normalizeEmail(process.env.SEED_ADMIN_EMAIL ?? '')
  const password = process.env.SEED_ADMIN_PASSWORD ?? ''

  if (!email || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set to seed the admin user.',
    )
  }
  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters.')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'ADMIN' },
    create: { email, passwordHash, role: 'ADMIN' },
  })

  const seedWorkshops = String(process.env.SEED_SAMPLE_WORKSHOPS ?? 'true').toLowerCase() === 'true'
  if (seedWorkshops) {
    const samples = [
      {
        code: 'WS-INTRO-001',
        title: 'Introduction to Workshop Safety',
        instructor: 'Alex Rivera',
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        capacity: 20,
      },
      {
        code: 'WS-ADV-002',
        title: 'Advanced Facilitation Skills',
        instructor: 'Jordan Lee',
        scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        capacity: 12,
      },
    ]

    for (const workshop of samples) {
      await prisma.workshop.upsert({
        where: { code: workshop.code },
        update: workshop,
        create: { ...workshop, status: 'SCHEDULED' },
      })
    }
  }

  console.log('Seed completed.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
