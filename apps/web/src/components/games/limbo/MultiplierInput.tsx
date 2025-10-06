/**
 * Multiplier Input Component for Limbo Game
 * Provides slider, text input, presets, and validation for target multiplier selection
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardBody, CardHeader, Button, Input, Slider, Chip, Divider } from '@heroui/react'
import type {
  LimboConfig,
  MultiplierValidation,
  MultiplierPreset
} from '@yois-games/shared'
import { LIMBO_CONSTANTS } from '@yois-games/shared'

/**
 * Props for MultiplierInput component
 */
interface MultiplierInputProps {
  value: number
  onChange: (multiplier: number) => void
  winProbability: number
  potentialPayout: number
  betAmount: number
  config: LimboConfig
  disabled?: boolean
}

/**
 * MultiplierInput component with slider, text input, presets, and validation
 */
export function MultiplierInput({
  value,
  onChange,
  winProbability,
  potentialPayout,
  betAmount,
  config,
  disabled = false
}: MultiplierInputProps) {
  const [inputValue, setInputValue] = useState<string>(value.toString())
  const [isEditing, setIsEditing] = useState<boolean>(false)

  /**
   * Validate multiplier input
   */
  const validateMultiplier = useCallback((multiplier: number): MultiplierValidation => {
    const errors: string[] = []

    // Check multiplier bounds
    if (multiplier < config.minTargetMultiplier) {
      errors.push(`Minimum multiplier is ${config.minTargetMultiplier}x`)
    }

    if (multiplier > config.maxTargetMultiplier) {
      errors.push(`Maximum multiplier is ${config.maxTargetMultiplier.toLocaleString()}x`)
    }

    // Check precision
    const decimalPlaces = (multiplier.toString().split('.')[1] || '').length
    if (decimalPlaces > config.multiplierPrecision) {
      errors.push(`Maximum ${config.multiplierPrecision} decimal places allowed`)
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        multiplier,
        winProbability: 0,
        potentialPayout: 0,
        error: errors.join(', ')
      }
    }

    const calculatedWinProbability = LIMBO_CONSTANTS.WIN_PROBABILITY_NUMERATOR / multiplier * (1 - config.houseEdge)
    const calculatedPayout = betAmount * multiplier

    // Add warnings for extreme multipliers
    let warning: string | undefined
    if (multiplier > 100) {
      warning = `Very high multiplier (${multiplier}x) has extremely low win probability (${calculatedWinProbability.toFixed(2)}%)`
    } else if (calculatedWinProbability < 1) {
      warning = `Low win probability (${calculatedWinProbability.toFixed(2)}%) for this multiplier`
    }

    const result: MultiplierValidation = {
      isValid: true,
      multiplier,
      winProbability: calculatedWinProbability,
      potentialPayout: calculatedPayout
    }

    if (warning) {
      result.warning = warning
    }

    return result
  }, [config, betAmount])

  /**
   * Get quick preset multipliers with probabilities
   */
  const quickPresets = useMemo((): MultiplierPreset[] => {
    return config.quickPresets.map(multiplier => ({
      multiplier,
      label: `${multiplier}x`,
      winProbability: LIMBO_CONSTANTS.WIN_PROBABILITY_NUMERATOR / multiplier * (1 - config.houseEdge),
      popularityRank: config.quickPresets.indexOf(multiplier) + 1
    }))
  }, [config])

  /**
   * Handle slider value change
   */
  const handleSliderChange = useCallback((sliderValue: number | number[]) => {
    const newValue = Array.isArray(sliderValue) ? (sliderValue[0] ?? 0) : sliderValue
    const rounded = Math.round(newValue * Math.pow(10, config.multiplierPrecision)) /
      Math.pow(10, config.multiplierPrecision)

    setInputValue(rounded.toString())
    onChange(rounded)
  }, [onChange, config.multiplierPrecision])

  /**
   * Handle text input change
   */
  const handleInputChange = useCallback((newValue: string) => {
    setInputValue(newValue)

    const numValue = parseFloat(newValue)
    if (!isNaN(numValue) && numValue > 0) {
      const validation = validateMultiplier(numValue)
      if (validation.isValid) {
        onChange(numValue)
      }
    }
  }, [onChange, validateMultiplier])

  /**
   * Handle text input focus
   */
  const handleInputFocus = useCallback(() => {
    setIsEditing(true)
  }, [])

  /**
   * Handle text input blur
   */
  const handleInputBlur = useCallback(() => {
    setIsEditing(false)

    const numValue = parseFloat(inputValue)
    if (isNaN(numValue) || numValue <= 0) {
      setInputValue(value.toString())
    } else {
      const validation = validateMultiplier(numValue)
      if (!validation.isValid) {
        setInputValue(value.toString())
      }
    }
  }, [inputValue, value, validateMultiplier])

  /**
   * Handle preset button click
   */
  const handlePresetClick = useCallback((presetMultiplier: number) => {
    setInputValue(presetMultiplier.toString())
    onChange(presetMultiplier)
  }, [onChange])

  // Calculate slider parameters for reasonable range
  const sliderMin = config.minTargetMultiplier
  const sliderMax = Math.min(1000, config.maxTargetMultiplier) // Cap at 1000 for reasonable slider
  const sliderStep = Math.pow(10, -config.multiplierPrecision)

  // Current validation state
  const validation = validateMultiplier(value)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold">Target Multiplier</h3>
          <p className="text-sm text-default-500">Set your target multiplier to win</p>
        </div>
      </CardHeader>
      <CardBody className="space-y-6">
        {/* Current Multiplier Display */}
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">
            {value.toFixed(config.multiplierPrecision)}x
          </div>
          <div className="flex justify-center gap-4 text-sm text-default-600">
            <div className="text-center">
              <div className="text-xs text-default-500">Win Probability</div>
              <div className="font-semibold">{winProbability.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-default-500">Potential Payout</div>
              <div className="font-semibold">${potentialPayout.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <Divider />

        {/* Quick Presets */}
        <div>
          <div className="text-sm font-medium mb-3">Quick Presets</div>
          <div className="flex flex-wrap gap-2">
            {quickPresets.map((preset) => (
              <Button
                key={preset.multiplier}
                size="sm"
                variant={value === preset.multiplier ? "solid" : "bordered"}
                color={value === preset.multiplier ? "primary" : "default"}
                onPress={() => handlePresetClick(preset.multiplier)}
                disabled={disabled}
                className="min-w-0"
              >
                <div className="text-center">
                  <div className="font-semibold">{preset.label}</div>
                  <div className="text-xs opacity-70">
                    {preset.winProbability.toFixed(1)}%
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <Divider />

        {/* Slider Input */}
        <div>
          <div className="text-sm font-medium mb-3">Adjust with Slider</div>
          <Slider
            size="lg"
            step={sliderStep}
            minValue={sliderMin}
            maxValue={sliderMax}
            value={Math.min(value, sliderMax)}
            onChange={handleSliderChange}
            isDisabled={disabled}
            className="max-w-full"
            showSteps
            showTooltip
            formatOptions={{
              style: "decimal",
              minimumFractionDigits: config.multiplierPrecision,
              maximumFractionDigits: config.multiplierPrecision
            }}
          />
          <div className="flex justify-between text-xs text-default-500 mt-1">
            <span>{sliderMin}x</span>
            <span>{sliderMax}x</span>
          </div>
        </div>

        <Divider />

        {/* Precise Text Input */}
        <div>
          <div className="text-sm font-medium mb-3">Precise Input</div>
          <Input
            type="number"
            value={inputValue}
            onValueChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            disabled={disabled}
            step={sliderStep}
            min={config.minTargetMultiplier}
            max={config.maxTargetMultiplier}
            placeholder="Enter multiplier..."
            endContent={<span className="text-default-500">x</span>}
            isInvalid={!validation.isValid}
            errorMessage={validation.error}
            description={validation.warning}
            classNames={{
              input: "text-center text-lg font-semibold"
            }}
          />
        </div>

        {/* Validation Status */}
        {validation.isValid ? (
          <div className="flex justify-center">
            <Chip color="success" variant="flat" size="sm">
              Valid Multiplier
            </Chip>
          </div>
        ) : (
          <div className="flex justify-center">
            <Chip color="danger" variant="flat" size="sm">
              Invalid Multiplier
            </Chip>
          </div>
        )}

        {/* Range Info */}
        <div className="text-center text-xs text-default-500">
          <div>Range: {config.minTargetMultiplier}x - {config.maxTargetMultiplier.toLocaleString()}x</div>
          <div>Precision: {config.multiplierPrecision} decimal places</div>
          <div>House Edge: {(config.houseEdge * 100).toFixed(2)}%</div>
        </div>
      </CardBody>
    </Card>
  )
}