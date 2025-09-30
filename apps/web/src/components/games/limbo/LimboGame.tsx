/**
 * Main Limbo Game Component
 * Integrates all Limbo game components and manages multiplier prediction game state
 */

'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardBody, CardHeader, Button, Spinner, Chip } from '@heroui/react'
import type { 
  LimboGameState, 
  LimboConfig, 
  LimboResult,
  LimboAction,
  LimboAutoBettingConfig,
  GameStatus 
} from '@stake-games/shared'
import { LIMBO_CONSTANTS } from '@stake-games/shared'
import { useWalletStore } from '../../../stores/wallet'
import { useAuthStore } from '../../../stores/auth'
import { MultiplierInput } from './MultiplierInput'
import { LimboControls } from './LimboControls'
import { LimboStats } from './LimboStats'

/**
 * Props for LimboGame component
 */
interface LimboGameProps {
  onGameResult?: (result: LimboResult) => void
  minBet?: number
  maxBet?: number
}

/**
 * Game history entry for tracking results
 */
interface GameHistoryEntry {
  id: string
  timestamp: Date
  betAmount: number
  targetMultiplier: number
  generatedMultiplier: number
  isWin: boolean
  payout: number
  profit: number
}

/**
 * Main Limbo multiplier prediction game component
 */
