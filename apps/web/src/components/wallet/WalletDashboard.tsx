'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Progress,
  Chip,
  Divider,
  Tabs,
  Tab
} from '@heroui/react'
import { useWalletStore, useFormattedBalance, useWalletLoading } from '@/stores/wallet'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { TransactionHistory } from './TransactionHistory'
import { DepositModal } from './DepositModal'
import { WithdrawModal } from './WithdrawModal'

interface WalletDashboardProps {
  compact?: boolean
  showTransactions?: boolean
}

/**
 * WalletDashboard component for displaying wallet information and controls
 * 
 * Features:
 * - Balance display with pending amounts
 * - Quick deposit/withdraw actions
 * - Recent transaction history
 * - Account statistics and insights
 * - Responsive design with compact mode
 * - Real-time balance updates
 */
export function WalletDashboard({
  compact = false,
  showTransactions = true
}: WalletDashboardProps) {
  const { user } = useAuthStore()
  const {
    balance,
    transactions,
    fetchBalance,
    fetchTransactions,
    error,
    clearError
  } = useWalletStore()
  const formattedBalance = useFormattedBalance()
  const { isLoading, isDepositing, isWithdrawing } = useWalletLoading()
  const { addToast } = useUIStore()

  // Compute derived balance values
  const pendingBalance = balance?.pending || 0
  const currentBalance = balance?.current || balance?.amount || 0

  const [activeTab, setActiveTab] = useState('overview')
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)

  // Fetch initial data
  useEffect(() => {
    if (user) {
      fetchBalance()
      if (showTransactions) {
        fetchTransactions(1) // Recent transactions only
      }
    }
  }, [user, fetchBalance, fetchTransactions, showTransactions])

  // Clear errors when component mounts
  useEffect(() => {
    if (error) {
      addToast({
        title: 'Wallet Error',
        message: error,
        type: 'error'
      })
      clearError()
    }
  }, [error, addToast, clearError])

  if (!user) {
    return (
      <Card className="w-full">
        <CardBody className="text-center py-8">
          <p className="text-muted-foreground">Please log in to view your wallet</p>
        </CardBody>
      </Card>
    )
  }

  // Calculate statistics from recent transactions
  const recentTransactions = transactions.slice(0, 10)
  const totalDeposited = recentTransactions
    .filter(t => t.type === 'deposit' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalWagered = recentTransactions
    .filter(t => t.type === 'bet')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalWon = recentTransactions
    .filter(t => t.type === 'win')
    .reduce((sum, t) => sum + t.amount, 0)

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-3 bg-card/50 rounded-lg border border-border/50"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium">{formattedBalance}</p>
            <p className="text-xs text-muted-foreground">Available</p>
          </div>
        </div>

        {pendingBalance > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-warning/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">${pendingBalance.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 ml-auto">
          <Button
            size="sm"
            color="success"
            variant="flat"
            onPress={() => setShowDepositModal(true)}
            isLoading={isDepositing}
          >
            Deposit
          </Button>
          <Button
            size="sm"
            variant="flat"
            onPress={() => setShowWithdrawModal(true)}
            isLoading={isWithdrawing}
            isDisabled={currentBalance <= 0}
          >
            Withdraw
          </Button>
        </div>

        {/* Modals */}
        <DepositModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
        />
        <WithdrawModal
          isOpen={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
        />
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Balance Overview Card */}
      <Card>
        <CardHeader className="text-center pb-2">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full"
          >
            <h2 className="text-2xl font-bold gradient-text mb-2">Your Wallet</h2>
            <p className="text-muted-foreground">Manage your gaming balance</p>
          </motion.div>
        </CardHeader>

        <CardBody className="space-y-6">
          {/* Main Balance */}
          <div className="text-center space-y-4">
            <div className="relative">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-5xl font-bold gradient-text"
              >
                {formattedBalance}
              </motion.div>
              <p className="text-muted-foreground mt-2">Available Balance</p>

              {pendingBalance > 0 && (
                <div className="mt-3">
                  <Chip size="sm" color="warning" variant="flat">
                    ${pendingBalance.toFixed(2)} pending
                  </Chip>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                color="success"
                variant="flat"
                onPress={() => setShowDepositModal(true)}
                isLoading={isDepositing}
                startContent={
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                }
              >
                Add Funds
              </Button>

              <Button
                size="lg"
                variant="flat"
                onPress={() => setShowWithdrawModal(true)}
                isLoading={isWithdrawing}
                isDisabled={currentBalance <= 0}
                startContent={
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 13H5v-2h14v2z" />
                  </svg>
                }
              >
                Withdraw
              </Button>
            </div>
          </div>

          <Divider />

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-semibold text-success">
                ${totalDeposited.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Total Deposited</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-primary">
                ${totalWagered.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Total Wagered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-success">
                ${totalWon.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Total Won</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Detailed View */}
      {showTransactions && (
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          className="w-full"
        >
          <Tab key="overview" title="Overview">
            <Card>
              <CardBody className="space-y-4">
                <h3 className="text-lg font-semibold">Account Overview</h3>

                {/* Account Level Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Account Level: Gold</span>
                    <span>85% to Platinum</span>
                  </div>
                  <Progress value={85} color="warning" size="sm" />
                </div>

                <Divider />

                {/* Recent Activity Summary */}
                <div className="space-y-3">
                  <h4 className="font-medium">Recent Activity</h4>
                  <div className="space-y-2">
                    {recentTransactions.slice(0, 3).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${transaction.type === 'deposit' ? 'bg-success' :
                            transaction.type === 'win' ? 'bg-success' : 'bg-primary'
                            }`} />
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {transaction.type.toLowerCase()}
                              {transaction.gameType && ` - ${transaction.gameType}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <p className={`font-medium ${transaction.type === 'deposit' || transaction.type === 'win'
                          ? 'text-success' : 'text-foreground'
                          }`}>
                          {transaction.type === 'deposit' || transaction.type === 'win' ? '+' : '-'}
                          ${transaction.amount.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Tab>

          <Tab key="transactions" title="Transactions">
            <TransactionHistory limit={20} />
          </Tab>
        </Tabs>
      )}

      {/* Modals */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
      />
      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
      />
    </div>
  )
}