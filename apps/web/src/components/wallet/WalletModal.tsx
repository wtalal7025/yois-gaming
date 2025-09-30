'use client'

import React from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody
} from '@heroui/react'
import { WalletDashboard } from './WalletDashboard'

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
}

// Reason: Modal wrapper for the WalletDashboard component
// This allows the wallet to be opened as a modal from anywhere in the app
export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      placement="center"
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        base: "bg-card/95 backdrop-blur-md border border-border/50 max-h-[90vh]",
        closeButton: "hover:bg-danger/10 hover:text-danger"
      }}
    >
      <ModalContent>
        <ModalHeader className="text-center">
          <h2 className="text-2xl font-bold gradient-text">Your Wallet</h2>
        </ModalHeader>
        <ModalBody className="p-0">
          <div className="p-6">
            <WalletDashboard compact={false} showTransactions={true} />
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}