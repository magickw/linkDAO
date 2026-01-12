import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  HeartIcon,
  ShareIcon,
  ClockIcon,
  EyeIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';

interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

interface NFTDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftId: string;
}

interface NFTDetail {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  animationUrl?: string;
  price?: string;
  currency: string;
  creator: {
    id: string;
    handle: string;
    walletAddress: string;
    avatar?: string;
    verified: boolean;
  };
  owner: {
    id: string;
    handle: string;
    walletAddress: string;
    avatar?: string;
  };
  collection?: {
    id: string;
    name: string;
    verified: boolean;
    floorPrice: string;
    totalVolume: string;
  };
  attributes: NFTAttribute[];
  isVerified: boolean;
  isLiked: boolean;
  likes: number;
  views: number;
  listingType?: 'fixed' | 'auction';
  auctionEndTime?: string;
  currentBid?: string;
  bidHistory?: Array<{
    bidder: string;
    amount: string;
    timestamp: string;
  }>;
  offers?: Array<{
    id: string;
    buyer: string;
    amount: string;
    currency: string;
    expiresAt: string;
  }>;
  provenance: Array<{
    event: string;
    from?: string;
    to: string;
    price?: string;
    currency?: string;
    transactionHash: string;
    timestamp: string;
  }>;
  contractAddress: string;
  tokenId: string;
  tokenStandard: string;
  blockchain: string;
  royalty: number;
  lastSale?: {
    price: string;
    currency: string;
    date: string;
  };
}

