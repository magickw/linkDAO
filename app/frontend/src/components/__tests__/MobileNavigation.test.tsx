import React from 'react';
import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/router';
import MobileNavigation from '../MobileNavigation';
import { NavigationProvider } from '@/context/NavigationContext';
import { Web3Provider } from '@/context/Web3Context';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
}));

const mockRouter = {
  pathname: '/dashboard',
  push: jest.fn(),
  query: {},
};

const MockProviders = ({ children }: { children: React.ReactNode }) => (
  <Web3Provider>
    <NavigationProvider>
      {children}
    </NavigationProvider>
  </Web3Provider>
);

describe('MobileNavigation', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders mobile navigation when user is connected', () => {
    render(
      <MockProviders>
        <MobileNavigation />
      </MockProviders>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Communities')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
    expect(screen.getByText('Market')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('has proper mobile classes', () => {
    const { container } = render(
      <MockProviders>
        <MobileNavigation />
      </MockProviders>
    );

    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('fixed', 'bottom-0', 'md:hidden');
  });
});