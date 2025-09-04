import React from 'react';
import { useRouter } from 'next/router';
import { SellerOnboarding } from '../../components/Marketplace/Seller/SellerOnboarding';

export default function SellerOnboardingPage() {
  const router = useRouter();

  const handleOnboardingComplete = () => {
    router.push('/seller/dashboard');
  };

  return <SellerOnboarding onComplete={handleOnboardingComplete} />;
}