export default function NFTDetailModal({ isOpen, onClose, nftId }: NFTDetailModalProps) {
  const [nft, setNft] = useState<NFTDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [bidAmount, setBidAmount] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [showBidModal, setShowBidModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);

  useEffect(() => {
    if (isOpen && nftId) {
      fetchNFTDetails();
    }
  }, [isOpen, nftId]);

  const fetchNFTDetails = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockNFT: NFTDetail = {
        id: nftId,
        name: 'Cosmic Wanderer #1234',
        description: 'A beautiful cosmic wanderer exploring the digital universe. This unique piece represents the journey of consciousness through the vast expanse of cyberspace, where digital souls find their purpose among the stars.',
        imageUrl: 'https://placehold.co/600x600/6366f1/ffffff?text=NFT+Detail',
        animationUrl: undefined,
        price: '2.5',
        currency: 'ETH',
        creator: {
          id: 'creator1',
          handle: 'cosmicartist',
          walletAddress: '0x1234567890123456789012345678901234567890',
          avatar: 'https://placehold.co/40x40/8b5cf6/ffffff?text=CA',
          verified: true,
        },
        owner: {
          id: 'owner1',
          handle: 'collector_pro',
          walletAddress: '0x0987654321098765432109876543210987654321',
          avatar: 'https://placehold.co/40x40/10b981/ffffff?text=CP'
        },
        collection: {
          id: 'collection1',
          name: 'Cosmic Wanderers',
          verified: true,
          floorPrice: '1.8',
          totalVolume: '1,234.5',
        },
        attributes: [
          { trait_type: 'Background', value: 'Nebula' },
          { trait_type: 'Rarity', value: 'Legendary' },
          { trait_type: 'Power Level', value: 95, display_type: 'number' },
          { trait_type: 'Speed Boost', value: 15, display_type: 'boost_percentage' },
        ],
        isVerified: true,
        isLiked: false,
        likes: 42,
        views: 1234,
        listingType: 'auction',
        auctionEndTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        currentBid: '2.1',
        bidHistory: [
          { bidder: '0xabc...def', amount: '2.1', timestamp: '2024-01-15T10:30:00Z' },
          { bidder: '0x123...456', amount: '2.0', timestamp: '2024-01-15T09:15:00Z' },
          { bidder: '0x789...012', amount: '1.8', timestamp: '2024-01-15T08:00:00Z' },
        ],
        offers: [
          {
            id: 'offer1',
            buyer: '0xdef...abc',
            amount: '2.3',
            currency: 'ETH',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        provenance: [
          {
            event: 'Minted',
            to: '0x1234...5678',
            transactionHash: '0xabcdef...',
            timestamp: '2024-01-01T00:00:00Z',
          },
          {
            event: 'Sale',
            from: '0x1234...5678',
            to: '0x0987...4321',
            price: '1.5',
            currency: 'ETH',
            transactionHash: '0x123456...',
            timestamp: '2024-01-10T12:00:00Z',
          },
        ],
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '1234',
        tokenStandard: 'ERC-721',
        blockchain: 'Ethereum',
        royalty: 5,
        lastSale: {
          price: '1.5',
          currency: 'ETH',
          date: '2024-01-10',
        },
      };

      setNft(mockNFT);
    } catch (error) {
      console.error('Error fetching NFT details:', error);
      toast.error('Failed to load NFT details');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = () => {
    if (!nft) return;
    setNft(prev => prev ? {
      ...prev,
      isLiked: !prev.isLiked,
      likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
    } : null);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: nft?.name,
        text: nft?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handleBid = () => {
    if (!bidAmount || !nft) return;
    // Implement bid logic
    toast.success(`Bid of ${bidAmount} ETH placed successfully`);
    setShowBidModal(false);
    setBidAmount('');
  };

  const handleOffer = () => {
    if (!offerAmount || !nft) return;
    // Implement offer logic
    toast.success(`Offer of ${offerAmount} ETH submitted successfully`);
    setShowOfferModal(false);
    setOfferAmount('');
  };

  const formatTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (!isOpen) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all">
                {loading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : nft ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    {/* Left Column - Image */}
                    <div className="relative bg-gray-100 dark:bg-gray-900">
                      <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <XMarkIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      </button>

                      <div className="aspect-square">
                        <img
                          src={nft.imageUrl}
                          alt={nft.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Right Column - Details */}
                    <div className="p-6 flex flex-col">
                      {/* Header */}
                      <div className="mb-6">
                        {nft.collection && (
                          <div className="flex items-center mb-2">
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {nft.collection.name}
                            </span>
                            {nft.collection.verified && (
                              <CheckCircleIcon className="h-4 w-4 ml-1 text-blue-500" />
                            )}
                          </div>
                        )}

                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          {nft.name}
                        </h1>

                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <EyeIcon className="h-4 w-4 mr-1" />
                            {nft.views} views
                          </div>
                          <div className="flex items-center">
                            <HeartIcon className="h-4 w-4 mr-1" />
                            {nft.likes} likes
                          </div>
                        </div>
                      </div>

                      {/* Creator & Owner */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Creator</p>
                          <div className="flex items-center">
                            <img
                              src={nft.creator.avatar}
                              alt={nft.creator.handle}
                              className="h-8 w-8 rounded-full mr-2"
                            />
                            <div>
                              <div className="flex items-center">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  @{nft.creator.handle}
                                </span>
                                {nft.creator.verified && (
                                  <CheckCircleIcon className="h-4 w-4 ml-1 text-blue-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Owner</p>
                          <div className="flex items-center">
                            <img
                              src={nft.owner.avatar}
                              alt={nft.owner.handle}
                              className="h-8 w-8 rounded-full mr-2"
                            />
                            <span className="font-medium text-gray-900 dark:text-white">
                              @{nft.owner.handle}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Price & Actions */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                        {nft.listingType === 'auction' ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                Current bid
                              </span>
                              {nft.auctionEndTime && (
                                <div className="flex items-center text-red-500">
                                  <ClockIcon className="h-4 w-4 mr-1" />
                                  <span className="text-sm font-medium">
                                    {formatTimeRemaining(nft.auctionEndTime)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                              {nft.currentBid} {nft.currency}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => setShowBidModal(true)}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Place Bid
                              </button>
                              <button
                                onClick={() => setShowOfferModal(true)}
                                className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                              >
                                Make Offer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">Price</span>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                              {nft.price} {nft.currency}
                            </div>
                            <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                              Buy Now
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-3 mb-6">
                        <button
                          onClick={handleLike}
                          className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {nft.isLiked ? (
                            <HeartSolidIcon className="h-5 w-5 text-red-500 mr-2" />
                          ) : (
                            <HeartIcon className="h-5 w-5 mr-2" />
                          )}
                          {nft.likes}
                        </button>

                        <button
                          onClick={handleShare}
                          className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <ShareIcon className="h-5 w-5 mr-2" />
                          Share
                        </button>
                      </div>

                      {/* Tabs */}
                      <div className="flex-1">
                        <div className="border-b border-gray-200 dark:border-gray-600 mb-4">
                          <nav className="-mb-px flex space-x-8">
                            {['details', 'attributes', 'offers', 'activity'].map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                  }`}
                              >
                                {tab}
                              </button>
                            ))}
                          </nav>
                        </div>

                        {/* Tab Content */}
                        <div className="overflow-y-auto max-h-64">
                          {activeTab === 'details' && (
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                  Description
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                  {nft.description}
                                </p>
                              </div>

                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                  Contract Details
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Contract Address</span>
                                    <button
                                      onClick={() => copyToClipboard(nft.contractAddress)}
                                      className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                      {nft.contractAddress.slice(0, 6)}...{nft.contractAddress.slice(-4)}
                                      <DocumentDuplicateIcon className="h-3 w-3 ml-1" />
                                    </button>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Token ID</span>
                                    <span className="text-gray-900 dark:text-white">{nft.tokenId}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Token Standard</span>
                                    <span className="text-gray-900 dark:text-white">{nft.tokenStandard}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Blockchain</span>
                                    <span className="text-gray-900 dark:text-white">{nft.blockchain}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Creator Royalty</span>
                                    <span className="text-gray-900 dark:text-white">{nft.royalty}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTab === 'attributes' && (
                            <div className="grid grid-cols-2 gap-3">
                              {nft.attributes.map((attr, index) => (
                                <div
                                  key={index}
                                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center"
                                >
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    {attr.trait_type}
                                  </div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {attr.value}
                                    {attr.display_type === 'boost_percentage' && '%'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {activeTab === 'offers' && (
                            <div className="space-y-3">
                              {nft.offers?.map((offer) => (
                                <div
                                  key={offer.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                >
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {offer.amount} {offer.currency}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      by {offer.buyer.slice(0, 6)}...{offer.buyer.slice(-4)}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Expires in {formatTimeRemaining(offer.expiresAt)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {activeTab === 'activity' && (
                            <div className="space-y-3">
                              {nft.provenance.map((event, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                >
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {event.event}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {event.from && `${event.from.slice(0, 6)}...${event.from.slice(-4)} → `}
                                      {event.to.slice(0, 6)}...{event.to.slice(-4)}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {event.price && (
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {event.price} {event.currency}
                                      </div>
                                    )}
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {new Date(event.timestamp).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      NFT Not Found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      The requested NFT could not be loaded.
                    </p>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>

        {/* Bid Modal */}
        {showBidModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Place a Bid
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bid Amount (ETH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter bid amount"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Minimum bid: {nft?.currentBid} ETH
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBidModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBid}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Place Bid
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Offer Modal */}
        {showOfferModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Make an Offer
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Offer Amount (ETH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter offer amount"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowOfferModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOffer}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Make Offer
                </button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </Transition>
  );
}