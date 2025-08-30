import type { Meta, StoryObj } from '@storybook/react';
import { 
  LoadingSkeleton, 
  TextSkeleton, 
  CardSkeleton, 
  ImageSkeleton, 
  ButtonSkeleton, 
  AvatarSkeleton,
  ProductCardSkeleton,
  UserProfileSkeleton,
  NavbarSkeleton
} from './LoadingSkeleton';

const meta: Meta<typeof LoadingSkeleton> = {
  title: 'Design System/Components/LoadingSkeleton',
  component: LoadingSkeleton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Glassmorphic loading skeletons that provide consistent loading states with shimmer animations and glassmorphism styling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'card', 'image', 'button', 'avatar', 'custom'],
      description: 'Skeleton variant',
    },
    width: {
      control: 'text',
      description: 'Width of the skeleton',
    },
    height: {
      control: 'text',
      description: 'Height of the skeleton',
    },
    borderRadius: {
      control: 'text',
      description: 'Border radius',
    },
    lines: {
      control: 'number',
      description: 'Number of lines for text skeleton',
    },
    speed: {
      control: 'select',
      options: ['slow', 'normal', 'fast'],
      description: 'Animation speed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {
  args: {
    variant: 'text',
    width: '200px',
    height: '1rem',
    speed: 'normal',
  },
};

export const MultilineText: Story = {
  args: {
    variant: 'text',
    width: '300px',
    height: '1rem',
    lines: 3,
    speed: 'normal',
  },
};

export const Card: Story = {
  args: {
    variant: 'card',
    width: '300px',
    height: '200px',
    speed: 'normal',
  },
};

export const Image: Story = {
  args: {
    variant: 'image',
    width: '250px',
    height: '150px',
    speed: 'normal',
  },
};

export const Button: Story = {
  args: {
    variant: 'button',
    width: '120px',
    height: '40px',
    speed: 'normal',
  },
};

export const Avatar: Story = {
  args: {
    variant: 'avatar',
    width: '48px',
    height: '48px',
    speed: 'normal',
  },
};

export const CustomSize: Story = {
  args: {
    variant: 'custom',
    width: '400px',
    height: '60px',
    borderRadius: '30px',
    speed: 'normal',
  },
};

export const FastAnimation: Story = {
  args: {
    variant: 'text',
    width: '200px',
    height: '1rem',
    speed: 'fast',
  },
};

export const SlowAnimation: Story = {
  args: {
    variant: 'text',
    width: '200px',
    height: '1rem',
    speed: 'slow',
  },
};

// Specialized component stories
export const TextSkeletonStory: Story = {
  render: () => (
    <TextSkeleton width="250px" lines={2} />
  ),
};

export const CardSkeletonStory: Story = {
  render: () => (
    <CardSkeleton width="320px" height="240px" />
  ),
};

export const ImageSkeletonStory: Story = {
  render: () => (
    <ImageSkeleton width="300px" height="200px" />
  ),
};

export const ButtonSkeletonStory: Story = {
  render: () => (
    <ButtonSkeleton width="100px" height="36px" />
  ),
};

export const AvatarSkeletonStory: Story = {
  render: () => (
    <AvatarSkeleton width="64px" height="64px" />
  ),
};

export const ProductCardSkeletonStory: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <ProductCardSkeleton />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const UserProfileSkeletonStory: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <UserProfileSkeleton />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const NavbarSkeletonStory: Story = {
  render: () => (
    <div style={{ width: '100%', maxWidth: '1200px' }}>
      <NavbarSkeleton />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

// Showcase all variants
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', padding: '2rem' }}>
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Basic Skeleton Variants</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Text Skeleton</h4>
            <LoadingSkeleton variant="text" width="200px" height="1rem" />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Multiline Text</h4>
            <LoadingSkeleton variant="text" width="300px" height="1rem" lines={3} />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Image Skeleton</h4>
            <LoadingSkeleton variant="image" width="250px" height="150px" />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Button Skeleton</h4>
            <LoadingSkeleton variant="button" width="120px" height="40px" />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Avatar Skeleton</h4>
            <LoadingSkeleton variant="avatar" width="48px" height="48px" />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Card Skeleton</h4>
            <LoadingSkeleton variant="card" width="300px" height="200px" />
          </div>
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Animation Speeds</h3>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Slow</h4>
            <LoadingSkeleton variant="text" width="150px" height="1rem" speed="slow" />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Normal</h4>
            <LoadingSkeleton variant="text" width="150px" height="1rem" speed="normal" />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Fast</h4>
            <LoadingSkeleton variant="text" width="150px" height="1rem" speed="fast" />
          </div>
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Specialized Components</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Text Skeleton Component</h4>
            <TextSkeleton width="250px" lines={2} />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Card Skeleton Component</h4>
            <CardSkeleton width="320px" height="180px" />
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Image Skeleton Component</h4>
            <ImageSkeleton width="280px" height="160px" />
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div>
              <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Button Skeleton</h4>
              <ButtonSkeleton width="100px" height="36px" />
            </div>
            <div>
              <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Avatar Skeleton</h4>
              <AvatarSkeleton width="48px" height="48px" />
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Complex Layout Skeletons</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1rem', fontSize: '0.9rem' }}>Product Card Skeleton</h4>
            <div style={{ width: '300px' }}>
              <ProductCardSkeleton />
            </div>
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1rem', fontSize: '0.9rem' }}>User Profile Skeleton</h4>
            <div style={{ width: '300px' }}>
              <UserProfileSkeleton />
            </div>
          </div>
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1rem', fontSize: '0.9rem' }}>Navbar Skeleton</h4>
            <div style={{ width: '100%', maxWidth: '800px' }}>
              <NavbarSkeleton />
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Custom Shapes</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <LoadingSkeleton variant="custom" width="100px" height="100px" borderRadius="50%" />
          <LoadingSkeleton variant="custom" width="200px" height="30px" borderRadius="15px" />
          <LoadingSkeleton variant="custom" width="150px" height="60px" borderRadius="8px" />
          <LoadingSkeleton variant="custom" width="80px" height="80px" borderRadius="12px" />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};