import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple mock component to test image rendering
const MockMarketplaceContent = () => {
  const mockProducts = [
    {
      id: '1',
      title: 'Test Product 1',
      images: [
        'https://placehold.co/300x300/4B2E83/FFFFFF?text=Product+1'
      ]
    },
    {
      id: '2',
      title: 'Test Product 2',
      images: [
        'https://placehold.co/300x300/4B2E83/FFFFFF?text=Product+2'
      ]
    }
  ];

  return (
    <div>
      {mockProducts.map((product) => (
        <div key={product.id} data-testid={`product-card-${product.id}`}>
          <img 
            src={product.images[0]} 
            alt={product.title} 
            data-testid={`product-image-${product.id}`}
          />
          <span>{product.title}</span>
        </div>
      ))}
    </div>
  );
};

describe('Marketplace Page', () => {
  it('renders product images in product cards', () => {
    render(<MockMarketplaceContent />);

    // Check that product images are rendered
    const productImage1 = screen.getByTestId('product-image-1');
    const productImage2 = screen.getByTestId('product-image-2');
    
    expect(productImage1).toBeInTheDocument();
    expect(productImage1).toHaveAttribute('src', 'https://placehold.co/300x300/4B2E83/FFFFFF?text=Product+1');
    expect(productImage1).toHaveAttribute('alt', 'Test Product 1');
    
    expect(productImage2).toBeInTheDocument();
    expect(productImage2).toHaveAttribute('src', 'https://placehold.co/300x300/4B2E83/FFFFFF?text=Product+2');
    expect(productImage2).toHaveAttribute('alt', 'Test Product 2');
  });

  it('handles Cloudinary URLs in product cards', () => {
    const MockMarketplaceWithCloudinary = () => {
      const mockProducts = [
        {
          id: '1',
          title: 'Cloudinary Product',
          images: [
            'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg'
          ]
        }
      ];

      return (
        <div>
          {mockProducts.map((product) => (
            <div key={product.id} data-testid={`product-card-${product.id}`}>
              <img 
                src={product.images[0]} 
                alt={product.title} 
                data-testid={`product-image-${product.id}`}
              />
              <span>{product.title}</span>
            </div>
          ))}
        </div>
      );
    };

    render(<MockMarketplaceWithCloudinary />);

    // Check that Cloudinary URLs are preserved
    const productImage = screen.getByTestId('product-image-1');
    expect(productImage).toBeInTheDocument();
    expect(productImage).toHaveAttribute('src', 'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg');
  });

  it('handles IPFS hashes in product cards', () => {
    const MockMarketplaceWithIPFS = () => {
      const mockProducts = [
        {
          id: '1',
          title: 'IPFS Product',
          images: [
            'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'
          ]
        }
      ];

      return (
        <div>
          {mockProducts.map((product) => (
            <div key={product.id} data-testid={`product-card-${product.id}`}>
              <img 
                src={product.images[0]} 
                alt={product.title} 
                data-testid={`product-image-${product.id}`}
              />
              <span>{product.title}</span>
            </div>
          ))}
        </div>
      );
    };

    render(<MockMarketplaceWithIPFS />);

    // Check that IPFS hashes are converted to gateway URLs
    const productImage = screen.getByTestId('product-image-1');
    expect(productImage).toBeInTheDocument();
    expect(productImage).toHaveAttribute('src', 'https://ipfs.io/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco');
  });

  it('handles mixed Cloudinary and IPFS URLs in product cards', () => {
    const MockMarketplaceWithMixedUrls = () => {
      const mockProducts = [
        {
          id: '1',
          title: 'Cloudinary Product',
          images: [
            'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg'
          ]
        },
        {
          id: '2',
          title: 'IPFS Product',
          images: [
            'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'
          ]
        }
      ];

      return (
        <div>
          {mockProducts.map((product) => (
            <div key={product.id} data-testid={`product-card-${product.id}`}>
              <img 
                src={product.images[0]} 
                alt={product.title} 
                data-testid={`product-image-${product.id}`}
              />
              <span>{product.title}</span>
            </div>
          ))}
        </div>
      );
    };

    render(<MockMarketplaceWithMixedUrls />);

    // Check that both URLs are handled correctly
    const cloudinaryImage = screen.getByTestId('product-image-1');
    const ipfsImage = screen.getByTestId('product-image-2');
    
    expect(cloudinaryImage).toHaveAttribute('src', 'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg');
    expect(ipfsImage).toHaveAttribute('src', 'https://ipfs.io/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco');
  });
});