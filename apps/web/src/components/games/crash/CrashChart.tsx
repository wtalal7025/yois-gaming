/**
 * Crash Chart Component
 * Real-time multiplier visualization with smooth curve and crash animations
 */

'use client'

import React, { useRef, useEffect, useMemo } from 'react'
import type { MultiplierPoint } from '@stake-games/shared'

interface CrashChartProps {
  multiplierCurve: MultiplierPoint[]
  currentMultiplier: number
  crashPoint: number | null
  playerCashedOut: boolean
  cashOutMultiplier: number | null
  gameStatus: string
}

export function CrashChart({
  multiplierCurve,
  currentMultiplier,
  crashPoint,
  playerCashedOut,
  cashOutMultiplier,
  gameStatus
}: CrashChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  // Chart configuration
  const config = useMemo(() => ({
    padding: 40,
    gridColor: 'rgba(100, 116, 139, 0.3)', // slate-500/30
    axisColor: 'rgba(148, 163, 184, 0.8)', // slate-400/80
    curveColor: '#10b981', // emerald-500
    crashColor: '#ef4444', // red-500
    cashOutColor: '#f59e0b', // amber-500
    backgroundColor: 'rgba(15, 23, 42, 0.8)', // slate-900/80
    textColor: '#e2e8f0', // slate-200
    minMultiplier: 1.0,
    maxMultiplier: Math.max(10, currentMultiplier * 1.2, crashPoint || 1),
    maxTime: 30000, // 30 seconds
    lineWidth: 3,
    pointRadius: 4
  }), [currentMultiplier, crashPoint])

  /**
   * Clear and setup canvas context
   */
  const setupCanvas = (canvas: HTMLCanvasElement): CanvasRenderingContext2D | null => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Set canvas size to match display size
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)
    
    return ctx
  }

  /**
   * Convert multiplier value to canvas Y coordinate
   */
  const multiplierToY = (multiplier: number, canvasHeight: number): number => {
    const { padding, minMultiplier, maxMultiplier } = config
    const availableHeight = canvasHeight - (padding * 2)
    const range = maxMultiplier - minMultiplier
    const position = (multiplier - minMultiplier) / range
    return canvasHeight - padding - (position * availableHeight)
  }

  /**
   * Convert time value to canvas X coordinate
   */
  const timeToX = (time: number, canvasWidth: number): number => {
    const { padding, maxTime } = config
    const availableWidth = canvasWidth - (padding * 2)
    const position = Math.min(time / maxTime, 1)
    return padding + (position * availableWidth)
  }

  /**
   * Draw grid lines and axes
   */
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const { padding, gridColor, axisColor, textColor, minMultiplier, maxMultiplier } = config
    
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.fillStyle = textColor

    // Vertical grid lines (time)
    for (let t = 0; t <= 30; t += 5) {
      const x = timeToX(t * 1000, width)
      
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
      
      // Time labels
      if (t % 10 === 0) {
        ctx.fillText(`${t}s`, x - 10, height - 10)
      }
    }

    // Horizontal grid lines (multiplier)
    const multiplierSteps = [1, 2, 5, 10, 20, 50, 100]
    multiplierSteps.forEach(mult => {
      if (mult >= minMultiplier && mult <= maxMultiplier) {
        const y = multiplierToY(mult, height)
        
        ctx.strokeStyle = mult === 1 ? axisColor : gridColor
        ctx.beginPath()
        ctx.moveTo(padding, y)
        ctx.lineTo(width - padding, y)
        ctx.stroke()
        
        // Multiplier labels
        ctx.fillText(`${mult}.00x`, 5, y + 4)
      }
    })

    // Draw axes
    ctx.strokeStyle = axisColor
    ctx.lineWidth = 2
    
    // X-axis
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()
    
    // Y-axis
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.stroke()
  }

  /**
   * Draw the multiplier curve
   */
  const drawCurve = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (multiplierCurve.length < 2) return

    const { curveColor, lineWidth } = config
    
    ctx.strokeStyle = curveColor
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Create smooth curve using bezier curves
    ctx.beginPath()
    
    let firstPoint = multiplierCurve[0]!
    ctx.moveTo(
      timeToX(firstPoint.time, width),
      multiplierToY(firstPoint.multiplier, height)
    )

    // Draw smooth curve through all points
    for (let i = 1; i < multiplierCurve.length; i++) {
      const point = multiplierCurve[i]!
      const x = timeToX(point.time, width)
      const y = multiplierToY(point.multiplier, height)
      
      if (i === 1) {
        ctx.lineTo(x, y)
      } else {
        // Use quadratic curves for smoothness
        const prevPoint = multiplierCurve[i - 1]!
        const prevX = timeToX(prevPoint.time, width)
        const prevY = multiplierToY(prevPoint.multiplier, height)
        
        const controlX = (prevX + x) / 2
        ctx.quadraticCurveTo(controlX, prevY, x, y)
      }
    }

    ctx.stroke()

    // Add glow effect
    ctx.shadowColor = curveColor
    ctx.shadowBlur = 10
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  /**
   * Draw crash point indicator
   */
  const drawCrashPoint = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!crashPoint || gameStatus !== 'crashed') return

    const lastPoint = multiplierCurve[multiplierCurve.length - 1]
    if (!lastPoint) return

    const { crashColor, pointRadius, textColor } = config
    
    const x = timeToX(lastPoint.time, width)
    const y = multiplierToY(crashPoint, height)

    // Draw crash explosion effect
    ctx.fillStyle = crashColor
    ctx.strokeStyle = crashColor
    ctx.lineWidth = 3

    // Explosion circle
    ctx.beginPath()
    ctx.arc(x, y, pointRadius * 2, 0, 2 * Math.PI)
    ctx.fill()

    // Crash text
    ctx.fillStyle = textColor
    ctx.font = 'bold 16px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`CRASHED @ ${crashPoint.toFixed(2)}x`, x, y - 20)
    
    // Add pulsing effect
    const pulseRadius = pointRadius * (2 + Math.sin(Date.now() * 0.01) * 0.5)
    ctx.beginPath()
    ctx.arc(x, y, pulseRadius, 0, 2 * Math.PI)
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + Math.sin(Date.now() * 0.01) * 0.3})`
    ctx.stroke()
  }

  /**
   * Draw player cash out indicator
   */
  const drawCashOutPoint = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!playerCashedOut || !cashOutMultiplier) return

    // Find the curve point closest to cash out multiplier
    const cashOutPoint = multiplierCurve.find(p => p.multiplier >= cashOutMultiplier)
    if (!cashOutPoint) return

    const { cashOutColor, pointRadius, textColor } = config
    
    const x = timeToX(cashOutPoint.time, width)
    const y = multiplierToY(cashOutMultiplier, height)

    // Draw cash out marker
    ctx.fillStyle = cashOutColor
    ctx.strokeStyle = cashOutColor
    ctx.lineWidth = 2

    // Success circle
    ctx.beginPath()
    ctx.arc(x, y, pointRadius * 1.5, 0, 2 * Math.PI)
    ctx.fill()

    // Cash out text
    ctx.fillStyle = textColor
    ctx.font = 'bold 14px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`CASHED OUT @ ${cashOutMultiplier.toFixed(2)}x`, x, y - 15)
  }

  /**
   * Draw current multiplier indicator
   */
  const drawCurrentMultiplier = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (gameStatus !== 'flying' || multiplierCurve.length === 0) return

    const lastPoint = multiplierCurve[multiplierCurve.length - 1]
    if (!lastPoint) return

    const { curveColor, pointRadius } = config
    
    const x = timeToX(lastPoint.time, width)
    const y = multiplierToY(currentMultiplier, height)

    // Draw current position indicator
    ctx.fillStyle = curveColor
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2

    // Pulsing dot
    const pulseRadius = pointRadius * (1 + Math.sin(Date.now() * 0.02) * 0.3)
    ctx.beginPath()
    ctx.arc(x, y, pulseRadius, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()
  }

  /**
   * Draw waiting state
   */
  const drawWaitingState = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (gameStatus !== 'waiting' && gameStatus !== 'betting-closed' && gameStatus !== 'idle') return

    const { textColor } = config
    
    ctx.fillStyle = textColor
    ctx.font = 'bold 24px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    
    const centerX = width / 2
    const centerY = height / 2
    
    if (gameStatus === 'waiting') {
      ctx.fillText('Waiting for Next Round...', centerX, centerY)
    } else if (gameStatus === 'betting-closed') {
      ctx.fillText('Get Ready!', centerX, centerY)
    } else {
      ctx.fillText('Place Your Bet', centerX, centerY)
      ctx.font = '16px Inter, system-ui, sans-serif'
      ctx.fillText('and watch the multiplier rise!', centerX, centerY + 30)
    }
  }

  /**
   * Main render function
   */
  const render = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = setupCanvas(canvas)
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    // Clear canvas with background
    ctx.fillStyle = config.backgroundColor
    ctx.fillRect(0, 0, width, height)

    // Draw chart elements
    drawGrid(ctx, width, height)
    drawCurve(ctx, width, height)
    drawCrashPoint(ctx, width, height)
    drawCashOutPoint(ctx, width, height)
    drawCurrentMultiplier(ctx, width, height)
    drawWaitingState(ctx, width, height)
  }

  /**
   * Animation loop for smooth updates
   */
  const animate = () => {
    render()
    animationRef.current = requestAnimationFrame(animate)
  }

  // Start/stop animation based on game status
  useEffect(() => {
    if (gameStatus === 'flying') {
      animate()
    } else {
      render()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [gameStatus, multiplierCurve, currentMultiplier, crashPoint, playerCashedOut, cashOutMultiplier])

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => render()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="relative w-full h-full bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)'
        }}
      />
      
      {/* Overlay for current multiplier display */}
      {gameStatus === 'flying' && (
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-emerald-500/30">
          <div className="text-emerald-400 text-sm font-medium">Current Multiplier</div>
          <div className="text-white text-2xl font-bold">
            {currentMultiplier.toFixed(2)}x
          </div>
        </div>
      )}

      {/* Crash overlay */}
      {gameStatus === 'crashed' && crashPoint && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-red-400 text-4xl font-bold mb-2">CRASHED!</div>
            <div className="text-white text-xl">@ {crashPoint.toFixed(2)}x</div>
          </div>
        </div>
      )}
    </div>
  )
}