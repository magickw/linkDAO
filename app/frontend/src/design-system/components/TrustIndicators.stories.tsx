import type { Meta, StoryObj } from '@storybook/react';
import { TrustIndicators, VerifiedBadge, EscrowBadge, OnChainBadge, DAOBadge } from './TrustIndicators';

const meta: Meta<typeof TrustIndicators> = {
  title: 'Design System/Components/TrustIndicators',
  component: TrustIndicators,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Web3 trust badges and indicators that display verification status, escrow protection, and blockchain certification with animated glow effects.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    verified: {
      control: 'boolean',
      description: 'Product is verified',
    },
    escrowProtected: {
      control: 'boolean',
      description: 'Transaction is escrow protected',
    },
    onChainCertified: {
      control: 'boolean',
      description: 'Item is on-chain certified',
    },
    daoApproved: {
      control: 'boolean',
      description: 'Seller is DAO approved',
    },
    layout: {
      control: 'select',
      options: ['badges', 'inline', 'compact'],
      description: 'Display layout',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Size variant',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllIndicators: Story = {
  args: {
    verified: true,
    escrowProtected: true,
    onChainCertified: true,
    daoApproved: true,
    layout: 'badges',
    size: 'medium',
  },
};

export const VerifiedOnly: Story = {
  args: {
    verified: true,
    escrowProtected: false,
    onChainCertified: false,
    daoApproved: false,
    layout: 'badges',
    size: 'medium',
  },
};

export const EscrowOnly: Story = {
  args: {
    verified: false,
    escrowProtected: true,
    onChainCertified: false,
    daoApproved: false,
    layout: 'badges',
    size: 'medium',
  },
};

export const OnChainOnly: Story = {
  args: {
    verified: false,
    escrowProtected: false,
    onChainCertified: true,
    daoApproved: false,
    layout: 'badges',
    size: 'medium',
  },
};

export const DAOOnly: Story = {
  args: {
    verified: false,
    escrowProtected: false,
    onChainCertified: false,
    daoApproved: true,
    layout: 'badges',
    size: 'medium',
  },
};

export const InlineLayout: Story = {
  args: {
    verified: true,
    escrowProtected: true,
    onChainCertified: true,
    layout: 'inline',
    size: 'medium',
  },
};

export const CompactLayout: Story = {
  args: {
    verified: true,
    escrowProtected: true,
    onChainCertified: true,
    daoApproved: true,
    layout: 'compact',
    size: 'small',
  },
};

export const SmallSize: Story = {
  args: {
    verified: true,
    escrowProtected: true,
    layout: 'badges',
    size: 'small',
  },
};

export const LargeSize: Story = {
  args: {
    verified: true,
    escrowProtected: true,
    onChainCertified: true,
    layout: 'badges',
    size: 'large',
  },
};

// Specialized component stories
export const VerifiedBadgeStory: Story = {
  render: () => (
    <VerifiedBadge size="md" />
  ),
};

export const EscrowBadgeStory: Story = {
  render: () => (
    <EscrowBadge size="md" />
  ),
};

export const OnChainBadgeStory: Story = {
  render: () => (
    <OnChainBadge size="md" />
  ),
};

export const DAOBadgeStory: Story = {
  render: () => (
    <DAOBadge size="md" />
  ),
};

// Showcase all variants
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', padding: '2rem' }}>
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Individual Badges</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <TrustIndicators verified size="md" />
          <TrustIndicators escrowProtected size="md" />
          <TrustIndicators onChainCertified size="md" />
          <TrustIndicators daoApproved size="md" />
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Layout Variants</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Badges Layout</h4>
            <TrustIndicators 
              verified 
              escrowProtected 
              onChainCertified 
              daoApproved 
              layout="badges" 
              size="md" 
            />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Inline Layout</h4>
            <TrustIndicators 
              verified 
              escrowProtected 
              onChainCertified 
              layout="inline" 
              size="md" 
            />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Compact Layout</h4>
            <TrustIndicators 
              verified 
              escrowProtected 
              onChainCertified 
              daoApproved 
              layout="compact" 
              size="sm" 
            />
          </div>
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Size Variants</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Small</h4>
            <TrustIndicators verified escrowProtected size="sm" />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Medium</h4>
            <TrustIndicators verified escrowProtected onChainCertified size="md" />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Large</h4>
            <TrustIndicators verified escrowProtected onChainCertified daoApproved size="lg" />
          </div>
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Common Combinations</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Basic Product</h4>
            <TrustIndicators verified escrowProtected size="md" />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Premium Product</h4>
            <TrustIndicators verified escrowProtected onChainCertified size="md" />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>DAO Verified Seller</h4>
            <TrustIndicators verified escrowProtected onChainCertified daoApproved size="md" />
          </div>
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Specialized Components</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <VerifiedBadge />
          <EscrowBadge />
          <OnChainBadge />
          <DAOBadge />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};