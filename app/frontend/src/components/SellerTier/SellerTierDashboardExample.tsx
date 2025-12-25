/**
 * SellerTierDashboardExample Component
 * Comprehensive example showing all tier system components in action
 */

import React, { useState } from 'react';
import {
  SellerTierBadge,
  TierProgressWidget,
  TierProgressionUI,
  SellerAnalyticsDashboard,
  TierBenefitsCard,
  SellerTier
} from './index';

// Mock data for demonstration
const mockAnalyticsData = {
  salesOverTime: [
    { date: 'Jan', sales: 4500, orders: 23 },
    { date: 'Feb', sales: 5200, orders: 28 },
    { date: 'Mar', sales: 4800, orders: 25 },
    { date: 'Apr', sales: 6100, orders: 32 },
    { date: 'May', sales: 7300, orders: 38 },
    { date: 'Jun', sales: 8900, orders: 45 }
  ],
  revenueByCategory: [
    { category: 'Electronics', revenue: 15000, percentage: 35 },
    { category: 'Clothing', revenue: 12000, percentage: 28 },
    { category: 'Books', revenue: 8000, percentage: 19 },
    { category: 'Home & Garden', revenue: 5000, percentage: 12 },
    { category: 'Sports', revenue: 3000, percentage: 6 }
  ],
  customerSatisfaction: [
    { month: 'Jan', rating: 4.2, reviews: 45 },
    { month: 'Feb', rating: 4.3, reviews: 52 },
    { month: 'Mar', rating: 4.4, reviews: 48 },
    { month: 'Apr', rating: 4.5, reviews: 61 },
    { month: 'May', rating: 4.6, reviews: 73 },
    { month: 'Jun', rating: 4.7, reviews: 89 }
  ],
  topProducts: [
    { name: 'Wireless Headphones', sales: 145, revenue: 14500 },
    { name: 'Smart Watch', sales: 98, revenue: 14700 },
    { name: 'Laptop Stand', sales: 87, revenue: 6525 },
    { name: 'USB-C Hub', sales: 76, revenue: 4560 },
    { name: 'Phone Case', sales: 65, revenue: 1950 }
  ],
  responseTimeMetrics: [
    { time: 'Week 1', average: 45, target: 30 },
    { time: 'Week 2', average: 38, target: 30 },
    { time: 'Week 3', average: 32, target: 30 },
    { time: 'Week 4', average: 28, target: 30 }
  ],
  geographicDistribution: [
    { country: 'United States', orders: 245, revenue: 24500 },
    { country: 'Canada', orders: 89, revenue: 8900 },
    { country: 'United Kingdom', orders: 67, revenue: 6700 },
    { country: 'Germany', orders: 45, revenue: 4500 },
    { country: 'Australia', orders: 34, revenue: 3400 }
  ]
};

