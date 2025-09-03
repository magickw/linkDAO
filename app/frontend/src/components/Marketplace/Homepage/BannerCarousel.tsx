import React, { useState, useEffect } from 'react';

const BannerCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Sample banner data
  const banners = [
    {
      id: 1,
      title: "Featured Sellers",
      description: "Discover top-rated sellers in our community",
      image: "/images/featured-sellers-banner.jpg",
      cta: "Shop Now"
    },
    {
      id: 2,
      title: "DAO-Approved Products",
      description: "Curated selection of community-vetted items",
      image: "/images/dao-approved-banner.jpg",
      cta: "Explore Collection"
    },
    {
      id: 3,
      title: "NFT Drops",
      description: "Limited edition digital collectibles available now",
      image: "/images/nft-drops-banner.jpg",
      cta: "View Drops"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [banners.length]);

  return (
    <div className="relative h-96 overflow-hidden rounded-lg">
      {banners.map((banner, index) => (
        <div 
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${banner.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center">
            <div className="container mx-auto px-4">
              <div className="max-w-xl">
                <h2 className="text-4xl font-bold text-white mb-4">{banner.title}</h2>
                <p className="text-xl text-white mb-6">{banner.description}</p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                  {banner.cta}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full ${
              index === currentSlide ? 'bg-white' : 'bg-white bg-opacity-50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default BannerCarousel;