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
  Select,
  SelectItem,
  Card,
  CardBody,
  Chip,
  Divider
} from '@heroui/react'
import { useWalletStore } from '@/stores/wallet'
import { useUIStore } from '@/stores/ui'
import { PaymentMethod } from 'shared/types/wallet'

// Withdrawal form validation schema
const withdrawSchema = z.object({
  amount: z
    .number()
    .min(10, 'Minimum withdrawal is $10')
    .max(5000, 'Maximum withdrawal is $5,000'),
  paymentMethod: z.string().min(1, 'Please select a withdrawal method'),
  accountDetails: z.string().min(1, 'Account details are required')
})

type WithdrawFormData = z.infer<typeof withdrawSchema>

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * WithdrawModal component for handling fund withdrawals
 * 
 * Features:
 * - Balance validation before withdrawal
 * - Multiple withdrawal method options (mock for demo)
 * - Account details collection
 * - Processing states and feedback
 * - Responsive design
 * - Demo mode indicators
 * - Minimum/maximum withdrawal limits
 */
export function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const { withdraw, isWithdrawing, balance, canAfford, formatCurrency } = useWalletStore()
  const { addToast } = useUIStore()
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('BANK_TRANSFER')

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
    setValue
  } = useForm<WithdrawFormData>({
    resolver: zodResolver(withdrawSchema),
    mode: 'onChange',
    defaultValues: {
      paymentMethod: 'BANK_TRANSFER'
    }
  })

  const watchAmount = watch('amount', 0)

  // Mock withdrawal methods for demo
  const withdrawalMethods = [
    {
      id: 'BANK_TRANSFER',
      name: 'Bank Transfer',
      description: 'Direct transfer to your bank account',
      icon: '🏦',
      processingTime: '3-5 business days',
      fees: 'Free',
      accountPlaceholder: 'Account number or IBAN'
    },
    {
      id: 'CRYPTO',
      name: 'Cryptocurrency',
      description: 'Bitcoin, Ethereum wallet address',
      icon: '₿',
      processingTime: '30-60 minutes',
      fees: 'Network fees apply',
      accountPlaceholder: 'Wallet address'
    },
    {
      id: 'E_WALLET',
      name: 'E-Wallet',
      description: 'PayPal, Skrill, Neteller account',
      icon: '💰',
      processingTime: '1-3 business days',
      fees: 'Small transaction fee',
      accountPlaceholder: 'Account email or ID'
    }
  ]

  const selectedWithdrawalMethod = withdrawalMethods.find(method => method.id === selectedMethod)

  const onSubmit = async (data: WithdrawFormData) => {
    // Additional validation
    if (!canAfford(data.amount)) {
      addToast({
        title: 'Insufficient balance',
        message: 'You do not have enough funds for this withdrawal',
        type: 'error'
      })
      return
    }

    try {
      await withdraw({
        amount: data.amount,
        paymentMethod: data.paymentMethod as PaymentMethod,
        metadata: {
          accountDetails: data.accountDetails,
          clientType: 'web'
        }
      })

      addToast({
        title: 'Withdrawal submitted!',
        message: `${formatCurrency(data.amount)} withdrawal is being processed`,
        type: 'success'
      })

      reset()
      onClose()
    } catch (error) {
      addToast({
        title: 'Withdrawal failed',
        message: error instanceof Error ? error.message : 'Something went wrong',
        type: 'error'
      })
    }
  }

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId as PaymentMethod)
    setValue('paymentMethod', methodId, { shouldValidate: true })
    setValue('accountDetails', '', { shouldValidate: false })
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // Calculate fees (mock)
  const calculateFees = (amount: number) => {
    if (selectedMethod === 'E_WALLET') {
      return Math.max(amount * 0.025, 2) // 2.5% with min $2
    }
    return 0
  }

  const fees = calculateFees(watchAmount || 0)
  const netAmount = (watchAmount || 0) - fees

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      placement="center"
      size="xl"
      classNames={{
        base: "bg-card/95 backdrop-blur-md border border-border/50",
        closeButton: "hover:bg-danger/10 hover:text-danger"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full"
          >
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-warning to-orange-500 rounded-xl flex items-center justify-center shadow-glow mr-3">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13H5v-2h14v2z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold gradient-text">Withdraw Funds</h2>
            </div>
            
            {/* Demo Warning */}
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <p className="text-sm text-warning font-medium">
                  Demo Mode: No real money is processed
                </p>
              </div>
            </div>
            
            <p className="text-muted-foreground">
              Available balance: <span className="font-medium text-success">{formatCurrency(balance)}</span>
            </p>
          </motion.div>
        </ModalHeader>

        <ModalBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Withdrawal Method Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold">Withdrawal Method</h3>
              
              <div className="grid grid-cols-1 gap-3">
                {withdrawalMethods.map((method) => (
                  <Card
                    key={method.id}
                    isPressable
                    isHoverable
                    className={`cursor-pointer transition-all ${
                      selectedMethod === method.id 
                        ? 'border-2 border-warning bg-warning/5' 
                        : 'border border-border/50 hover:border-primary/50'
                    }`}
                    onPress={() => handleMethodSelect(method.id)}
                  >
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{method.icon}</span>
                          <div>
                            <p className="font-medium">{method.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {method.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{method.processingTime}</p>
                          <p className="text-xs text-muted-foreground">{method.fees}</p>
                        </div>
                        {selectedMethod === method.id && (
                          <div className="w-5 h-5 bg-warning rounded-full flex items-center justify-center ml-3">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>

            <Divider />

            {/* Amount Input */}
            <div className="space-y-4">
              <h3 className="font-semibold">Withdrawal Amount</h3>
              
              <Input
                {...register('amount', { valueAsNumber: true })}
                label="Amount to withdraw"
                placeholder="Enter amount"
                type="number"
                variant="bordered"
                isInvalid={!!errors.amount}
                errorMessage={errors.amount?.message}
                startContent={
                  <span className="text-default-400 text-small">$</span>
                }
                description={`Minimum: $10, Maximum: $5,000`}
              />

              {/* Balance Check Warning */}
              {watchAmount > 0 && !canAfford(watchAmount) && (
                <div className="bg-danger/10 border border-danger/20 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-danger" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    <p className="text-sm text-danger font-medium">
                      Insufficient balance for this withdrawal
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Account Details */}
            {selectedWithdrawalMethod && (
              <div className="space-y-4">
                <h3 className="font-semibold">Account Details</h3>
                
                <Input
                  {...register('accountDetails')}
                  label={`${selectedWithdrawalMethod.name} Details`}
                  placeholder={selectedWithdrawalMethod.accountPlaceholder}
                  variant="bordered"
                  isInvalid={!!errors.accountDetails}
                  errorMessage={errors.accountDetails?.message}
                  startContent={
                    <span className="text-2xl">{selectedWithdrawalMethod.icon}</span>
                  }
                />
                
                <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  <p className="font-medium mb-1">Important:</p>
                  <ul className="space-y-1">
                    <li>• Ensure account details are correct to avoid delays</li>
                    <li>• Withdrawals are processed during business hours</li>
                    <li>• You may need to verify your identity for large withdrawals</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Hidden input for form validation */}
            <input
              {...register('paymentMethod')}
              type="hidden"
              value={selectedMethod}
            />

            {/* Transaction Summary */}
            {watchAmount > 0 && canAfford(watchAmount) && (
              <Card className="bg-muted/30">
                <CardBody className="p-4">
                  <h4 className="font-medium mb-3">Transaction Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Withdrawal amount:</span>
                      <span>{formatCurrency(watchAmount)}</span>
                    </div>
                    {fees > 0 && (
                      <div className="flex justify-between text-warning">
                        <span>Processing fees:</span>
                        <span>-{formatCurrency(fees)}</span>
                      </div>
                    )}
                    <Divider />
                    <div className="flex justify-between font-medium">
                      <span>You will receive:</span>
                      <span className="text-success">{formatCurrency(netAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Processing time:</span>
                      <span>{selectedWithdrawalMethod?.processingTime}</span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </form>
        </ModalBody>

        <ModalFooter className="flex gap-2">
          <Button
            variant="light"
            onPress={handleClose}
            isDisabled={isWithdrawing}
          >
            Cancel
          </Button>
          <Button
            color="warning"
            onPress={handleSubmit(onSubmit)}
            isLoading={isWithdrawing}
            isDisabled={!isValid || !canAfford(watchAmount || 0)}
            className="flex-1"
          >
            {isWithdrawing ? 'Processing...' : `Withdraw ${formatCurrency(netAmount || 0)}`}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}