const mockTierBenefits = {
  bronze: [
    {
      icon: () => null, // Will be set dynamically
      title: 'Commission Rate',
      description: 'Standard platform commission on all sales',
      value: '5%',
      isAvailable: true
    },
    {
      icon: () => null,
      title: 'Weekly Withdrawal Limit',
      description: 'Maximum amount you can withdraw per week',
      value: '$1,000',
      isAvailable: true
    },
    {
      icon: () => null,
      title: 'Customer Support',
      description: 'Access to standard customer support',
      value: 'Standard',
      isAvailable: true
    },
    {
      icon: () => null,
      title: 'Analytics Access',
      description: 'Basic sales and performance analytics',
      value: 'Basic',
      isAvailable: true
    }
  ],
  silver: [
    {
      icon: () => null,
      title: 'Commission Rate',
      description: 'Reduced commission rate',
      value: '4.5%',
      isAvailable: false
    },
    {
      icon: () => null,
      title: 'Weekly Withdrawal Limit',
      description: 'Higher withdrawal limits',
      value: '$5,000',
      isAvailable: false
    },
    {
      icon: () => null,
      title: 'Customer Support',
      description: 'Priority customer support',
      value: 'Priority',
      isAvailable: false
    },
    {
      icon: () => null,
      title: 'Analytics Dashboard',
      description: 'Advanced analytics with insights',
      value: 'Advanced',
      isAvailable: false
    }
  ],
  gold: [
    {
      icon: () => null,
      title: 'Commission Rate',
      description: 'Lower commission rate for higher profits',
      value: '4%',
      isAvailable: false
    },
    {
      icon: () => null,
      title: 'Weekly Withdrawal Limit',
      description: 'Substantially higher withdrawal limits',
      value: '$25,000',
      isAvailable: false
    },
    {
      icon: () => null,
      title: 'Marketing Tools',
      description: 'Access to promotional tools and features',
      value: 'Available',
      isAvailable: false
    },
    {
      icon: () => null,
      title: 'Advanced Analytics',
      description: 'Comprehensive analytics with custom reports',
      value: 'Advanced+',
      isAvailable: false
    }
  ],
  platinum: [
    {
      icon: () => null,
      title: 'Commission Rate',
      description: 'Lowest commission rate for maximum profits',
      value: '3.5%',
      isAvailable: false
    },
    {
      icon: () => null,
      title: 'Dedicated Account Manager',
      description: 'Personal account manager for support',
      value: 'Dedicated',
      isAvailable: false
    },
    {
      icon: () => null,
      title: 'Early Access Features',
      description: 'Get access to new features before anyone else',
      value: 'Early Access',
      isAvailable: false
    },
    {
      icon: () => null,
      title: 'Custom Branding',
      description: 'Customize your store with advanced branding',
      value: 'Available',
      isAvailable: false
    }
  ],
  diamond: [
    {
      icon: () => null,
      title: 'Commission Rate',
      description: 'VIP commission rate for top performers',
      value: '3%',
      isAvailable: false
    },
    {
      icon: () => null,
      title: 'White-Glove Support',
      description: 'Premium support with dedicated team',
      value: 'White-Glove',
      isAvailable: false
    },
    {
      icon: () => null,
      title: 'Revenue Sharing',
      description: 'Participate in platform revenue sharing',
      value: 'Available',
      isAvailable: false
    },
    {
      icon: () => null,
      title: 'API Access',
      description: 'Advanced API access for custom integrations',
      value: 'Full Access',
      isAvailable: false
    }
  ]
};

// Add icons to benefits
Object.keys(mockTierBenefits).forEach(tier => {
  mockTierBenefits[tier as SellerTier].forEach((benefit, index) => {
    // Import icons here or use a mapping function
  });
});

