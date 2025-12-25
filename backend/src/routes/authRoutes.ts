import { Router } from 'express'
import passport from '../config/passport.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticate } from '../middleware/auth.js'
import {
  register,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  logout,
} from '../controllers/authController.js'
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js'

const router = Router()

/**
 * POST /api/auth/register
 * Register new user with email and password
 */
router.post('/register', asyncHandler(register))

/**
 * POST /api/auth/verify-email
 * Verify email address with token
 */
router.post('/verify-email', asyncHandler(verifyEmail))

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', asyncHandler(login))

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post('/forgot-password', asyncHandler(forgotPassword))

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', asyncHandler(resetPassword))

/**
 * POST /api/auth/logout
 * Logout (client handles token removal)
 */
router.post('/logout', authenticate, asyncHandler(logout))

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, asyncHandler(getProfile))

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
)

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    // Generate tokens
    const user = req.user as any

    const accessToken = generateAccessToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
    })

    const refreshToken = generateRefreshToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
    })

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(
      `${frontendUrl}/auth/callback?access_token=${accessToken}&refresh_token=${refreshToken}`
    )
  }
)

export default router
