import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'

export interface EmailOptions {
  to: string
  subject: string
  html: string
}

/**
 * Send email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
    console.log('✅ Email sent successfully:', {
      to: options.to,
      subject: options.subject,
      id: result.data?.id
    })
  } catch (error: any) {
    console.error('❌ Failed to send email:', {
      error: error.message,
      to: options.to,
      subject: options.subject,
      from: FROM_EMAIL
    })
    // Don't throw in development to prevent blocking registration
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Failed to send email')
    } else {
      console.warn('⚠️  Email sending failed but continuing (development mode)')
    }
  }
}

/**
 * Send email verification link
 */
export async function sendVerificationEmail(
  email: string,
  username: string,
  token: string
): Promise<void> {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #0066cc;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to Home Run Derby! ⚾</h1>
    <p>Hi ${username},</p>
    <p>Thanks for signing up! Please verify your email address to get started.</p>
    <a href="${verificationUrl}" class="button">Verify Email Address</a>
    <p>Or copy and paste this link into your browser:</p>
    <p><a href="${verificationUrl}">${verificationUrl}</a></p>
    <p>This link will expire in 24 hours.</p>
    <div class="footer">
      <p>If you didn't create an account, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `

  await sendEmail({
    to: email,
    subject: 'Verify your email - Home Run Derby',
    html,
  })
}

/**
 * Send password reset link
 */
export async function sendPasswordResetEmail(
  email: string,
  username: string,
  token: string
): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #0066cc;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Password Reset Request</h1>
    <p>Hi ${username},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <a href="${resetUrl}" class="button">Reset Password</a>
    <p>Or copy and paste this link into your browser:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>This link will expire in 24 hours.</p>
    <div class="footer">
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>Your password will remain unchanged.</p>
    </div>
  </div>
</body>
</html>
  `

  await sendEmail({
    to: email,
    subject: 'Reset your password - Home Run Derby',
    html,
  })
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(
  email: string,
  username: string,
  teamName: string,
  amount: number
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .success {
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Payment Confirmed! 🎉</h1>
    <p>Hi ${username},</p>
    <div class="success">
      <p><strong>Your team "${teamName}" has been successfully entered into the contest!</strong></p>
    </div>
    <p>Payment details:</p>
    <ul>
      <li>Amount: $${amount.toFixed(2)}</li>
      <li>Team: ${teamName}</li>
      <li>Status: Confirmed</li>
    </ul>
    <p>Good luck this season!</p>
    <div class="footer">
      <p>For questions, please contact support.</p>
    </div>
  </div>
</body>
</html>
  `

  await sendEmail({
    to: email,
    subject: `Payment Confirmed - ${teamName}`,
    html,
  })
}

/**
 * Send team locked notification
 */
export async function sendTeamLockedEmail(
  email: string,
  username: string,
  teamName: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .info {
      background-color: #d1ecf1;
      border: 1px solid #bee5eb;
      color: #0c5460;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Team Locked ⚾</h1>
    <p>Hi ${username},</p>
    <div class="info">
      <p><strong>Your team "${teamName}" has been locked for the season.</strong></p>
    </div>
    <p>The MLB season is about to start! Your team is now locked and cannot be modified.</p>
    <p>Follow your team's progress on the leaderboard throughout the season.</p>
    <p>Good luck!</p>
    <div class="footer">
      <p>Home Run Derby - May the best team win!</p>
    </div>
  </div>
</body>
</html>
  `

  await sendEmail({
    to: email,
    subject: `Team Locked - ${teamName}`,
    html,
  })
}
