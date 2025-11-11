import React from 'react';

interface DynamicSEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

const DynamicSEO: React.FC<DynamicSEOProps> = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  section,
  tags = []
}) => {
  // Default values
  const defaultTitle = 'LinkDAO - The Web3 Social Network';
  const defaultDescription = 'Join the future of social networking. Own your data, earn from your content, and shape the platform through decentralized governance.';
  const defaultImage = 'https://linkdao.io/images/linkdao-social-preview.png';
  const defaultUrl = typeof window !== 'undefined' ? window.location.href : 'https://linkdao.io';
  
  // Use provided values or defaults
  const finalTitle = title ? `${title} | LinkDAO` : defaultTitle;
  const finalDescription = description || defaultDescription;
  const finalImage = image || defaultImage;
  const finalUrl = url || defaultUrl;
  const finalKeywords = keywords || 'Web3, social network, decentralized, blockchain, DAO, cryptocurrency, NFT, DeFi';
  
  // Generate structured data
  const generateStructuredData = () => {
    const baseSchema = {
      '@context': 'https://schema.org',
      '@type': type === 'article' ? 'Article' : 
               type === 'product' ? 'Product' : 
               type === 'profile' ? 'ProfilePage' : 
               type === 'organization' ? 'Organization' : 'WebPage',
      'name': finalTitle,
      'description': finalDescription,
      'url': finalUrl,
      'image': finalImage,
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
          'name': author || 'LinkDAO'
        },
        'datePublished': publishedTime,
        'dateModified': modifiedTime,
        'articleSection': section
      };
    }

    if (type === 'product') {
      return {
        ...baseSchema,
        'offers': {
          '@type': 'Offer',
          'priceCurrency': 'ETH',
          'availability': 'https://schema.org/InStock'
        }
      };
    }

    return baseSchema;
  };

  const schemaData = generateStructuredData();

  return (
    <>
      <title>{finalTitle}</title>
      <meta name="title" content={finalTitle} />
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      <meta name="author" content={author || 'LinkDAO'} />
      
      {/* Open Graph */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="LinkDAO" />
      
      {section && <meta property="article:section" content={section} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {tags.map(tag => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
      <meta name="twitter:site" content="@linkdao" />
      
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemaData)
        }}
      />
    </>
  );
};

export default DynamicSEO;