import Head from 'next/head'
import { SEOData } from '../../utils/seo'

interface SEOMetadataProps {
  seo: SEOData
  children?: React.ReactNode
}

/**
 * Comprehensive SEO metadata component
 * Handles all meta tags, structured data, and SEO optimizations
 */
export function SEOMetadata({ seo, children }: SEOMetadataProps) {
  const {
    title,
    description,
    keywords,
    canonical,
    ogImage,
    ogType = 'website',
    structuredData
  } = seo

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      
      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {canonical && <meta property="og:url" content={canonical} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:site_name" content="Cheats Gaming" />
      
      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      <meta name="twitter:site" content="@cheatsgaming" />
      
      {/* Additional SEO Meta Tags */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="author" content="Cheats Gaming" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      
      {/* Favicon and App Icons */}
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="icon" type="image/png" href="/favicon.png" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.json" />
      
      {/* Theme Colors */}
      <meta name="theme-color" content="#0070f3" />
      <meta name="msapplication-TileColor" content="#0070f3" />
      
      {/* Structured Data JSON-LD */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData)
          }}
        />
      )}
      
      {/* Additional head elements */}
      {children}
    </Head>
  )
}

/**
 * Default SEO metadata for fallback
 */
export const defaultSEO: SEOData = {
  title: 'Cheats Gaming - Premium Online Casino Experience',
  description: 'Experience the thrill of online gaming with our collection of premium casino games. Fair play, instant payouts, and 24/7 support.',
  keywords: [
    'online casino',
    'casino games',
    'gambling',
    'slots',
    'crash games',
    'provably fair'
  ]
}

/**
 * Game-specific structured data component
 */
interface GameStructuredDataProps {
  game: {
    id: string
    title: string
    description: string
    category: string
    rtp: number
    features: string[]
  }
  baseUrl?: string
}

export function GameStructuredData({ game, baseUrl = '' }: GameStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    description: game.description,
    url: `${baseUrl}/games/${game.id}`,
    image: `${baseUrl}/images/games/${game.id}/thumbnail.webp`,
    genre: game.category,
    applicationCategory: 'Game',
    operatingSystem: 'Web Browser',
    gamePlatform: 'Web Browser',
    playMode: ['SinglePlayer', 'MultiPlayer'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      category: 'Free to Play'
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
    },
    featureList: game.features
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData)
      }}
    />
  )
}

/**
 * Breadcrumb structured data component
 */
interface BreadcrumbItem {
  name: string
  url: string
}

interface BreadcrumbStructuredDataProps {
  items: BreadcrumbItem[]
}

export function BreadcrumbStructuredData({ items }: BreadcrumbStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData)
      }}
    />
  )
}

/**
 * FAQ structured data component
 */
interface FAQItem {
  question: string
  answer: string
}

interface FAQStructuredDataProps {
  faqs: FAQItem[]
}

export function FAQStructuredData({ faqs }: FAQStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData)
      }}
    />
  )
}