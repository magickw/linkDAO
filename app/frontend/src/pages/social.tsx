import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

// Redirect component - Social feed is now integrated into Home page
export default function SocialFeed() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new unified Home page
    router.replace('/');
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">
          Redirecting to Home...
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          The social feed is now part of your Home dashboard
        </p>
      </div>
    </div>
  );
}