export const SellerTierDashboardExample: React.FC = () => {
  const [currentTier, setCurrentTier] = useState<SellerTier>('silver');
  const [periodFilter, setPeriodFilter] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedTier, setSelectedTier] = useState<SellerTier | null>(null);

  const mockRequirements = [
    {
      id: 'sales',
      label: 'Total Sales',
      current: 12000,
      required: 25000,
      unit: '$',
      icon: () => null, // Will be set dynamically
      isCompleted: false,
      progress: 48
    },
    {
      id: 'rating',
      label: 'Average Rating',
      current: 4.3,
      required: 4.3,
      unit: '',
      icon: () => null,
      isCompleted: true,
      progress: 100
    },
    {
      id: 'response',
      label: 'Response Time',
      current: 45,
      required: 30,
      unit: 'min',
      icon: () => null,
      isCompleted: false,
      progress: 67
    },
    {
      id: 'returns',
      label: 'Return Rate',
      current: 4.2,
      required: 5.0,
      unit: '%',
      icon: () => null,
      isCompleted: true,
      progress: 100
    }
  ];

  const mockTierData = [
    {
      tier: 'bronze' as SellerTier,
      name: 'Bronze',
      description: 'Perfect for new sellers',
      requirements: {
        sales: 0,
        rating: 0,
        responseTime: 0
      },
      benefits: {
        commissionRate: 5,
        withdrawalLimit: 1000,
        support: 'Standard',
        features: ['Basic analytics', 'Standard support']
      },
      isUnlocked: true,
      isCurrent: false
    },
    {
      tier: 'silver' as SellerTier,
      name: 'Silver',
      description: 'Growing sellers with consistent sales',
      requirements: {
        sales: 5000,
        rating: 4.0,
        responseTime: 60
      },
      benefits: {
        commissionRate: 4.5,
        withdrawalLimit: 5000,
        support: 'Priority',
        features: ['Advanced analytics', 'Priority support']
      },
      isUnlocked: true,
      isCurrent: true
    },
    {
      tier: 'gold' as SellerTier,
      name: 'Gold',
      description: 'Established sellers with strong performance',
      requirements: {
        sales: 25000,
        rating: 4.3,
        responseTime: 30,
        returnRate: 5
      },
      benefits: {
        commissionRate: 4,
        withdrawalLimit: 25000,
        support: 'Priority',
        features: ['Marketing tools', 'Advanced analytics']
      },
      isUnlocked: false,
      isCurrent: false
    },
    {
      tier: 'platinum' as SellerTier,
      name: 'Platinum',
      description: 'High-performing sellers with exceptional service',
      requirements: {
        sales: 100000,
        rating: 4.5,
        responseTime: 15,
        returnRate: 3,
        disputeRate: 1
      },
      benefits: {
        commissionRate: 3.5,
        withdrawalLimit: 100000,
        support: 'Dedicated Manager',
        features: ['Early access', 'Custom branding']
      },
      isUnlocked: false,
      isCurrent: false
    },
    {
      tier: 'diamond' as SellerTier,
      name: 'Diamond',
      description: 'Top-performing sellers who exemplify excellence',
      requirements: {
        sales: 500000,
        rating: 4.7,
        responseTime: 10,
        returnRate: 2,
        disputeRate: 0.5,
        repeatRate: 30
      },
      benefits: {
        commissionRate: 3,
        withdrawalLimit: Infinity,
        support: 'White-Glove',
        features: ['Revenue sharing', 'API access', 'Exclusive events']
      },
      isUnlocked: false,
      isCurrent: false
    }
  ];

  const mockCurrentMetrics = {
    totalSales: 12000,
    totalOrders: 89,
    averageRating: 4.3,
    averageResponseTime: 45,
    conversionRate: 3.2,
    repeatCustomerRate: 18
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Seller Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your store and track your performance
              </p>
            </div>
            <div className="flex items-center gap-4">
              <SellerTierBadge tier={currentTier} size="lg" />
              <select
                value={currentTier}
                onChange={(e) => setCurrentTier(e.target.value as SellerTier)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
                <option value="diamond">Diamond</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Progress and Benefits */}
          <div className="space-y-6">
            <TierProgressWidget
              currentTier={currentTier}
              nextTier="gold"
              requirements={mockRequirements}
              overallProgress={48}
              estimatedTimeToNext="2-3 months"
            />

            <TierBenefitsCard
              currentTier={currentTier}
              benefits={mockTierBenefits}
              onUpgradeClick={() => console.log('Upgrade clicked')}
              showComparison={false}
            />
          </div>

          {/* Right Column - Analytics and Progression */}
          <div className="lg:col-span-2 space-y-6">
            <SellerAnalyticsDashboard
              sellerTier={currentTier}
              analyticsData={mockAnalyticsData}
              currentMetrics={mockCurrentMetrics}
              periodFilter={periodFilter}
              onPeriodChange={setPeriodFilter}
            />

            <TierProgressionUI
              tiers={mockTierData}
              currentMetrics={{
                totalSales: mockCurrentMetrics.totalSales,
                rating: mockCurrentMetrics.averageRating,
                responseTime: mockCurrentMetrics.averageResponseTime,
                returnRate: 4.2,
                disputeRate: 0.8,
                repeatRate: mockCurrentMetrics.repeatCustomerRate
              }}
              onTierSelect={setSelectedTier}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerTierDashboardExample;