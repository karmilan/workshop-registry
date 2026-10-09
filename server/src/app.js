import express from 'express'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import workshopRoutes from './routes/workshops.js'
import registrationRoutes from './routes/registrations.js'
import { errorHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/workshops', workshopRoutes)
  app.use('/api/registrations', registrationRoutes)

  app.use(errorHandler)
  return app
}
