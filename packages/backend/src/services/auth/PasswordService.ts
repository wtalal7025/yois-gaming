/**
 * Password Service
 * Handles password hashing, validation, and strength checking
 */

import bcrypt from 'bcryptjs'
import type { PasswordStrength } from '@yois-games/shared'

export class PasswordService {
  private static readonly SALT_ROUNDS = 12

  // Reason: Higher cost factor for better security, but still reasonable performance
  private static readonly MIN_PASSWORD_LENGTH = 8
  private static readonly MAX_PASSWORD_LENGTH = 128

  /**
   * Hash a plain text password using bcrypt
   * @param password - Plain text password to hash
   * @returns Promise with hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    if (!password) {
      throw new Error('Password is required')
    }

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`)
    }

    if (password.length > this.MAX_PASSWORD_LENGTH) {
      throw new Error(`Password must be less than ${this.MAX_PASSWORD_LENGTH} characters long`)
    }

    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS)
      return await bcrypt.hash(password, salt)
    } catch (error) {
      throw new Error('Failed to hash password')
    }
  }

  /**
   * Verify a plain text password against a hashed password
   * @param password - Plain text password to verify
   * @param hashedPassword - Hashed password to compare against
   * @returns Promise with boolean result
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    if (!password || !hashedPassword) {
      return false
    }

    try {
      return await bcrypt.compare(password, hashedPassword)
    } catch (error) {
      // Reason: Don't throw error to prevent timing attacks, just return false
      return false
    }
  }

  /**
   * Check password strength and provide feedback
   * @param password - Password to check
   * @returns PasswordStrength object with score and feedback
   */
  static checkPasswordStrength(password: string): PasswordStrength {
    const feedback: string[] = []
    const suggestions: string[] = []
    let score = 0

    if (!password) {
      return {
        score: 0,
        isValid: false,
        feedback: ['Password is required'],
        suggestions: ['Please enter a password']
      }
    }

    // Length checks
    if (password.length < 8) {
      feedback.push('Password is too short')
      suggestions.push('Use at least 8 characters')
    } else if (password.length >= 8) {
      score += 1
    }

    if (password.length >= 12) {
      score += 1
    }

    // Character variety checks
    const hasLowercase = /[a-z]/.test(password)
    const hasUppercase = /[A-Z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    if (hasLowercase) score += 1
    if (hasUppercase) score += 1
    if (hasNumbers) score += 1
    if (hasSpecialChars) score += 1

    if (!hasLowercase) {
      feedback.push('Add lowercase letters')
      suggestions.push('Include lowercase letters (a-z)')
    }

    if (!hasUppercase) {
      feedback.push('Add uppercase letters')
      suggestions.push('Include uppercase letters (A-Z)')
    }

    if (!hasNumbers) {
      feedback.push('Add numbers')
      suggestions.push('Include numbers (0-9)')
    }

    if (!hasSpecialChars) {
      feedback.push('Add special characters')
      suggestions.push('Include special characters (!@#$%^&*)')
    }

    // Common patterns to avoid
    const commonPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty',
      'abc123', 'admin', 'letmein', 'welcome', 'monkey'
    ]

    if (commonPasswords.includes(password.toLowerCase())) {
      score = Math.max(0, score - 2)
      feedback.push('Password is too common')
      suggestions.push('Avoid common passwords')
    }

    // Sequential patterns
    if (/123/.test(password) || /abc/i.test(password) || /qwe/i.test(password)) {
      score = Math.max(0, score - 1)
      feedback.push('Avoid sequential patterns')
      suggestions.push('Mix up the order of characters')
    }

    // Repetitive patterns
    if (/(.)\1{2,}/.test(password)) {
      score = Math.max(0, score - 1)
      feedback.push('Avoid repetitive characters')
      suggestions.push('Use varied characters instead of repeating')
    }

    // Ensure score doesn't exceed maximum
    score = Math.min(score, 4)

    const isValid = score >= 2 && password.length >= this.MIN_PASSWORD_LENGTH

    if (isValid && feedback.length === 0) {
      feedback.push('Password strength is good')
    }

    return {
      score,
      isValid,
      feedback,
      suggestions
    }
  }

  /**
   * Generate a random secure password
   * @param length - Length of password to generate (default 16)
   * @returns Generated secure password
   */
  static generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'

    const allChars = lowercase + uppercase + numbers + specialChars
    let password = ''

    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += specialChars[Math.floor(Math.random() * specialChars.length)]

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // Shuffle the password to randomize the guaranteed characters
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  /**
   * Validate password meets minimum requirements
   * @param password - Password to validate
   * @returns Object with validation result and messages
   */
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!password) {
      errors.push('Password is required')
      return { isValid: false, errors }
    }

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`)
    }

    if (password.length > this.MAX_PASSWORD_LENGTH) {
      errors.push(`Password must be less than ${this.MAX_PASSWORD_LENGTH} characters long`)
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}