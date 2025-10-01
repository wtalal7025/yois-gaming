/**
 * Email Service using Resend
 * Handles all email functionality for the gaming platform
 * Supports password resets, welcome emails, verification emails, and notifications
 */

import { Resend } from 'resend'
import type {
  EmailResult,
  EmailConfig,
  WelcomeEmailData,
  PasswordResetEmailData,
  EmailVerificationData,
  TransactionNotificationData,
  EmailOptions,
  // EmailTemplateType
} from '@yois-games/shared'

export class EmailService {
  private resend: Resend | null
  private config: EmailConfig

  constructor(config: EmailConfig) {
    this.config = config

    // Reason: Handle missing RESEND_API_KEY gracefully for production deployment
    if (!config.apiKey) {
      console.warn('⚠️ EmailService initialized without API key - email functionality disabled')
      this.resend = null
    } else {
      try {
        this.resend = new Resend(config.apiKey)
        console.log('✅ EmailService initialized successfully')
      } catch (error) {
        console.error('❌ Failed to initialize EmailService:', error)
        this.resend = null
      }
    }
  }

  /**
   * Send welcome email to new users
   * @param data - Welcome email data including username and email
   * @param options - Optional email settings
   * @returns Promise with email result
   */
  async sendWelcomeEmail(
    data: WelcomeEmailData,
    options?: EmailOptions
  ): Promise<EmailResult> {
    try {
      const template = this.generateWelcomeTemplate(data)

      const emailData = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        reply_to: this.config.replyToEmail,
        tags: ['welcome', 'onboarding', ...(options?.tags || [])],
        ...this.buildResendOptions(options)
      }

      // Reason: Handle disabled email service gracefully when API key is missing
      if (!this.resend) {
        console.warn('📧 Email service disabled - welcome email not sent to:', data.email)
        return { success: false, error: 'Email service disabled - missing API key' }
      }

      const result = await this.resend.emails.send(emailData)

      if (result.error) {
        console.error('❌ Failed to send welcome email:', result.error)
        return {
          success: false,
          error: result.error.message || 'Failed to send welcome email'
        }
      }

      console.log('✅ Welcome email sent successfully:', {
        messageId: result.data?.id,
        email: data.email,
        username: data.username
      })

      return {
        success: true,
        messageId: result.data?.id
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Welcome email error:', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Send password reset email
   * @param data - Password reset email data
   * @param options - Optional email settings
   * @returns Promise with email result
   */
  async sendPasswordResetEmail(
    data: PasswordResetEmailData,
    options?: EmailOptions
  ): Promise<EmailResult> {
    try {
      const template = this.generatePasswordResetTemplate(data)

      const emailData = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        reply_to: this.config.replyToEmail,
        tags: ['password-reset', 'security', ...(options?.tags || [])],
        ...this.buildResendOptions(options)
      }

      // Reason: Handle disabled email service gracefully when API key is missing
      if (!this.resend) {
        console.warn('📧 Email service disabled - password reset email not sent to:', data.email)
        return { success: false, error: 'Email service disabled - missing API key' }
      }

      const result = await this.resend.emails.send(emailData)

      if (result.error) {
        console.error('❌ Failed to send password reset email:', result.error)
        return {
          success: false,
          error: result.error.message || 'Failed to send password reset email'
        }
      }

      console.log('✅ Password reset email sent successfully:', {
        messageId: result.data?.id,
        email: data.email,
        username: data.username
      })

      return {
        success: true,
        messageId: result.data?.id
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Password reset email error:', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Send email verification email
   * @param data - Email verification data
   * @param options - Optional email settings
   * @returns Promise with email result
   */
  async sendEmailVerificationEmail(
    data: EmailVerificationData,
    options?: EmailOptions
  ): Promise<EmailResult> {
    try {
      const template = this.generateEmailVerificationTemplate(data)

      const emailData = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        reply_to: this.config.replyToEmail,
        tags: ['email-verification', 'security', ...(options?.tags || [])],
        ...this.buildResendOptions(options)
      }

      // Reason: Handle disabled email service gracefully when API key is missing
      if (!this.resend) {
        console.warn('📧 Email service disabled - email verification not sent to:', data.email)
        return { success: false, error: 'Email service disabled - missing API key' }
      }

      const result = await this.resend.emails.send(emailData)

      if (result.error) {
        console.error('❌ Failed to send email verification:', result.error)
        return {
          success: false,
          error: result.error.message || 'Failed to send email verification'
        }
      }

      console.log('✅ Email verification sent successfully:', {
        messageId: result.data?.id,
        email: data.email,
        username: data.username
      })

      return {
        success: true,
        messageId: result.data?.id
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Email verification error:', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Send transaction notification email
   * @param data - Transaction notification data
   * @param options - Optional email settings
   * @returns Promise with email result
   */
  async sendTransactionNotificationEmail(
    data: TransactionNotificationData,
    options?: EmailOptions
  ): Promise<EmailResult> {
    try {
      const template = this.generateTransactionNotificationTemplate(data)

      const emailData = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        reply_to: this.config.replyToEmail,
        tags: ['transaction', 'notification', data.transactionType, ...(options?.tags || [])],
        ...this.buildResendOptions(options)
      }

      // Reason: Handle disabled email service gracefully when API key is missing
      if (!this.resend) {
        console.warn('📧 Email service disabled - transaction notification not sent to:', data.email)
        return { success: false, error: 'Email service disabled - missing API key' }
      }

      const result = await this.resend.emails.send(emailData)

      if (result.error) {
        console.error('❌ Failed to send transaction notification:', result.error)
        return {
          success: false,
          error: result.error.message || 'Failed to send transaction notification'
        }
      }

      console.log('✅ Transaction notification sent successfully:', {
        messageId: result.data?.id,
        email: data.email,
        transactionType: data.transactionType,
        amount: data.amount
      })

      return {
        success: true,
        messageId: result.data?.id
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Transaction notification error:', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Generate welcome email template
   * @private
   */
  private generateWelcomeTemplate(data: WelcomeEmailData) {
    const subject = `Welcome to Gaming Platform, ${data.username}!`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Gaming Platform</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎮 Welcome to Gaming Platform!</h1>
          </div>
          <div class="content">
            <h2>Hey ${data.username}!</h2>
            <p>Welcome to our amazing gaming platform! We're thrilled to have you join our community of gamers.</p>
            
            <p>Here's what you can do now:</p>
            <ul>
              <li>🎯 Play exciting games like Mines, Sugar Rush, Crash, and more</li>
              <li>💰 Enjoy your welcome bonus of 100 coins</li>
              <li>🏆 Compete on leaderboards and earn achievements</li>
              <li>👥 Connect with other players in our community</li>
            </ul>
            
            ${data.loginUrl ? `<a href="${data.loginUrl}" class="button">Start Playing Now</a>` : ''}
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Happy gaming!</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Gaming Platform. All rights reserved.</p>
            <p>This email was sent to ${data.email}</p>
          </div>
        </body>
      </html>
    `

    const text = `
Welcome to Gaming Platform, ${data.username}!

Hey ${data.username}!

Welcome to our amazing gaming platform! We're thrilled to have you join our community of gamers.

Here's what you can do now:
• Play exciting games like Mines, Sugar Rush, Crash, and more
• Enjoy your welcome bonus of 100 coins
• Compete on leaderboards and earn achievements
• Connect with other players in our community

${data.loginUrl ? `Start playing now: ${data.loginUrl}` : ''}

If you have any questions, feel free to reach out to our support team.

Happy gaming!

Gaming Platform Team
    `

    return { subject, html, text }
  }

  /**
   * Generate password reset email template
   * @private
   */
  private generatePasswordResetTemplate(data: PasswordResetEmailData) {
    const subject = `Reset your Gaming Platform password`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset Request</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.username},</h2>
            <p>We received a request to reset your password for your Gaming Platform account.</p>
            
            <p>Click the button below to reset your password:</p>
            <a href="${data.resetUrl}" class="button">Reset Password</a>
            
            <div class="warning">
              <strong>⏰ Important:</strong> This reset link will expire in ${data.expiresInHours} hours.
            </div>
            
            <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <p>If the button above doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">
              ${data.resetUrl}
            </p>
            
            <p>For security reasons, please don't share this email with anyone.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Gaming Platform. All rights reserved.</p>
            <p>This email was sent to ${data.email}</p>
          </div>
        </body>
      </html>
    `

    const text = `
Password Reset Request - Gaming Platform

Hello ${data.username},

We received a request to reset your password for your Gaming Platform account.

Reset your password using this link: ${data.resetUrl}

IMPORTANT: This reset link will expire in ${data.expiresInHours} hours.

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.

For security reasons, please don't share this email with anyone.

Gaming Platform Team
    `

    return { subject, html, text }
  }

  /**
   * Generate email verification template
   * @private
   */
  private generateEmailVerificationTemplate(data: EmailVerificationData) {
    const subject = `Verify your Gaming Platform email address`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .info { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✉️ Verify Your Email</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.username},</h2>
            <p>Thanks for joining Gaming Platform! We need to verify your email address to secure your account.</p>
            
            <p>Click the button below to verify your email:</p>
            <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
            
            <div class="info">
              <strong>📧 Why verify?</strong> Email verification helps us keep your account secure and ensures you receive important updates about your gaming activity.
            </div>
            
            <p>This verification link will expire in ${data.expiresInHours} hours.</p>
            
            <p>If the button above doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">
              ${data.verificationUrl}
            </p>
            
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Gaming Platform. All rights reserved.</p>
            <p>This email was sent to ${data.email}</p>
          </div>
        </body>
      </html>
    `

    const text = `
Email Verification - Gaming Platform

Hello ${data.username},

Thanks for joining Gaming Platform! We need to verify your email address to secure your account.

Verify your email using this link: ${data.verificationUrl}

Why verify? Email verification helps us keep your account secure and ensures you receive important updates about your gaming activity.

This verification link will expire in ${data.expiresInHours} hours.

If you didn't create an account with us, please ignore this email.

Gaming Platform Team
    `

    return { subject, html, text }
  }

  /**
   * Generate transaction notification template
   * @private
   */
  private generateTransactionNotificationTemplate(data: TransactionNotificationData) {
    const transactionTypeMap = {
      deposit: { emoji: '💰', title: 'Deposit Confirmed', color: '#28a745' },
      withdrawal: { emoji: '💸', title: 'Withdrawal Processed', color: '#dc3545' },
      win: { emoji: '🎉', title: 'Congratulations! You Won', color: '#ffc107' },
      loss: { emoji: '🎮', title: 'Game Result', color: '#6c757d' }
    }

    const typeInfo = transactionTypeMap[data.transactionType]
    const subject = `${typeInfo.emoji} ${typeInfo.title} - ${data.amount} ${data.currency}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Transaction Notification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .transaction { background: #f8f9fa; border-left: 4px solid ${typeInfo.color}; padding: 20px; margin: 20px 0; }
            .amount { font-size: 24px; font-weight: bold; color: ${typeInfo.color}; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${typeInfo.emoji} ${typeInfo.title}</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.username},</h2>
            <p>Here's a summary of your recent transaction:</p>
            
            <div class="transaction">
              <p><strong>Transaction Type:</strong> ${data.transactionType.charAt(0).toUpperCase() + data.transactionType.slice(1)}</p>
              <p><strong>Amount:</strong> <span class="amount">${data.amount > 0 ? '+' : ''}${data.amount} ${data.currency}</span></p>
              <p><strong>New Balance:</strong> ${data.balance} ${data.currency}</p>
              <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
              <p><strong>Date:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
            </div>
            
            <p>You can view all your transactions in your account dashboard.</p>
            
            ${data.transactionType === 'win' ? '<p>🎊 Great job! Keep the winning streak going!</p>' : ''}
            ${data.transactionType === 'deposit' ? '<p>💪 Good luck with your games!</p>' : ''}
          </div>
          <div class="footer">
            <p>&copy; 2025 Gaming Platform. All rights reserved.</p>
            <p>This email was sent to ${data.email}</p>
          </div>
        </body>
      </html>
    `

    const text = `
${typeInfo.title} - Gaming Platform

Hello ${data.username},

Here's a summary of your recent transaction:

Transaction Type: ${data.transactionType.charAt(0).toUpperCase() + data.transactionType.slice(1)}
Amount: ${data.amount > 0 ? '+' : ''}${data.amount} ${data.currency}
New Balance: ${data.balance} ${data.currency}
Transaction ID: ${data.transactionId}
Date: ${new Date(data.timestamp).toLocaleString()}

You can view all your transactions in your account dashboard.

${data.transactionType === 'win' ? 'Great job! Keep the winning streak going!' : ''}
${data.transactionType === 'deposit' ? 'Good luck with your games!' : ''}

Gaming Platform Team
    `

    return { subject, html, text }
  }

  /**
   * Build Resend-specific options from generic email options
   * @private
   */
  private buildResendOptions(options?: EmailOptions) {
    if (!options) return {}

    const resendOptions: any = {}

    if (options.scheduled) {
      resendOptions.scheduled_at = options.scheduled.toISOString()
    }

    if (options.metadata) {
      resendOptions.headers = options.metadata
    }

    return resendOptions
  }

  /**
   * Test email service connectivity
   * @returns Promise with connection test result
   */
  async testConnection(): Promise<EmailResult> {
    try {
      // Reason: Handle disabled email service gracefully when API key is missing
      if (!this.resend) {
        console.warn('📧 Email service disabled - cannot test connection')
        return { success: false, error: 'Email service disabled - missing API key' }
      }

      // Reason: Test connection by sending a simple email to verify Resend API key works
      const result = await this.resend.emails.send({
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: this.config.fromEmail, // Send test email to self
        subject: '🧪 Email Service Test',
        html: '<p>This is a test email from Gaming Platform email service.</p>',
        text: 'This is a test email from Gaming Platform email service.'
      })

      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Connection test failed'
        }
      }

      return {
        success: true,
        messageId: result.data?.id
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}