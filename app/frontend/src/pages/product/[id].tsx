import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Button, GlassPanel } from '@/design-system';

// Legacy product page - redirects to standardized URL

const ProductPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      // Redirect to the new standardized URL
      router.replace(`/marketplace/listing/${id}`);
    }
  }, [id, router]);

  // This page now redirects to the standardized URL

  // Show loading while redirecting

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="relative z-10 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/50 mx-auto mb-4"></div>
        <h1 className="text-xl font-bold text-white mb-2">Redirecting...</h1>
        <p className="text-white/70">Taking you to the product page</p>
      </div>
    </div>
  );
};

export default ProductPage;