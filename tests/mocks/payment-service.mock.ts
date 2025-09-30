/**
 * Payment Service Mock for Testing
 * Provides mock implementations of payment processing functionality
 */

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'bank_transfer' | 'crypto';
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  isDefault?: boolean;
}

export interface PaymentTransaction {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  paymentMethodId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  failureReason?: string;
}

export interface DepositRequest {
  userId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
}

export interface WithdrawalRequest {
  userId: string;
  amount: number;
  currency: string;
  destination: string;
}

/**
 * Mock payment service for testing
 * Simulates real payment processing without external API calls
 */
export class MockPaymentService {
  private transactions: Map<string, PaymentTransaction> = new Map();
  private paymentMethods: Map<string, PaymentMethod> = new Map();
  private shouldFailNext: boolean = false;
  private failureReason: string = 'Payment failed';

  /**
   * Configure mock to fail next operation (for error testing)
   */
  setNextOperationFailure(reason: string = 'Mock payment failure'): void {
    this.shouldFailNext = true;
    this.failureReason = reason;
  }

  /**
   * Reset mock to normal operation
   */
  resetToNormalOperation(): void {
    this.shouldFailNext = false;
    this.failureReason = 'Payment failed';
  }

  /**
   * Mock deposit processing
   */
  async processDeposit(request: DepositRequest): Promise<PaymentTransaction> {
    const transactionId = `mock-deposit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    const transaction: PaymentTransaction = {
      id: transactionId,
      amount: request.amount,
      currency: request.currency,
      status: this.shouldFailNext ? 'failed' : 'success',
      paymentMethodId: request.paymentMethodId,
      userId: request.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      failureReason: this.shouldFailNext ? this.failureReason : undefined
    };

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    this.transactions.set(transactionId, transaction);

    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      throw new Error(this.failureReason);
    }

    return transaction;
  }

  /**
   * Mock withdrawal processing
   */
  async processWithdrawal(request: WithdrawalRequest): Promise<PaymentTransaction> {
    const transactionId = `mock-withdrawal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    const transaction: PaymentTransaction = {
      id: transactionId,
      amount: -request.amount, // Negative for withdrawal
      currency: request.currency,
      status: this.shouldFailNext ? 'failed' : 'pending', // Withdrawals typically start as pending
      paymentMethodId: 'withdrawal-method',
      userId: request.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      failureReason: this.shouldFailNext ? this.failureReason : undefined
    };

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 200));

    this.transactions.set(transactionId, transaction);

    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      throw new Error(this.failureReason);
    }

    return transaction;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    return this.transactions.get(transactionId) || null;
  }

  /**
   * Get user's transactions
   */
  async getUserTransactions(userId: string): Promise<PaymentTransaction[]> {
    return Array.from(this.transactions.values()).filter(t => t.userId === userId);
  }

  /**
   * Add payment method for testing
   */
  async addPaymentMethod(paymentMethod: PaymentMethod): Promise<PaymentMethod> {
    this.paymentMethods.set(paymentMethod.id, paymentMethod);
    return paymentMethod;
  }

  /**
   * Get user's payment methods
   */
  async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    // In real implementation, would filter by userId
    return Array.from(this.paymentMethods.values());
  }

  /**
   * Simulate webhook callback for transaction status updates
   */
  async simulateWebhook(transactionId: string, newStatus: PaymentTransaction['status']): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (transaction) {
      transaction.status = newStatus;
      transaction.updatedAt = new Date();
      this.transactions.set(transactionId, transaction);
    }
  }

  /**
   * Clear all mock data
   */
  clear(): void {
    this.transactions.clear();
    this.paymentMethods.clear();
    this.shouldFailNext = false;
  }
}

/**
 * Pre-configured test payment methods
 */
export const testPaymentMethods = {
  validCreditCard: {
    id: 'test-cc-1',
    type: 'credit_card' as const,
    last4: '4242',
    expiryMonth: 12,
    expiryYear: 2025,
    brand: 'visa',
    isDefault: true
  },
  expiredCreditCard: {
    id: 'test-cc-expired',
    type: 'credit_card' as const,
    last4: '0000',
    expiryMonth: 1,
    expiryYear: 2020,
    brand: 'mastercard',
    isDefault: false
  },
  bankTransfer: {
    id: 'test-bank-1',
    type: 'bank_transfer' as const,
    isDefault: false
  },
  crypto: {
    id: 'test-crypto-1',
    type: 'crypto' as const,
    isDefault: false
  }
};

/**
 * Common test scenarios for payment testing
 */
export const paymentTestScenarios = {
  successfulDeposit: {
    amount: 100.00,
    currency: 'USD',
    expectedStatus: 'success'
  },
  failedDeposit: {
    amount: 50.00,
    currency: 'USD',
    expectedStatus: 'failed',
    failureReason: 'Insufficient funds'
  },
  largeDeposit: {
    amount: 10000.00,
    currency: 'USD',
    expectedStatus: 'success'
  },
  smallWithdrawal: {
    amount: 25.00,
    currency: 'USD',
    expectedStatus: 'pending'
  },
  largeWithdrawal: {
    amount: 5000.00,
    currency: 'USD',
    expectedStatus: 'pending'
  }
};

// Export singleton instance for testing
export const mockPaymentService = new MockPaymentService();