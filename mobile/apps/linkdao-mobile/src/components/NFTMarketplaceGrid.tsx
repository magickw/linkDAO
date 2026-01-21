/**
 * NFT Marketplace Grid Component
 * Displays a grid of NFTs with filtering and sorting options
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NFT, nftService } from '../services/nftService';
import { NFTCard } from './NFTCard';

interface NFTMarketplaceGridProps {
  onNFTPress: (nft: NFT) => void;
}

type SortOption = 'recent' | 'price_low' | 'price_high' | 'rarity';

export const NFTMarketplaceGrid: React.FC<NFTMarketplaceGridProps> = ({ onNFTPress }) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [filteredNfts, setFilteredNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = ['All', 'Art', 'Gaming', 'Collectibles', 'Music', 'Photography'];

  const loadNFTs = useCallback(async () => {
    setLoading(true);
    try {
      const featuredNfts = await nftService.getFeaturedNFTs(20);
      setNfts(featuredNfts);
      setFilteredNfts(featuredNfts);
    } catch (error) {
      console.error('Error loading NFTs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadNFTs();
  }, [loadNFTs]);

  React.useEffect(() => {
    let filtered = nfts;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (nft) =>
          nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          nft.collection.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory && selectedCategory !== 'All') {
      filtered = filtered.filter((nft) =>
        nft.traits.some((trait) => trait.trait_type === 'Category' && trait.value === selectedCategory)
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'price_low':
        filtered = [...filtered].sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        filtered = [...filtered].sort((a, b) => b.price - a.price);
        break;
      case 'rarity':
        filtered = [...filtered].sort((a, b) => {
          const aRarity = a.traits.filter((t) => t.rarity === 'legendary').length;
          const bRarity = b.traits.filter((t) => t.rarity === 'legendary').length;
          return bRarity - aRarity;
        });
        break;
      default:
        // recent - no sorting needed
        break;
    }

    setFilteredNfts(filtered);
  }, [nfts, searchQuery, sortBy, selectedCategory]);

  const renderNFT = useCallback(
    ({ item }: { item: NFT }) => <NFTCard nft={item} onPress={onNFTPress} />,
    [onNFTPress]
  );

  const renderCategoryButton = useCallback(
    (category: string) => (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryButton,
          selectedCategory === category && styles.categoryButtonActive,
        ]}
        onPress={() => setSelectedCategory(category === selectedCategory ? null : category)}
      >
        <Text
          style={[
            styles.categoryButtonText,
            selectedCategory === category && styles.categoryButtonTextActive,
          ]}
        >
          {category}
        </Text>
      </TouchableOpacity>
    ),
    [selectedCategory]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ecca3" />
        <Text style={styles.loadingText}>Loading NFTs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search NFTs..."
          placeholderTextColor="#a0a0a0"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {categories.map(renderCategoryButton)}
      </ScrollView>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['recent', 'price_low', 'price_high', 'rarity'] as SortOption[]).map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.sortButton,
                sortBy === option && styles.sortButtonActive,
              ]}
              onPress={() => setSortBy(option)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === option && styles.sortButtonTextActive,
                ]}
              >
                {option.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredNfts.length} {filteredNfts.length === 1 ? 'NFT' : 'NFTs'} found
        </Text>
      </View>

      {/* NFT Grid */}
      {filteredNfts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No NFTs found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNfts}
          renderItem={renderNFT}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.row}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f23',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#a0a0a0',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#1a1a2e',
  },
  searchInput: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  categoryScroll: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 12,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#16213e',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#4ecca3',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#a0a0a0',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#0f0f23',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a2e',
    marginTop: 8,
  },
  sortLabel: {
    fontSize: 14,
    color: '#a0a0a0',
    marginRight: 12,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#16213e',
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: '#4ecca3',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#a0a0a0',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#0f0f23',
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a2e',
  },
  resultsText: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
});

export default NFTMarketplaceGrid;