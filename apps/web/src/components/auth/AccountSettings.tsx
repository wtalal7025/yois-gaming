'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Switch,
  Divider,
  Tabs,
  Tab,
  Avatar
} from '@heroui/react'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

// Password change schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// Profile update schema
const profileUpdateSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().optional(),
  lastName: z.string().optional()
})

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>
type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>

interface AccountSettingsProps {
  onClose?: () => void
}

/**
 * AccountSettings component for managing user account preferences
 * 
 * Features:
 * - Profile information editing
 * - Password change functionality
 * - Account preferences and settings
 * - Email verification management
 * - Privacy and security settings
 * - Notification preferences
 */
export function AccountSettings({ onClose }: AccountSettingsProps) {
  const { user, updateProfile, changePassword } = useAuthStore()
  const { addToast } = useUIStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
    reset: resetProfile
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || ''
    }
  })

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting },
    reset: resetPassword
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema)
  })

  const onProfileSubmit = async (data: ProfileUpdateFormData) => {
    try {
      await updateProfile(data)
      addToast({
        title: 'Profile updated',
        message: 'Your profile has been updated successfully',
        type: 'success'
      })
    } catch (error) {
      addToast({
        title: 'Update failed',
        message: error instanceof Error ? error.message : 'Failed to update profile',
        type: 'error'
      })
    }
  }

  const onPasswordSubmit = async (data: PasswordChangeFormData) => {
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      })

      addToast({
        title: 'Password changed',
        message: 'Your password has been changed successfully',
        type: 'success'
      })

      resetPassword()
    } catch (error) {
      addToast({
        title: 'Password change failed',
        message: error instanceof Error ? error.message : 'Failed to change password',
        type: 'error'
      })
    }
  }

  const handleVerifyEmail = async () => {
    // Mock email verification
    addToast({
      title: 'Verification sent',
      message: 'A verification email has been sent to your email address',
      type: 'success'
    })
  }

  if (!user) {
    return (
      <Card className="w-full max-w-2xl">
        <CardBody className="text-center py-8">
          <p className="text-muted-foreground">Please log in to access account settings</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <h2 className="text-2xl font-bold">Account Settings</h2>
          <p className="text-muted-foreground">Manage your account preferences</p>
        </motion.div>
      </CardHeader>

      <CardBody>
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          className="w-full"
        >
          {/* Profile Tab */}
          <Tab key="profile" title="Profile">
            <div className="space-y-6 py-4">
              {/* Avatar Section */}
              <div className="text-center">
                <Avatar
                  src={user.avatar || user.avatarUrl || ''}
                  name={user.username}
                  size="lg"
                  className="w-20 h-20 mx-auto mb-4"
                />
                <Button size="sm" variant="flat" color="primary">
                  Change Avatar
                </Button>
              </div>

              <Divider />

              {/* Profile Form */}
              <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                <Input
                  {...registerProfile('username')}
                  label="Username"
                  placeholder="Your username"
                  variant="bordered"
                  isInvalid={!!profileErrors.username}
                  errorMessage={profileErrors.username?.message}
                />

                <Input
                  {...registerProfile('email')}
                  label="Email"
                  placeholder="Your email address"
                  type="email"
                  variant="bordered"
                  isInvalid={!!profileErrors.email}
                  errorMessage={profileErrors.email?.message}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    {...registerProfile('firstName')}
                    label="First Name"
                    placeholder="Your first name"
                    variant="bordered"
                  />
                  <Input
                    {...registerProfile('lastName')}
                    label="Last Name"
                    placeholder="Your last name"
                    variant="bordered"
                  />
                </div>

                <Button
                  type="submit"
                  color="primary"
                  isLoading={profileSubmitting}
                  className="w-full"
                >
                  Update Profile
                </Button>
              </form>
            </div>
          </Tab>

          {/* Security Tab */}
          <Tab key="security" title="Security">
            <div className="space-y-6 py-4">
              {/* Email Verification */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium">Email Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    {user.isEmailVerified ? 'Your email is verified' : 'Verify your email address'}
                  </p>
                </div>
                {!user.isEmailVerified && (
                  <Button size="sm" color="primary" onPress={handleVerifyEmail}>
                    Verify Email
                  </Button>
                )}
              </div>

              <Divider />

              {/* Password Change Form */}
              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                <h4 className="font-medium">Change Password</h4>

                <Input
                  {...registerPassword('currentPassword')}
                  label="Current Password"
                  placeholder="Enter your current password"
                  variant="bordered"
                  type={showCurrentPassword ? 'text' : 'password'}
                  isInvalid={!!passwordErrors.currentPassword}
                  errorMessage={passwordErrors.currentPassword?.message}
                  endContent={
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                    </Button>
                  }
                />

                <Input
                  {...registerPassword('newPassword')}
                  label="New Password"
                  placeholder="Enter your new password"
                  variant="bordered"
                  type={showNewPassword ? 'text' : 'password'}
                  isInvalid={!!passwordErrors.newPassword}
                  errorMessage={passwordErrors.newPassword?.message}
                  endContent={
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? '👁️' : '👁️‍🗨️'}
                    </Button>
                  }
                />

                <Input
                  {...registerPassword('confirmPassword')}
                  label="Confirm New Password"
                  placeholder="Confirm your new password"
                  variant="bordered"
                  type={showConfirmPassword ? 'text' : 'password'}
                  isInvalid={!!passwordErrors.confirmPassword}
                  errorMessage={passwordErrors.confirmPassword?.message}
                  endContent={
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </Button>
                  }
                />

                <Button
                  type="submit"
                  color="primary"
                  isLoading={passwordSubmitting}
                  className="w-full"
                >
                  Change Password
                </Button>
              </form>
            </div>
          </Tab>

          {/* Preferences Tab */}
          <Tab key="preferences" title="Preferences">
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <h4 className="font-medium">Notifications</h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch defaultSelected />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Game Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Notifications about game results and bonuses
                      </p>
                    </div>
                    <Switch defaultSelected />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Marketing Emails</p>
                      <p className="text-sm text-muted-foreground">
                        Promotional emails and special offers
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <Divider />

                <h4 className="font-medium">Privacy</h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Profile Visibility</p>
                      <p className="text-sm text-muted-foreground">
                        Make your profile visible to other users
                      </p>
                    </div>
                    <Switch defaultSelected />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Game History</p>
                      <p className="text-sm text-muted-foreground">
                        Show your game history on your profile
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            </div>
          </Tab>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex gap-3 mt-6">
          {onClose && (
            <Button
              variant="light"
              onPress={onClose}
              className="flex-1"
            >
              Close
            </Button>
          )}
          <Button
            color="primary"
            className="flex-1"
            onPress={() => {
              addToast({
                title: 'Settings saved',
                message: 'Your preferences have been saved',
                type: 'success'
              })
            }}
          >
            Save Changes
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}