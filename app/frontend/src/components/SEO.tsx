/**
 * SEO Component - Comprehensive meta tags for search engine optimization
 * Use this component on every page to ensure proper indexing
 */

import Head from 'next/head';
import { useRouter } from 'next/router';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

const DEFAULT_SEO = {
  title: 'LinkDAO - Decentralized Social & Marketplace Platform',
  description: 'Join LinkDAO, the blockchain-powered social network and decentralized marketplace. Connect with communities, trade securely, and participate in DAO governance.',
  keywords: ['linkdao', 'dao', 'blockchain', 'web3', 'decentralized', 'marketplace', 'social network', 'crypto', 'ethereum', 'defi'],
  image: 'https://linkdao.io/og-image.png',
  type: 'website' as const,
};

export default function SEO({
  title,
  description,
  keywords,
  image,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  canonicalUrl,
  noindex = false,
  nofollow = false,
}: SEOProps) {
  const router = useRouter();
  const baseUrl = 'https://linkdao.io';

  // Construct full URL
  const fullUrl = canonicalUrl || `${baseUrl}${router.asPath}`;

  // Use defaults if not provided
  const seoTitle = title ? `${title} | LinkDAO` : DEFAULT_SEO.title;
  const seoDescription = description || DEFAULT_SEO.description;
  const seoKeywords = keywords || DEFAULT_SEO.keywords;
  const seoImage = image || DEFAULT_SEO.image;

  // Construct robots directive
  const robotsContent = [
    noindex ? 'noindex' : 'index',
    nofollow ? 'nofollow' : 'follow',
    'max-snippet:-1',
    'max-image-preview:large',
    'max-video-preview:-1'
  ].join(', ');

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords.join(', ')} />

      {/* Robots */}
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />

      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />
      <meta property="og:site_name" content="LinkDAO" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />
      <meta name="twitter:site" content="@LinkDAO" />
      <meta name="twitter:creator" content="@LinkDAO" />

      {/* Article specific tags */}
      {type === 'article' && (
        <>
          {author && <meta property="article:author" content={author} />}
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
        </>
      )}

      {/* Additional SEO Tags */}
      <meta name="theme-color" content="#6366f1" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="LinkDAO" />
      <meta name="format-detection" content="telephone=no" />

      {/* Verification Tags (add your actual verification codes) */}
      <meta name="google-site-verification" content="your-google-verification-code" />

      {/* Structured Data - JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'LinkDAO',
            url: baseUrl,
            description: seoDescription,
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: `${baseUrl}/search?q={search_term_string}`
              },
              'query-input': 'required name=search_term_string'
            }
          })
        }}
      />
    </Head>
  );
}

/**
 * Structured Data for Organization
 */
export function OrganizationSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'LinkDAO',
          url: 'https://linkdao.io',
          logo: 'https://linkdao.io/logo.png',
          description: 'Decentralized Autonomous Organization for social networking and marketplace',
          sameAs: [
            'https://twitter.com/LinkDAO',
            'https://github.com/linkdao',
            'https://discord.gg/linkdao'
          ],
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Customer Support',
            email: 'support@linkdao.io'
          }
        })
      }}
    />
  );
}

/**
 * Breadcrumb Structured Data
 */
export function BreadcrumbSchema({ items }: { items: Array<{ name: string; url: string }> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url
          }))
        })
      }}
    />
  );
}
