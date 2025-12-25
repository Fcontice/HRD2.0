import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import { PrismaClient } from '@prisma/client'
import { comparePassword } from '../utils/password.js'
import { JwtPayload } from '../utils/jwt.js'

const prisma = new PrismaClient()

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

/**
 * Local Strategy for email/password authentication
 */
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        })

        if (!user) {
          return done(null, false, { message: 'Invalid email or password' })
        }

        // Check if user is deleted
        if (user.deletedAt) {
          return done(null, false, { message: 'Account has been deleted' })
        }

        // Check if email is verified
        if (!user.emailVerified) {
          return done(null, false, {
            message: 'Please verify your email before logging in',
          })
        }

        // Check password (skip for Google OAuth users)
        if (!user.passwordHash) {
          return done(null, false, {
            message: 'Please use Google to sign in to this account',
          })
        }

        const isValidPassword = await comparePassword(password, user.passwordHash)

        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' })
        }

        // Return user data
        return done(null, {
          userId: user.id,
          email: user.email,
          role: user.role,
        })
      } catch (error) {
        return done(error)
      }
    }
  )
)

/**
 * Google OAuth Strategy
 */
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${BACKEND_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value

          if (!email) {
            return done(new Error('No email found in Google profile'))
          }

          // Check if user exists
          let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
          })

          if (user) {
            // User exists - check if deleted
            if (user.deletedAt) {
              return done(new Error('Account has been deleted'))
            }

            // Update avatar if not set
            if (!user.avatarUrl && profile.photos?.[0]?.value) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { avatarUrl: profile.photos[0].value },
              })
            }
          } else {
            // Create new user
            const username = email.split('@')[0] + '_' + Date.now()

            user = await prisma.user.create({
              data: {
                email: email.toLowerCase(),
                username,
                authProvider: 'google',
                emailVerified: true, // Google emails are pre-verified
                avatarUrl: profile.photos?.[0]?.value,
              },
            })
          }

          return done(null, {
            userId: user.id,
            email: user.email,
            role: user.role,
          })
        } catch (error) {
          return done(error as Error)
        }
      }
    )
  )
}

/**
 * JWT Strategy (for validating tokens)
 */
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: JWT_SECRET,
    },
    async (payload: JwtPayload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
        })

        if (!user || user.deletedAt) {
          return done(null, false)
        }

        return done(null, payload)
      } catch (error) {
        return done(error, false)
      }
    }
  )
)

export default passport
