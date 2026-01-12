import React from 'react';
import Head from 'next/head';
import { generateKeywordsFromContent } from '@/utils/seoUtils';
import { ENV_CONFIG } from '@/config/environment';

interface SEOHeadProps {
  title: string;
  description?: string;
  keywords?: string;
  url?: string;
  image?: string;
  type?: 'website' | 'article' | 'product' | 'profile' | 'organization';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  additionalMeta?: Array<{ name: string; content: string }>;
  structuredData?: Record<string, any>;
  noIndex?: boolean;
  noFollow?: boolean;
  canonicalUrl?: string;
  locale?: string;
  alternateLocales?: string[];
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
  ogLocale?: string;
  ogSiteName?: string;
  fbAppId?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description = 'Join the future of social networking. Own your data, earn from your content, and shape the platform through decentralized governance.',
  keywords,
  url = typeof window !== 'undefined' ? window.location.href : 'https://linkdao.io',
  image = 'https://linkdao.io/images/linkdao-social-preview.png',
  type = 'website',
  author = 'LinkDAO',
  publishedTime,
  modifiedTime,
  section,
  tags = [],
  additionalMeta = [],
  structuredData,
  noIndex = false,
  noFollow = false,
  canonicalUrl,
  locale = 'en_US',
  alternateLocales = [],
  twitterCard = 'summary_large_image',
  twitterSite = '@linkdao',
  twitterCreator,
  ogLocale = 'en_US',
  ogSiteName = 'LinkDAO',
  fbAppId
}) => {
  // Generate keywords from content if not provided
  const generatedKeywords = keywords || generateKeywordsFromContent(description, tags);

  // Generate canonical URL if not provided
  const finalCanonicalUrl = canonicalUrl || url;

  // Generate structured data based on type
  const generateStructuredData = () => {
    if (structuredData) return structuredData;

    const baseSchema = {
      '@context': 'https://schema.org',
      '@type': type === 'article' ? 'Article' : 
               type === 'product' ? 'Product' : 
               type === 'profile' ? 'ProfilePage' : 
               type === 'organization' ? 'Organization' : 'WebPage',
      'name': title,
      'description': description,
      'url': url,
      'publisher': {
        '@type': 'Organization',
        'name': 'LinkDAO',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://linkdao.io/images/logo.png'
        }
      }
    };

    if (type === 'article') {
      return {
        ...baseSchema,
        'author': {
          '@type': 'Person',
          'name': author
        },
        'datePublished': publishedTime,
        'dateModified': modifiedTime
      };
    }

    if (type === 'product') {
      return {
        ...baseSchema,
        'offers': {
          '@type': 'Offer',
          'priceCurrency': 'ETH',
          'availability': 'https://schema.org/InStock'
        },
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': '4.8',
          'reviewCount': '1200'
        }
      };
    }

    return baseSchema;
  };

  const schemaData = generateStructuredData();

  // Generate robots meta tag
  const robotsContent = [
    noIndex ? 'noindex' : 'index',
    noFollow ? 'nofollow' : 'follow'
  ].join(', ');

  return (
    <Head>
      {/* Google Analytics */}
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-053PFGVQ9D"></script>
      <script>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-053PFGVQ9D');
        `}
      </script>

      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={generatedKeywords} />
      <meta name="robots" content={robotsContent} />
      <meta name="author" content={author} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#3B82F6" />

      {/* Canonical URL */}
      <link rel="canonical" href={finalCanonicalUrl} />

      {/* Alternate URLs for internationalization */}
      {alternateLocales.map(locale => (
        <link key={locale} rel="alternate" hrefLang={locale} href={url} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={url} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={ogSiteName} />
      <meta property="og:locale" content={ogLocale} />
      {section && <meta property="article:section" content={section} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {tags.map(tag => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content={twitterSite} />
      {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}

      {/* Facebook App ID */}
      {fbAppId && <meta property="fb:app_id" content={fbAppId} />}

      {/* Additional Meta Tags */}
      {additionalMeta.map((meta, index) => (
        <meta key={index} name={meta.name} content={meta.content} />
      ))}

      {/* Structured Data */}
      {schemaData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schemaData)
          }}
        />
      )}

      {/* Resource Hints */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="//linkdao.io" />
      {/* Use environment-specific API URL for DNS prefetch */}
      <link rel="dns-prefetch" href={ENV_CONFIG.IS_PRODUCTION ? "//api.linkdao.io" : `//${new URL(ENV_CONFIG.API_URL).hostname}`} />
    </Head>
  );
};

export default SEOHead;