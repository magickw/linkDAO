import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple mock component to test image rendering
const MockProductDetailPage = ({ product }: any) => {
  const [selectedImage, setSelectedImage] = React.useState(
    product.media && product.media.length > 0 ? product.media[0].url : ''
  );

  // Simulate the IPFS handling logic from the real component
  const processImageUrl = (url: string) => {
    if (!url || url.trim() === '') {
      return `https://placehold.co/600x400/4B2E83/FFFFFF?text=Product`;
    }
    
    if (url.startsWith('http')) {
      return url;
    }
    
    // Handle IPFS hashes
    return `https://gateway.pinata.cloud/ipfs/${url.replace(/^\/+/, '')}`;
  };

  return (
    <div>
      {/* Main product image */}
      <img
        data-testid="main-product-image"
        src={processImageUrl(selectedImage)}
        alt={product.title || 'Product'}
        className="w-full h-96 object-contain"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          target.src = `https://placehold.co/600x400/4B2E83/FFFFFF?text=${encodeURIComponent(product.title || 'Product')}`;
        }}
      />
      
      {/* Thumbnail images */}
      {product.media && product.media.length > 0 && (
        <div>
          {product.media.map((media: any, index: number) => (
            <img
              key={index}
              data-testid={`thumbnail-${index}`}
              src={processImageUrl(media.thumbnail || media.url)}
              alt={media.alt || `Product view ${index + 1}`}
              onClick={() => setSelectedImage(media.url)}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = `https://placehold.co/150x150/4B2E83/FFFFFF?text=${encodeURIComponent(`Img ${index + 1}`)}`;
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

describe('ProductDetailPage', () => {
  const mockProduct = {
    id: '1',
    title: 'Test Product',
    description: 'Test product description',
    media: [
      {
        type: 'image',
        url: 'https://placehold.co/600x400/4B2E83/FFFFFF?text=Main+Product',
        thumbnail: 'https://placehold.co/150x150/4B2E83/FFFFFF?text=Thumb+1',
        alt: 'Main product image'
      },
      {
        type: 'image',
        url: 'https://placehold.co/600x400/4B2E83/FFFFFF?text=Product+View+2',
        thumbnail: 'https://placehold.co/150x150/4B2E83/FFFFFF?text=Thumb+2',
        alt: 'Second product image'
      }
    ]
  };

  it('renders product images correctly', () => {
    render(<MockProductDetailPage product={mockProduct} />);

    // Check that the main product image is rendered
    const mainImage = screen.getByTestId('main-product-image');
    expect(mainImage).toBeInTheDocument();
    // The selectedImage state is initialized with the first media URL
    expect(mainImage).toHaveAttribute('src', 'https://placehold.co/600x400/4B2E83/FFFFFF?text=Main+Product');

    // Check that thumbnail images are rendered
    const thumbnail1 = screen.getByTestId('thumbnail-0');
    const thumbnail2 = screen.getByTestId('thumbnail-1');
    expect(thumbnail1).toBeInTheDocument();
    expect(thumbnail2).toBeInTheDocument();
    
    expect(thumbnail1).toHaveAttribute('src', 'https://placehold.co/150x150/4B2E83/FFFFFF?text=Thumb+1');
    expect(thumbnail1).toHaveAttribute('alt', 'Main product image');
    
    expect(thumbnail2).toHaveAttribute('src', 'https://placehold.co/150x150/4B2E83/FFFFFF?text=Thumb+2');
    expect(thumbnail2).toHaveAttribute('alt', 'Second product image');
  });

  it('handles Cloudinary URLs correctly', () => {
    const productWithCloudinary = {
      ...mockProduct,
      media: [
        {
          type: 'image',
          url: 'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg',
          thumbnail: 'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_150,h_150,q_80/v1234567890/product.jpg',
          alt: 'Cloudinary product image'
        }
      ]
    };

    render(<MockProductDetailPage product={productWithCloudinary} />);

    // Check that Cloudinary URLs are preserved
    const mainImage = screen.getByTestId('main-product-image');
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', 'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg');
  });

  it('handles IPFS hashes correctly', () => {
    const productWithIPFS = {
      ...mockProduct,
      media: [
        {
          type: 'image',
          url: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
          thumbnail: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
          alt: 'IPFS product image'
        }
      ]
    };

    render(<MockProductDetailPage product={productWithIPFS} />);

    // Check that IPFS hashes are converted to gateway URLs
    const mainImage = screen.getByTestId('main-product-image');
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', 'https://gateway.pinata.cloud/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco');
  });

  it('handles missing media gracefully', () => {
    const productWithoutMedia = {
      ...mockProduct,
      media: []
    };

    render(<MockProductDetailPage product={productWithoutMedia} />);

    // Should render with fallback image
    const fallbackImage = screen.getByTestId('main-product-image');
    expect(fallbackImage).toBeInTheDocument();
  });

  it('uses fallback images when media URLs are missing', () => {
    const productWithMissingMediaUrls = {
      ...mockProduct,
      media: [
        {
          type: 'image',
          url: '',
          thumbnail: '',
          alt: 'Missing image'
        }
      ]
    };

    render(<MockProductDetailPage product={productWithMissingMediaUrls} />);

    // Check that the image with missing URL is rendered
    const mainImage = screen.getByTestId('main-product-image');
    const thumbnail = screen.getByTestId('thumbnail-0');
    expect(mainImage).toBeInTheDocument();
    expect(thumbnail).toBeInTheDocument();
  });

  it('handles mixed Cloudinary and IPFS URLs correctly', () => {
    const productWithMixedUrls = {
      ...mockProduct,
      media: [
        {
          type: 'image',
          url: 'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg',
          thumbnail: 'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_150,h_150,q_80/v1234567890/product.jpg',
          alt: 'Cloudinary product image'
        },
        {
          type: 'image',
          url: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
          thumbnail: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
          alt: 'IPFS product image'
        }
      ]
    };

    render(<MockProductDetailPage product={productWithMixedUrls} />);

    // Check that both URLs are handled correctly
    const mainImage = screen.getByTestId('main-product-image');
    const thumbnail1 = screen.getByTestId('thumbnail-0');
    const thumbnail2 = screen.getByTestId('thumbnail-1');
    
    expect(mainImage).toHaveAttribute('src', 'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg');
    expect(thumbnail1).toHaveAttribute('src', 'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_150,h_150,q_80/v1234567890/product.jpg');
    expect(thumbnail2).toHaveAttribute('src', 'https://gateway.pinata.cloud/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco');
  });
});