import React from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import { useSeller } from '@/hooks/useSeller';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';

interface SellerQuickAccessPanelProps {
  onActionComplete?: () => void;
}

export const SellerQuickAccessPanel: React.FC<SellerQuickAccessPanelProps> = ({ 
  onActionComplete 
}) => {
  const { isConnected } = useAccount();
  const { profile } = useSeller();
  const router = useRouter();

  const handleSellerAction = () => {
    if (!isConnected) {
      // In a real implementation, this would trigger wallet connection
      return;
    }
    
    if (!profile) {
      // Redirect to seller onboarding API endpoint
      router.push('/marketplace/seller/onboarding');
    } else {
      router.push('/marketplace/seller/dashboard');
    }
    
    if (onActionComplete) {
      onActionComplete();
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <GlassPanel variant="secondary" className="mb-6">
      <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {profile ? (
              <>
                {profile.coverImage ? (
                  <img
                    src={profile.coverImage}
                    alt={profile.storeName || 'Seller'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {profile.storeName?.charAt(0) || 'S'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-white font-medium text-sm">{profile.storeName}</p>
                  <p className="text-white/60 text-xs">Seller Dashboard</p>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">S</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Become a Seller</p>
                  <p className="text-white/60 text-xs">Start selling on LinkDAO</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleSellerAction}
            variant={profile ? "primary" : "outline"}
            size="small"
          >
            {profile ? 'Go to Dashboard' : 'Start Selling'}
          </Button>
          {profile && (
            <>
              <Button
                onClick={() => router.push('/marketplace/seller/profile')}
                variant="outline"
                size="small"
              >
                Profile
              </Button>
              <Button
                onClick={() => router.push('/marketplace/seller/listings/create')}
                variant="outline"
                size="small"
              >
                Create Listing
              </Button>
            </>
          )}
        </div>
      </div>
    </GlassPanel>
  );
};