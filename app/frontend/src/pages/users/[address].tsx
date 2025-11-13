import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function UserPage() {
  const router = useRouter();
  const { address } = router.query;

  useEffect(() => {
    if (address) {
      // Redirect to the profile page with the user query parameter
      router.push(`/profile?user=${address}`);
    }
  }, [address, router]);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}