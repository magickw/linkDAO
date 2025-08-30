import type { Meta, StoryObj } from '@storybook/react';
import { DualPricing, ProductPricing, CardPricing, CompactPricing } from './DualPricing';

const meta: Meta<typeof DualPricing> = {
  title: 'Design System/Components/DualPricing',
  component: DualPricing,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Displays cryptocurrency and fiat prices with real-time conversion, supporting multiple layouts and interactive currency toggling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    cryptoPrice: {
      control: 'text',
      description: 'Cryptocurrency price',
    },
    cryptoSymbol: {
      control: 'text',
      description: 'Cryptocurrency symbol',
    },
    fiatPrice: {
      control: 'text',
      description: 'Fiat equivalent price',
    },
    fiatSymbol: {
      control: 'text',
      description: 'Fiat currency symbol',
    },
    realTimeConversion: {
      control: 'boolean',
      description: 'Enable real-time conversion',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Price size variant',
    },
    layout: {
      control: 'select',
      options: ['horizontal', 'vertical', 'stacked'],
      description: 'Layout orientation',
    },
    showToggle: {
      control: 'boolean',
      description: 'Show conversion toggle',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    cryptoPrice: '0.15',
    cryptoSymbol: 'ETH',
    fiatPrice: '270.00',
    fiatSymbol: 'USD',
    realTimeConversion: true,
    size: 'medium',
    layout: 'horizontal',
    showToggle: false,
  },
};

export const WithToggle: Story = {
  args: {
    cryptoPrice: '0.25',
    cryptoSymbol: 'ETH',
    fiatPrice: '450.00',
    fiatSymbol: 'USD',
    realTimeConversion: true,
    size: 'medium',
    layout: 'horizontal',
    showToggle: true,
  },
};

export const VerticalLayout: Story = {
  args: {
    cryptoPrice: '1.5',
    cryptoSymbol: 'ETH',
    fiatPrice: '2700.00',
    fiatSymbol: 'USD',
    realTimeConversion: true,
    size: 'large',
    layout: 'vertical',
    showToggle: true,
  },
};

export const SmallSize: Story = {
  args: {
    cryptoPrice: '0.05',
    cryptoSymbol: 'ETH',
    fiatPrice: '90.00',
    fiatSymbol: 'USD',
    realTimeConversion: true,
    size: 'small',
    layout: 'horizontal',
    showToggle: false,
  },
};

export const LargeSize: Story = {
  args: {
    cryptoPrice: '2.5',
    cryptoSymbol: 'ETH',
    fiatPrice: '4500.00',
    fiatSymbol: 'USD',
    realTimeConversion: true,
    size: 'large',
    layout: 'horizontal',
    showToggle: true,
  },
};

export const DifferentCrypto: Story = {
  args: {
    cryptoPrice: '150.00',
    cryptoSymbol: 'USDC',
    fiatPrice: '150.00',
    fiatSymbol: 'USD',
    realTimeConversion: false,
    size: 'medium',
    layout: 'horizontal',
    showToggle: false,
  },
};

export const BitcoinPricing: Story = {
  args: {
    cryptoPrice: '0.005',
    cryptoSymbol: 'BTC',
    fiatPrice: '215.00',
    fiatSymbol: 'USD',
    realTimeConversion: true,
    size: 'medium',
    layout: 'horizontal',
    showToggle: true,
  },
};

export const EuroPricing: Story = {
  args: {
    cryptoPrice: '0.18',
    cryptoSymbol: 'ETH',
    fiatPrice: '250.00',
    fiatSymbol: 'EUR',
    realTimeConversion: true,
    size: 'medium',
    layout: 'horizontal',
    showToggle: true,
  },
};

export const RealTimeConversion: Story = {
  args: {
    cryptoPrice: '0.12',
    cryptoSymbol: 'ETH',
    realTimeConversion: true,
    size: 'medium',
    layout: 'horizontal',
    showToggle: false,
  },
};

// Specialized component stories
export const ProductPricingStory: Story = {
  render: () => (
    <ProductPricing
      cryptoPrice="1.25"
      cryptoSymbol="ETH"
      fiatPrice="2250.00"
      fiatSymbol="USD"
      realTimeConversion={true}
    />
  ),
};

