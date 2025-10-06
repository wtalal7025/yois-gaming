'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
  Spinner,
  Pagination
} from '@heroui/react'
import { useWalletStore } from '@/stores/wallet'
import { useAuthStore } from '@/stores/auth'
import { TransactionType, TransactionStatus } from '@yois-games/shared'

interface TransactionHistoryProps {
  limit?: number
  showFilters?: boolean
  gameId?: string
  compact?: boolean
}

/**
 * TransactionHistory component for displaying user's transaction history
 * 
 * Features:
 * - Paginated transaction list
 * - Filtering by type, status, and date range
 * - Search functionality
 * - Responsive design with compact mode
 * - Real-time updates
 * - Export functionality (future)
 */
export function TransactionHistory({
  limit = 50,
  showFilters = true,
  gameId,
  compact = false
}: TransactionHistoryProps) {
  const { user } = useAuthStore()
  const {
    transactions,
    transactionsPagination,
    fetchTransactions,
    isLoadingTransactions,
    formatCurrency,
    error
  } = useWalletStore()

  const [filters, setFilters] = useState({
    type: '',
    status: '',
    search: '',
    startDate: '',
    endDate: ''
  })

  // Fetch transactions on mount and when filters change
  useEffect(() => {
    if (user) {
      fetchTransactions({
        limit,
        type: filters.type as TransactionType || undefined,
        status: filters.status as TransactionStatus || undefined,
        gameId,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      })
    }
  }, [user, limit, gameId, filters, fetchTransactions])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handlePageChange = (page: number) => {
    fetchTransactions({
      page,
      limit,
      type: filters.type as TransactionType || undefined,
      status: filters.status as TransactionStatus || undefined,
      gameId,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined
    })
  }

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'DEPOSIT':
        return (
          <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        )
      case 'WITHDRAW':
        return (
          <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 13H5v-2h14v2z" />
          </svg>
        )
      case 'BET':
        return (
          <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )
      case 'WIN':
        return (
          <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        )
    }
  }

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'success'
      case 'PENDING':
        return 'warning'
      case 'FAILED':
        return 'danger'
      case 'CANCELLED':
        return 'default'
      default:
        return 'default'
    }
  }

  const getAmountDisplay = (transaction: any) => {
    const isPositive = transaction.type === 'DEPOSIT' || transaction.type === 'WIN'
    const sign = isPositive ? '+' : '-'
    const colorClass = isPositive ? 'text-success' : 'text-foreground'

    return (
      <span className={`font-medium ${colorClass}`}>
        {sign}{formatCurrency(transaction.amount)}
      </span>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardBody className="text-center py-8">
          <p className="text-muted-foreground">Please log in to view transaction history</p>
        </CardBody>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {transactions.slice(0, limit).map((transaction) => (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                {getTransactionIcon(transaction.type)}
              </div>
              <div>
                <p className="text-sm font-medium capitalize">
                  {transaction.type.toLowerCase()}
                  {transaction.gameId && ` - ${transaction.gameId}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(transaction.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              {getAmountDisplay(transaction)}
              <Chip
                size="sm"
                color={getStatusColor(transaction.status)}
                variant="flat"
                className="ml-2"
              >
                {transaction.status}
              </Chip>
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex justify-between items-center w-full">
          <h3 className="text-lg font-semibold">Transaction History</h3>
          {showFilters && (
            <Button size="sm" variant="flat">
              Export
            </Button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
            <Input
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              startContent={
                <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              }
            />

            <Select
              placeholder="Transaction Type"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <SelectItem key="" value="">All Types</SelectItem>
              <SelectItem key="DEPOSIT" value="DEPOSIT">Deposit</SelectItem>
              <SelectItem key="WITHDRAW" value="WITHDRAW">Withdraw</SelectItem>
              <SelectItem key="BET" value="BET">Bet</SelectItem>
              <SelectItem key="WIN" value="WIN">Win</SelectItem>
            </Select>

            <Select
              placeholder="Status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <SelectItem key="" value="">All Status</SelectItem>
              <SelectItem key="COMPLETED" value="COMPLETED">Completed</SelectItem>
              <SelectItem key="PENDING" value="PENDING">Pending</SelectItem>
              <SelectItem key="FAILED" value="FAILED">Failed</SelectItem>
              <SelectItem key="CANCELLED" value="CANCELLED">Cancelled</SelectItem>
            </Select>

            <Input
              type="date"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
        )}
      </CardHeader>

      <CardBody className="gap-0">
        {isLoadingTransactions ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-muted-foreground mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 11H7v9a2 2 0 002 2h8a2 2 0 002-2V9h-2m-1 0V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v3m2-3h4v3h-4V6z" />
            </svg>
            <p className="text-muted-foreground">No transactions found</p>
            <p className="text-sm text-muted-foreground">
              Your transaction history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg transition-colors border-b border-border/30 last:border-b-0"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                    {getTransactionIcon(transaction.type)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium capitalize">
                        {transaction.type.toLowerCase()}
                      </p>
                      {transaction.gameId && (
                        <Chip size="sm" variant="flat" color="primary">
                          {transaction.gameId}
                        </Chip>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{new Date(transaction.createdAt).toLocaleString()}</span>
                      {transaction.description && (
                        <span>• {transaction.description}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="mb-1">
                    {getAmountDisplay(transaction)}
                  </div>
                  <Chip
                    size="sm"
                    color={getStatusColor(transaction.status)}
                    variant="flat"
                  >
                    {transaction.status}
                  </Chip>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {transactionsPagination.total > 0 && (
          <div className="flex justify-center pt-6">
            <Pagination
              total={Math.ceil(transactionsPagination.total / transactionsPagination.limit)}
              page={transactionsPagination.page}
              onChange={handlePageChange}
              size="sm"
              showControls
              showShadow
            />
          </div>
        )}
      </CardBody>
    </Card>
  )
}