/**
 * Next.js Performance Optimization Configuration
 * Production-ready performance optimizations for the gaming platform
 */

/** @type {import('next').NextConfig} */
const performanceConfig = {
  // Compiler optimizations
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // Experimental features for better performance
  experimental: {
    // Enable modern image optimization
    optimizePackageImports: ['@heroui/react', '@heroui/theme', 'framer-motion'],
    
    // Enable React 19 optimizations
    reactCompiler: true,
    
    // Enable partial prerendering for static parts
    ppr: true,
    
    // Enable Server Components optimization
    serverComponentsExternalPackages: ['canvas', 'jsdom']
  },

  // Bundle optimization
  webpack: (config, { dev, isServer, webpack, nextRuntime }) => {
    // Production optimizations only
    if (!dev && !isServer && nextRuntime === 'nodejs') {
      // Add bundle analyzer in development
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: '../analyze/client.html',
            openAnalyzer: false,
          })
        )
      }

      // Optimize chunks for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            // Vendor libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 20,
              chunks: 'all',
              reuseExistingChunk: true,
            },
            
            // UI components chunk
            ui: {
              test: /[\\/]node_modules[\\/](@heroui|framer-motion)[\\/]/,
              name: 'ui',
              priority: 30,
              chunks: 'all',
              reuseExistingChunk: true,
            },
            
            // Game engine chunk
            gameEngine: {
              test: /[\\/](packages[\\/]game-engine|components[\\/]games)[\\/]/,
              name: 'game-engine',
              priority: 25,
              chunks: 'all',
              reuseExistingChunk: true,
            },
            
            // Common utilities
            common: {
              name: 'common',
              priority: 10,
              minChunks: 2,
              chunks: 'all',
              reuseExistingChunk: true,
            }
          }
        }
      }

      // Tree shaking optimization
      config.optimization.usedExports = true
      config.optimization.sideEffects = false

      // Add compression plugin for smaller bundles
      if (process.env.NODE_ENV === 'production') {
        const CompressionPlugin = require('compression-webpack-plugin')
        config.plugins.push(
          new CompressionPlugin({
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 8192,
            minRatio: 0.8,
          })
        )
      }
    }

    // Resolve optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      // Bundle smaller lodash alternative
      'lodash': 'lodash-es',
    }

    return config
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    
    // Optimize image sizes for different viewports
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/api/**',
      }
    ]
  },

  // Headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      },
      {
        source: '/static/(.*)',
        headers: [
          // Cache static assets for 1 year
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/_next/image(.*)',
        headers: [
          // Cache optimized images
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/api/(.*)',
        headers: [
          // API caching headers
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400'
          }
        ]
      }
    ]
  },

  // Compression
  compress: true,

  // Power optimizations
  poweredByHeader: false,

  // Generate ETags for caching
  generateEtags: true,

  // Production source maps for debugging (smaller)
  productionBrowserSourceMaps: process.env.NODE_ENV === 'development',

  // Optimize fonts
  optimizeFonts: true,

  // SWC minification (faster than Terser)
  swcMinify: true,

  // Output configuration for production
  output: 'standalone',

  // Disable X-Powered-By header
  poweredByHeader: false,

  // Custom server configuration
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2
  }
}

// Merge with environment-specific configuration
function getConfig() {
  if (process.env.NODE_ENV === 'production') {
    return {
      ...performanceConfig,
      // Production-only optimizations
      experimental: {
        ...performanceConfig.experimental,
        // Enable additional production optimizations
        optimizeServerReact: true,
        gzipSize: true
      }
    }
  }

  return {
    ...performanceConfig,
    // Development-friendly settings
    experimental: {
      ...performanceConfig.experimental,
      // Fast refresh and hot reloading
      forceSwcTransforms: false
    }
  }
}

module.exports = getConfig()