import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/DashboardLayout';
import HashtagDiscovery from '@/components/HashtagDiscovery';

export default function HashtagPage() {
  const router = useRouter();
  const { hashtag } = router.query;

  const hashtagName = typeof hashtag === 'string' ? hashtag : '';

  return (
    <>
      <Head>
        <title>{hashtagName ? `#${hashtagName}` : 'Hashtag Discovery'} - Web3 Social Platform</title>
        <meta 
          name="description" 
          content={
            hashtagName 
              ? `Explore posts and discussions about #${hashtagName}` 
              : 'Discover trending hashtags and explore topics of interest'
          } 
        />
      </Head>

      <DashboardLayout activeView="feed">
        <HashtagDiscovery
          hashtag={hashtagName}
          onHashtagSelect={(tag) => {
            router.push(`/search?q=${encodeURIComponent('#' + tag)}`);
          }}
          className="min-h-screen"
        />
      </DashboardLayout>
    </>
  );
}