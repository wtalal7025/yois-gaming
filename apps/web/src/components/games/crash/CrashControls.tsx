/**
 * Crash Controls Component
 * Handles betting, auto-cashout settings, and game configuration
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardBody, CardHeader, Button, Input, Switch, Slider, Divider } from '@heroui/react'
import type { CrashConfig, CrashGameState } from '@stake-games/shared'

interface CrashControlsProps {
  config: CrashConfig
  onConfigChange: (config: Partial<CrashConfig>) => void
  betAmount: number
  onBetChange: (amount: number) => void
  balance: number
  minBet: number
  maxBet: number
  gameState: CrashGameState | null
  gameStatus: string
  onStartGame: () => void
  onCashOut: () => void
  onNewGame: () => void
  canPlaceBet: boolean
  canCashOut: boolean
}

export function CrashControls({
  config,
  onConfigChange,
  betAmount,
  onBetChange,
  balance,
  minBet,
  maxBet,
  gameState,
  gameStatus,
  onStartGame,
  onCashOut,
  onNewGame,
  canPlaceBet,
  canCashOut
}: CrashControlsProps) {
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(config.autoCashout?.enabled || false)
  const [autoCashoutTarget, setAutoCashoutTarget] = useState(config.autoCashout?.target || 2.0)
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(config.autoPlay?.enabled || false)
  const [autoPlayRounds, setAutoPlayRounds] = useState(config.autoPlay?.numberOfRounds || 10)
  const [stopOnBigWin, setStopOnBigWin] = useState(config.autoPlay?.stopOnBigWin || 0)
  const [stopOnBalance, setStopOnBalance] = useState(config.autoPlay?.stopOnBalance || 0)

  /**
   * Handle bet amount change with validation
   */
  const handleBetAmountChange = useCallback((value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue >= minBet && numValue <= maxBet && numValue <= balance) {
      onBetChange(numValue)
    }
  }, [minBet, maxBet, balance, onBetChange])

  /**
   * Set bet to percentage of balance
   */
  const setBetPercentage = useCallback((percentage: number) => {
    const newBet = Math.min(balance * (percentage / 100), maxBet)
    const roundedBet = Math.max(Math.round(newBet * 100) / 100, minBet)
    onBetChange(roundedBet)
  }, [balance, maxBet, minBet, onBetChange])

  /**
   * Double bet amount
   */
  const doubleBet = useCallback(() => {
    const newBet = Math.min(betAmount * 2, maxBet, balance)
    onBetChange(newBet)
  }, [betAmount, maxBet, balance, onBetChange])

  /**
   * Half bet amount
   */
  const halfBet = useCallback(() => {
    const newBet = Math.max(betAmount / 2, minBet)
    onBetChange(Math.round(newBet * 100) / 100)
  }, [betAmount, minBet, onBetChange])

  /**
   * Handle auto-cashout toggle
   */
  const handleAutoCashoutToggle = useCallback((enabled: boolean) => {
    setAutoCashoutEnabled(enabled)
    onConfigChange({
      autoCashout: {
        enabled,
        target: autoCashoutTarget,
        minTarget: 1.01,
        maxTarget: 1000
      }
    })
  }, [autoCashoutTarget, onConfigChange])

  /**
   * Handle auto-cashout target change
   */
  const handleAutoCashoutTargetChange = useCallback((target: number) => {
    setAutoCashoutTarget(target)
    onConfigChange({
      autoCashout: {
        enabled: autoCashoutEnabled,
        target,
        minTarget: 1.01,
        maxTarget: 1000
      }
    })
  }, [autoCashoutEnabled, onConfigChange])

  /**
   * Handle auto-play toggle
   */
  const handleAutoPlayToggle = useCallback((enabled: boolean) => {
    setAutoPlayEnabled(enabled)
    onConfigChange({
      autoPlay: {
        enabled,
        numberOfRounds: autoPlayRounds,
        stopOnBigWin,
        stopOnBalance
      }
    })
  }, [autoPlayRounds, stopOnBigWin, stopOnBalance, onConfigChange])

  /**
   * Handle auto-play configuration changes
   */
  const handleAutoPlayConfigChange = useCallback((newConfig: {
    numberOfRounds?: number
    stopOnBigWin?: number
    stopOnBalance?: number
  }) => {
    const updatedRounds = newConfig.numberOfRounds !== undefined ? newConfig.numberOfRounds : autoPlayRounds
    const updatedStopOnBigWin = newConfig.stopOnBigWin !== undefined ? newConfig.stopOnBigWin : stopOnBigWin
    const updatedStopOnBalance = newConfig.stopOnBalance !== undefined ? newConfig.stopOnBalance : stopOnBalance
    
    setAutoPlayRounds(updatedRounds)
    setStopOnBigWin(updatedStopOnBigWin)
    setStopOnBalance(updatedStopOnBalance)
    
    onConfigChange({
      autoPlay: {
        enabled: autoPlayEnabled,
        numberOfRounds: updatedRounds,
        stopOnBigWin: updatedStopOnBigWin,
        stopOnBalance: updatedStopOnBalance
      }
    })
  }, [autoPlayEnabled, autoPlayRounds, stopOnBigWin, stopOnBalance, onConfigChange])

  // Calculate potential payout
  const potentialPayout = gameState ? betAmount * (gameState.currentMultiplier || 1) : betAmount

  return (
    <div className="space-y-4">
      {/* Bet Controls */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Bet Controls</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Balance Display */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-default-600">Balance:</span>
            <span className="font-semibold text-success">${balance.toFixed(2)}</span>
          </div>

          {/* Bet Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bet Amount</label>
            <Input
              type="number"
              value={betAmount.toString()}
              onValueChange={handleBetAmountChange}
              placeholder="Enter bet amount"
              startContent={<span className="text-default-500">$</span>}
              min={minBet}
              max={Math.min(maxBet, balance)}
              step={0.01}
              isDisabled={!canPlaceBet}
              classNames={{
                input: "text-right"
              }}
            />
            <div className="flex justify-between text-xs text-default-500">
              <span>Min: ${minBet}</span>
              <span>Max: ${Math.min(maxBet, balance).toFixed(2)}</span>
            </div>
          </div>

          {/* Quick Bet Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <Button
              size="sm"
              variant="flat"
              onPress={() => setBetPercentage(25)}
              isDisabled={!canPlaceBet}
            >
              25%
            </Button>
            <Button
              size="sm"
              variant="flat"
              onPress={() => setBetPercentage(50)}
              isDisabled={!canPlaceBet}
            >
              50%
            </Button>
            <Button
              size="sm"
              variant="flat"
              onPress={halfBet}
              isDisabled={!canPlaceBet || betAmount <= minBet}
            >
              ½
            </Button>
            <Button
              size="sm"
              variant="flat"
              onPress={doubleBet}
              isDisabled={!canPlaceBet || betAmount * 2 > Math.min(maxBet, balance)}
            >
              2×
            </Button>
          </div>

          {/* Potential Payout */}
          {gameState && (
            <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg border border-success/20">
              <span className="text-sm text-success">Potential Payout:</span>
              <span className="font-semibold text-success">${potentialPayout.toFixed(2)}</span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Auto-Cashout Settings */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Auto-Cashout</h3>
            <Switch
              isSelected={autoCashoutEnabled}
              onValueChange={handleAutoCashoutToggle}
              size="sm"
              color="success"
            />
          </div>
        </CardHeader>
        {autoCashoutEnabled && (
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Auto-Cashout at</label>
                <span className="text-sm font-semibold text-success">
                  {autoCashoutTarget.toFixed(2)}x
                </span>
              </div>
              <Slider
                size="sm"
                step={0.01}
                minValue={1.01}
                maxValue={100}
                value={autoCashoutTarget}
                onChange={(value) => handleAutoCashoutTargetChange(Array.isArray(value) ? value[0]! : value)}
                color="success"
                showTooltip={true}
                formatOptions={{ style: 'decimal', minimumFractionDigits: 2 }}
                classNames={{
                  value: "text-success"
                }}
              />
            </div>
            <div className="text-xs text-default-500">
              Automatically cash out when the multiplier reaches this value
            </div>
          </CardBody>
        )}
      </Card>

      {/* Auto-Play Settings */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Auto-Play</h3>
            <Switch
              isSelected={autoPlayEnabled}
              onValueChange={handleAutoPlayToggle}
              size="sm"
              color="primary"
            />
          </div>
        </CardHeader>
        {autoPlayEnabled && (
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Rounds</label>
              <Input
                type="number"
                value={autoPlayRounds.toString()}
                onValueChange={(value) => handleAutoPlayConfigChange({ numberOfRounds: parseInt(value) || 10 })}
                min={1}
                max={1000}
                size="sm"
              />
            </div>

            <Divider />

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Stop on Big Win (multiplier)</label>
                <Input
                  type="number"
                  value={stopOnBigWin.toString()}
                  onValueChange={(value) => handleAutoPlayConfigChange({ stopOnBigWin: parseFloat(value) || 0 })}
                  placeholder="0 = disabled"
                  min={0}
                  step={0.01}
                  size="sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stop on Balance ($)</label>
                <Input
                  type="number"
                  value={stopOnBalance.toString()}
                  onValueChange={(value) => handleAutoPlayConfigChange({ stopOnBalance: parseFloat(value) || 0 })}
                  placeholder="0 = disabled"
                  min={0}
                  step={0.01}
                  size="sm"
                />
              </div>
            </div>
          </CardBody>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="space-y-2">
        {canPlaceBet ? (
          <Button
            color="primary"
            size="lg"
            className="w-full font-bold"
            onPress={onStartGame}
            isDisabled={betAmount > balance || betAmount < minBet}
          >
            Bet ${betAmount.toFixed(2)}
          </Button>
        ) : canCashOut ? (
          <Button
            color="success"
            size="lg"
            className="w-full font-bold"
            onPress={onCashOut}
          >
            Cash Out
          </Button>
        ) : (
          <Button
            color="default"
            size="lg"
            className="w-full font-bold"
            onPress={onNewGame}
            isDisabled={gameStatus === 'loading'}
          >
            {gameStatus === 'waiting' ? 'Waiting...' : 'Next Round'}
          </Button>
        )}

        {/* Auto-play start/stop */}
        {autoPlayEnabled && (
          <Button
            color={gameStatus === 'idle' ? 'primary' : 'danger'}
            size="md"
            variant="flat"
            className="w-full"
            onPress={gameStatus === 'idle' ? onStartGame : onNewGame}
          >
            {gameStatus === 'idle' ? `Start Auto-Play (${autoPlayRounds} rounds)` : 'Stop Auto-Play'}
          </Button>
        )}
      </div>

      {/* Game Status */}
      <Card className="border-default-200">
        <CardBody className="py-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-default-600">Game Status:</span>
            <span className={`font-semibold capitalize ${
              gameStatus === 'flying' ? 'text-success' :
              gameStatus === 'crashed' ? 'text-danger' :
              gameStatus === 'waiting' ? 'text-warning' :
              'text-default-700'
            }`}>
              {gameStatus === 'betting-closed' ? 'Starting...' : gameStatus}
            </span>
          </div>
          {gameState && (
            <>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-default-600">Round:</span>
                <span className="font-semibold">#{gameState.roundNumber}</span>
              </div>
              {gameState.currentMultiplier > 1 && (
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-default-600">Current:</span>
                  <span className="font-semibold text-success">{gameState.currentMultiplier.toFixed(2)}x</span>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}