export function LimboGame({
  onGameResult,
  minBet = 0.01,
  maxBet = 1000
}: LimboGameProps) {
  // Wallet and auth integration
  const { bet, win, canAfford } = useWalletStore()
  const balance = useWalletStore(state => state.balance?.current || 0)
  const { user, isAuthenticated } = useAuthStore()

  // Game state management
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')
  const [gameState, setGameState] = useState<LimboGameState | null>(null)
  const [gameConfig, setGameConfig] = useState<LimboConfig>({
    minTargetMultiplier: LIMBO_CONSTANTS.MIN_TARGET_MULTIPLIER,
    maxTargetMultiplier: LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER,
    houseEdge: LIMBO_CONSTANTS.DEFAULT_HOUSE_EDGE,
    multiplierPrecision: LIMBO_CONSTANTS.MULTIPLIER_PRECISION,
    quickPresets: [...LIMBO_CONSTANTS.QUICK_PRESETS]
  })

  // Game parameters
  const [betAmount, setBetAmount] = useState<number>(1.0)
  const [targetMultiplier, setTargetMultiplier] = useState<number>(2.0)
  
  // Game results and history
  const [currentResult, setCurrentResult] = useState<LimboResult | null>(null)
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([])
  const [isAutoBetting, setIsAutoBetting] = useState<boolean>(false)
  const [autoBetRemaining, setAutoBetRemaining] = useState<number>(0)
  const [autoBetSettings, setAutoBetSettings] = useState<LimboAutoBettingConfig>({
    enabled: false,
    numberOfBets: 10,
    onWin: 'continue',
    onLoss: 'continue',
    stopOnWin: false,
    stopOnLoss: false,
    winAmount: 0,
    lossAmount: 0,
    increaseOnWin: false,
    increaseOnLoss: false,
    increasePercentage: 10,
    resetOnWin: false,
    resetOnLoss: false,
    speed: 1000
  })

  // Refs for auto-betting control
  const autoBetIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isAutoBettingRef = useRef<boolean>(false)

  /**
   * Calculate win probability for current target multiplier
   */
  const calculateWinProbability = useCallback((target: number): number => {
    return LIMBO_CONSTANTS.WIN_PROBABILITY_NUMERATOR / target * (1 - gameConfig.houseEdge)
  }, [gameConfig.houseEdge])

  /**
   * Calculate potential payout for current bet
   */
  const calculatePotentialPayout = useCallback((bet: number, target: number): number => {
    return bet * target
  }, [])

  /**
   * Generate provably fair multiplier
   */
  const generateMultiplier = useCallback((): number => {
    // Reason: Simple random generation for demo - would use proper provably fair in production
    const randomValue = Math.random()
    const rawMultiplier = LIMBO_CONSTANTS.WIN_PROBABILITY_NUMERATOR / 
                          (randomValue * LIMBO_CONSTANTS.WIN_PROBABILITY_NUMERATOR + 1)
    const adjustedMultiplier = rawMultiplier * (1 - gameConfig.houseEdge)
    const finalMultiplier = Math.max(1.0, adjustedMultiplier)
    
    return Math.round(finalMultiplier * Math.pow(10, gameConfig.multiplierPrecision)) / 
           Math.pow(10, gameConfig.multiplierPrecision)
  }, [gameConfig.houseEdge, gameConfig.multiplierPrecision])

  /**
   * Play a single round of Limbo
   */
  const playRound = useCallback(async (
    customBetAmount?: number,
    customTargetMultiplier?: number
  ): Promise<void> => {
    const currentBet = customBetAmount ?? betAmount
    const currentTarget = customTargetMultiplier ?? targetMultiplier

    // Validate authentication
    if (!isAuthenticated) {
      setGameStatus('idle')
      return
    }

    // Validate bet amount
    if (currentBet <= 0 || !canAfford(currentBet) || currentBet < minBet || currentBet > maxBet) {
      return
    }

    // Validate target multiplier
    if (currentTarget < gameConfig.minTargetMultiplier || 
        currentTarget > gameConfig.maxTargetMultiplier) {
      return
    }

    setGameStatus('loading')
    
    try {
      // Place bet through wallet store
      const betResult = await bet(currentBet, 'limbo')
      if (!betResult.success) {
        throw new Error(betResult.error || 'Failed to place bet')
      }

      // Simulate rolling animation delay
      await new Promise(resolve => setTimeout(resolve, LIMBO_CONSTANTS.ROLL_ANIMATION_DURATION))

      // Generate multiplier
      const generatedMultiplier = generateMultiplier()
      
      // Determine win/loss
      const isWin = generatedMultiplier >= currentTarget
      const payout = isWin ? currentBet * currentTarget : 0
      const profit = payout - currentBet

      // Handle winnings through wallet store
      if (isWin) {
        const gameId = `limbo-${Date.now()}`
        await win(payout, gameId)
      }

      // Create result object
      const result: LimboResult = {
        gameId: `limbo-${Date.now()}`,
        gameType: 'limbo',
        playerId: user?.id || 'anonymous',
        betAmount: currentBet,
        multiplier: currentTarget,
        payout,
        status: isWin ? 'win' : 'loss',
        timestamp: new Date(),
        seed: 'demo-seed',
        nonce: Date.now(),
        config: gameConfig,
        finalState: {
          gameId: `limbo-${Date.now()}`,
          playerId: user?.id || 'anonymous',
          state: 'complete',
          betAmount: currentBet,
          targetMultiplier: currentTarget,
          generatedMultiplier,
          winProbability: calculateWinProbability(currentTarget),
          potentialPayout: calculatePotentialPayout(currentBet, currentTarget),
          isAutoBetting: isAutoBetting,
          seed: 'demo-seed',
          nonce: Date.now(),
          clientSeed: 'client-seed',
          isWin,
          payout,
          profit,
          roundStartTime: new Date(),
          roundEndTime: new Date()
        },
        targetMultiplier: currentTarget,
        generatedMultiplier,
        winProbability: calculateWinProbability(currentTarget),
        isWin,
        rollDuration: LIMBO_CONSTANTS.ROLL_ANIMATION_DURATION,
        wasAutoBet: isAutoBetting
      }

      setCurrentResult(result)
      setGameStatus(isWin ? 'win' : 'loss')

      // Add to history
      const historyEntry: GameHistoryEntry = {
        id: result.gameId,
        timestamp: result.timestamp,
        betAmount: currentBet,
        targetMultiplier: currentTarget,
        generatedMultiplier,
        isWin,
        payout,
        profit
      }

      setGameHistory((prev: GameHistoryEntry[]) => [historyEntry, ...prev.slice(0, 99)]) // Keep last 100 games

      // Call result callback
      onGameResult?.(result)

      // Handle auto-betting continuation
      if (isAutoBetting && autoBetRemaining > 1) {
        setAutoBetRemaining(prev => prev - 1)
        
        // Check stop conditions
        let shouldStop = false
        
        if (autoBetSettings.stopOnWin && isWin) shouldStop = true
        if (autoBetSettings.stopOnLoss && !isWin) shouldStop = true
        if (autoBetSettings.winAmount > 0 && profit >= autoBetSettings.winAmount) shouldStop = true
        if (autoBetSettings.lossAmount > 0 && Math.abs(profit) >= autoBetSettings.lossAmount) shouldStop = true

        if (shouldStop) {
          stopAutoBetting()
          return
        }

        // Schedule next bet
        setTimeout(() => {
          if (isAutoBettingRef.current) {
            let nextBetAmount = currentBet

            // Apply bet adjustment rules
            if (isWin) {
              if (autoBetSettings.resetOnWin) {
                nextBetAmount = betAmount
              } else if (autoBetSettings.increaseOnWin && autoBetSettings.increasePercentage) {
                nextBetAmount = currentBet * (1 + autoBetSettings.increasePercentage / 100)
              }
            } else {
              if (autoBetSettings.resetOnLoss) {
                nextBetAmount = betAmount
              } else if (autoBetSettings.increaseOnLoss && autoBetSettings.increasePercentage) {
                nextBetAmount = currentBet * (1 + autoBetSettings.increasePercentage / 100)
              }
            }

            playRound(nextBetAmount, currentTarget)
          }
        }, autoBetSettings.speed)
      } else if (isAutoBetting) {
        // Auto-betting completed
        stopAutoBetting()
      } else {
        // Return to idle after brief delay
        setTimeout(() => {
          if (!isAutoBettingRef.current) {
            setGameStatus('idle')
          }
        }, 1500)
      }

    } catch (error) {
      console.error('Error playing Limbo round:', error)
      setGameStatus('idle')
    }
  }, [
    betAmount, 
    targetMultiplier, 
    minBet, 
    maxBet, 
    gameConfig, 
    generateMultiplier, 
    calculateWinProbability, 
    calculatePotentialPayout, 
    onGameResult, 
    isAutoBetting, 
    autoBetRemaining, 
    autoBetSettings,
    isAuthenticated,
    user?.id,
    canAfford,
    bet,
    win
  ])

  /**
   * Start auto-betting with current settings
   */
  const startAutoBetting = useCallback(() => {
    if (isAutoBetting || autoBetSettings.numberOfBets <= 0 || !isAuthenticated) return

    setIsAutoBetting(true)
    isAutoBettingRef.current = true
    setAutoBetRemaining(autoBetSettings.numberOfBets)
    setGameStatus('loading')
    
    // Start first auto-bet immediately
    playRound()
  }, [isAutoBetting, autoBetSettings, playRound, isAuthenticated])

  /**
   * Stop auto-betting
   */
  const stopAutoBetting = useCallback(() => {
    setIsAutoBetting(false)
    isAutoBettingRef.current = false
    setAutoBetRemaining(0)
    setGameStatus('idle')

    if (autoBetIntervalRef.current) {
      clearTimeout(autoBetIntervalRef.current)
      autoBetIntervalRef.current = null
    }
  }, [])

  /**
   * Handle bet amount change
   */
  const handleBetChange = useCallback((newBetAmount: number) => {
    setBetAmount(newBetAmount)
  }, [])

  /**
   * Handle target multiplier change
   */
  const handleTargetMultiplierChange = useCallback((newTargetMultiplier: number) => {
    setTargetMultiplier(newTargetMultiplier)
  }, [])

  /**
   * Handle auto-betting config change
   */
  const handleAutoBetConfigChange = useCallback((newConfig: LimboAutoBettingConfig) => {
    setAutoBetSettings(newConfig)
  }, [])

  // Cleanup auto-betting on unmount
  useEffect(() => {
    return () => {
      if (autoBetIntervalRef.current) {
        clearTimeout(autoBetIntervalRef.current)
      }
    }
  }, [])

  // Calculate current game stats
  const winProbability = calculateWinProbability(targetMultiplier)
  const potentialPayout = calculatePotentialPayout(betAmount, targetMultiplier)

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Game Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-2xl font-bold">Limbo</h1>
              <p className="text-default-500">Multiplier Prediction Game</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-default-500">Balance</p>
                <p className="text-lg font-semibold">${balance.toFixed(2)}</p>
              </div>
              <Chip 
                color={gameStatus === 'win' ? 'success' : gameStatus === 'loss' ? 'danger' : 'default'}
                variant="flat"
              >
                {gameStatus === 'loading' ? 'Rolling...' : gameStatus === 'win' ? 'Win!' : gameStatus === 'loss' ? 'Loss' : 'Ready'}
              </Chip>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Game Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Controls - Left Column */}
        <div className="lg:col-span-1 space-y-4">
          <MultiplierInput
            value={targetMultiplier}
            onChange={handleTargetMultiplierChange}
            winProbability={winProbability}
            potentialPayout={potentialPayout}
            betAmount={betAmount}
            config={gameConfig}
            disabled={gameStatus === 'loading' || isAutoBetting || !isAuthenticated}
          />
          
          <LimboControls
            betAmount={betAmount}
            onBetChange={handleBetChange}
            balance={balance}
            minBet={minBet}
            maxBet={maxBet}
            onPlayRound={() => playRound()}
            onStartAutoBetting={startAutoBetting}
            onStopAutoBetting={stopAutoBetting}
            isAutoBetting={isAutoBetting}
            autoBetRemaining={autoBetRemaining}
            autoBetSettings={autoBetSettings}
            onAutoBetConfigChange={handleAutoBetConfigChange}
            gameStatus={gameStatus}
            disabled={gameStatus === 'loading' || !isAuthenticated}
          />
        </div>

        {/* Game Display - Center Column */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardBody className="flex flex-col items-center justify-center p-8">
              {gameStatus === 'loading' ? (
                <div className="flex flex-col items-center gap-4">
                  <Spinner size="lg" />
                  <p className="text-default-500">Rolling...</p>
                </div>
              ) : currentResult ? (
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-default-500">Generated Multiplier</p>
                    <div className={`text-4xl font-bold ${
                      currentResult.isWin ? 'text-success' : 'text-danger'
                    }`}>
                      {currentResult.generatedMultiplier.toFixed(2)}x
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-default-500">Target Multiplier</p>
                    <div className="text-2xl font-semibold text-default-700">
                      {currentResult.targetMultiplier.toFixed(2)}x
                    </div>
                  </div>

                  {currentResult.isWin ? (
                    <div className="space-y-2">
                      <p className="text-sm text-default-500">Payout</p>
                      <div className="text-xl font-semibold text-success">
                        +${currentResult.payout.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-default-500">Lost</p>
                      <div className="text-xl font-semibold text-danger">
                        -${currentResult.betAmount.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="text-6xl">🎯</div>
                  <p className="text-default-500">
                    {!isAuthenticated ? 'Please log in to play!' : 'Set your target and place your bet!'}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Statistics - Right Column */}
        <div className="lg:col-span-1">
          <LimboStats
            gameHistory={gameHistory}
            currentBalance={balance}
            initialBalance={1000} // Note: This could be removed or made dynamic
          />
        </div>
      </div>
    </div>
  )
}