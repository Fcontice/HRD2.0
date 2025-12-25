import { z } from 'zod'

/**
 * Authentication validation schemas
 */

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    )
    .optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
})

/**
 * Team validation schemas
 */

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(1, 'Team name is required')
    .max(50, 'Team name must be at most 50 characters'),
  seasonYear: z.number().int().min(2020).max(2100),
  playerIds: z
    .array(z.string().uuid())
    .length(8, 'Team must have exactly 8 players'),
})

export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(1, 'Team name is required')
    .max(50, 'Team name must be at most 50 characters')
    .optional(),
  playerIds: z
    .array(z.string().uuid())
    .length(8, 'Team must have exactly 8 players')
    .optional(),
})

/**
 * Admin validation schemas
 */

export const updateTeamStatusSchema = z.object({
  paymentStatus: z.enum(['draft', 'pending', 'paid', 'rejected', 'refunded']),
  entryStatus: z.enum(['draft', 'entered', 'locked']).optional(),
})

export const sendNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()).optional(), // If not provided, send to all
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  type: z.enum(['email', 'in_app']),
})

/**
 * Type exports for TypeScript
 */

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
export type UpdateTeamStatusInput = z.infer<typeof updateTeamStatusSchema>
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>
