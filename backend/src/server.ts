// MUST load environment variables FIRST before any other imports
import './env.js'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import passport from './config/passport.js'
import authRoutes from './routes/authRoutes.js'
import playerRoutes from './routes/playerRoutes.js'
import teamRoutes from './routes/teamRoutes.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import rateLimit from 'express-rate-limit'

const app = express()
const PORT = process.env.PORT || 5000

// ==================== SECURITY MIDDLEWARE ====================

// Helmet for security headers
app.use(helmet())

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
)

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
})

app.use('/api/', limiter)

// ==================== GENERAL MIDDLEWARE ====================

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Initialize Passport
app.use(passport.initialize())

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HRD 2.0 API is running',
    timestamp: new Date().toISOString(),
  })
})

// ==================== API ROUTES ====================

// Welcome endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Home Run Derby 2.0 API',
    version: '1.0.0',
  })
})

// Authentication routes
app.use('/api/auth', authRoutes)

// Player routes
app.use('/api/players', playerRoutes)

// Team routes
app.use('/api/teams', teamRoutes)

// Future routes will be added here:
// app.use('/api/users', userRoutes)
// app.use('/api/leaderboards', leaderboardRoutes)
// app.use('/api/admin', adminRoutes)

// ==================== ERROR HANDLING ====================

// 404 handler (must be after all routes)
app.use(notFoundHandler)

// Global error handler (must be last)
app.use(errorHandler)

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✓ Set' : '⚠ Not set (using default)'}`)
  console.log(
    `📧 Resend API: ${process.env.RESEND_API_KEY ? '✓ Configured' : '⚠ Not configured'}`
  )
  console.log(
    `🔑 Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✓ Configured' : '⚠ Not configured'}`
  )
})

export default app
