import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/DashboardLayout';
import HashtagDiscovery from '@/components/HashtagDiscovery';

export default function HashtagsIndexPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Hashtag Discovery - Web3 Social Platform</title>
        <meta name="description" content="Discover trending hashtags and explore topics of interest in the Web3 community" />
      </Head>

      <DashboardLayout activeView="feed">
        <HashtagDiscovery 
          onHashtagSelect={(tag) => {
            router.push(`/hashtags/${tag}`);
          }}
          className="min-h-screen"
        />
      </DashboardLayout>
    </>
  );
}