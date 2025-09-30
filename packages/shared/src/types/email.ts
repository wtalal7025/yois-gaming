/**
 * Email Service Types
 * Shared between frontend and backend for email functionality
 */

export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

export interface EmailData {
  to: string
  from: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType?: string
  }>
}

export interface EmailVerificationRequest {
  email: string
  userId: string
  verificationToken: string
}

export interface ResendVerificationRequest {
  email: string
}

export interface VerifyEmailRequest {
  token: string
}

export interface WelcomeEmailData {
  username: string
  email: string
  loginUrl?: string
}

export interface PasswordResetEmailData {
  username: string
  email: string
  resetToken: string
  resetUrl: string
  expiresInHours: number
}

export interface EmailVerificationData {
  username: string
  email: string
  verificationToken: string
  verificationUrl: string
  expiresInHours: number
}

export interface TransactionNotificationData {
  username: string
  email: string
  transactionType: 'deposit' | 'withdrawal' | 'win' | 'loss'
  amount: number
  currency: string
  balance: number
  transactionId: string
  timestamp: string
}

// Email sending result
export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// Email service configuration
export interface EmailConfig {
  apiKey: string
  fromEmail: string
  fromName: string
  replyToEmail?: string
  webhookSecret?: string
}

// Email template types
export type EmailTemplateType = 
  | 'welcome'
  | 'password-reset'
  | 'email-verification'
  | 'transaction-notification'
  | 'account-locked'
  | 'security-alert'

// Email priority levels
export type EmailPriority = 'low' | 'normal' | 'high'

export interface EmailOptions {
  priority?: EmailPriority
  scheduled?: Date
  tags?: string[]
  metadata?: Record<string, string>
}