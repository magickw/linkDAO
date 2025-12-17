/**
 * React hooks for NFT Marketplace
 * Provides easy access to NFT marketplace functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useEthersSigner } from '@/hooks/useEthersSigner';
import { nftMarketplaceService, NFTListing, CreateListingParams } from '@/services/contracts/nftMarketplaceService';

export const useNFTMarketplace = () => {
  const { address } = useAccount();
  const signer = useEthersSigner();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a new NFT listing
  const createListing = useCallback(async (params: CreateListingParams): Promise<string> => {
    if (!signer || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const listingId = await nftMarketplaceService.createListing(params, signer);
      return listingId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create listing';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [signer, address]);

  // Place a bid on a listing
  const placeBid = useCallback(async (listingId: string, amount: number): Promise<void> => {
    if (!signer || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      await nftMarketplaceService.placeBid(listingId, amount, signer);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to place bid';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [signer, address]);

  // Execute a sale
  const executeSale = useCallback(async (listingId: string): Promise<void> => {
    if (!signer || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      await nftMarketplaceService.executeSale(listingId, signer);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute sale';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [signer, address]);

  // Cancel a listing
  const cancelListing = useCallback(async (listingId: string): Promise<void> => {
    if (!signer || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      await nftMarketplaceService.cancelListing(listingId, signer);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel listing';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [signer, address]);

  // Accept a bid
  const acceptBid = useCallback(async (listingId: string, bidder: string): Promise<void> => {
    if (!signer || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      await nftMarketplaceService.acceptBid(listingId, bidder, signer);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept bid';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [signer, address]);

  // Initialize service
  useEffect(() => {
    const initialize = async () => {
      try {
        await nftMarketplaceService.initialize();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize NFT marketplace');
      }
    };

    initialize();
  }, []);

  return {
    loading,
    error,
    createListing,
    placeBid,
    executeSale,
    cancelListing,
    acceptBid
  };
};

export const useNFTListing = (listingId: string) => {
  const [listing, setListing] = useState<NFTListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListing = useCallback(async () => {
    if (!listingId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const listingData = await nftMarketplaceService.getListing(listingId);
      setListing(listingData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch listing');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  // Listen to listing events
  useEffect(() => {
    nftMarketplaceService.listenToEvents({
      onBidPlaced: (bidListingId) => {
        if (bidListingId === listingId) {
          fetchListing();
        }
      },
      onSaleExecuted: (soldListingId) => {
        if (soldListingId === listingId) {
          fetchListing();
        }
      },
      onListingCancelled: (cancelledListingId) => {
        if (cancelledListingId === listingId) {
          fetchListing();
        }
      }
    });

    return () => {
      nftMarketplaceService.cleanup();
    };
  }, [listingId, fetchListing]);

  return {
    listing,
    loading,
    error,
    refetch: fetchListing
  };
};

export const useUserListings = (userAddress?: string) => {
  const { address: connectedAddress } = useAccount();
  const [listings, setListings] = useState<NFTListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetAddress = userAddress || connectedAddress;

  const fetchListings = useCallback(async () => {
    if (!targetAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await nftMarketplaceService.initialize();
      const userListings = await nftMarketplaceService.getListingsBySeller(targetAddress);
      setListings(userListings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  }, [targetAddress]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Listen to user's listing events
  useEffect(() => {
    if (!targetAddress) return;

    nftMarketplaceService.listenToEvents({
      onListingCreated: (listingId, seller) => {
        if (seller.toLowerCase() === targetAddress.toLowerCase()) {
          fetchListings();
        }
      },
      onSaleExecuted: (listingId) => {
        fetchListings();
      },
      onListingCancelled: (listingId) => {
        fetchListings();
      }
    });

    return () => {
      nftMarketplaceService.cleanup();
    };
  }, [targetAddress, fetchListings]);

  return {
    listings,
    loading,
    error,
    refetch: fetchListings
  };
};

export const useUserBids = (userAddress?: string) => {
  const { address: connectedAddress } = useAccount();
  const [bidIds, setBidIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetAddress = userAddress || connectedAddress;

  const fetchBids = useCallback(async () => {
    if (!targetAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await nftMarketplaceService.initialize();
      const userBids = await nftMarketplaceService.getUserBids(targetAddress);
      setBidIds(userBids);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bids');
    } finally {
      setLoading(false);
    }
  }, [targetAddress]);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  // Listen to bid events
  useEffect(() => {
    if (!targetAddress) return;

    nftMarketplaceService.listenToEvents({
      onBidPlaced: (listingId, bidder) => {
        if (bidder.toLowerCase() === targetAddress.toLowerCase()) {
          fetchBids();
        }
      },
      onSaleExecuted: (listingId) => {
        fetchBids();
      }
    });

    return () => {
      nftMarketplaceService.cleanup();
    };
  }, [targetAddress, fetchBids]);

  return {
    bidIds,
    loading,
    error,
    refetch: fetchBids
  };
};

export const useActiveListings = (limit: number = 50, offset: number = 0) => {
  const [listings, setListings] = useState<NFTListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveListings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await nftMarketplaceService.initialize();
      const activeListings = await nftMarketplaceService.getActiveListings(limit, offset);
      setListings(activeListings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch active listings');
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    fetchActiveListings();
  }, [fetchActiveListings]);

  // Listen to all marketplace events
  useEffect(() => {
    nftMarketplaceService.listenToEvents({
      onListingCreated: () => {
        fetchActiveListings();
      },
      onSaleExecuted: () => {
        fetchActiveListings();
      },
      onListingCancelled: () => {
        fetchActiveListings();
      }
    });

    return () => {
      nftMarketplaceService.cleanup();
    };
  }, [fetchActiveListings]);

  return {
    listings,
    loading,
    error,
    refetch: fetchActiveListings
  };
};

export const useNFTMetadata = (nftContract: string, tokenId: string) => {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    if (!nftContract || !tokenId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nftMetadata = await nftMarketplaceService.getNFTMetadata(nftContract, tokenId);
      setMetadata(nftMetadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch NFT metadata');
    } finally {
      setLoading(false);
    }
  }, [nftContract, tokenId]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  return {
    metadata,
    loading,
    error,
    refetch: fetchMetadata
  };
};

export const useNFTOwnership = (nftContract: string, tokenId: string, userAddress?: string) => {
  const { address: connectedAddress } = useAccount();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetAddress = userAddress || connectedAddress;

  const checkOwnership = useCallback(async () => {
    if (!nftContract || !tokenId || !targetAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const owner = await nftMarketplaceService.checkNFTOwnership(nftContract, tokenId, targetAddress);
      setIsOwner(owner);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check NFT ownership');
    } finally {
      setLoading(false);
    }
  }, [nftContract, tokenId, targetAddress]);

  useEffect(() => {
    checkOwnership();
  }, [checkOwnership]);

  return {
    isOwner,
    loading,
    error,
    refetch: checkOwnership
  };
};