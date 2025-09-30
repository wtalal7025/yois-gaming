'use client'

import React from 'react'
import { useUIStore } from '../../stores/ui'
import { LoginModal } from '../auth/LoginModal'
import { RegisterModal } from '../auth/RegisterModal'
import { WalletModal } from '../wallet/WalletModal'

// Reason: Central modal manager that renders modals based on UI store state
// This component bridges the gap between modal triggers and modal rendering
export function ModalRoot() {
  const { modal, closeModal, openModal } = useUIStore()

  // Handle switching between login and register modals
  const handleSwitchToRegister = () => {
    openModal('register')
  }

  const handleSwitchToLogin = () => {
    openModal('login')
  }

  // Render the appropriate modal based on the current modal state
  switch (modal.type) {
    case 'login':
      return (
        <LoginModal
          isOpen={modal.isOpen}
          onClose={closeModal}
          onOpenRegister={handleSwitchToRegister}
        />
      )

    case 'register':
      return (
        <RegisterModal
          isOpen={modal.isOpen}
          onClose={closeModal}
          onOpenLogin={handleSwitchToLogin}
        />
      )

    case 'wallet':
      return (
        <WalletModal
          isOpen={modal.isOpen}
          onClose={closeModal}
        />
      )

    case 'game':
    case 'profile':
    case 'settings':
      // TODO: Implement these modals when needed
      return null

    default:
      // No modal to render
      return null
  }
}