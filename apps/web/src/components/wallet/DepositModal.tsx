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

// Deposit form validation schema
const depositSchema = z.object({
  amount: z
    .number()
    .min(5, 'Minimum deposit is $5')
    .max(10000, 'Maximum deposit is $10,000'),
  paymentMethod: z.string().min(1, 'Please select a payment method'),
  bonusCode: z.string().optional()
})

type DepositFormData = z.infer<typeof depositSchema>

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * DepositModal component for handling fund deposits
 * 
 * Features:
 * - Multiple payment method options (mock for demo)
 * - Amount validation with min/max limits
 * - Bonus code input
 * - Processing states and feedback
 * - Responsive design
 * - Demo mode indicators
 */
export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { deposit, isDepositing, balance, formatCurrency } = useWalletStore()
  const { addToast } = useUIStore()
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CREDIT_CARD')

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
    setValue
  } = useForm<DepositFormData>({
    resolver: zodResolver(depositSchema),
    mode: 'onChange',
    defaultValues: {
      amount: 50,
      paymentMethod: 'CREDIT_CARD'
    }
  })

  const watchAmount = watch('amount', 50)

  // Quick amount buttons
  const quickAmounts = [25, 50, 100, 250, 500, 1000]

  // Mock payment methods for demo
  const paymentMethods = [
    {
      id: 'CREDIT_CARD',
      name: 'Credit Card',
      description: 'Visa, MasterCard, American Express',
      icon: '💳',
      processingTime: 'Instant',
      fees: 'Free'
    },
    {
      id: 'BANK_TRANSFER',
      name: 'Bank Transfer',
      description: 'Direct bank account transfer',
      icon: '🏦',
      processingTime: '1-3 business days',
      fees: 'Free'
    },
    {
      id: 'CRYPTO',
      name: 'Cryptocurrency',
      description: 'Bitcoin, Ethereum, Litecoin',
      icon: '₿',
      processingTime: '15-30 minutes',
      fees: 'Network fees apply'
    },
    {
      id: 'E_WALLET',
      name: 'E-Wallet',
      description: 'PayPal, Skrill, Neteller',
      icon: '💰',
      processingTime: 'Instant',
      fees: 'Free'
    }
  ]

  const selectedPaymentMethod = paymentMethods.find(method => method.id === selectedMethod)

  const onSubmit = async (data: DepositFormData) => {
    try {
      await deposit({
        amount: data.amount,
        paymentMethod: data.paymentMethod as PaymentMethod,
        metadata: {
          bonusCode: data.bonusCode,
          clientType: 'web'
        }
      })

      addToast({
        title: 'Deposit successful!',
        message: `${formatCurrency(data.amount)} has been added to your account`,
        type: 'success'
      })

      reset()
      onClose()
    } catch (error) {
      addToast({
        title: 'Deposit failed',
        message: error instanceof Error ? error.message : 'Something went wrong',
        type: 'error'
      })
    }
  }

  const handleQuickAmount = (amount: number) => {
    setValue('amount', amount, { shouldValidate: true })
  }

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId as PaymentMethod)
    setValue('paymentMethod', methodId, { shouldValidate: true })
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      placement="center"
      size="2xl"
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
              <div className="w-12 h-12 bg-gradient-to-br from-success to-success-600 rounded-xl flex items-center justify-center shadow-glow mr-3">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold gradient-text">Add Funds</h2>
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
              Current balance: <span className="font-medium">{formatCurrency(balance)}</span>
            </p>
          </motion.div>
        </ModalHeader>

        <ModalBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Amount Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold">Deposit Amount</h3>
              
              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant={watchAmount === amount ? 'solid' : 'bordered'}
                    color={watchAmount === amount ? 'success' : 'default'}
                    size="sm"
                    onPress={() => handleQuickAmount(amount)}
                    className="h-12"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>

              {/* Custom Amount Input */}
              <Input
                {...register('amount', { valueAsNumber: true })}
                label="Custom Amount"
                placeholder="Enter amount"
                type="number"
                variant="bordered"
                isInvalid={!!errors.amount}
                errorMessage={errors.amount?.message}
                startContent={
                  <span className="text-default-400 text-small">$</span>
                }
              />
            </div>

            <Divider />

            {/* Payment Method Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold">Payment Method</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {paymentMethods.map((method) => (
                  <Card
                    key={method.id}
                    isPressable
                    isHoverable
                    className={`cursor-pointer transition-all ${
                      selectedMethod === method.id 
                        ? 'border-2 border-success bg-success/5' 
                        : 'border border-border/50 hover:border-primary/50'
                    }`}
                    onPress={() => handleMethodSelect(method.id)}
                  >
                    <CardBody className="p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{method.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {method.description}
                          </p>
                        </div>
                        {selectedMethod === method.id && (
                          <div className="w-5 h-5 bg-success rounded-full flex items-center justify-center">
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

              {/* Selected Method Details */}
              {selectedPaymentMethod && (
                <Card className="bg-muted/30">
                  <CardBody className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium mb-2">Transaction Details</p>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Processing time:</span>
                            <span>{selectedPaymentMethod.processingTime}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fees:</span>
                            <span>{selectedPaymentMethod.fees}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>

            {/* Bonus Code */}
            <div className="space-y-2">
              <Input
                {...register('bonusCode')}
                label="Bonus Code (Optional)"
                placeholder="Enter bonus code if you have one"
                variant="bordered"
                startContent={
                  <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                }
              />
            </div>

            {/* Hidden input for form validation */}
            <input
              {...register('paymentMethod')}
              type="hidden"
              value={selectedMethod}
            />

            {/* Summary */}
            {watchAmount > 0 && (
              <Card className="bg-success/5 border border-success/20">
                <CardBody className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">You will receive:</span>
                    <span className="text-xl font-bold text-success">
                      {formatCurrency(watchAmount)}
                    </span>
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
            isDisabled={isDepositing}
          >
            Cancel
          </Button>
          <Button
            color="success"
            onPress={handleSubmit(onSubmit)}
            isLoading={isDepositing}
            isDisabled={!isValid}
            className="flex-1"
          >
            {isDepositing ? 'Processing...' : `Deposit ${formatCurrency(watchAmount || 0)}`}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}