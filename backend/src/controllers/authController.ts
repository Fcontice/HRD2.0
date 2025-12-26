import { Request, Response } from 'express'
import { hashPassword, comparePassword } from '../utils/password.js'
import {
  generateAccessToken,
  generateRefreshToken,
  generateRandomToken,
  createTokenExpiry,
} from '../utils/jwt.js'
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../services/emailService.js'
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js'
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../types/validation.js'
import { db } from '../services/db.js'

/**
 * Register new user with email and password
 */
export async function register(req: Request, res: Response) {
  const { email, username, password } = registerSchema.parse(req.body)

  // Check if email already exists
  const existingEmail = await db.user.findUnique({
    email: email.toLowerCase(),
  })

  if (existingEmail) {
    throw new ConflictError('Email already registered')
  }

  // Check if username already exists
  const existingUsername = await db.user.findUnique({
    username,
  })

  if (existingUsername) {
    throw new ConflictError('Username already taken')
  }

  // Hash password
  const passwordHash = await hashPassword(password)

  // Generate verification token
  const verificationToken = generateRandomToken()
  const verificationTokenExpiry = createTokenExpiry(24)

  // Create user
  const newUser = await db.user.create({
    email: email.toLowerCase(),
    username,
    passwordHash,
    authProvider: 'email',
    verificationToken,
    verificationTokenExpiry,
  })

  // Return only needed fields
  const user = {
    id: newUser.id,
    email: newUser.email,
    username: newUser.username,
    role: newUser.role,
    createdAt: newUser.createdAt,
  }

  // Send verification email
  await sendVerificationEmail(user.email, user.username, verificationToken)

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    data: { user },
  })
}

/**
 * Verify email address
 */
export async function verifyEmail(req: Request, res: Response) {
  const { token } = verifyEmailSchema.parse(req.body)

  const user = await db.user.findFirst({
    verificationToken: token,
    verificationTokenExpiry: {
      gt: new Date(),
    },
  })

  if (!user) {
    throw new ValidationError('Invalid or expired verification token')
  }

  // Mark email as verified
  await db.user.update(
    { id: user.id },
    {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    }
  )

  res.json({
    success: true,
    message: 'Email verified successfully. You can now log in.',
  })
}

/**
 * Login with email and password
 */
export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body)

  // Find user
  const user = await db.user.findUnique({
    email: email.toLowerCase(),
  })

  if (!user) {
    throw new AuthenticationError('Invalid email or password')
  }

  if (user.deletedAt) {
    throw new AuthenticationError('Account has been deleted')
  }

  if (!user.emailVerified) {
    throw new AuthenticationError('Please verify your email before logging in')
  }

  if (!user.passwordHash) {
    throw new AuthenticationError(
      'Please use Google to sign in to this account'
    )
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.passwordHash)

  if (!isValidPassword) {
    throw new AuthenticationError('Invalid email or password')
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  })

  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  })

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      accessToken,
      refreshToken,
    },
  })
}

/**
 * Request password reset
 */
export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body)

  const user = await db.user.findUnique({
    email: email.toLowerCase(),
  })

  // Don't reveal if email exists for security
  if (!user || user.deletedAt) {
    return res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
    })
  }

  // Only allow password reset for email auth users
  if (user.authProvider !== 'email') {
    return res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
    })
  }

  // Generate reset token
  const resetToken = generateRandomToken()
  const resetTokenExpiry = createTokenExpiry(24)

  await db.user.update(
    { id: user.id },
    {
      resetToken,
      resetTokenExpiry,
    }
  )

  // Send reset email
  await sendPasswordResetEmail(user.email, user.username, resetToken)

  res.json({
    success: true,
    message: 'If the email exists, a password reset link has been sent.',
  })
}

/**
 * Reset password with token
 */
export async function resetPassword(req: Request, res: Response) {
  const { token, password } = resetPasswordSchema.parse(req.body)

  const user = await db.user.findFirst({
    resetToken: token,
    resetTokenExpiry: {
      gt: new Date(),
    },
  })

  if (!user) {
    throw new ValidationError('Invalid or expired reset token')
  }

  // Hash new password
  const passwordHash = await hashPassword(password)

  // Update password and clear reset token
  await db.user.update(
    { id: user.id },
    {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    }
  )

  res.json({
    success: true,
    message: 'Password reset successfully. You can now log in.',
  })
}

/**
 * Get current user profile
 */
export async function getProfile(req: Request, res: Response) {
  if (!req.user) {
    throw new AuthenticationError()
  }

  const foundUser = await db.user.findUnique({
    id: req.user.userId,
  })

  if (!foundUser) {
    throw new NotFoundError('User')
  }

  // Return only needed fields
  const user = {
    id: foundUser.id,
    email: foundUser.email,
    username: foundUser.username,
    role: foundUser.role,
    avatarUrl: foundUser.avatarUrl,
    authProvider: foundUser.authProvider,
    emailVerified: foundUser.emailVerified,
    createdAt: foundUser.createdAt,
  }

  res.json({
    success: true,
    data: { user },
  })
}

/**
 * Logout (client-side token invalidation)
 */
export async function logout(req: Request, res: Response) {
  res.json({
    success: true,
    message: 'Logged out successfully',
  })
}
