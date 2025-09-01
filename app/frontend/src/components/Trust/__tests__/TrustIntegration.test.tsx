import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { 
  TrustLayer, 
  Web3ExplainerSection, 
  BlockchainVerification, 
  NFTVerificationBadge, 
  GlobalAccessibilityIndicator 
} from '../index';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock window.open
const mockOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockOpen,
  writable: true,
});

describe('Trust Components Integration', () => {
  beforeEach(() => {
    mockOpen.mockClear();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders complete trust ecosystem for a product page', async () => {
    const productData = {
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      contractAddress: '0x1234567890123456789012345678901234567890',
      tokenId: '12345',
      blockNumber: 18500000,
      timestamp: 1640995200
    };

    render(
      <div>
        <Web3ExplainerSection />
        <TrustLayer
          escrowGuarantee={true}
          authenticityNFT={productData.contractAddress}
          buyerProtection={true}
          transactionHash={productData.transactionHash}
          blockNumber={productData.blockNumber}
        />
        <BlockchainVerification
          transactionHash={productData.transactionHash}
          contractAddress={productData.contractAddress}
          tokenId={productData.tokenId}
          blockNumber={productData.blockNumber}
          timestamp={productData.timestamp}
        />
        <NFTVerificationBadge
          contractAddress={productData.contractAddress}
          tokenId={productData.tokenId}
        />
        <GlobalAccessibilityIndicator />
      </div>
    );

    // Verify all main components are rendered
    expect(screen.getByText('Why Web3 Marketplace?')).toBeInTheDocument();
    expect(screen.getByText('Trust & Security')).toBeInTheDocument();
    expect(screen.getByText('Blockchain Verification')).toBeInTheDocument();
    expect(screen.getByText('Global Accessibility')).toBeInTheDocument();
  });

  it('demonstrates complete trust verification workflow', async () => {
    const productData = {
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      contractAddress: '0x1234567890123456789012345678901234567890',
      tokenId: '12345'
    };

    render(
      <div>
        <TrustLayer
          escrowGuarantee={true}
          authenticityNFT={productData.contractAddress}
          buyerProtection={true}
          transactionHash={productData.transactionHash}
        />
        <BlockchainVerification
          transactionHash={productData.transactionHash}
          contractAddress={productData.contractAddress}
        />
        <NFTVerificationBadge
          contractAddress={productData.contractAddress}
          tokenId={productData.tokenId}
        />
      </div>
    );

    // Test trust layer indicators
    expect(screen.getByText('Escrow Protected')).toBeInTheDocument();
    expect(screen.getByText('Blockchain Certified')).toBeInTheDocument();
    expect(screen.getByText('Buyer Protection')).toBeInTheDocument();

    // Test blockchain verification
    expect(screen.getByText('Verifying...')).toBeInTheDocument();
    
    // Wait for verification to complete
    jest.useFakeTimers();
    jest.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
    jest.useRealTimers();

    // Test NFT verification badge
    const nftBadge = screen.getByRole('button');
    fireEvent.click(nftBadge);
    
    await waitFor(() => {
      expect(screen.getByText('NFT Verification')).toBeInTheDocument();
      expect(screen.getByText('Authentic NFT Verified')).toBeInTheDocument();
    });
  });

  it('validates blockchain data consistency across components', async () => {
    const consistentData = {
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      contractAddress: '0x1234567890123456789012345678901234567890',
      tokenId: '12345'
    };

    render(
      <div>
        <TrustLayer
          transactionHash={consistentData.transactionHash}
          authenticityNFT={consistentData.contractAddress}
        />
        <BlockchainVerification
          transactionHash={consistentData.transactionHash}
          contractAddress={consistentData.contractAddress}
        />
        <NFTVerificationBadge
          contractAddress={consistentData.contractAddress}
          tokenId={consistentData.tokenId}
        />
      </div>
    );

    // Verify consistent transaction hash display
    const shortTxHash = `${consistentData.transactionHash.slice(0, 10)}...${consistentData.transactionHash.slice(-8)}`;
    const txHashElements = screen.getAllByText(shortTxHash);
    expect(txHashElements.length).toBeGreaterThan(0);

    // Verify consistent contract address display
    const shortContractAddress = `${consistentData.contractAddress.slice(0, 10)}...${consistentData.contractAddress.slice(-8)}`;
    const contractElements = screen.getAllByText(shortContractAddress);
    expect(contractElements.length).toBeGreaterThan(0);
  });

  it('handles external link navigation consistently', async () => {
    const testData = {
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      contractAddress: '0x1234567890123456789012345678901234567890',
      tokenId: '12345'
    };

    render(
      <div>
        <TrustLayer
          transactionHash={testData.transactionHash}
          authenticityNFT={testData.contractAddress}
        />
        <BlockchainVerification
          transactionHash={testData.transactionHash}
          contractAddress={testData.contractAddress}
        />
        <NFTVerificationBadge
          contractAddress={testData.contractAddress}
          tokenId={testData.tokenId}
        />
      </div>
    );

    // Test TrustLayer external links
    const trustLayerEtherscanButton = screen.getByText('View on Etherscan →');
    fireEvent.click(trustLayerEtherscanButton);
    expect(mockOpen).toHaveBeenCalledWith(
      `https://etherscan.io/tx/${testData.transactionHash}`,
      '_blank'
    );

    const trustLayerCertificateButton = screen.getByText('View Certificate →');
    fireEvent.click(trustLayerCertificateButton);
    expect(mockOpen).toHaveBeenCalledWith(
      `https://etherscan.io/token/${testData.contractAddress}`,
      '_blank'
    );

    // Test BlockchainVerification external links
    const blockchainViewButtons = screen.getAllByText('View →');
    fireEvent.click(blockchainViewButtons[0]); // Transaction link
    expect(mockOpen).toHaveBeenCalledWith(
      `https://etherscan.io/tx/${testData.transactionHash}`,
      '_blank'
    );

    // Test NFT verification modal
    const nftBadge = screen.getByRole('button');
    fireEvent.click(nftBadge);
    
    await waitFor(() => {
      const viewContractButton = screen.getByText('View Contract →');
      fireEvent.click(viewContractButton);
      expect(mockOpen).toHaveBeenCalledWith(
        `https://etherscan.io/address/${testData.contractAddress}`,
        '_blank'
      );
    });
  });

  it('demonstrates fee comparison accuracy', async () => {
    render(<Web3ExplainerSection />);

    // Switch to fee comparison tab
    const comparisonTab = screen.getByText('Fee Comparison');
    fireEvent.click(comparisonTab);

    await waitFor(() => {
      // Verify fee comparison data
      expect(screen.getByText('Platform Fees')).toBeInTheDocument();
      expect(screen.getByText('10% - 30%')).toBeInTheDocument(); // Web2 fees
      expect(screen.getByText('0% - 2%')).toBeInTheDocument(); // Web3 fees
      
      // Verify savings calculation
      expect(screen.getByText('💡 Example Savings')).toBeInTheDocument();
      expect(screen.getByText(/Save \$80-280 per transaction!/)).toBeInTheDocument();
    });

    // Test expandable feature details
    const platformFeesRow = screen.getByText('Platform Fees').closest('div');
    if (platformFeesRow) {
      fireEvent.click(platformFeesRow);
    }

    await waitFor(() => {
      expect(screen.getByText('Save up to 28% on every transaction')).toBeInTheDocument();
    });
  });

  it('validates global accessibility statistics', async () => {
    render(<GlobalAccessibilityIndicator showLiveStats={true} />);

    // Verify initial statistics
    expect(screen.getByText('12,847')).toBeInTheDocument(); // Active users
    expect(screen.getByText('195')).toBeInTheDocument(); // Countries
    expect(screen.getByText('3,421')).toBeInTheDocument(); // Transactions
    expect(screen.getByText('$2.4M')).toBeInTheDocument(); // Volume

    // Test live updates
    jest.useFakeTimers();
    jest.advanceTimersByTime(5000);
    
    await waitFor(() => {
      // Statistics should have updated (values will be different due to random increments)
      const statisticsSection = screen.getByText('Active Users').closest('div');
      expect(statisticsSection).toBeInTheDocument();
    });
    jest.useRealTimers();
  });

  it('ensures responsive behavior across trust components', () => {
    render(
      <div>
        <Web3ExplainerSection />
        <TrustLayer escrowGuarantee={true} />
        <GlobalAccessibilityIndicator compact={true} />
      </div>
    );

    // Verify compact mode for GlobalAccessibilityIndicator
    expect(screen.getByText('Global 24/7')).toBeInTheDocument();
    expect(screen.getByText('⚡ Instant Settlement')).toBeInTheDocument();

    // Verify full components are still rendered
    expect(screen.getByText('Why Web3 Marketplace?')).toBeInTheDocument();
    expect(screen.getByText('Trust & Security')).toBeInTheDocument();
  });

  it('validates trust indicator accuracy across components', () => {
    render(
      <div>
        <TrustLayer
          escrowGuarantee={true}
          authenticityNFT="0x123"
          buyerProtection={true}
        />
        <NFTVerificationBadge
          contractAddress="0x123"
          tokenId="1"
          verified={true}
        />
      </div>
    );

    // Verify trust indicators are consistent
    expect(screen.getByText('Escrow Protected')).toBeInTheDocument();
    expect(screen.getByText('Blockchain Certified')).toBeInTheDocument();
    expect(screen.getByText('Buyer Protection')).toBeInTheDocument();

    // Verify NFT verification badge shows verified status
    expect(screen.getByText('NFT Verified')).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    // Test with invalid/missing data
    render(
      <div>
        <TrustLayer />
        <BlockchainVerification />
        <NFTVerificationBadge contractAddress="" tokenId="" />
        <GlobalAccessibilityIndicator showLiveStats={false} />
      </div>
    );

    // Components should still render without crashing
    expect(screen.getByText('Trust & Security')).toBeInTheDocument();
    expect(screen.getByText('Blockchain Verification')).toBeInTheDocument();
    expect(screen.getByText('Global Accessibility')).toBeInTheDocument();
  });
});