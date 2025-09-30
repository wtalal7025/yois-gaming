'use client'

import React from 'react'
import { Progress } from '@heroui/react'
import { motion } from 'framer-motion'

interface PasswordStrengthProps {
  password: string
  className?: string
}

interface StrengthCriteria {
  id: string
  label: string
  test: (password: string) => boolean
}

const strengthCriteria: StrengthCriteria[] = [
  {
    id: 'length',
    label: 'At least 8 characters',
    test: (password) => password.length >= 8
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    test: (password) => /[A-Z]/.test(password)
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    test: (password) => /[a-z]/.test(password)
  },
  {
    id: 'number',
    label: 'One number',
    test: (password) => /\d/.test(password)
  },
  {
    id: 'special',
    label: 'One special character',
    test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password)
  }
]

const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, label: '', color: 'default' }
  
  const passedCriteria = strengthCriteria.filter(criteria => criteria.test(password)).length
  const score = (passedCriteria / strengthCriteria.length) * 100
  
  if (score < 40) {
    return { score, label: 'Weak', color: 'danger' }
  } else if (score < 80) {
    return { score, label: 'Fair', color: 'warning' }
  } else if (score < 100) {
    return { score, label: 'Good', color: 'primary' }
  } else {
    return { score, label: 'Strong', color: 'success' }
  }
}

export function PasswordStrength({ password, className = '' }: PasswordStrengthProps) {
  const strength = getPasswordStrength(password)
  
  // Don't show anything if password is empty
  if (!password) {
    return null
  }

  return (
    <motion.div 
      className={`space-y-3 ${className}`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Strength Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Password strength</span>
          <span className={`text-xs font-medium ${
            strength.color === 'danger' ? 'text-danger' :
            strength.color === 'warning' ? 'text-warning' :
            strength.color === 'primary' ? 'text-primary' :
            strength.color === 'success' ? 'text-success' :
            'text-muted-foreground'
          }`}>
            {strength.label}
          </span>
        </div>
        
        <Progress
          value={strength.score}
          color={strength.color as any}
          size="sm"
          className="w-full"
          classNames={{
            track: "bg-muted/50",
            indicator: "transition-all duration-300"
          }}
        />
      </div>

      {/* Criteria Checklist */}
      <div className="space-y-1">
        {strengthCriteria.map((criteria) => {
          const passed = criteria.test(password)
          return (
            <motion.div
              key={criteria.id}
              className="flex items-center space-x-2 text-xs"
              initial={{ opacity: 0.5 }}
              animate={{ 
                opacity: 1,
                color: passed ? 'rgb(34, 197, 94)' : 'rgb(156, 163, 175)'
              }}
              transition={{ duration: 0.2 }}
            >
              <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                passed ? 'bg-success text-white' : 'bg-muted border border-muted-foreground/30'
              }`}>
                {passed ? (
                  <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                ) : (
                  <div className="w-1 h-1 bg-muted-foreground/50 rounded-full"></div>
                )}
              </div>
              <span className={passed ? 'text-success' : 'text-muted-foreground'}>
                {criteria.label}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Security Tips */}
      {strength.score < 100 && (
        <motion.div 
          className="p-3 bg-muted/30 rounded-lg border border-border/50"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Security tip:</p>
              <p>Use a mix of uppercase, lowercase, numbers, and special characters for a stronger password.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Strong Password Confirmation */}
      {strength.score === 100 && (
        <motion.div 
          className="p-3 bg-success/10 rounded-lg border border-success/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
            </svg>
            <span className="text-xs font-medium text-success">
              Excellent! Your password is very strong.
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}