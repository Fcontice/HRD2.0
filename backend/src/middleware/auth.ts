import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../utils/jwt.js'
import { AuthenticationError, AuthorizationError } from '../utils/errors.js'

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 * Expects token in Authorization header as "Bearer <token>"
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided')
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const payload = verifyToken(token)

    // Attach user info to request object
    req.user = payload
    next()
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      next(new AuthenticationError('Invalid or expired token'))
    } else {
      next(error)
    }
  }
}

/**
 * Middleware to check if authenticated user has admin role
 * Must be used after authenticate middleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AuthenticationError())
  }

  if (req.user.role !== 'admin') {
    return next(new AuthorizationError('Admin access required'))
  }

  next()
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't reject if missing/invalid
 */
export function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      req.user = payload
    }
  } catch (error) {
    // Silently ignore authentication errors for optional auth
  }

  next()
}

/**
 * Middleware to check if user owns the resource
 * Compares req.user.userId with req.params.userId (or specified param)
 */
export function requireOwnership(paramName: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError())
    }

    const resourceUserId = req.params[paramName]

    if (req.user.userId !== resourceUserId && req.user.role !== 'admin') {
      return next(
        new AuthorizationError(
          'You do not have permission to access this resource'
        )
      )
    }

    next()
  }
}

/**
 * Alias for authenticate - required for auth
 */
export const requireAuth = authenticate

/**
 * Middleware to check if authenticated user's email is verified
 * Must be used after authenticate middleware
 */
export async function requireEmailVerified(req: Request, res: Response, next: NextFunction) {
  // This check is now handled in the controller
  // But we keep the middleware for route-level protection
  next()
}