export const CardPricingStory: Story = {
  render: () => (
    <CardPricing
      cryptoPrice="0.08"
      cryptoSymbol="ETH"
      fiatPrice="144.00"
      fiatSymbol="USD"
      realTimeConversion={true}
    />
  ),
};

export const CompactPricingStory: Story = {
  render: () => (
    <CompactPricing
      cryptoPrice="0.03"
      cryptoSymbol="ETH"
      fiatPrice="54.00"
      fiatSymbol="USD"
      realTimeConversion={true}
    />
  ),
};

// Showcase all variants
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', padding: '2rem' }}>
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Size Variants</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Small</h4>
            <DualPricing
              cryptoPrice="0.05"
              cryptoSymbol="ETH"
              fiatPrice="90.00"
              fiatSymbol="USD"
              size="small"
              realTimeConversion={true}
            />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Medium</h4>
            <DualPricing
              cryptoPrice="0.15"
              cryptoSymbol="ETH"
              fiatPrice="270.00"
              fiatSymbol="USD"
              size="medium"
              realTimeConversion={true}
            />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Large</h4>
            <DualPricing
              cryptoPrice="1.5"
              cryptoSymbol="ETH"
              fiatPrice="2700.00"
              fiatSymbol="USD"
              size="large"
              realTimeConversion={true}
            />
          </div>
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Layout Variants</h3>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Horizontal</h4>
            <DualPricing
              cryptoPrice="0.25"
              cryptoSymbol="ETH"
              fiatPrice="450.00"
              fiatSymbol="USD"
              layout="horizontal"
              size="medium"
              realTimeConversion={true}
            />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Vertical</h4>
            <DualPricing
              cryptoPrice="0.25"
              cryptoSymbol="ETH"
              fiatPrice="450.00"
              fiatSymbol="USD"
              layout="vertical"
              size="medium"
              realTimeConversion={true}
            />
          </div>
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Different Cryptocurrencies</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Ethereum (ETH)</h4>
            <DualPricing
              cryptoPrice="0.15"
              cryptoSymbol="ETH"
              fiatPrice="270.00"
              fiatSymbol="USD"
              size="medium"
              realTimeConversion={true}
            />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Bitcoin (BTC)</h4>
            <DualPricing
              cryptoPrice="0.005"
              cryptoSymbol="BTC"
              fiatPrice="215.00"
              fiatSymbol="USD"
              size="medium"
              realTimeConversion={true}
            />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>USDC Stablecoin</h4>
            <DualPricing
              cryptoPrice="150.00"
              cryptoSymbol="USDC"
              fiatPrice="150.00"
              fiatSymbol="USD"
              size="medium"
              realTimeConversion={false}
            />
          </div>
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>With Toggle Controls</h3>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <DualPricing
            cryptoPrice="0.35"
            cryptoSymbol="ETH"
            fiatPrice="630.00"
            fiatSymbol="USD"
            size="medium"
            showToggle={true}
            realTimeConversion={true}
          />
          <DualPricing
            cryptoPrice="0.75"
            cryptoSymbol="ETH"
            fiatPrice="1350.00"
            fiatSymbol="EUR"
            size="medium"
            showToggle={true}
            realTimeConversion={true}
          />
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Specialized Components</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Product Pricing (Large with Toggle)</h4>
            <ProductPricing
              cryptoPrice="2.5"
              cryptoSymbol="ETH"
              fiatPrice="4500.00"
              fiatSymbol="USD"
              realTimeConversion={true}
            />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Card Pricing (Medium Vertical)</h4>
            <CardPricing
              cryptoPrice="0.12"
              cryptoSymbol="ETH"
              fiatPrice="216.00"
              fiatSymbol="USD"
              realTimeConversion={true}
            />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Compact Pricing (Small Horizontal)</h4>
            <CompactPricing
              cryptoPrice="0.03"
              cryptoSymbol="ETH"
              fiatPrice="54.00"
              fiatSymbol="USD"
              realTimeConversion={true}
            />
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};