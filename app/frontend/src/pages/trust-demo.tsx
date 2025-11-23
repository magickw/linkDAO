import React from 'react';
import { NextPage } from 'next';
import { 
  TrustLayer, 
  Web3ExplainerSection, 
  BlockchainVerification, 
  NFTVerificationBadge, 
  GlobalAccessibilityIndicator 
} from '../components/Trust';

const TrustDemoPage: NextPage = () => {
  const mockProductData = {
    transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    contractAddress: '0x1234567890123456789012345678901234567890',
    tokenId: '12345',
    blockNumber: 18500000,
    timestamp: 1640995200
  };

  const mockNFTMetadata = {
    name: 'Authentic Digital Art',
    description: 'A verified digital artwork with blockchain authenticity',
    image: 'https://example.com/image.png',
    attributes: [
      { trait_type: 'Artist', value: 'Digital Creator' },
      { trait_type: 'Edition', value: '1 of 1' },
      { trait_type: 'Year', value: '2024' }
    ],
    creator: '0x1234567890123456789012345678901234567890',
    royalties: 10
  };

  const mockProvenance = [
    {
      owner: '0x1111111111111111111111111111111111111111',
      timestamp: 1640995200,
      transactionHash: '0xabc123def456',
      event: 'minted' as const
    },
    {
      owner: '0x2222222222222222222222222222222222222222',
      timestamp: 1641081600,
      transactionHash: '0xdef456abc789',
      price: '2.5 ETH',
      event: 'sold' as const
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Trust & Transparency Demo
          </h1>
          <p className="text-xl text-gray-300">
            Experience Web3 marketplace trust features
          </p>
        </div>

        {/* Web3 Explainer Section */}
        <div className="mb-16">
          <Web3ExplainerSection />
        </div>

        {/* Product Trust Demo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-6">Product Trust Layer</h2>
            <TrustLayer
              escrowGuarantee={true}
              authenticityNFT={mockProductData.contractAddress}
              buyerProtection={true}
              transactionHash={mockProductData.transactionHash}
              blockNumber={mockProductData.blockNumber}
            />
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white mb-6">Blockchain Verification</h2>
            <BlockchainVerification
              transactionHash={mockProductData.transactionHash}
              contractAddress={mockProductData.contractAddress}
              tokenId={mockProductData.tokenId}
              blockNumber={mockProductData.blockNumber}
              timestamp={mockProductData.timestamp}
              network="ethereum"
            />
          </div>
        </div>

        {/* NFT Verification Demo */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">NFT Verification</h2>
          <div className="flex justify-center space-x-8">
            <div className="text-center">
              <p className="text-gray-300 mb-4">Small Badge</p>
              <NFTVerificationBadge
                contractAddress={mockProductData.contractAddress}
                tokenId={mockProductData.tokenId}
                size="sm"
                verified={true}
              />
            </div>
            
            <div className="text-center">
              <p className="text-gray-300 mb-4">Medium Badge (Clickable)</p>
              <NFTVerificationBadge
                contractAddress={mockProductData.contractAddress}
                tokenId={mockProductData.tokenId}
                size="md"
                metadata={mockNFTMetadata}
                showProvenance={true}
                provenance={mockProvenance}
              />
            </div>
            
            <div className="text-center">
              <p className="text-gray-300 mb-4">Large Badge</p>
              <NFTVerificationBadge
                contractAddress={mockProductData.contractAddress}
                tokenId={mockProductData.tokenId}
                size="lg"
                metadata={mockNFTMetadata}
              />
            </div>
          </div>
        </div>

        {/* Global Accessibility Demo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-6">Full Global Indicator</h2>
            <GlobalAccessibilityIndicator showLiveStats={true} />
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold text-white mb-6">Compact Version</h2>
            <div className="p-6 bg-gray-800/50 rounded-lg">
              <GlobalAccessibilityIndicator compact={true} />
            </div>
          </div>
        </div>

        {/* Integration Example */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            Complete Trust Integration Example
          </h2>
          <div className="max-w-4xl mx-auto space-y-6">
            <TrustLayer
              escrowGuarantee={true}
              authenticityNFT={mockProductData.contractAddress}
              buyerProtection={true}
              transactionHash={mockProductData.transactionHash}
              blockNumber={mockProductData.blockNumber}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BlockchainVerification
                transactionHash={mockProductData.transactionHash}
                contractAddress={mockProductData.contractAddress}
                network="ethereum"
              />
              
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-300 mb-4">NFT Authenticity</p>
                  <NFTVerificationBadge
                    contractAddress={mockProductData.contractAddress}
                    tokenId={mockProductData.tokenId}
                    metadata={mockNFTMetadata}
                    showProvenance={true}
                    provenance={mockProvenance}
                  />
                </div>
              </div>
            </div>
            
            <GlobalAccessibilityIndicator compact={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustDemoPage;