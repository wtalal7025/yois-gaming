'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Link,
  Divider,
  Checkbox,
  Progress
} from '@heroui/react'
import { useAuthStore } from '../../stores/auth'
import { useUIStore } from '../../stores/ui'
import { PasswordStrength } from './PasswordStrength'

// Form validation schema
const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  agreeToTerms: z
    .boolean()
    .refine(val => val === true, 'You must agree to the terms and conditions'),
  agreeToPrivacy: z
    .boolean()
    .refine(val => val === true, 'You must agree to the privacy policy'),
  subscribeNewsletter: z.boolean().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type RegisterFormData = z.infer<typeof registerSchema>

// Social login icons
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

const TwitterIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
  </svg>
)

const DiscordIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0188 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0188 1.3332-.946 2.4189-2.1569 2.4189Z" />
  </svg>
)

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenLogin: () => void
}

export function RegisterModal({ isOpen, onClose, onOpenLogin }: RegisterModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register: registerUser, error, isLoading, clearError } = useAuthStore()
  const { addToast } = useUIStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    watch,
    reset
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
      agreeToPrivacy: false,
      subscribeNewsletter: false
    }
  })

  // DEBUG: Log form validation state
  React.useEffect(() => {
    console.log('🔍 REGISTER FORM DEBUG:', {
      isValid,
      errors: Object.keys(errors).length > 0 ? errors : 'None',
      formValues: {
        username: watch('username'),
        email: watch('email'),
        password: watch('password')?.length > 0 ? '***' : 'Empty',
        confirmPassword: watch('confirmPassword')?.length > 0 ? '***' : 'Empty',
        agreeToTerms: watch('agreeToTerms'),
        agreeToPrivacy: watch('agreeToPrivacy')
      }
    })
  }, [isValid, errors, watch])

  const watchPassword = watch('password', '')

  const onSubmit = async (data: RegisterFormData) => {
    clearError() // Clear any previous errors

    try {
      await registerUser({
        username: data.username,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        acceptedTerms: data.agreeToTerms,
        acceptedPrivacy: data.agreeToPrivacy
      })

      // Check if registration was successful
      const state = useAuthStore.getState()
      if (state.isAuthenticated && state.user) {
        addToast({
          title: 'Welcome to Yois Gaming!',
          message: `Account created successfully! Welcome, ${state.user.username}!`,
          type: 'success'
        })

        reset()
        onClose()
      }
    } catch (error) {
      // Error is already handled by the auth store and set in the error state
      // We just need to ensure it's displayed - the error will be shown below
      console.error('Registration error:', error)
    }
  }

  const handleSocialLogin = (provider: 'google' | 'twitter' | 'discord') => {
    // Placeholder for social login implementation
    addToast({
      title: 'Coming Soon',
      message: `${provider} registration will be available soon!`,
      type: 'info'
    })
  }

  const switchToLogin = () => {
    reset()
    onClose()
    onOpenLogin()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      size="lg"
      scrollBehavior="inside"
      classNames={{
        base: "bg-card/95 backdrop-blur-md border border-border/50 max-h-[90vh]",
        closeButton: "hover:bg-danger/10 hover:text-danger"
      }}
    >
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader className="flex flex-col gap-1 text-center">
            <motion.div
              className="flex items-center justify-center mb-2"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-glow mr-3">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <h2 className="text-2xl font-bold gradient-text">Join the Game</h2>
            </motion.div>
            <p className="text-muted-foreground">Create your account and start winning</p>
          </ModalHeader>

          <ModalBody className="gap-4">
            {/* Social Registration */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="bordered"
                  size="lg"
                  onPress={() => handleSocialLogin('google')}
                  className="h-12"
                >
                  <GoogleIcon />
                </Button>
                <Button
                  variant="bordered"
                  size="lg"
                  onPress={() => handleSocialLogin('twitter')}
                  className="h-12"
                >
                  <TwitterIcon />
                </Button>
                <Button
                  variant="bordered"
                  size="lg"
                  onPress={() => handleSocialLogin('discord')}
                  className="h-12"
                >
                  <DiscordIcon />
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <Divider className="flex-1" />
                <span className="text-sm text-muted-foreground">or sign up with email</span>
                <Divider className="flex-1" />
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <Input
                {...register('username')}
                label="Username"
                placeholder="Choose a unique username"
                variant="bordered"
                isInvalid={!!errors.username}
                errorMessage={errors.username?.message}
                startContent={
                  <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                }
              />

              <Input
                {...register('email')}
                label="Email"
                placeholder="Enter your email address"
                type="email"
                variant="bordered"
                isInvalid={!!errors.email}
                errorMessage={errors.email?.message}
                startContent={
                  <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                }
              />

              <div className="space-y-2">
                <Input
                  {...register('password')}
                  label="Password"
                  placeholder="Create a strong password"
                  variant="bordered"
                  type={showPassword ? 'text' : 'password'}
                  isInvalid={!!errors.password}
                  errorMessage={errors.password?.message}
                  startContent={
                    <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                  }
                  endContent={
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                        </svg>
                      )}
                    </Button>
                  }
                />

                {/* Password Strength Indicator */}
                <PasswordStrength password={watchPassword} />
              </div>

              <Input
                {...register('confirmPassword')}
                label="Confirm Password"
                placeholder="Confirm your password"
                variant="bordered"
                type={showConfirmPassword ? 'text' : 'password'}
                isInvalid={!!errors.confirmPassword}
                errorMessage={errors.confirmPassword?.message}
                startContent={
                  <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                  </svg>
                }
                endContent={
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                      </svg>
                    )}
                  </Button>
                }
              />

              {/* Terms and Newsletter */}
              <div className="space-y-3">
                <Checkbox
                  {...register('agreeToTerms')}
                  size="sm"
                  className="text-sm"
                  isInvalid={!!errors.agreeToTerms}
                >
                  <span className="text-sm">
                    I agree to the{' '}
                    <Link href="/terms" size="sm" className="text-primary hover:text-primary-400">
                      Terms of Service
                    </Link>
                  </span>
                </Checkbox>
                {errors.agreeToTerms && (
                  <p className="text-danger text-xs mt-1">{errors.agreeToTerms.message}</p>
                )}

                <Checkbox
                  {...register('agreeToPrivacy')}
                  size="sm"
                  className="text-sm"
                  isInvalid={!!errors.agreeToPrivacy}
                >
                  <span className="text-sm">
                    I agree to the{' '}
                    <Link href="/privacy" size="sm" className="text-primary hover:text-primary-400">
                      Privacy Policy
                    </Link>
                  </span>
                </Checkbox>
                {errors.agreeToPrivacy && (
                  <p className="text-danger text-xs mt-1">{errors.agreeToPrivacy.message}</p>
                )}

                <Checkbox
                  {...register('subscribeNewsletter')}
                  size="sm"
                  className="text-sm"
                >
                  <span className="text-sm text-muted-foreground">
                    Subscribe to our newsletter for updates and special offers
                  </span>
                </Checkbox>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 mt-4">
                <p className="text-danger text-sm font-medium">{error}</p>
              </div>
            )}
          </ModalBody>

          <ModalFooter className="flex-col gap-3">
            <Button
              type="submit"
              color="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              isDisabled={!isValid}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <Link
                as="button"
                size="sm"
                onPress={switchToLogin}
                className="text-primary hover:text-primary-400 font-medium"
              >
                Sign in here
              </Link>
            </p>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}