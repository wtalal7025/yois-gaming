import { NextResponse } from 'next/server'
import { generateRobotsTxt } from '../../utils/seo'

/**
 * Generate robots.txt for search engine crawlers
 * Provides instructions for bot behavior and sitemap location
 */
export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheats.gaming'
    const robotsTxt = generateRobotsTxt(baseUrl)
    
    return new NextResponse(robotsTxt, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400' // Cache for 1 day
      }
    })
  } catch (error) {
    console.error('Error generating robots.txt:', error)
    return new NextResponse('Error generating robots.txt', { status: 500 })
  }
}