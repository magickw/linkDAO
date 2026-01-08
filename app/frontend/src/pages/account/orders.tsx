import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Redirect /account/orders to /marketplace/orders for consolidation
 */
export default function AccountOrdersRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/marketplace/orders');
  }, [router]);

  return null;
}
