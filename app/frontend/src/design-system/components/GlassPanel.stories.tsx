import type { Meta, StoryObj } from '@storybook/react';
import { GlassPanel, GlassCard, GlassModal, NFTGlassCard, PremiumNFTCard, DAOApprovedCard } from './GlassPanel';

const meta: Meta<typeof GlassPanel> = {
  title: 'Design System/Components/GlassPanel',
  component: GlassPanel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Core glassmorphic container component with various styling variants and NFT-style shadow effects.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'navbar', 'modal'],
      description: 'Glassmorphism variant to apply',
    },
    nftShadow: {
      control: 'select',
      options: ['standard', 'premium', 'dao'],
      description: 'NFT-style shadow variant',
    },
    hoverable: {
      control: 'boolean',
      description: 'Enable hover effects',
    },
    padding: {
      control: 'text',
      description: 'Custom padding',
    },
    margin: {
      control: 'text',
      description: 'Custom margin',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    hoverable: false,
    children: (
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Primary Glass Panel</h3>
        <p style={{ color: 'rgba(255,255,255,0.8)' }}>
          This is a primary glassmorphic panel with frosted-glass effect and blurred transparency.
        </p>
      </div>
    ),
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    hoverable: true,
    children: (
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Secondary Glass Panel</h3>
        <p style={{ color: 'rgba(255,255,255,0.8)' }}>
          Secondary variant with hover effects enabled. Try hovering over this panel.
        </p>
      </div>
    ),
  },
};

export const Modal: Story = {
  args: {
    variant: 'modal',
    children: (
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Modal Glass Panel</h3>
        <p style={{ color: 'rgba(255,255,255,0.8)' }}>
          Modal variant with enhanced blur and shadow effects for overlay content.
        </p>
      </div>
    ),
  },
};

export const NFTStandard: Story = {
  args: {
    nftShadow: 'standard',
    hoverable: true,
    children: (
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>NFT Glass Card</h3>
        <p style={{ color: 'rgba(255,255,255,0.8)' }}>
          Standard NFT-style shadow with blue/purple glow effects.
        </p>
      </div>
    ),
  },
};

export const NFTPremium: Story = {
  args: {
    nftShadow: 'premium',
    hoverable: true,
    children: (
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Premium NFT Card</h3>
        <p style={{ color: 'rgba(255,255,255,0.8)' }}>
          Premium NFT variant with golden glow for verified/high-value items.
        </p>
      </div>
    ),
  },
};

export const NFTDAO: Story = {
  args: {
    nftShadow: 'dao',
    hoverable: true,
    children: (
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>DAO Approved Card</h3>
        <p style={{ color: 'rgba(255,255,255,0.8)' }}>
          DAO approved variant with green/blue glow for community-verified items.
        </p>
      </div>
    ),
  },
};

// Specialized component stories
export const GlassCardStory: Story = {
  render: () => (
    <GlassCard>
      <h3 style={{ color: 'white', marginBottom: '1rem' }}>Glass Card</h3>
      <p style={{ color: 'rgba(255,255,255,0.8)' }}>
        Pre-configured glass card with secondary variant and hover effects.
      </p>
    </GlassCard>
  ),
};

export const GlassModalStory: Story = {
  render: () => (
    <GlassModal>
      <h3 style={{ color: 'white', marginBottom: '1rem' }}>Glass Modal</h3>
      <p style={{ color: 'rgba(255,255,255,0.8)' }}>
        Pre-configured modal with enhanced glassmorphism effects.
      </p>
    </GlassModal>
  ),
};

export const NFTGlassCardStory: Story = {
  render: () => (
    <NFTGlassCard>
      <h3 style={{ color: 'white', marginBottom: '1rem' }}>NFT Glass Card</h3>
      <p style={{ color: 'rgba(255,255,255,0.8)' }}>
        Pre-configured NFT card with standard shadow effects.
      </p>
    </NFTGlassCard>
  ),
};

export const PremiumNFTCardStory: Story = {
  render: () => (
    <PremiumNFTCard>
      <h3 style={{ color: 'white', marginBottom: '1rem' }}>Premium NFT Card</h3>
      <p style={{ color: 'rgba(255,255,255,0.8)' }}>
        Pre-configured premium NFT card with golden glow effects.
      </p>
    </PremiumNFTCard>
  ),
};

export const DAOApprovedCardStory: Story = {
  render: () => (
    <DAOApprovedCard>
      <h3 style={{ color: 'white', marginBottom: '1rem' }}>DAO Approved Card</h3>
      <p style={{ color: 'rgba(255,255,255,0.8)' }}>
        Pre-configured DAO approved card with community verification glow.
      </p>
    </DAOApprovedCard>
  ),
};

// Showcase all variants
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', padding: '2rem' }}>
      <GlassPanel variant="primary">
        <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Primary</h4>
        <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.9rem' }}>Standard glass panel</p>
      </GlassPanel>
      
      <GlassPanel variant="secondary" hoverable>
        <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Secondary</h4>
        <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.9rem' }}>With hover effects</p>
      </GlassPanel>
      
      <GlassPanel nftShadow="standard" hoverable>
        <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>NFT Standard</h4>
        <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.9rem' }}>Blue/purple glow</p>
      </GlassPanel>
      
      <GlassPanel nftShadow="premium" hoverable>
        <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>NFT Premium</h4>
        <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.9rem' }}>Golden glow</p>
      </GlassPanel>
      
      <GlassPanel nftShadow="dao" hoverable>
        <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>DAO Approved</h4>
        <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.9rem' }}>Green/blue glow</p>
      </GlassPanel>
      
      <GlassPanel variant="modal">
        <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Modal</h4>
        <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.9rem' }}>Enhanced blur</p>
      </GlassPanel>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};