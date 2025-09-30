/**
 * Limbo Controls Component
 * Provides betting controls, auto-betting configuration, and game action buttons
 */

'use client'

import React, { useState, useCallback } from 'react'
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Button, 
  Input, 
  Switch,
  Select,
  SelectItem,
  Divider,
  Chip,
  Progress
} from '@heroui/react'
import type { 
  LimboAutoBettingConfig,
  AutoBettingBehavior,
  GameStatus 
} from '@stake-games/shared'

/**
 * Props for LimboControls component
 */
interface LimboControlsProps {
  betAmount: number
  onBetChange: (amount: number) => void
  balance: number
  minBet: number
  maxBet: number
  onPlayRound: () => void
  onStartAutoBetting: () => void
  onStopAutoBetting: () => void
  isAutoBetting: boolean
  autoBetRemaining: number
  autoBetSettings: LimboAutoBettingConfig
  onAutoBetConfigChange: (config: LimboAutoBettingConfig) => void
  gameStatus: GameStatus
  disabled?: boolean
}

/**
 * Quick bet amount presets
 */
const QUICK_BET_PRESETS = [0.1, 1, 5, 10, 25, 50, 100]

/**
 * LimboControls component with betting and auto-betting functionality
 */
export function LimboControls({
  betAmount,
  onBetChange,
  balance,
  minBet,
  maxBet,
  onPlayRound,
  onStartAutoBetting,
  onStopAutoBetting,
  isAutoBetting,
  autoBetRemaining,
  autoBetSettings,
  onAutoBetConfigChange,
  gameStatus,
  disabled = false
}: LimboControlsProps) {
  const [showAutoBetConfig, setShowAutoBetConfig] = useState<boolean>(false)
  const [betInputValue, setBetInputValue] = useState<string>(betAmount.toString())

  /**
   * Handle bet amount input change
   */
  const handleBetInputChange = useCallback((value: string) => {
    setBetInputValue(value)
    
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue > 0) {
      onBetChange(Math.min(Math.max(numValue, minBet), maxBet))
    }
  }, [onBetChange, minBet, maxBet])

  /**
   * Handle bet amount input blur
   */
  const handleBetInputBlur = useCallback(() => {
    const numValue = parseFloat(betInputValue)
    if (isNaN(numValue) || numValue <= 0) {
      setBetInputValue(betAmount.toString())
    }
  }, [betInputValue, betAmount])

  /**
   * Handle quick bet preset click
   */
  const handleQuickBetClick = useCallback((presetAmount: number) => {
    const clampedAmount = Math.min(Math.max(presetAmount, minBet), Math.min(maxBet, balance))
    setBetInputValue(clampedAmount.toString())
    onBetChange(clampedAmount)
  }, [onBetChange, minBet, maxBet, balance])

  /**
   * Handle double bet amount
   */
  const handleDoubleBet = useCallback(() => {
    const newAmount = Math.min(betAmount * 2, Math.min(maxBet, balance))
    setBetInputValue(newAmount.toString())
    onBetChange(newAmount)
  }, [betAmount, onBetChange, maxBet, balance])

  /**
   * Handle half bet amount
   */
  const handleHalfBet = useCallback(() => {
    const newAmount = Math.max(betAmount / 2, minBet)
    setBetInputValue(newAmount.toString())
    onBetChange(newAmount)
  }, [betAmount, onBetChange, minBet])

  /**
   * Handle max bet amount
   */
  const handleMaxBet = useCallback(() => {
    const maxAmount = Math.min(maxBet, balance)
    setBetInputValue(maxAmount.toString())
    onBetChange(maxAmount)
  }, [onBetChange, maxBet, balance])

  /**
   * Handle auto-betting config change
   */
  const handleAutoBetConfigChange = useCallback((key: keyof LimboAutoBettingConfig, value: any) => {
    const newConfig = { ...autoBetSettings, [key]: value }
    onAutoBetConfigChange(newConfig)
  }, [autoBetSettings, onAutoBetConfigChange])

  /**
   * Get button text based on game status
   */
  const getPlayButtonText = useCallback(() => {
    if (isAutoBetting) return `Auto-bet (${autoBetRemaining} left)`
    if (gameStatus === 'loading') return 'Rolling...'
    return 'Roll'
  }, [isAutoBetting, autoBetRemaining, gameStatus])

  /**
   * Check if bet amount is valid
   */
  const isBetValid = betAmount >= minBet && betAmount <= maxBet && betAmount <= balance

  /**
   * Check if auto-betting can start
   */
  const canStartAutoBetting = isBetValid && autoBetSettings.numberOfBets > 0 && !isAutoBetting

  return (
    <div className="space-y-4">
      {/* Manual Betting Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Bet Amount</h3>
            <Chip variant="flat" size="sm">
              Balance: ${balance.toFixed(2)}
            </Chip>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Bet Amount Input */}
          <Input
            type="number"
            value={betInputValue}
            onValueChange={handleBetInputChange}
            onBlur={handleBetInputBlur}
            disabled={disabled || isAutoBetting}
            min={minBet}
            max={Math.min(maxBet, balance)}
            step={0.01}
            startContent="$"
            placeholder="Bet amount"
            isInvalid={!isBetValid}
            errorMessage={
              betAmount < minBet ? `Minimum bet is $${minBet}` :
              betAmount > maxBet ? `Maximum bet is $${maxBet}` :
              betAmount > balance ? 'Insufficient balance' : ''
            }
            classNames={{
              input: "text-center font-semibold"
            }}
          />

          {/* Quick Bet Presets */}
          <div>
            <div className="text-sm font-medium mb-2">Quick Amounts</div>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_BET_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  variant="bordered"
                  onPress={() => handleQuickBetClick(preset)}
                  disabled={disabled || isAutoBetting || preset > balance}
                  className="text-xs"
                >
                  ${preset}
                </Button>
              ))}
            </div>
          </div>

          {/* Bet Adjustment Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              variant="bordered"
              onPress={handleHalfBet}
              disabled={disabled || isAutoBetting}
            >
              1/2
            </Button>
            <Button
              size="sm"
              variant="bordered"
              onPress={handleDoubleBet}
              disabled={disabled || isAutoBetting || betAmount * 2 > balance}
            >
              2x
            </Button>
            <Button
              size="sm"
              variant="bordered"
              onPress={handleMaxBet}
              disabled={disabled || isAutoBetting}
            >
              Max
            </Button>
          </div>

          <Divider />

          {/* Play Button */}
          <Button
            size="lg"
            color="primary"
            onPress={onPlayRound}
            disabled={disabled || !isBetValid || isAutoBetting}
            isLoading={gameStatus === 'loading'}
            className="w-full font-semibold"
          >
            {getPlayButtonText()}
          </Button>
        </CardBody>
      </Card>

      {/* Auto-Betting Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Auto-Betting</h3>
            <Switch
              isSelected={showAutoBetConfig}
              onValueChange={setShowAutoBetConfig}
              size="sm"
            >
              Configure
            </Switch>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Auto-Betting Status */}
          {isAutoBetting ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Remaining Bets</span>
                <Chip color="primary" variant="flat" size="sm">
                  {autoBetRemaining}
                </Chip>
              </div>
              
              <Progress
                value={((autoBetSettings.numberOfBets - autoBetRemaining) / autoBetSettings.numberOfBets) * 100}
                color="primary"
                size="sm"
                showValueLabel
                formatOptions={{
                  style: "percent",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }}
              />
              
              <Button
                color="danger"
                variant="bordered"
                onPress={onStopAutoBetting}
                className="w-full"
                size="sm"
              >
                Stop Auto-Betting
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-default-500 mb-1">Number of Bets</div>
                  <div className="font-semibold">{autoBetSettings.numberOfBets}</div>
                </div>
                <div>
                  <div className="text-sm text-default-500 mb-1">Speed</div>
                  <div className="font-semibold">{(autoBetSettings.speed / 1000).toFixed(1)}s</div>
                </div>
              </div>
              
              <Button
                color="secondary"
                onPress={onStartAutoBetting}
                disabled={!canStartAutoBetting}
                className="w-full"
                size="sm"
              >
                Start Auto-Betting
              </Button>
            </div>
          )}

          {/* Auto-Betting Configuration */}
          {showAutoBetConfig && (
            <div className="space-y-4 pt-4 border-t border-default-200">
              <div className="text-sm font-medium">Auto-Betting Settings</div>
              
              {/* Number of Bets */}
              <Input
                type="number"
                label="Number of Bets"
                value={autoBetSettings.numberOfBets.toString()}
                onValueChange={(value) => handleAutoBetConfigChange('numberOfBets', parseInt(value) || 1)}
                min={1}
                max={1000}
                disabled={isAutoBetting}
                size="sm"
              />

              {/* Speed */}
              <Input
                type="number"
                label="Speed (seconds)"
                value={(autoBetSettings.speed / 1000).toString()}
                onValueChange={(value) => handleAutoBetConfigChange('speed', (parseFloat(value) || 1) * 1000)}
                min={0.5}
                max={5}
                step={0.1}
                disabled={isAutoBetting}
                size="sm"
              />

              {/* On Win/Loss Behavior */}
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="On Win"
                  selectedKeys={[autoBetSettings.onWin]}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as AutoBettingBehavior
                    handleAutoBetConfigChange('onWin', selectedKey)
                  }}
                  disabled={isAutoBetting}
                  size="sm"
                >
                  <SelectItem key="continue" value="continue">Continue</SelectItem>
                  <SelectItem key="reset-base" value="reset-base">Reset to Base</SelectItem>
                  <SelectItem key="increase" value="increase">Increase</SelectItem>
                </Select>

                <Select
                  label="On Loss"
                  selectedKeys={[autoBetSettings.onLoss]}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as AutoBettingBehavior
                    handleAutoBetConfigChange('onLoss', selectedKey)
                  }}
                  disabled={isAutoBetting}
                  size="sm"
                >
                  <SelectItem key="continue" value="continue">Continue</SelectItem>
                  <SelectItem key="reset-base" value="reset-base">Reset to Base</SelectItem>
                  <SelectItem key="increase" value="increase">Increase</SelectItem>
                </Select>
              </div>

              {/* Increase Percentage (if applicable) */}
              {(autoBetSettings.onWin === 'increase' || autoBetSettings.onLoss === 'increase') && (
                <Input
                  type="number"
                  label="Increase Percentage (%)"
                  value={autoBetSettings.increasePercentage.toString()}
                  onValueChange={(value) => handleAutoBetConfigChange('increasePercentage', parseFloat(value) || 0)}
                  min={0}
                  max={100}
                  disabled={isAutoBetting}
                  size="sm"
                />
              )}

              {/* Stop Conditions */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Stop Conditions</div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    size="sm"
                    isSelected={autoBetSettings.stopOnWin}
                    onValueChange={(checked) => handleAutoBetConfigChange('stopOnWin', checked)}
                    disabled={isAutoBetting}
                  />
                  <span className="text-sm">Stop on any win</span>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    size="sm"
                    isSelected={autoBetSettings.stopOnLoss}
                    onValueChange={(checked) => handleAutoBetConfigChange('stopOnLoss', checked)}
                    disabled={isAutoBetting}
                  />
                  <span className="text-sm">Stop on any loss</span>
                </div>

                {/* Win/Loss Amount Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    label="Stop at Profit ($)"
                    value={autoBetSettings.winAmount.toString()}
                    onValueChange={(value) => handleAutoBetConfigChange('winAmount', parseFloat(value) || 0)}
                    min={0}
                    disabled={isAutoBetting}
                    size="sm"
                    placeholder="0 = disabled"
                  />

                  <Input
                    type="number"
                    label="Stop at Loss ($)"
                    value={autoBetSettings.lossAmount.toString()}
                    onValueChange={(value) => handleAutoBetConfigChange('lossAmount', parseFloat(value) || 0)}
                    min={0}
                    disabled={isAutoBetting}
                    size="sm"
                    placeholder="0 = disabled"
                  />
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}