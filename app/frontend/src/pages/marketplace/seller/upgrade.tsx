import React from 'react';
import { useRouter } from 'next/router';
import { useSeller, useSellerTiers } from '@/hooks/useSeller';
import { useToast } from '@/context/ToastContext';
import { Button, GlassPanel } from '@/design-system';
import Layout from '@/components/Layout';

export default function SellerUpgradePage() {
  const router = useRouter();
  const { profile } = useSeller();
  const { tiers } = useSellerTiers();
  const { addToast } = useToast();

  if (!profile) {
    return (
      <Layout title="Upgrade Seller Account - LinkDAO Marketplace" fullWidth={true}>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
          <GlassPanel className="max-w-md w-full text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Seller Profile Required</h1>
              <p className="text-gray-300 mb-6">
                You need to have a seller profile to upgrade your account.
              </p>
            </div>
            <Button onClick={() => router.push('/marketplace/seller/onboarding')} variant="primary">
              Start Seller Onboarding
            </Button>
          </GlassPanel>
        </div>
      </Layout>
    );
  }

  const currentTierIndex = tiers.findIndex(tier => tier.id === profile.tier);
  const nextTiers = tiers.slice(currentTierIndex + 1);

  return (
    <Layout title="Upgrade Seller Account - LinkDAO Marketplace" fullWidth={true}>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/marketplace/seller/dashboard')}
              className="flex items-center text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            
            <h1 className="text-2xl font-bold text-white">Upgrade Your Seller Account</h1>
            
            <div></div> {/* Spacer for alignment */}
          </div>

          <GlassPanel className="mb-8 p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-white mb-2">Current Plan: {tiers[currentTierIndex]?.name}</h2>
              <p className="text-gray-300">{tiers[currentTierIndex]?.description}</p>
            </div>
            
            <div className="flex justify-center mb-6">
              <div className="flex items-center">
                {tiers.map((tier, index) => (
                  <React.Fragment key={tier.id}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index <= currentTierIndex 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {index < currentTierIndex ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    {index < tiers.length - 1 && (
                      <div className={`h-1 w-12 ${
                        index < currentTierIndex ? 'bg-green-500' : 'bg-gray-700'
                      }`}></div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </GlassPanel>

          {nextTiers.length === 0 ? (
            <GlassPanel className="text-center p-12">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">You're on the Highest Tier!</h3>
              <p className="text-gray-300">
                Congratulations! You're already on our highest seller tier with all features unlocked.
              </p>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {nextTiers.map((tier) => (
                <GlassPanel key={tier.id} className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                    <p className="text-gray-300 mb-4">{tier.description}</p>
                    <div className="inline-block px-3 py-1 bg-purple-600 text-white text-sm rounded-full">
                      {tier.id === 'gold' ? 'Free' : 'Contact Support'}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-white mb-3">Benefits</h4>
                    <ul className="space-y-2">
                      {tier.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-300">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-white mb-3">Requirements</h4>
                    <ul className="space-y-2">
                      {tier.requirements.map((requirement, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-gray-300">{requirement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      if (tier.id === 'gold') {
                        // For gold tier, we might want to redirect to a verification page
                        addToast('Verification process would start here. In a real implementation, this would redirect to an email/phone verification flow.', 'info');
                      } else {
                        // For Platinum and Diamond tiers, contact support
                        addToast('To upgrade to ' + tier.name + ' tier, please contact our support team.', 'info');
                      }
                    }}
                  >
                    {tier.id === 'gold' ? 'Start Verification' : 'Contact Support'}
                  </Button>
                </GlassPanel>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}