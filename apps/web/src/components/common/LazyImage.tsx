'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Skeleton } from '@heroui/react'
import { createIntersectionObserver, shouldLoadHighQuality } from '../../utils/lazyLoading'

interface LazyImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  quality?: number
  sizes?: string
  blurDataURL?: string
  onLoad?: () => void
  onError?: () => void
}

/**
 * Lazy loading image component with intersection observer
 * Optimizes loading based on network conditions and user preferences
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality,
  sizes,
  blurDataURL,
  onLoad,
  onError
}: LazyImageProps) {
  const [isInView, setIsInView] = useState(priority)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return

    const observer = createIntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer?.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1
      }
    )

    if (observer && imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer?.disconnect()
  }, [priority, isInView])

  // Determine image quality based on network conditions
  const getOptimalQuality = () => {
    if (quality) return quality
    return shouldLoadHighQuality() ? 90 : 75
  }

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {!isLoaded && !hasError && (
        <Skeleton className="absolute inset-0 rounded-lg" />
      )}

      {isInView && !hasError && (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          quality={getOptimalQuality()}
          sizes={sizes}
          priority={priority}
          placeholder={blurDataURL ? 'blur' : 'empty'}
          {...(blurDataURL && { blurDataURL })}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'
            } ${className}`}
        />
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-default-100 rounded-lg">
          <div className="text-center text-default-500">
            <div className="text-2xl mb-2">🎮</div>
            <div className="text-sm">Image not available</div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Optimized game thumbnail component
 */
interface GameThumbnailProps {
  gameId: string
  title: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  priority?: boolean
}

export function GameThumbnail({
  gameId,
  title,
  className = '',
  size = 'md',
  priority = false
}: GameThumbnailProps) {
  const dimensions = {
    sm: { width: 120, height: 80 },
    md: { width: 240, height: 160 },
    lg: { width: 360, height: 240 }
  }

  const { width, height } = dimensions[size]

  // Generate responsive sizes attribute
  const sizes = {
    sm: '(max-width: 768px) 120px, 120px',
    md: '(max-width: 768px) 240px, 240px',
    lg: '(max-width: 768px) 360px, 360px'
  }

  return (
    <LazyImage
      src={`/images/games/${gameId}/thumbnail.webp`}
      alt={`${title} game thumbnail`}
      width={width}
      height={height}
      className={`rounded-lg object-cover ${className}`}
      sizes={sizes[size]}
      priority={priority}
      quality={shouldLoadHighQuality() ? 90 : 75}
      blurDataURL={`data:image/svg+xml;base64,${Buffer.from(
        `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f4f4f5"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#a1a1aa" font-family="system-ui" font-size="14">
            🎮
          </text>
        </svg>`
      ).toString('base64')}`}
    />
  )
}