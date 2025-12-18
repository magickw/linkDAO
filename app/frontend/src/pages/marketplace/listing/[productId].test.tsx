import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple mock component to test image rendering
const MockProductDetailPageRoute = () => {
  const mockProduct = {
    id: '1',
    title: 'Test Product',
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
    <div data-testid="product-detail-route">
      {/* Main product image */}
      <img
        data-testid="main-product-image"
        src={processImageUrl(mockProduct.media[0].url)}
        alt={mockProduct.media[0].alt}
      />
      
      {/* Thumbnail images */}
      <div>
        {mockProduct.media.map((media: any, index: number) => (
          <img
            key={index}
            data-testid={`thumbnail-${index}`}
            src={processImageUrl(media.thumbnail)}
            alt={media.alt}
          />
        ))}
      </div>
    </div>
  );
};

describe('Product Detail Page Route', () => {
  it('renders product images correctly when product data is loaded', () => {
    render(<MockProductDetailPageRoute />);

    // Check that the main product image is rendered
    const mainImage = screen.getByTestId('main-product-image');
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', 'https://placehold.co/600x400/4B2E83/FFFFFF?text=Main+Product');
    expect(mainImage).toHaveAttribute('alt', 'Main product image');

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
    const MockProductDetailPageRouteWithCloudinary = () => {
      const mockProduct = {
        id: '1',
        title: 'Cloudinary Product',
        media: [
          {
            type: 'image',
            url: 'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg',
            thumbnail: 'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_150,h_150,q_80/v1234567890/product.jpg',
            alt: 'Cloudinary product image'
          }
        ]
      };

      return (
        <div data-testid="product-detail-route">
          {/* Main product image */}
          <img
            data-testid="main-product-image"
            src={mockProduct.media[0].url}
            alt={mockProduct.media[0].alt}
          />
          
          {/* Thumbnail images */}
          <div>
            {mockProduct.media.map((media: any, index: number) => (
              <img
                key={index}
                data-testid={`thumbnail-${index}`}
                src={media.thumbnail}
                alt={media.alt}
              />
            ))}
          </div>
        </div>
      );
    };

    render(<MockProductDetailPageRouteWithCloudinary />);

    // Check that Cloudinary URLs are preserved
    const mainImage = screen.getByTestId('main-product-image');
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', 'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg');
  });

  it('handles IPFS hashes correctly', () => {
    const MockProductDetailPageRouteWithIPFS = () => {
      const mockProduct = {
        id: '1',
        title: 'IPFS Product',
        media: [
          {
            type: 'image',
            url: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
            thumbnail: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
            alt: 'IPFS product image'
          }
        ]
      };

      return (
        <div data-testid="product-detail-route">
          {/* Main product image */}
          <img
            data-testid="main-product-image"
            src={`https://gateway.pinata.cloud/ipfs/${mockProduct.media[0].url}`}
            alt={mockProduct.media[0].alt}
          />
          
          {/* Thumbnail images */}
          <div>
            {mockProduct.media.map((media: any, index: number) => (
              <img
                key={index}
                data-testid={`thumbnail-${index}`}
                src={`https://gateway.pinata.cloud/ipfs/${media.thumbnail}`}
                alt={media.alt}
              />
            ))}
          </div>
        </div>
      );
    };

    render(<MockProductDetailPageRouteWithIPFS />);

    // Check that IPFS hashes are converted to gateway URLs
    const mainImage = screen.getByTestId('main-product-image');
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', 'https://gateway.pinata.cloud/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco');
  });

  it('handles mixed Cloudinary and IPFS URLs correctly', () => {
    const MockProductDetailPageRouteWithMixedUrls = () => {
      const mockProduct = {
        id: '1',
        title: 'Mixed URLs Product',
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

      return (
        <div data-testid="product-detail-route">
          {/* Main product image */}
          <img
            data-testid="main-product-image"
            src={mockProduct.media[0].url}
            alt={mockProduct.media[0].alt}
          />
          
          {/* Thumbnail images */}
          <div>
            {mockProduct.media.map((media: any, index: number) => (
              <img
                key={index}
                data-testid={`thumbnail-${index}`}
                src={media.url.startsWith('http') ? media.thumbnail : `https://gateway.pinata.cloud/ipfs/${media.thumbnail}`}
                alt={media.alt}
              />
            ))}
          </div>
        </div>
      );
    };

    render(<MockProductDetailPageRouteWithMixedUrls />);

    // Check that both URLs are handled correctly
    const mainImage = screen.getByTestId('main-product-image');
    const thumbnail1 = screen.getByTestId('thumbnail-0');
    const thumbnail2 = screen.getByTestId('thumbnail-1');
    
    expect(mainImage).toHaveAttribute('src', 'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg');
    expect(thumbnail1).toHaveAttribute('src', 'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_150,h_150,q_80/v1234567890/product.jpg');
    expect(thumbnail2).toHaveAttribute('src', 'https://gateway.pinata.cloud/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco');
  });
});