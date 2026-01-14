import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/context/ToastContext';

export default function SocialConnectionsCallback() {
  const router = useRouter();
  const { addToast } = useToast();

  useEffect(() => {
    // Handle OAuth callback redirect
    const { success, error, platform, username } = router.query;

    // Show appropriate toast message
    if (success) {
      addToast(
        `Successfully connected to ${platform}!${username ? ` as ${username}` : ''}`,
        'success'
      );
    } else if (error) {
      addToast(
        `Failed to connect to ${platform}: ${error}`,
        'error'
      );
    }

    // Redirect to settings page with social tab active
    router.replace('/settings?tab=social', undefined, { shallow: true });
  }, [router.query, router, addToast]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">
          {router.query.success ? 'Connection successful! Redirecting...' : 'Processing...'}
        </p>
      </div>
    </div>
  );
}