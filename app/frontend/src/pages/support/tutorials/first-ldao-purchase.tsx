import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Clock, Users, Star, CheckCircle, Play, ArrowRight } from 'lucide-react';

const FirstLDAOPurchasePage: NextPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  const steps = [
    {
      title: "Connect Your Wallet",
      content: "First, you'll need to connect your Web3 wallet to the platform. We support MetaMask, Coinbase Wallet, and other popular wallets.",
      tips: ["Make sure you have some ETH or USDC for gas fees", "Use Polygon network for lower fees"],
      image: "/images/tutorials/connect-wallet.png"
    },
    {
      title: "Navigate to LDAO Section",
      content: "Go to your dashboard and click on the 'LDAO Tokens' section in the sidebar.",
      tips: ["Look for the LDAO logo in the navigation", "You can also use the search function"],
      image: "/images/tutorials/navigate-ldao.png"
    },
    {
      title: "Choose Purchase Amount",
      content: "Select how many LDAO tokens you want to buy. The minimum purchase is 10 LDAO tokens ($0.10).",
      tips: ["Check for volume discounts on larger purchases", "Consider starting small for your first purchase"],
      image: "/images/tutorials/choose-amount.png"
    },
    {
      title: "Select Payment Method",
      content: "Choose between cryptocurrency (ETH, USDC) or credit card payment. Crypto payments have lower fees.",
      tips: ["Crypto payments are usually cheaper", "Credit cards are more familiar but have higher fees"],
      image: "/images/tutorials/payment-method.png"
    },
    {
      title: "Review and Confirm",
      content: "Review your purchase details including the total cost, gas fees, and any applicable discounts.",
      tips: ["Double-check the amount and payment method", "Gas fees vary by network congestion"],
      image: "/images/tutorials/review-confirm.png"
    },
    {
      title: "Complete Purchase",
      content: "Confirm the transaction in your wallet and wait for blockchain confirmation. Your tokens will appear in your wallet.",
      tips: ["Don't close the browser during transaction", "Confirmation usually takes 1-5 minutes"],
      image: "/images/tutorials/complete-purchase.png"
    }
  ];

  return (
    <>
      <Head>
        <title>First LDAO Purchase Tutorial - Support Center</title>
        <meta name="description" content="Step-by-step tutorial to buy your first LDAO tokens in under 5 minutes" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-6">
          {/* Navigation */}
          <div className="mb-6">
            <Link href="/support" className="flex items-center text-blue-600 hover:text-blue-800 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Support Center
            </Link>
          </div>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Tutorial
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    Beginner
                  </span>
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  Your First LDAO Purchase
                </h1>
                
                <p className="text-gray-600 text-lg mb-4">
                  Complete step-by-step tutorial to buy your first LDAO tokens in under 5 minutes. 
                  Perfect for beginners new to cryptocurrency.
                </p>

                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>5 min tutorial</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>8,900 completed</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                    <span>4.9 rating</span>
                  </div>
                </div>
              </div>

              <div className="ml-6">
                <button className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Play className="w-5 h-5 mr-2" />
                  Start Tutorial
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              Step {currentStep} of {totalSteps}
            </p>
          </div>

          {/* Tutorial Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full mr-4">
                {currentStep}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {steps[currentStep - 1].title}
              </h2>
            </div>

            {/* Step Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <p className="text-gray-700 text-lg mb-6">
                  {steps[currentStep - 1].content}
                </p>

                {/* Tips */}
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Tips:</h4>
                  <ul className="text-blue-800 text-sm space-y-1">
                    {steps[currentStep - 1].tips.map((tip, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1}
                    className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <div className="flex space-x-2">
                    {Array.from({ length: totalSteps }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentStep(i + 1)}
                        className={`w-3 h-3 rounded-full ${
                          i + 1 === currentStep 
                            ? 'bg-blue-600' 
                            : i + 1 < currentStep 
                              ? 'bg-green-500' 
                              : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                    disabled={currentStep === totalSteps}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {currentStep === totalSteps ? 'Complete' : 'Next'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>

              {/* Visual/Screenshot */}
              <div className="bg-gray-100 rounded-lg p-6 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-64 h-40 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-gray-500">Screenshot: {steps[currentStep - 1].title}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Visual guide for step {currentStep}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Prerequisites */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Before You Start</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Web3 Wallet</h4>
                  <p className="text-sm text-gray-600">MetaMask, Coinbase Wallet, or similar</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Cryptocurrency</h4>
                  <p className="text-sm text-gray-600">ETH or USDC for purchases and gas fees</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Platform Account</h4>
                  <p className="text-sm text-gray-600">Registered and email verified</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Basic Understanding</h4>
                  <p className="text-sm text-gray-600">Familiarity with wallet transactions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Common Issues */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Issues & Solutions</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
                <h4 className="font-medium text-yellow-900 mb-2">Transaction Failed</h4>
                <p className="text-yellow-800 text-sm">
                  Usually caused by insufficient gas fees. Try increasing the gas limit or waiting for lower network congestion.
                </p>
              </div>
              <div className="border-l-4 border-red-400 bg-red-50 p-4">
                <h4 className="font-medium text-red-900 mb-2">Wallet Not Connecting</h4>
                <p className="text-red-800 text-sm">
                  Refresh the page, make sure your wallet extension is enabled, and try a different browser if needed.
                </p>
              </div>
              <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
                <h4 className="font-medium text-blue-900 mb-2">Tokens Not Showing</h4>
                <p className="text-blue-800 text-sm">
                  Check that you're on the correct network and add the LDAO token contract address to your wallet if needed.
                </p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/support/guides/staking-calculator" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <h4 className="font-medium text-gray-900 mb-2">Start Staking</h4>
                <p className="text-sm text-gray-600">Earn rewards on your LDAO tokens</p>
              </Link>
              <Link href="/support/guides/earn-ldao-community" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <h4 className="font-medium text-gray-900 mb-2">Earn More LDAO</h4>
                <p className="text-sm text-gray-600">Learn about the earn-to-own system</p>
              </Link>
              <Link href="/support/guides/dex-trading-masterclass" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <h4 className="font-medium text-gray-900 mb-2">Advanced Trading</h4>
                <p className="text-sm text-gray-600">Trade on decentralized exchanges</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FirstLDAOPurchasePage;