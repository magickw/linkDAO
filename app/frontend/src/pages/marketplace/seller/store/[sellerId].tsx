import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import SellerStorePage from '@/components/Marketplace/Seller/SellerStorePage';
import { MarketplaceBreadcrumbs } from '@/components/Marketplace/Navigation/MarketplaceBreadcrumbs';
import { useMarketplaceBreadcrumbs } from '@/hooks/useMarketplaceBreadcrumbs';
import { MarketplaceErrorBoundary } from '@/components/ErrorHandling/MarketplaceErrorBoundary';
import { SellerNotFoundFallback } from '@/components/ErrorHandling/MarketplaceErrorFallback';
import { useAccount } from 'wagmi';

export default function SellerStorePageRoute() {
  const router = useRouter();
  const { sellerId } = router.query;
  const { breadcrumbItems } = useMarketplaceBreadcrumbs();
  const { address } = useAccount();

  // Handle product navigation from store page
  const handleProductClick = (productId: string) => {
    router.push(`/marketplace/listing/${productId}`);
  };

  if (!sellerId || typeof sellerId !== 'string') {
    return (
      <Layout title="Seller Store - LinkDAO Marketplace" fullWidth={true}>
        <SellerNotFoundFallback />
      </Layout>
    );
  }

  return (
    <Layout title={`Seller Store - LinkDAO Marketplace`} fullWidth={true}>
      <MarketplaceErrorBoundary>
        {/* Breadcrumb Navigation */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-3">
            <MarketplaceBreadcrumbs
              items={breadcrumbItems}
              className="text-gray-600"
              preserveFilters={true}
            />
          </div>
        </div>

        <SellerStorePage
          sellerId={sellerId}
          onProductClick={handleProductClick}
          // Pass isEditable prop when this is the seller's own store
          isEditable={address?.toLowerCase() === sellerId?.toLowerCase()}
        />
      </MarketplaceErrorBoundary>
    </Layout>
  );
}