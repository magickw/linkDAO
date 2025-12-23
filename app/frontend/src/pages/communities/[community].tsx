import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/Layout';
import CommunityView from '@/components/CommunityView';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';

export default function CommunityPage() {
  const router = useRouter();
  const { isMobile } = useMobileOptimization();
  const { community, post } = router.query;
  const [communityData, setCommunityData] = useState<any>(null);
  
  // Ref to track if we're currently updating to prevent blocking navigation
  const isUpdating = useRef(false);
  
  // Route change handlers to prevent blocking navigation
  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      console.log('[CommunityPage] Route change start:', url);
      
      // Cancel any pending operations to prevent blocking navigation
      if (isUpdating.current) {
        console.log('[CommunityPage] Cancelling pending operations to allow navigation');
        isUpdating.current = false;
      }
    };

    const handleRouteChangeComplete = (url: string) => {
      console.log('[CommunityPage] Route change complete:', url);
    };

    const handleRouteChangeError = (err: any, url: string) => {
      console.error('[CommunityPage] Route change error for', url, ':', err);
    };

    // Listen for route changes to properly handle navigation
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [router]);

  useEffect(() => {
    // Fetch community data for SEO
    const fetchCommunityData = async () => {
      if (community) {
        try {
          // Set updating flag to coordinate with navigation handlers
          isUpdating.current = true;
          
          // In a real implementation, fetch community data
          // const data = await CommunityService.getCommunityBySlug(community as string);
          // setCommunityData(data);
        } catch (error) {
          console.error('Error fetching community data:', error);
        } finally {
          // Clear updating flag when done
          isUpdating.current = false;
        }
      }
    };
    fetchCommunityData();
    
    // Cleanup function
    return () => {
      // Clear updating flag when component unmounts
      isUpdating.current = false;
    };
  }, [community]);

  // Generate SEO metadata
  const generateSEOMetadata = () => {
    const communityName = communityData?.displayName || community;
    const communityDescription = communityData?.description || `Join the ${communityName} community on LinkDAO`;

    return {
      title: `${communityName} - LinkDAO Community`,
      description: communityDescription,
      url: `https://linkdao.io/communities/${community}`,
      type: 'website'
    };
  };

  // If we don't have the community ID yet, show loading state
  if (!community) {
    return (
      <Layout title="Community - LinkDAO" fullWidth={isMobile}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  const seo = generateSEOMetadata();

  // Generate structured data for SEO
  const generateStructuredData = () => {
    if (!communityData) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: communityData.displayName,
      description: communityData.description,
      url: seo.url,
      logo: communityData.avatar,
      image: communityData.banner,
      memberCount: communityData.memberCount,
      keywords: communityData.tags?.join(', '),
      sameAs: []
    };
  };

  const structuredData = generateStructuredData();

  return (
    <Layout title={seo.title} fullWidth={true}>
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={seo.url} />
        <meta property="og:type" content={seo.type} />
        <meta property="og:image" content={communityData?.banner || 'https://linkdao.io/og-image-default.png'} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        <meta name="twitter:image" content={communityData?.banner || 'https://linkdao.io/og-image-default.png'} />
        <link rel="canonical" href={seo.url} />
        {communityData?.tags && communityData.tags.map((tag: string) => (
          <meta key={tag} name="keywords" content={tag} />
        ))}
        {structuredData && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structuredData)
            }}
          />
        )}
      </Head>
      <ErrorBoundary>
        <CommunityView
          communitySlug={community as string}
          highlightedPostId={post as string}
        />
      </ErrorBoundary>
    </Layout>
  );
}
