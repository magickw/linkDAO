import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Web3ExplainerSection } from '../Web3ExplainerSection';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('Web3ExplainerSection', () => {
  it('renders the main heading and description', () => {
    render(<Web3ExplainerSection />);
    
    expect(screen.getByText('Why Web3 Marketplace?')).toBeInTheDocument();
    expect(screen.getByText(/Experience the future of commerce/)).toBeInTheDocument();
  });

  it('renders tab navigation', () => {
    render(<Web3ExplainerSection />);
    
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Fee Comparison')).toBeInTheDocument();
    expect(screen.getByText('Key Benefits')).toBeInTheDocument();
  });

  it('shows overview tab by default', () => {
    render(<Web3ExplainerSection />);
    
    expect(screen.getByText('Lower Fees')).toBeInTheDocument();
    expect(screen.getByText('Global Access')).toBeInTheDocument();
    expect(screen.getByText('Instant Settlement')).toBeInTheDocument();
    expect(screen.getByText(/Pay only 0-2% in fees/)).toBeInTheDocument();
  });

  it('switches to fee comparison tab when clicked', async () => {
    render(<Web3ExplainerSection />);
    
    const comparisonTab = screen.getByText('Fee Comparison');
    fireEvent.click(comparisonTab);
    
    await waitFor(() => {
      expect(screen.getByText('Platform Fee Comparison')).toBeInTheDocument();
      expect(screen.getByText('Platform Fees')).toBeInTheDocument();
      expect(screen.getByText('10% - 30%')).toBeInTheDocument();
      expect(screen.getByText('0% - 2%')).toBeInTheDocument();
    });
  });

  it('displays comparison data correctly', async () => {
    render(<Web3ExplainerSection />);
    
    const comparisonTab = screen.getByText('Fee Comparison');
    fireEvent.click(comparisonTab);
    
    await waitFor(() => {
      // Check for all comparison features
      expect(screen.getByText('Platform Fees')).toBeInTheDocument();
      expect(screen.getByText('Payment Settlement')).toBeInTheDocument();
      expect(screen.getByText('Global Access')).toBeInTheDocument();
      expect(screen.getByText('Transaction Trust')).toBeInTheDocument();
      expect(screen.getByText('Data Ownership')).toBeInTheDocument();
      
      // Check for Web2 vs Web3 values
      expect(screen.getByText('3-7 business days')).toBeInTheDocument();
      expect(screen.getByText('Instant')).toBeInTheDocument();
      expect(screen.getByText('Limited by banks & borders')).toBeInTheDocument();
      expect(screen.getByText('Truly borderless')).toBeInTheDocument();
    });
  });

  it('expands feature details when clicked', async () => {
    render(<Web3ExplainerSection />);
    
    const comparisonTab = screen.getByText('Fee Comparison');
    fireEvent.click(comparisonTab);
    
    await waitFor(() => {
      const platformFeesRow = screen.getByText('Platform Fees').closest('div');
      if (platformFeesRow) {
        fireEvent.click(platformFeesRow);
      }
    });
    
    await waitFor(() => {
      expect(screen.getByText('Save up to 28% on every transaction')).toBeInTheDocument();
    });
  });

  it('shows example savings calculation', async () => {
    render(<Web3ExplainerSection />);
    
    const comparisonTab = screen.getByText('Fee Comparison');
    fireEvent.click(comparisonTab);
    
    await waitFor(() => {
      expect(screen.getByText('💡 Example Savings')).toBeInTheDocument();
      expect(screen.getByText(/On a \$1,000 sale/)).toBeInTheDocument();
      expect(screen.getByText(/Save \$80-280 per transaction!/)).toBeInTheDocument();
    });
  });

  it('switches to benefits tab when clicked', async () => {
    render(<Web3ExplainerSection />);
    
    const benefitsTab = screen.getByText('Key Benefits');
    fireEvent.click(benefitsTab);
    
    await waitFor(() => {
      expect(screen.getByText('🔒')).toBeInTheDocument();
      expect(screen.getByText('Enhanced Security')).toBeInTheDocument();
      expect(screen.getByText('🌐')).toBeInTheDocument();
      expect(screen.getByText('True Ownership')).toBeInTheDocument();
      expect(screen.getByText('⚡')).toBeInTheDocument();
      expect(screen.getByText('Instant Transactions')).toBeInTheDocument();
      expect(screen.getByText('🏛️')).toBeInTheDocument();
      expect(screen.getByText('Community Governance')).toBeInTheDocument();
    });
  });

  it('displays security benefits correctly', async () => {
    render(<Web3ExplainerSection />);
    
    const benefitsTab = screen.getByText('Key Benefits');
    fireEvent.click(benefitsTab);
    
    await waitFor(() => {
      expect(screen.getByText('Smart contract escrow protection')).toBeInTheDocument();
      expect(screen.getByText('Immutable transaction records')).toBeInTheDocument();
      expect(screen.getByText('Cryptographic proof of authenticity')).toBeInTheDocument();
      expect(screen.getByText('Decentralized dispute resolution')).toBeInTheDocument();
    });
  });

  it('displays ownership benefits correctly', async () => {
    render(<Web3ExplainerSection />);
    
    const benefitsTab = screen.getByText('Key Benefits');
    fireEvent.click(benefitsTab);
    
    await waitFor(() => {
      expect(screen.getByText('Own your digital assets as NFTs')).toBeInTheDocument();
      expect(screen.getByText('Control your data and privacy')).toBeInTheDocument();
      expect(screen.getByText('Portable reputation across platforms')).toBeInTheDocument();
      expect(screen.getByText('No platform lock-in')).toBeInTheDocument();
    });
  });

  it('displays transaction benefits correctly', async () => {
    render(<Web3ExplainerSection />);
    
    const benefitsTab = screen.getByText('Key Benefits');
    fireEvent.click(benefitsTab);
    
    await waitFor(() => {
      expect(screen.getByText('24/7 global payments')).toBeInTheDocument();
      expect(screen.getByText('No banking hours or holidays')).toBeInTheDocument();
      expect(screen.getByText('Cross-border without friction')).toBeInTheDocument();
      expect(screen.getByText('Multiple cryptocurrency options')).toBeInTheDocument();
    });
  });

  it('displays governance benefits correctly', async () => {
    render(<Web3ExplainerSection />);
    
    const benefitsTab = screen.getByText('Key Benefits');
    fireEvent.click(benefitsTab);
    
    await waitFor(() => {
      expect(screen.getByText('Vote on platform policies')).toBeInTheDocument();
      expect(screen.getByText('Earn rewards for participation')).toBeInTheDocument();
      expect(screen.getByText('Transparent decision making')).toBeInTheDocument();
      expect(screen.getByText('Community-driven moderation')).toBeInTheDocument();
    });
  });
});