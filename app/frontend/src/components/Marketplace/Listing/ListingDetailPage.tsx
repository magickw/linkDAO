import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { 
  Star, 
  Shield, 
  Heart, 
  Share2, 
  MapPin, 
  Clock, 
  Truck, 
  RotateCcw, 
  MessageCircle,
  ShoppingCart,
  Gavel,
  Eye,
  Calendar,
  User,
  CheckCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

interface ListingData {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  condition: string;
  seller: {
    id: string;
    name: string;
    avatar: string;
    rating: number;
    totalSales: number;
    responseTime: string;
    location: string;
    memberSince: string;
    isVerified: boolean;
  };
  specifications: Record<string, string>;
  shipping: {
    cost: number;
    estimatedDays: string;
    locations: string[];
  };
  policies: {
    returns: string;
    warranty: string;
    authenticity: string;
  };
  stats: {
    views: number;
    favorites: number;
    watchers: number;
  };
  status: 'ACTIVE' | 'SOLD' | 'DRAFT';
  createdAt: Date;
  isEscrowProtected: boolean;
  tags: string[];
}

interface ListingDetailPageProps {
  listingId: string;
}

const ListingDetailPage: React.FC<ListingDetailPageProps> = ({ listingId }) => {
  const router = useRouter();
  const { address } = useAccount();
  
  const [listing, setListing] = useState<ListingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        
        // Mock listing data
        const mockListing: ListingData = {
          id: listingId,
          title: 'Premium Wireless Headphones - Studio Quality',
          description: 'Professional-grade wireless headphones with active noise cancellation, 30-hour battery life, and premium leather comfort. Perfect for music production, gaming, and everyday listening. Includes carrying case and premium cables.',
          price: 0.15,
          currency: 'ETH',
          images: [
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&h=600&fit=crop'
          ],
          category: 'Electronics',
          condition: 'New',
          seller: {
            id: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
            name: 'Alex Chen',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            rating: 4.8,
            totalSales: 247,
            responseTime: '< 2 hours',
            location: 'San Francisco, CA',
            memberSince: 'March 2023',
            isVerified: true
          },
          specifications: {
            'Brand': 'AudioTech Pro',
            'Model': 'AT-WH1000XM5',
            'Type': 'Over-ear',
            'Connectivity': 'Bluetooth 5.2, USB-C',
            'Battery Life': '30 hours',
            'Noise Cancellation': 'Active ANC',
            'Weight': '250g',
            'Warranty': '2 years'
          },
          shipping: {
            cost: 0.005,
            estimatedDays: '2-3 business days',
            locations: ['United States', 'Canada', 'Europe']
          },
          policies: {
            returns: '30-day return policy. Item must be in original condition.',
            warranty: '2-year manufacturer warranty included.',
            authenticity: 'Guaranteed authentic. Verified by seller reputation system.'
          },
          stats: {
            views: 245,
            favorites: 18,
            watchers: 7
          },
          status: 'ACTIVE',
          createdAt: new Date('2024-01-10'),
          isEscrowProtected: true,
          tags: ['wireless', 'noise-cancelling', 'premium', 'studio-quality']
        };
        
        setListing(mockListing);
      } catch (error) {
        console.error('Failed to fetch listing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [listingId]);

  const handlePurchase = () => {
    console.log('Purchase initiated for listing:', listingId);
  };

  const handleMakeOffer = () => {
    console.log('Make offer for listing:', listingId);
  };

  const handleContactSeller = () => {
    router.push(`/marketplace/seller/store/${listing?.seller.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading listing...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">Listing not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-white/70 mb-6">
          <button onClick={() => router.push('/marketplace')} className="hover:text-white">
            Marketplace
          </button>
          <span>›</span>
          <span className="capitalize">{listing.category}</span>
          <span>›</span>
          <span className="text-white truncate">{listing.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square bg-white/10 rounded-2xl overflow-hidden">
              <Image
                src={listing.images[selectedImageIndex]}
                alt={listing.title}
                width={600}
                height={600}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {listing.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImageIndex === index ? 'border-blue-400' : 'border-white/20'
                  }`}
                >
                  <Image
                    src={image}
                    alt={`${listing.title} ${index + 1}`}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Listing Details */}
          <div className="space-y-6">
            
            {/* Title and Price */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-white">{listing.title}</h1>
                {listing.isEscrowProtected && (
                  <Shield className="w-6 h-6 text-green-400" title="Escrow Protected" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-4xl font-bold text-white">
                  {listing.price} {listing.currency}
                </div>
                <div className="flex items-center gap-4 text-white/70">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{listing.stats.views}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    <span>{listing.stats.favorites}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status and Condition */}
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                listing.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                listing.status === 'SOLD' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {listing.status}
              </span>
              <span className="text-white/70">Condition: {listing.condition}</span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {listing.tags.map((tag) => (
                <span key={tag} className="bg-white/10 text-white/80 px-3 py-1 rounded-full text-sm">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <label className="text-white/70">Quantity:</label>
                <select 
                  value={quantity} 
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="bg-white/10 text-white rounded-lg px-3 py-2 border border-white/20"
                >
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              
              <button
                onClick={handlePurchase}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Buy Now
              </button>
              
              <button
                onClick={handleMakeOffer}
                className="w-full bg-white/10 text-white py-3 rounded-lg font-medium border border-white/20 hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
              >
                <Gavel className="w-5 h-5" />
                Make Offer
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setIsFavorited(!isFavorited)}
                  className={`flex-1 py-3 rounded-lg font-medium border transition-colors flex items-center justify-center gap-2 ${
                    isFavorited 
                      ? 'bg-red-500/20 text-red-400 border-red-400/30' 
                      : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                  {isFavorited ? 'Favorited' : 'Add to Favorites'}
                </button>
                
                <button className="px-4 py-3 bg-white/10 text-white/70 rounded-lg border border-white/20 hover:bg-white/20 transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="bg-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-white font-medium">
                <Truck className="w-5 h-5" />
                Shipping Information
              </div>
              <div className="text-white/80 text-sm space-y-1">
                <div>Cost: {listing.shipping.cost} {listing.currency}</div>
                <div>Estimated delivery: {listing.shipping.estimatedDays}</div>
                <div>Ships to: {listing.shipping.locations.join(', ')}</div>
              </div>
            </div>

            {/* Seller Info */}
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Image
                    src={listing.seller.avatar}
                    alt={listing.seller.name}
                    width={50}
                    height={50}
                    className="rounded-full"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{listing.seller.name}</span>
                      {listing.seller.isVerified && (
                        <CheckCircle className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-white/70 text-sm">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span>{listing.seller.rating}</span>
                      <span>•</span>
                      <span>{listing.seller.totalSales} sales</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleContactSeller}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contact
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-white/70">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Responds in {listing.seller.responseTime}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{listing.seller.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Member since {listing.seller.memberSince}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <button 
                    onClick={() => router.push(`/marketplace/seller/store/${listing.seller.id}`)}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    View Store
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Information */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
          <div className="space-y-8">
            {/* Description */}
            <div>
              <h3 className="text-2xl font-semibold text-white mb-4">Description</h3>
              <p className="text-white/80 leading-relaxed text-lg">{listing.description}</p>
            </div>
            
            {/* Specifications */}
            <div>
              <h3 className="text-2xl font-semibold text-white mb-4">Specifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(listing.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-3 border-b border-white/10">
                    <span className="text-white/70 font-medium">{key}</span>
                    <span className="text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Policies */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 rounded-lg p-6">
                <div className="flex items-center gap-2 text-green-400 mb-3">
                  <Shield className="w-6 h-6" />
                  <span className="font-semibold text-lg">Authenticity Guarantee</span>
                </div>
                <p className="text-white/70">{listing.policies.authenticity}</p>
              </div>
              
              <div className="bg-white/5 rounded-lg p-6">
                <div className="flex items-center gap-2 text-blue-400 mb-3">
                  <RotateCcw className="w-6 h-6" />
                  <span className="font-semibold text-lg">Return Policy</span>
                </div>
                <p className="text-white/70">{listing.policies.returns}</p>
              </div>
              
              <div className="bg-white/5 rounded-lg p-6">
                <div className="flex items-center gap-2 text-purple-400 mb-3">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-semibold text-lg">Warranty</span>
                </div>
                <p className="text-white/70">{listing.policies.warranty}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetailPage;