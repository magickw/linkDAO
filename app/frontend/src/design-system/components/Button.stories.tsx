import type { Meta, StoryObj } from '@storybook/react';
import { Button, PrimaryButton, SecondaryButton, OutlineButton, GhostButton, GradientButton } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Design System/Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Glassmorphic buttons with ripple effects and Web3 aesthetics. Supports multiple variants, sizes, and interactive states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'gradient'],
      description: 'Button variant',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Button size',
    },
    gradient: {
      control: 'select',
      options: ['primary', 'secondary', 'techBlue', 'techPurple', 'techGreen', 'nftGold', 'nftRainbow'],
      description: 'Gradient variant for gradient buttons',
    },
    ripple: {
      control: 'boolean',
      description: 'Enable ripple effect',
    },
    loading: {
      control: 'boolean',
      description: 'Loading state',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Full width button',
    },
    iconPosition: {
      control: 'select',
      options: ['left', 'right'],
      description: 'Icon position',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Icon component for stories
const Icon = ({ name }: { name: string }) => <span>{name}</span>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'medium',
    ripple: true,
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'medium',
    ripple: true,
    children: 'Secondary Button',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    size: 'medium',
    ripple: true,
    children: 'Outline Button',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    size: 'medium',
    ripple: true,
    children: 'Ghost Button',
  },
};

export const Gradient: Story = {
  args: {
    variant: 'gradient',
    gradient: 'techBlue',
    size: 'medium',
    ripple: true,
    children: 'Gradient Button',
  },
};

export const WithIcon: Story = {
  args: {
    variant: 'primary',
    size: 'medium',
    icon: <Icon name="🚀" />,
    iconPosition: 'left',
    children: 'Launch App',
  },
};

export const WithRightIcon: Story = {
  args: {
    variant: 'secondary',
    size: 'medium',
    icon: <Icon name="→" />,
    iconPosition: 'right',
    children: 'Continue',
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    size: 'medium',
    loading: true,
    children: 'Processing...',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    size: 'medium',
    disabled: true,
    children: 'Disabled Button',
  },
};

export const FullWidth: Story = {
  args: {
    variant: 'primary',
    size: 'large',
    fullWidth: true,
    children: 'Full Width Button',
  },
  parameters: {
    layout: 'padded',
  },
};

// Size variants
export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'small',
    children: 'Small Button',
  },
};

export const Medium: Story = {
  args: {
    variant: 'primary',
    size: 'medium',
    children: 'Medium Button',
  },
};

export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'large',
    children: 'Large Button',
  },
};

// Specialized component stories
export const PrimaryButtonStory: Story = {
  render: () => (
    <PrimaryButton>Primary Button Component</PrimaryButton>
  ),
};

export const SecondaryButtonStory: Story = {
  render: () => (
    <SecondaryButton>Secondary Button Component</SecondaryButton>
  ),
};

export const OutlineButtonStory: Story = {
  render: () => (
    <OutlineButton>Outline Button Component</OutlineButton>
  ),
};

export const GhostButtonStory: Story = {
  render: () => (
    <GhostButton>Ghost Button Component</GhostButton>
  ),
};

export const GradientButtonStory: Story = {
  render: () => (
    <GradientButton gradient="nftRainbow">Gradient Button Component</GradientButton>
  ),
};

// Showcase all variants
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Button Variants</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="gradient" gradient="techBlue">Gradient</Button>
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Button Sizes</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="primary" size="small">Small</Button>
          <Button variant="primary" size="medium">Medium</Button>
          <Button variant="primary" size="large">Large</Button>
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Button States</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="primary">Normal</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Buttons with Icons</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="primary" icon={<Icon name="🚀" />} iconPosition="left">
            Launch
          </Button>
          <Button variant="secondary" icon={<Icon name="💎" />} iconPosition="left">
            Buy NFT
          </Button>
          <Button variant="outline" icon={<Icon name="→" />} iconPosition="right">
            Continue
          </Button>
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Gradient Variants</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="gradient" gradient="primary">Primary</Button>
          <Button variant="gradient" gradient="techBlue">Tech Blue</Button>
          <Button variant="gradient" gradient="techPurple">Tech Purple</Button>
          <Button variant="gradient" gradient="nftGold">NFT Gold</Button>
          <Button variant="gradient" gradient="nftRainbow">NFT Rainbow</Button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};