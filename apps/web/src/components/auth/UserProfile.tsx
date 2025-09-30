'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Card,
  CardBody,
  CardHeader,
  Avatar,
  Button,
  Chip,
  Divider,
  Progress
} from '@heroui/react'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

interface UserProfileProps {
  onEditProfile?: () => void
  showEditButton?: boolean
  compact?: boolean
}

/**
 * UserProfile component that displays user information and statistics
 * 
 * Features:
 * - User avatar and basic information
 * - Account level and progress
 * - Account statistics (games played, wins, etc.)
 * - Settings and edit profile buttons
 * - Responsive design with compact mode
 */
export function UserProfile({ 
  onEditProfile, 
  showEditButton = true,
  compact = false 
}: UserProfileProps) {
  const { user, logout } = useAuthStore()
  const { addToast } = useUIStore()

  if (!user) {
    return (
      <Card className="w-full max-w-md">
        <CardBody className="text-center py-8">
          <p className="text-muted-foreground">Please log in to view your profile</p>
        </CardBody>
      </Card>
    )
  }

  const handleEditProfile = () => {
    if (onEditProfile) {
      onEditProfile()
    } else {
      addToast({
        title: 'Profile Settings',
        message: 'Profile editing will be available soon!',
        type: 'info'
      })
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      addToast({
        title: 'Logged out',
        message: 'You have been successfully logged out',
        type: 'success'
      })
    } catch (error) {
      addToast({
        title: 'Logout failed',
        message: error instanceof Error ? error.message : 'Failed to log out',
        type: 'error'
      })
    }
  }

  // Calculate user level based on experience points (mock calculation)
  const totalXP = user.stats?.totalWagered || 0
  const currentLevel = Math.floor(totalXP / 1000) + 1
  const levelProgress = ((totalXP % 1000) / 1000) * 100

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Avatar
          src={user.avatar}
          name={user.username}
          size="sm"
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{user.username}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <Chip size="sm" variant="flat" color="primary">
          Level {currentLevel}
        </Chip>
      </motion.div>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full"
        >
          <Avatar
            src={user.avatar}
            name={user.username}
            size="lg"
            className="w-20 h-20 mx-auto mb-3"
          />
          <h3 className="text-xl font-semibold">{user.username}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          
          {/* Account Level */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Level {currentLevel}</span>
              <span className="text-xs text-muted-foreground">
                {totalXP.toLocaleString()} XP
              </span>
            </div>
            <Progress 
              value={levelProgress} 
              color="primary" 
              size="sm"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {(1000 - (totalXP % 1000)).toLocaleString()} XP to next level
            </p>
          </div>
        </motion.div>
      </CardHeader>

      <Divider />

      <CardBody className="space-y-4">
        {/* Account Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status</span>
          <Chip
            size="sm"
            color={user.isEmailVerified ? 'success' : 'warning'}
            variant="flat"
          >
            {user.isEmailVerified ? 'Verified' : 'Unverified'}
          </Chip>
        </div>

        {/* Account Statistics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Statistics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-primary">
                {user.stats?.gamesPlayed || 0}
              </p>
              <p className="text-xs text-muted-foreground">Games Played</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-success">
                {user.stats?.totalWins || 0}
              </p>
              <p className="text-xs text-muted-foreground">Total Wins</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-primary">
                ${(user.stats?.totalWagered || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Wagered</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-success">
                ${(user.stats?.totalWon || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Won</p>
            </div>
          </div>
        </div>

        <Divider />

        {/* Action Buttons */}
        <div className="space-y-2">
          {showEditButton && (
            <Button
              variant="flat"
              color="primary"
              size="sm"
              onPress={handleEditProfile}
              className="w-full"
              startContent={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              }
            >
              Edit Profile
            </Button>
          )}
          
          <Button
            variant="light"
            color="danger"
            size="sm"
            onPress={handleLogout}
            className="w-full"
            startContent={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
            }
          >
            Sign Out
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

// Simplified profile card for navigation/header usage
export function UserProfileCard() {
  return <UserProfile compact showEditButton={false} />
}

// Profile modal content for full-screen display
export function UserProfileModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <UserProfile showEditButton onEditProfile={onClose} />
    </div>
  )
}