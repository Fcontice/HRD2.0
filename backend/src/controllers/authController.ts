import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
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

const prisma = new PrismaClient()

/**
 * Register new user with email and password
 */
export async function register(req: Request, res: Response) {
  const { email, username, password } = registerSchema.parse(req.body)

  // Check if email already exists
  const existingEmail = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (existingEmail) {
    throw new ConflictError('Email already registered')
  }

  // Check if username already exists
  const existingUsername = await prisma.user.findUnique({
    where: { username },
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
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      username,
      passwordHash,
      authProvider: 'email',
      verificationToken,
      verificationTokenExpiry,
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
    },
  })

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

  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
      verificationTokenExpiry: {
        gt: new Date(),
      },
    },
  })

  if (!user) {
    throw new ValidationError('Invalid or expired verification token')
  }

  // Mark email as verified
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    },
  })

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
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
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

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
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

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry,
    },
  })

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

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date(),
      },
    },
  })

  if (!user) {
    throw new ValidationError('Invalid or expired reset token')
  }

  // Hash new password
  const passwordHash = await hashPassword(password)

  // Update password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  })

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

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      avatarUrl: true,
      authProvider: true,
      emailVerified: true,
      createdAt: true,
    },
  })

  if (!user) {
    throw new NotFoundError('User')
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
