import React from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ListingDetailPage from '@/components/Marketplace/Listing/ListingDetailPage';

export default function ListingPageRoute() {
  const router = useRouter();
  const { id } = router.query;

  if (!id || typeof id !== 'string') {
    return (
      <Layout title="Listing - LinkDAO Marketplace">
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading listing...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Listing Details - LinkDAO Marketplace">
      <ListingDetailPage listingId={id} />
    </Layout>
  );
}