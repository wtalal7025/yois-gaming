/**
 * SEO Utilities and Metadata Generation
 * Comprehensive SEO optimization for the gaming platform
 */

import { GameInfo } from '../lib/gameRegistry'

export interface SEOData {
  title: string
  description: string
  keywords: string[]
  canonical?: string
  ogImage?: string
  ogType?: string
  structuredData?: Record<string, any>
}

/**
 * Generate SEO metadata for game pages
 */
export function generateGameSEO(game: GameInfo, baseUrl = ''): SEOData {
  const title = `${game.title} - Play Online Casino Game | Cheats Gaming`
  const description = `Play ${game.title} online! ${game.description} RTP: ${game.rtp}%. Join thousands of players enjoying this ${game.category} game.`
  
  const keywords = [
    game.title.toLowerCase(),
    game.category,
    'online casino',
    'casino game',
    'free play',
    'demo mode',
    ...game.features.map(f => f.toLowerCase())
  ]

  const structuredData = generateGameStructuredData(game, baseUrl)
  
  return {
    title,
    description,
    keywords,
    canonical: `${baseUrl}/games/${game.id}`,
    ogImage: `${baseUrl}/images/games/${game.id}/og-image.jpg`,
    ogType: 'website',
    structuredData
  }
}

/**
 * Generate SEO metadata for the games lobby
 */
export function generateLobbyGamesSEO(baseUrl = ''): SEOData {
  return {
    title: 'Games Lobby - Play 6+ Casino Games Online | Cheats Gaming',
    description: 'Explore our collection of exciting casino games including Mines, Sugar Rush, Crash, Dragon Tower, Bars, and Limbo. Play for free or with real money!',
    keywords: [
      'casino games',
      'online gambling',
      'slot machines',
      'crash games',
      'mines',
      'sugar rush',
      'dragon tower',
      'limbo',
      'bars slots',
      'free play',
      'demo mode'
    ],
    canonical: `${baseUrl}/games`,
    ogImage: `${baseUrl}/images/og/games-lobby.jpg`,
    ogType: 'website',
    structuredData: generateLobbyStructuredData(baseUrl)
  }
}

/**
 * Generate SEO metadata for home page
 */
export function generateHomeSEO(baseUrl = ''): SEOData {
  return {
    title: 'Cheats Gaming - Premium Online Casino Experience',
    description: 'Experience the thrill of online gaming with our collection of premium casino games. Fair play, instant payouts, and 24/7 support. Join now!',
    keywords: [
      'online casino',
      'casino games',
      'gambling',
      'slots',
      'crash games',
      'provably fair',
      'instant withdrawal',
      'cryptocurrency casino'
    ],
    canonical: baseUrl,
    ogImage: `${baseUrl}/images/og/homepage.jpg`,
    ogType: 'website',
    structuredData: generateWebsiteStructuredData(baseUrl)
  }
}

/**
 * Generate structured data for individual games
 */
function generateGameStructuredData(game: GameInfo, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Game',
    name: game.title,
    description: game.description,
    url: `${baseUrl}/games/${game.id}`,
    image: `${baseUrl}/images/games/${game.id}/thumbnail.webp`,
    genre: getGameGenre(game.category),
    applicationCategory: 'Game',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      category: 'Free'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      ratingCount: '1000',
      bestRating: '5',
      worstRating: '1'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Cheats Gaming',
      url: baseUrl
    }
  }
}

/**
 * Generate structured data for games lobby
 */
function generateLobbyStructuredData(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Casino Games Collection',
    description: 'Browse our collection of premium online casino games',
    url: `${baseUrl}/games`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: 6,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          item: {
            '@type': 'Game',
            name: 'Mines',
            url: `${baseUrl}/games/mines`
          }
        },
        {
          '@type': 'ListItem',
          position: 2,
          item: {
            '@type': 'Game',
            name: 'Sugar Rush',
            url: `${baseUrl}/games/sugar-rush`
          }
        },
        {
          '@type': 'ListItem',
          position: 3,
          item: {
            '@type': 'Game',
            name: 'Crash',
            url: `${baseUrl}/games/crash`
          }
        },
        {
          '@type': 'ListItem',
          position: 4,
          item: {
            '@type': 'Game',
            name: 'Dragon Tower',
            url: `${baseUrl}/games/dragon-tower`
          }
        },
        {
          '@type': 'ListItem',
          position: 5,
          item: {
            '@type': 'Game',
            name: 'Bars',
            url: `${baseUrl}/games/bars`
          }
        },
        {
          '@type': 'ListItem',
          position: 6,
          item: {
            '@type': 'Game',
            name: 'Limbo',
            url: `${baseUrl}/games/limbo`
          }
        }
      ]
    }
  }
}

/**
 * Generate structured data for website
 */
function generateWebsiteStructuredData(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Cheats Gaming',
    url: baseUrl,
    description: 'Premium online casino gaming platform',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/games?search={search_term_string}`,
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Cheats Gaming',
      url: baseUrl,
      logo: `${baseUrl}/images/logo.png`,
      sameAs: [
        'https://twitter.com/cheatsgaming',
        'https://facebook.com/cheatsgaming'
      ]
    }
  }
}

/**
 * Map game categories to Schema.org genres
 */
function getGameGenre(category: string): string {
  const genreMap: Record<string, string> = {
    'slots': 'Casino Game',
    'skill': 'Strategy Game', 
    'crash': 'Action Game',
    'other': 'Casino Game'
  }
  
  return genreMap[category] || 'Casino Game'
}

/**
 * Generate robots.txt content
 */
export function generateRobotsTxt(baseUrl: string): string {
  return `User-agent: *
Allow: /
Allow: /games
Allow: /games/*
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /static/

Sitemap: ${baseUrl}/sitemap.xml`
}

/**
 * Generate sitemap data
 */
export interface SitemapEntry {
  url: string
  lastModified: string
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

export function generateSitemapEntries(games: GameInfo[], baseUrl: string): SitemapEntry[] {
  const now = new Date().toISOString()
  
  const entries: SitemapEntry[] = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0
    },
    {
      url: `${baseUrl}/games`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9
    }
  ]

  // Add individual game pages
  games.forEach(game => {
    entries.push({
      url: `${baseUrl}/games/${game.id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    })
  })

  return entries
}

/**
 * Generate XML sitemap content
 */
export function generateSitemapXML(entries: SitemapEntry[]): string {
  const urls = entries.map(entry => 
    `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastModified}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  ).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

/**
 * Optimize meta description length
 */
export function optimizeMetaDescription(description: string, maxLength = 160): string {
  if (description.length <= maxLength) return description
  
  // Find the last complete sentence that fits
  const truncated = description.substring(0, maxLength - 3)
  const lastSentence = truncated.lastIndexOf('. ')
  
  if (lastSentence > maxLength / 2) {
    return truncated.substring(0, lastSentence + 1)
  }
  
  // If no sentence break, find last word
  const lastSpace = truncated.lastIndexOf(' ')
  return truncated.substring(0, lastSpace) + '...'
}

/**
 * Generate canonical URL ensuring no duplicates
 */
export function generateCanonicalUrl(path: string, baseUrl: string, params?: Record<string, string>): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  let canonical = `${baseUrl}${cleanPath}`
  
  // Add important parameters while excluding tracking parameters
  if (params) {
    const importantParams = ['category', 'sort']
    const filteredParams = Object.entries(params)
      .filter(([key]) => importantParams.includes(key))
    
    if (filteredParams.length > 0) {
      const queryString = new URLSearchParams(filteredParams).toString()
      canonical += `?${queryString}`
    }
  }
  
  return canonical
}