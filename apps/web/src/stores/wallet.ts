/**
 * Wallet Store - Balance and Transaction Management
 * Integrates with shared types and provides game-ready wallet functionality
 */

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import type { 
  Transaction, 
  TransactionType, 
  Balance,
  DepositRequest,
  WithdrawalRequest,
  WalletState,
  WalletApiResponse
} from '@stake-games/shared'

// Extended wallet store interface
interface ExtendedWalletState extends WalletState {
  // Loading states
  isDepositing: boolean
  isWithdrawing: boolean
  isBetting: boolean
  
  // Pagination for transactions
  transactionsPagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrevious: boolean
  }
  
  // Actions
  fetchBalance: () => Promise<void>
  deposit: (amount: number, description?: string) => Promise<{ success: boolean; error?: string }>
  withdraw: (amount: number, description?: string) => Promise<{ success: boolean; error?: string }>
  bet: (amount: number, gameType: string, metadata?: Record<string, any>) => Promise<{ success: boolean; transactionId?: string; error?: string }>
  win: (amount: number, gameSessionId: string, metadata?: Record<string, any>) => Promise<{ success: boolean; transactionId?: string; error?: string }>
  fetchTransactions: (page?: number) => Promise<void>
  
  // Real-time updates
  updateBalance: (balance: number) => void
  addTransaction: (transaction: Transaction) => void
  
  // Validation helpers
  canAfford: (amount: number) => boolean
  formatCurrency: (amount: number) => string
  
  // Utility actions
  clearError: () => void
  reset: () => void
}

// Demo/mock API functions for development
const mockApiDelay = () => new Promise(resolve => setTimeout(resolve, 500))

