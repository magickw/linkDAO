import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '../../../../design-system';
import { useToast } from '../../../../context/ToastContext';
import { API_BASE_URL } from '../../../../config/api';

interface PayoutSetupStepProps {
  onComplete: (data: any) => void;
  data?: any;
}

export function PayoutSetupStep({ onComplete, data }: PayoutSetupStepProps) {
  const { address } = useAccount();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<{
    connected: boolean;
    detailsSubmitted: boolean;
    payoutsEnabled: boolean;
    chargesEnabled: boolean;
    requirements?: any;
  } | null>(null);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [address]);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? (
      localStorage.getItem('linkdao_access_token') || 
      localStorage.getItem('token') || 
      localStorage.getItem('authToken') || 
      localStorage.getItem('auth_token')
    ) : null;
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  };

  const checkStatus = async () => {
    if (!address) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/stripe/connect/status`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        
        // If fully connected, we can auto-complete this step if needed
        if (data.detailsSubmitted && data.payoutsEnabled) {
          // Optional: onComplete({ payoutSetup: true });
        }
      }
    } catch (error) {
      console.error('Failed to check Stripe status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!address) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    try {
      setConnecting(true);
      const response = await fetch(`${API_BASE_URL}/api/stripe/connect/onboard`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          country: 'US', // Default, could be a dropdown
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start onboarding');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe
      window.location.href = url;
    } catch (error) {
      console.error('Onboarding error:', error);
      addToast('Failed to start onboarding. Please try again.', 'error');
      setConnecting(false);
    }
  };

  const handleManagePayouts = async () => {
    try {
      setConnecting(true);
      const response = await fetch(`${API_BASE_URL}/api/stripe/connect/login-link`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to get dashboard link');
      }

      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error) {
      console.error('Dashboard link error:', error);
      addToast('Failed to open dashboard. Please try again.', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleComplete = () => {
    if (status?.detailsSubmitted && status?.payoutsEnabled) {
      onComplete({
        payoutSetup: true,
        stripeConnected: true
      });
    } else {
      addToast('Please complete the Stripe onboarding to continue', 'warning');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const isFullyConnected = status?.detailsSubmitted && status?.payoutsEnabled;
  const isPending = status?.connected && (!status?.detailsSubmitted || !status?.payoutsEnabled);

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-6 border border-purple-500/30">
        <h4 className="text-white font-medium text-lg mb-2">💰 Secure Payouts with Stripe</h4>
        <p className="text-gray-300 text-sm mb-4">
          LinkDAO partners with Stripe to ensure you get paid securely and on time. 
          Connect your bank account or debit card to receive payouts from your sales.
        </p>
        
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Secure Processing
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Automated Payouts
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Global Support
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Stripe Account</h3>
            <p className="text-gray-400 text-sm">Status: {
              isFullyConnected ? <span className="text-green-400">Active & Connected</span> :
              isPending ? <span className="text-yellow-400">Pending Verification</span> :
              <span className="text-gray-400">Not Connected</span>
            }</p>
          </div>
          
          {/* Stripe Logo */}
          <div className="bg-[#635BFF] px-3 py-1 rounded text-white font-bold tracking-wider text-sm">
            STRIPE
          </div>
        </div>

        {isFullyConnected ? (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 flex items-start">
              <svg className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-green-300 font-medium text-sm mb-1">Account Ready</h4>
                <p className="text-green-200 text-sm">
                  Your payout account is set up and ready to receive funds.
                </p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleManagePayouts}
              disabled={connecting}
              className="w-full"
            >
              {connecting ? 'Loading...' : 'Manage Payout Settings on Stripe'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {isPending && (
              <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4 flex items-start">
                <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-yellow-300 font-medium text-sm mb-1">More Information Needed</h4>
                  <p className="text-yellow-200 text-sm">
                    Stripe requires additional information to enable payouts. Please continue the onboarding process.
                  </p>
                </div>
              </div>
            )}

            <Button 
              variant="primary" 
              onClick={handleConnect}
              disabled={connecting}
              className="w-full bg-[#635BFF] hover:bg-[#5851E1] border-none text-white py-3"
            >
              {connecting ? 'Connecting...' : (isPending ? 'Continue Onboarding' : 'Connect with Stripe')}
            </Button>
            
            <p className="text-center text-xs text-gray-500 mt-2">
              You will be redirected to a secure Stripe page to complete the setup.
            </p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-end pt-4">
        <Button 
          type="button" 
          variant="primary" 
          className="min-w-32"
          onClick={handleComplete}
          disabled={!isFullyConnected}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
