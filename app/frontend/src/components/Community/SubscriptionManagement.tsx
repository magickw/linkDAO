/**
 * Subscription Management Component
 * Handles community subscriptions with Stripe and crypto payment options
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Crown, Check, Zap, Gift, CreditCard, Wallet as WalletIcon } from 'lucide-react';
import { Button, GlassPanel } from '@/design-system';

interface SubscriptionTier {
  id: string;
  communityId: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: 'USD' | 'ETH' | 'LDAO';
  benefits: string[];
  features: {
    prioritySupport: boolean;
    exclusiveContent: boolean;
    customBadge: boolean;
    adFree: boolean;
    earlyAccess: boolean;
    governanceBonus: number;
  };
  isPopular?: boolean;
  maxSubscribers?: number;
  currentSubscribers?: number;
}

interface UserSubscription {
  id: string;
  tierId: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  paymentMethod: 'stripe' | 'crypto';
}

interface SubscriptionManagementProps {
  communityId: string;
  communityName: string;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  communityId,
  communityName
}) => {
  const { address, isConnected } = useAccount();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'crypto'>('stripe');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, [communityId, address]);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      
      const [tiersData, subscriptionData] = await Promise.all([
        fetchSubscriptionTiers(),
        address ? fetchUserSubscription() : Promise.resolve(null)
      ]);

      setTiers(tiersData);
      setUserSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionTiers = async (): Promise<SubscriptionTier[]> => {
    try {
      const response = await fetch(`/api/communities/${communityId}/subscriptions/tiers`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching tiers:', error);
      return [];
    }
  };

  const fetchUserSubscription = async (): Promise<UserSubscription | null> => {
    if (!address) return null;
    
    try {
      const response = await fetch(
        `/api/communities/${communityId}/subscriptions/user/${address}`
      );
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
  };

  const handleSubscribe = async (tierId: string) => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    setProcessingPayment(true);

    try {
      if (paymentMethod === 'stripe') {
        await handleStripePayment(tierId);
      } else {
        await handleCryptoPayment(tierId);
      }

      await loadSubscriptionData();
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleStripePayment = async (tierId: string) => {
    const tier = tiers.find(t => t.id === tierId);
    if (!tier) return;

    // Create Stripe checkout session
    const response = await fetch(`/api/communities/${communityId}/subscriptions/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tierId,
        billingPeriod,
        userAddress: address,
        paymentMethod: 'stripe'
      })
    });

    if (!response.ok) throw new Error('Failed to create checkout session');

    const { checkoutUrl } = await response.json();
    window.location.href = checkoutUrl;
  };

  const handleCryptoPayment = async (tierId: string) => {
    const tier = tiers.find(t => t.id === tierId);
    if (!tier) return;

    // Initiate crypto payment
    const response = await fetch(`/api/communities/${communityId}/subscriptions/crypto-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tierId,
        billingPeriod,
        userAddress: address,
        paymentMethod: 'crypto'
      })
    });

    if (!response.ok) throw new Error('Failed to process crypto payment');

    const { paymentAddress, amount, tokenAddress } = await response.json();
    
    // Here you would integrate with wagmi to send transaction
    console.log('Send', amount, 'to', paymentAddress);
  };

  const handleCancelSubscription = async () => {
    if (!userSubscription) return;

    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    try {
      const response = await fetch(
        `/api/communities/${communityId}/subscriptions/${userSubscription.id}/cancel`,
        { method: 'POST' }
      );

      if (!response.ok) throw new Error('Failed to cancel subscription');

      await loadSubscriptionData();
      alert('Subscription cancelled successfully');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription');
    }
  };

  const calculateSavings = (tier: SubscriptionTier): number => {
    const monthlyTotal = tier.priceMonthly * 12;
    const savings = monthlyTotal - tier.priceYearly;
    return Math.round((savings / monthlyTotal) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">
          Subscribe to {communityName}
        </h2>
        <p className="text-gray-400">
          Get exclusive access and support the community
        </p>
      </div>

      {/* Billing Period Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-white/10 rounded-lg p-1">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              billingPeriod === 'yearly'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Yearly
            <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
              Save up to 20%
            </span>
          </button>
        </div>
      </div>

      {/* Current Subscription Status */}
      {userSubscription && userSubscription.status === 'active' && (
        <GlassPanel className="p-6 border-2 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Crown className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Active Subscription</p>
                <p className="text-sm text-gray-400">
                  Renews {new Date(userSubscription.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button
              onClick={handleCancelSubscription}
              variant="secondary"
              size="small"
            >
              Cancel Subscription
            </Button>
          </div>
        </GlassPanel>
      )}

      {/* Subscription Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const price = billingPeriod === 'monthly' ? tier.priceMonthly : tier.priceYearly / 12;
          const isCurrentTier = userSubscription?.tierId === tier.id;
          const savings = calculateSavings(tier);

          return (
            <GlassPanel
              key={tier.id}
              className={`p-6 relative ${
                tier.isPopular ? 'border-2 border-blue-500' : ''
              } ${isCurrentTier ? 'border-2 border-green-500' : ''}`}
            >
              {tier.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              {isCurrentTier && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="px-4 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                    YOUR PLAN
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{tier.description}</p>
                
                <div className="mb-2">
                  <span className="text-4xl font-bold text-white">
                    ${price.toFixed(2)}
                  </span>
                  <span className="text-gray-400 ml-2">/month</span>
                </div>

                {billingPeriod === 'yearly' && savings > 0 && (
                  <p className="text-sm text-green-400">
                    Save {savings}% with yearly billing
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {tier.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-300">
                    <Check className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              {/* Subscribe Button */}
              {!isCurrentTier ? (
                <Button
                  onClick={() => {
                    setSelectedTier(tier.id);
                    handleSubscribe(tier.id);
                  }}
                  disabled={processingPayment}
                  className={`w-full ${
                    tier.isPopular
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {processingPayment && selectedTier === tier.id ? (
                    'Processing...'
                  ) : (
                    'Subscribe Now'
                  )}
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full bg-green-600 cursor-not-allowed"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Current Plan
                </Button>
              )}

              {/* Subscriber Count */}
              {tier.maxSubscribers && (
                <p className="text-xs text-center text-gray-400 mt-3">
                  {tier.currentSubscribers || 0} / {tier.maxSubscribers} subscribers
                </p>
              )}
            </GlassPanel>
          );
        })}
      </div>

      {/* Payment Method Selection */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Payment Method</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setPaymentMethod('stripe')}
            className={`p-4 rounded-lg border-2 transition-all ${
              paymentMethod === 'stripe'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-white/20 hover:border-white/40'
            }`}
          >
            <div className="flex items-center space-x-3">
              <CreditCard className="w-6 h-6 text-blue-400" />
              <div className="text-left">
                <p className="font-medium text-white">Credit/Debit Card</p>
                <p className="text-sm text-gray-400">Via Stripe</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setPaymentMethod('crypto')}
            className={`p-4 rounded-lg border-2 transition-all ${
              paymentMethod === 'crypto'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-white/20 hover:border-white/40'
            }`}
          >
            <div className="flex items-center space-x-3">
              <WalletIcon className="w-6 h-6 text-purple-400" />
              <div className="text-left">
                <p className="font-medium text-white">Cryptocurrency</p>
                <p className="text-sm text-gray-400">ETH, USDC, LDAO</p>
              </div>
            </div>
          </button>
        </div>
      </GlassPanel>

      {/* FAQ */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-white mb-1">Can I cancel anytime?</p>
            <p className="text-sm text-gray-400">
              Yes, you can cancel your subscription at any time. You'll retain access until the end of your billing period.
            </p>
          </div>
          <div>
            <p className="font-medium text-white mb-1">What payment methods do you accept?</p>
            <p className="text-sm text-gray-400">
              We accept credit/debit cards via Stripe, as well as cryptocurrency payments (ETH, USDC, LDAO).
            </p>
          </div>
          <div>
            <p className="font-medium text-white mb-1">Is there a free trial?</p>
            <p className="text-sm text-gray-400">
              Some tiers offer a 7-day free trial. Check the tier details for availability.
            </p>
          </div>
          <div>
            <p className="font-medium text-white mb-1">Can I change my subscription tier?</p>
            <p className="text-sm text-gray-400">
              Yes, you can upgrade or downgrade at any time. Changes take effect at the start of your next billing cycle.
            </p>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default SubscriptionManagement;
