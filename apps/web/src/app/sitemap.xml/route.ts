import { NextRequest, NextResponse } from 'next/server'
import { gameRegistry } from '../../lib/gameRegistry'
import { generateSitemapEntries, generateSitemapXML } from '../../utils/seo'

/**
 * Generate XML sitemap for the gaming platform
 * Includes all games and main pages
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheats.gaming'

    // Get all games from registry
    const games = Array.from(gameRegistry.values())

    // Generate sitemap entries
    const entries = generateSitemapEntries(games, baseUrl)

    // Generate XML content
    const xmlContent = generateSitemapXML(entries)

    return new NextResponse(xmlContent, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' // 1 day cache, 1 week stale
      }
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}