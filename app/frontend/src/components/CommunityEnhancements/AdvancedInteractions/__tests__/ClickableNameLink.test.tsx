/**
 * ClickableNameLink Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClickableNameLink from '../ClickableNameLink';
import { ensService } from '../../../../services/ensService';

// Mock the ENS service
jest.mock('../../../../services/ensService', () => ({
  ensService: {
    resolveName: jest.fn(),
    isENSName: jest.fn(),
    isSNSName: jest.fn(),
    isEthereumAddress: jest.fn(),
  },
}));

// Mock the MiniProfileCard component
jest.mock('../../SharedComponents/MiniProfileCard', () => {
  return function MockMiniProfileCard({ trigger, userId }: any) {
    return (
      <div data-testid="mini-profile-card" data-user-id={userId}>
        {trigger}
      </div>
    );
  };
});

const mockEnsService = ensService as jest.Mocked<typeof ensService>;

describe('ClickableNameLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ENS Name Handling', () => {
    it('should render ENS name as clickable link', async () => {
      const ensName = 'vitalik.eth';
      mockEnsService.resolveName.mockResolvedValue({
        type: 'ens',
        original: ensName,
        resolved: '0x1234567890123456789012345678901234567890',
        isValid: true,
      });

      render(<ClickableNameLink name={ensName} />);

      await waitFor(() => {
        const link = screen.getByRole('button');
        expect(link).toBeInTheDocument();
        expect(link).toHaveTextContent(ensName);
        expect(link).toHaveClass('ce-name-ens', 'ce-name-clickable');
      });
    });

    it('should show ENS type indicator', async () => {
      const ensName = 'test.eth';
      mockEnsService.resolveName.mockResolvedValue({
        type: 'ens',
        original: ensName,
        resolved: '0x1234567890123456789012345678901234567890',
        isValid: true,
      });

      render(<ClickableNameLink name={ensName} />);

      await waitFor(() => {
        const indicator = screen.getByText('⟠');
        expect(indicator).toBeInTheDocument();
        expect(indicator).toHaveClass('ce-name-type-indicator');
      });
    });

    it('should call onNameClick when ENS name is clicked', async () => {
      const ensName = 'test.eth';
      const mockOnClick = jest.fn();
      const resolvedName = {
        type: 'ens' as const,
        original: ensName,
        resolved: '0x1234567890123456789012345678901234567890',
        isValid: true,
      };

      mockEnsService.resolveName.mockResolvedValue(resolvedName);

      render(<ClickableNameLink name={ensName} onNameClick={mockOnClick} />);

      await waitFor(() => {
        const link = screen.getByRole('button');
        fireEvent.click(link);
        expect(mockOnClick).toHaveBeenCalledWith(resolvedName);
      });
    });
  });

  describe('SNS Name Handling', () => {
    it('should render SNS name as clickable link', async () => {
      const snsName = 'test.sol';
      mockEnsService.resolveName.mockResolvedValue({
        type: 'sns',
        original: snsName,
        resolved: 'test.solana.address',
        isValid: true,
      });

      render(<ClickableNameLink name={snsName} />);

      await waitFor(() => {
        const link = screen.getByRole('button');
        expect(link).toBeInTheDocument();
        expect(link).toHaveTextContent(snsName);
        expect(link).toHaveClass('ce-name-sns', 'ce-name-clickable');
      });
    });

    it('should show SNS type indicator', async () => {
      const snsName = 'test.sol';
      mockEnsService.resolveName.mockResolvedValue({
        type: 'sns',
        original: snsName,
        resolved: 'test.solana.address',
        isValid: true,
      });

      render(<ClickableNameLink name={snsName} />);

      await waitFor(() => {
        const indicator = screen.getByText('◎');
        expect(indicator).toBeInTheDocument();
        expect(indicator).toHaveClass('ce-name-type-indicator');
      });
    });
  });

  describe('Address Handling', () => {
    it('should render Ethereum address with fallback enabled', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      mockEnsService.resolveName.mockResolvedValue({
        type: 'address',
        original: address,
        resolved: address,
        isValid: true,
      });
      mockEnsService.isEthereumAddress.mockReturnValue(true);

      render(<ClickableNameLink name={address} fallbackToAddress={true} />);

      await waitFor(() => {
        const link = screen.getByRole('button');
        expect(link).toBeInTheDocument();
        expect(link).toHaveTextContent(address);
        expect(link).toHaveClass('ce-name-address', 'ce-name-clickable');
      });
    });

    it('should not render address as clickable when fallback is disabled', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      mockEnsService.resolveName.mockResolvedValue({
        type: 'address',
        original: address,
        resolved: address,
        isValid: true,
      });

      render(<ClickableNameLink name={address} fallbackToAddress={false} />);

      await waitFor(() => {
        const span = screen.getByText(address);
        expect(span).toBeInTheDocument();
        expect(span).toHaveClass('ce-name-static');
        expect(span).not.toHaveClass('ce-name-clickable');
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state', () => {
      mockEnsService.resolveName.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<ClickableNameLink name="test.eth" />);

      const loadingElement = screen.getByText(/test\.eth/);
      expect(loadingElement).toHaveClass('ce-name-loading');
      
      const loadingIndicator = screen.getByText('...');
      expect(loadingIndicator).toHaveClass('ce-name-loading-indicator');
    });

    it('should show error state when resolution fails', async () => {
      const name = 'invalid.eth';
      mockEnsService.resolveName.mockRejectedValue(new Error('Resolution failed'));

      render(<ClickableNameLink name={name} />);

      await waitFor(() => {
        const errorElement = screen.getByText(name);
        expect(errorElement).toHaveClass('ce-name-error');
        expect(errorElement).toHaveClass('ce-name-static');
      });
    });

    it('should show error state for invalid names', async () => {
      const name = 'invalid.eth';
      mockEnsService.resolveName.mockResolvedValue({
        type: 'ens',
        original: name,
        resolved: '',
        isValid: false,
      });

      render(<ClickableNameLink name={name} />);

      await waitFor(() => {
        const errorElement = screen.getByText(name);
        expect(errorElement).toHaveClass('ce-name-static');
        expect(errorElement).not.toHaveClass('ce-name-clickable');
      });
    });
  });

  describe('Mini Profile Integration', () => {
    it('should wrap clickable names with MiniProfileCard when enabled', async () => {
      const ensName = 'test.eth';
      const resolvedAddress = '0x1234567890123456789012345678901234567890';
      
      mockEnsService.resolveName.mockResolvedValue({
        type: 'ens',
        original: ensName,
        resolved: resolvedAddress,
        isValid: true,
      });

      render(<ClickableNameLink name={ensName} showMiniProfile={true} />);

      await waitFor(() => {
        const profileCard = screen.getByTestId('mini-profile-card');
        expect(profileCard).toBeInTheDocument();
        expect(profileCard).toHaveAttribute('data-user-id', resolvedAddress);
      });
    });

    it('should not wrap with MiniProfileCard when disabled', async () => {
      const ensName = 'test.eth';
      mockEnsService.resolveName.mockResolvedValue({
        type: 'ens',
        original: ensName,
        resolved: '0x1234567890123456789012345678901234567890',
        isValid: true,
      });

      render(<ClickableNameLink name={ensName} showMiniProfile={false} />);

      await waitFor(() => {
        const link = screen.getByRole('button');
        expect(link).toBeInTheDocument();
        
        const profileCard = screen.queryByTestId('mini-profile-card');
        expect(profileCard).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      const ensName = 'test.eth';
      mockEnsService.resolveName.mockResolvedValue({
        type: 'ens',
        original: ensName,
        resolved: '0x1234567890123456789012345678901234567890',
        isValid: true,
      });

      render(<ClickableNameLink name={ensName} />);

      await waitFor(() => {
        const link = screen.getByRole('button');
        expect(link).toHaveAttribute('title', `Click to view profile for ${ensName}`);
        expect(link).toHaveAttribute('type', 'button');
      });
    });

    it('should be keyboard accessible', async () => {
      const ensName = 'test.eth';
      const mockOnClick = jest.fn();
      
      mockEnsService.resolveName.mockResolvedValue({
        type: 'ens',
        original: ensName,
        resolved: '0x1234567890123456789012345678901234567890',
        isValid: true,
      });

      render(<ClickableNameLink name={ensName} onNameClick={mockOnClick} />);

      await waitFor(() => {
        const link = screen.getByRole('button');
        link.focus();
        fireEvent.keyDown(link, { key: 'Enter' });
        expect(mockOnClick).toHaveBeenCalled();
      });
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', async () => {
      const ensName = 'test.eth';
      const customClass = 'custom-name-link';
      
      mockEnsService.resolveName.mockResolvedValue({
        type: 'ens',
        original: ensName,
        resolved: '0x1234567890123456789012345678901234567890',
        isValid: true,
      });

      render(<ClickableNameLink name={ensName} className={customClass} />);

      await waitFor(() => {
        const link = screen.getByRole('button');
        expect(link).toHaveClass(customClass);
      });
    });
  });
});