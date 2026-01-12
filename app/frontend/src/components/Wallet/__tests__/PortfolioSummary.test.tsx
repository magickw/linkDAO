/**
 * Portfolio Summary Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PortfolioSummary } from '../PortfolioSummary';
import { TokenBalance } from '@/services/walletService';

describe('PortfolioSummary', () => {
  const mockTokens: TokenBalance[] = [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0x0000000000000000000000000000000000000000',
      balance: '1000000000000000000',
      balanceFormatted: '1.0000',
      decimals: 18,
      valueUSD: 2000,
      change24h: 5.2,
      priceUSD: 2000,
      isNative: true,
    },
    {
      symbol: 'LDAO',
      name: 'LinkDAO Token',
      address: '0x1234567890123456789012345678901234567890',
      balance: '10000000000000000000',
      balanceFormatted: '10.0000',
      decimals: 18,
      valueUSD: 1000,
      change24h: -2.5,
      priceUSD: 100,
      isNative: false,
    },
  ];

  it('displays total portfolio value', () => {
    render(
      <PortfolioSummary
        totalValue={3000}
        change24h={81}
        change24hPercent={2.7}
        tokens={mockTokens}
      />
    );

    expect(screen.getByText('$3,000.00')).toBeInTheDocument();
  });

  it('displays 24h change with positive value', () => {
    render(
      <PortfolioSummary
        totalValue={3000}
        change24h={81}
        change24hPercent={2.7}
        tokens={mockTokens}
      />
    );

    expect(screen.getByText('+2.70%')).toBeInTheDocument();
  });

  it('displays 24h change with negative value', () => {
    render(
      <PortfolioSummary
        totalValue={3000}
        change24h={-81}
        change24hPercent={-2.7}
        tokens={mockTokens}
      />
    );

    expect(screen.getByText('-2.70%')).toBeInTheDocument();
  });

  it('displays asset allocation', () => {
    render(
      <PortfolioSummary
        totalValue={3000}
        change24h={81}
        change24hPercent={2.7}
        tokens={mockTokens}
      />
    );

    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('LDAO')).toBeInTheDocument();
  });

  it('calls onTimeframeChange when timeframe is clicked', () => {
    const mockOnTimeframeChange = jest.fn();
    render(
      <PortfolioSummary
        totalValue={3000}
        change24h={81}
        change24hPercent={2.7}
        tokens={mockTokens}
        timeframe="1d"
        onTimeframeChange={mockOnTimeframeChange}
      />
    );

    screen.getByText('1W').click();
    expect(mockOnTimeframeChange).toHaveBeenCalledWith('1w');
  });

  it('displays correct number of assets', () => {
    render(
      <PortfolioSummary
        totalValue={3000}
        change24h={81}
        change24hPercent={2.7}
        tokens={mockTokens}
      />
    );

    expect(screen.getByText('Total Assets')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});