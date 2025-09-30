/**
 * Wallet and Transaction Management Types
 * Shared between frontend and backend for type safety
 */

export interface Transaction {
  id: string
  userId: string
  type: TransactionType
  amount: number
  balanceBefore: number
  balanceAfter: number
  gameType?: string
  gameSessionId?: string
  referenceId?: string
  description?: string
  metadata?: Record<string, any>
  status: TransactionStatus
  processedAt: string
  createdAt: string
}

export type TransactionType =
  | 'bet'
  | 'win'
  | 'deposit'
  | 'withdrawal'
  | 'bonus'
  | 'refund'
  | 'transfer_in'
  | 'transfer_out'

export type TransactionStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'

// Enum versions for runtime usage in backend services
export const TransactionTypeEnum = {
  BET: 'bet' as const,
  WIN: 'win' as const,
  DEPOSIT: 'deposit' as const,
  WITHDRAWAL: 'withdrawal' as const,
  BONUS: 'bonus' as const,
  REFUND: 'refund' as const,
  TRANSFER_IN: 'transfer_in' as const,
  TRANSFER_OUT: 'transfer_out' as const,
} as const

export const TransactionStatusEnum = {
  PENDING: 'pending' as const,
  PROCESSING: 'processing' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
  CANCELLED: 'cancelled' as const,
} as const

export interface Balance {
  id?: string
  userId: string
  amount: number // Primary field to match Prisma
  current?: number // Deprecated: use amount instead, kept for backward compatibility
  available?: number // Deprecated: use amount instead
  pending?: number // For locked funds
  currency: string
  lastUpdated: string // Maps to updatedAt from Prisma
  createdAt?: string
  updatedAt?: string
}

export interface DepositRequest {
  amount: number
  currency: string
  paymentMethod: PaymentMethod
  paymentDetails?: Record<string, any>
}

export interface WithdrawalRequest {
  amount: number
  currency: string
  withdrawalMethod: WithdrawalMethod
  withdrawalDetails: Record<string, any>
}

export interface PaymentMethod {
  id: string
  type: PaymentMethodType
  name: string
  details: Record<string, any>
  isActive: boolean
  isDefault: boolean
}

export type PaymentMethodType = 
  | 'credit_card' 
  | 'debit_card' 
  | 'bank_transfer' 
  | 'crypto' 
  | 'e_wallet' 
  | 'demo' // For demo/development

export interface WithdrawalMethod {
  id: string
  type: WithdrawalMethodType
  name: string
  details: Record<string, any>
  isActive: boolean
  isDefault: boolean
}

export type WithdrawalMethodType = 
  | 'bank_transfer' 
  | 'crypto' 
  | 'e_wallet' 
  | 'demo' // For demo/development

export interface GameTransaction {
  gameSessionId: string
  gameType: string
  betAmount: number
  winAmount: number
  multiplier: number
  profitLoss: number
  transactionIds: string[] // References to transaction records
}

// Balance update request for internal use
export interface BalanceUpdateRequest {
  userId: string
  amount: number
  type: TransactionType
  description?: string
  gameType?: string
  gameSessionId?: string
  metadata?: Record<string, any>
}

// Transaction filters for history/search
export interface TransactionFilters {
  userId?: string
  type?: TransactionType[]
  status?: TransactionStatus[]
  gameType?: string[]
  fromDate?: string
  toDate?: string
  minAmount?: number
  maxAmount?: number
  limit?: number
  offset?: number
  sortBy?: 'amount' | 'createdAt' | 'processedAt'
  sortOrder?: 'asc' | 'desc'
}

// Alias for backward compatibility
export type TransactionFilter = TransactionFilters

// Additional missing types for backend services
export interface CreateTransactionRequest {
  userId: string
  type: TransactionType
  amount: number
  currency: string
  description?: string
  gameType?: string
  gameSessionId?: string
  metadata?: Record<string, any>
  status?: TransactionStatus
}

export interface TransferRequest {
  fromUserId: string
  toUserId: string
  amount: number
  currency: string
  description?: string
  metadata?: Record<string, any>
}

// Alias for backward compatibility
export type WithdrawRequest = WithdrawalRequest

export interface TransactionHistory {
  transactions: Transaction[]
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

// Wallet statistics
export interface WalletStats {
  totalDeposits: number
  totalWithdrawals: number
  totalWins: number
  totalLosses: number
  netProfit: number
  transactionCount: number
  averageTransaction: number
  largestTransaction: number
  recentActivity: Transaction[]
}

// Demo/development wallet operations
export interface DemoDepositRequest {
  amount: number
  description?: string
}

export interface DemoWithdrawalRequest {
  amount: number
  description?: string
}

// Wallet operation responses
export interface DepositResponse {
  success: boolean
  transaction?: Transaction
  balance?: Balance
  paymentUrl?: string // For payment processor redirects
  error?: string
}

export interface WithdrawalResponse {
  success: boolean
  transaction?: Transaction
  balance?: Balance
  estimatedCompletion?: string
  error?: string
}

// Balance validation
export interface BalanceValidation {
  isValid: boolean
  currentBalance: number
  requiredAmount: number
  deficit?: number
  canProceed: boolean
  message?: string
}

// Audit trail for transactions
export interface TransactionAudit {
  transactionId: string
  userId: string
  action: string
  beforeState: Record<string, any>
  afterState: Record<string, any>
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

// Rate limiting for wallet operations
export interface WalletRateLimit {
  operation: 'deposit' | 'withdrawal' | 'bet'
  userId: string
  attempts: number
  maxAttempts: number
  windowStart: string
  windowDuration: number // in seconds
  blocked: boolean
  resetTime: string
}

// Transaction limits and settings
export interface TransactionLimits {
  userId: string
  dailyDepositLimit: number
  dailyWithdrawalLimit: number
  weeklyDepositLimit: number
  weeklyWithdrawalLimit: number
  monthlyDepositLimit: number
  monthlyWithdrawalLimit: number
  maxBetAmount: number
  minBetAmount: number
  currentDailyDeposited: number
  currentDailyWithdrawn: number
  currentWeeklyDeposited: number
  currentWeeklyWithdrawn: number
  currentMonthlyDeposited: number
  currentMonthlyWithdrawn: number
}

// Wallet preferences
export interface WalletPreferences {
  userId: string
  defaultCurrency: string
  autoWithdraw: boolean
  autoWithdrawThreshold: number
  notifications: {
    deposits: boolean
    withdrawals: boolean
    lowBalance: boolean
    bigWins: boolean
  }
  security: {
    requirePasswordForWithdrawals: boolean
    require2FAForWithdrawals: boolean
    dailyWithdrawalLimit: number
  }
}

// API response types for wallet operations
export interface WalletApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  balance?: Balance
}

// Real-time balance update for socket connections
export interface BalanceUpdate {
  userId: string
  balance: Balance
  transaction?: Transaction
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'bonus' | 'refund'
  timestamp: string
}

// Wallet state for frontend stores
export interface WalletState {
  balance: Balance | null
  transactions: Transaction[]
  isLoading: boolean
  error: string | null
  stats: WalletStats | null
  limits: TransactionLimits | null
  preferences: WalletPreferences | null
  lastUpdate?: string
}

// Mock payment provider interface (for demo)
export interface MockPaymentProvider {
  processDeposit(request: DepositRequest): Promise<DepositResponse>
  processWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse>
  validatePaymentMethod(method: PaymentMethod): Promise<boolean>
  getTransactionStatus(referenceId: string): Promise<TransactionStatus>
}