const generateTransactionId = () => `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const useWalletStore = create<ExtendedWalletState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state from WalletState - provide safe defaults
        balance: {
          userId: 'demo-user',
          current: 1000.00,
          available: 1000.00,
          pending: 0,
          currency: 'USD',
          lastUpdated: new Date().toISOString()
        },
        transactions: [],
        isLoading: false,
        error: null,
        stats: null,
        limits: null,
        preferences: null,
        
        // Extended state
        isDepositing: false,
        isWithdrawing: false,
        isBetting: false,
        transactionsPagination: {
          page: 1,
          limit: 20,
          total: 0,
          hasNext: false,
          hasPrevious: false
        },

        // Initialize with demo balance for development
        fetchBalance: async () => {
          set({ isLoading: true, error: null })
          
          try {
            await mockApiDelay()
            
            // Mock balance for demo purposes
            const demoBalance: Balance = {
              userId: 'demo-user',
              current: 1000.00,
              available: 1000.00,
              pending: 0,
              currency: 'USD',
              lastUpdated: new Date().toISOString()
            }
            
            set({ 
              balance: demoBalance,
              isLoading: false,
              lastUpdate: new Date().toISOString()
            })
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to fetch balance',
              isLoading: false 
            })
          }
        },

        // Demo deposit function
        deposit: async (amount: number, description = 'Demo deposit') => {
          set({ isDepositing: true, error: null })
          
          try {
            await mockApiDelay()
            
            const currentBalance = get().balance
            if (!currentBalance) {
              throw new Error('Balance not initialized')
            }
            
            const newBalance = currentBalance.current + amount
            const transaction: Transaction = {
              id: generateTransactionId(),
              userId: currentBalance.userId,
              type: 'deposit',
              amount,
              balanceBefore: currentBalance.current,
              balanceAfter: newBalance,
              description,
              status: 'completed',
              processedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            }
            
            const updatedBalance: Balance = {
              ...currentBalance,
              current: newBalance,
              available: newBalance,
              lastUpdated: new Date().toISOString()
            }
            
            set(state => ({
              balance: updatedBalance,
              transactions: [transaction, ...state.transactions],
              isDepositing: false,
              lastUpdate: new Date().toISOString()
            }))
            
            return { success: true }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Deposit failed'
            set({ 
              error: errorMessage,
              isDepositing: false 
            })
            return { success: false, error: errorMessage }
          }
        },

        // Demo withdrawal function
        withdraw: async (amount: number, description = 'Demo withdrawal') => {
          const currentBalance = get().balance
          if (!currentBalance) {
            const error = 'Balance not initialized'
            set({ error })
            return { success: false, error }
          }
          
          if (amount > currentBalance.available) {
            const error = 'Insufficient balance'
            set({ error })
            return { success: false, error }
          }
          
          set({ isWithdrawing: true, error: null })
          
          try {
            await mockApiDelay()
            
            const newBalance = currentBalance.current - amount
            const transaction: Transaction = {
              id: generateTransactionId(),
              userId: currentBalance.userId,
              type: 'withdrawal',
              amount: -amount,
              balanceBefore: currentBalance.current,
              balanceAfter: newBalance,
              description,
              status: 'completed',
              processedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            }
            
            const updatedBalance: Balance = {
              ...currentBalance,
              current: newBalance,
              available: newBalance,
              lastUpdated: new Date().toISOString()
            }
            
            set(state => ({
              balance: updatedBalance,
              transactions: [transaction, ...state.transactions],
              isWithdrawing: false,
              lastUpdate: new Date().toISOString()
            }))
            
            return { success: true }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Withdrawal failed'
            set({ 
              error: errorMessage,
              isWithdrawing: false 
            })
            return { success: false, error: errorMessage }
          }
        },

        // Place a bet (deduct from balance)
        bet: async (amount: number, gameType: string, metadata?: Record<string, any>) => {
          const currentBalance = get().balance
          if (!currentBalance) {
            const error = 'Balance not initialized'
            set({ error })
            return { success: false, error }
          }
          
          if (amount <= 0) {
            const error = 'Invalid bet amount'
            set({ error })
            return { success: false, error }
          }
          
          if (amount > currentBalance.available) {
            const error = 'Insufficient balance for this bet'
            set({ error })
            return { success: false, error }
          }
          
          set({ isBetting: true, error: null })
          
          try {
            await mockApiDelay()
            
            const newBalance = currentBalance.current - amount
            const transactionId = generateTransactionId()
            const transaction: Transaction = {
              id: transactionId,
              userId: currentBalance.userId,
              type: 'bet',
              amount: -amount,
              balanceBefore: currentBalance.current,
              balanceAfter: newBalance,
              gameType,
              description: `${gameType} bet`,
              ...(metadata && { metadata }),
              status: 'completed',
              processedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            }
            
            const updatedBalance: Balance = {
              ...currentBalance,
              current: newBalance,
              available: newBalance,
              lastUpdated: new Date().toISOString()
            }
            
            set(state => ({
              balance: updatedBalance,
              transactions: [transaction, ...state.transactions],
              isBetting: false,
              lastUpdate: new Date().toISOString()
            }))
            
            return { success: true, transactionId }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to place bet'
            set({ 
              error: errorMessage,
              isBetting: false 
            })
            return { success: false, error: errorMessage }
          }
        },

        // Record a win (add to balance)
        win: async (amount: number, gameSessionId: string, metadata?: Record<string, any>) => {
          const currentBalance = get().balance
          if (!currentBalance) {
            const error = 'Balance not initialized'
            set({ error })
            return { success: false, error }
          }
          
          try {
            const newBalance = currentBalance.current + amount
            const transactionId = generateTransactionId()
            const transaction: Transaction = {
              id: transactionId,
              userId: currentBalance.userId,
              type: 'win',
              amount,
              balanceBefore: currentBalance.current,
              balanceAfter: newBalance,
              gameSessionId,
              description: `Game win`,
              ...(metadata && { metadata }),
              status: 'completed',
              processedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            }
            
            const updatedBalance: Balance = {
              ...currentBalance,
              current: newBalance,
              available: newBalance,
              lastUpdated: new Date().toISOString()
            }
            
            set(state => ({
              balance: updatedBalance,
              transactions: [transaction, ...state.transactions],
              lastUpdate: new Date().toISOString()
            }))
            
            return { success: true, transactionId }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to record win'
            set({ error: errorMessage })
            return { success: false, error: errorMessage }
          }
        },

        // Fetch transaction history (mock)
        fetchTransactions: async (page = 1) => {
          set({ isLoading: true, error: null })
          
          try {
            await mockApiDelay()
            
            // For demo, just update pagination
            set(state => ({
              transactionsPagination: {
                ...state.transactionsPagination,
                page,
                total: state.transactions.length
              },
              isLoading: false
            }))
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to fetch transactions',
              isLoading: false 
            })
          }
        },

        // Real-time balance update
        updateBalance: (balanceAmount: number) => {
          const currentBalance = get().balance
          if (currentBalance) {
            set({
              balance: {
                ...currentBalance,
                current: balanceAmount,
                available: balanceAmount,
                lastUpdated: new Date().toISOString()
              },
              lastUpdate: new Date().toISOString()
            })
          }
        },

        // Add new transaction to history
        addTransaction: (transaction: Transaction) => {
          set(state => ({
            transactions: [transaction, ...state.transactions]
          }))
        },

        // Helper: Check if user can afford amount
        canAfford: (amount: number): boolean => {
          const balance = get().balance
          return balance ? balance.available >= amount && amount > 0 : false
        },

        // Helper: Format currency
        formatCurrency: (amount: number): string => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(amount)
        },

        // Clear error
        clearError: () => {
          set({ error: null })
        },

        // Reset store
        reset: () => {
          set({
            balance: null,
            transactions: [],
            isLoading: false,
            error: null,
            stats: null,
            limits: null,
            preferences: null,
            isDepositing: false,
            isWithdrawing: false,
            isBetting: false,
            transactionsPagination: {
              page: 1,
              limit: 20,
              total: 0,
              hasNext: false,
              hasPrevious: false
            }
          })
        }
      }),
      {
        name: 'wallet-store',
        partialize: (state) => ({
          // Only persist balance and last update
          balance: state.balance,
          lastUpdate: state.lastUpdate
        }),
      }
    )
  )
)

// Selector hooks for better performance
export const useBalance = () => useWalletStore(state => state.balance?.current || 0)
export const useFormattedBalance = () => {
  const balance = useWalletStore(state => state.balance?.current || 0)
  const formatCurrency = useWalletStore(state => state.formatCurrency)
  return formatCurrency(balance)
}

export const useTransactions = () => useWalletStore(state => state.transactions)

export const useWalletLoading = () => useWalletStore(state => ({
  isLoading: state.isLoading,
  isDepositing: state.isDepositing,
  isWithdrawing: state.isWithdrawing,
  isBetting: state.isBetting
}))

// Initialize wallet on first use
if (typeof window !== 'undefined') {
  // Auto-initialize balance if not set
  const store = useWalletStore.getState()
  if (!store.balance) {
    store.fetchBalance()
  }
}