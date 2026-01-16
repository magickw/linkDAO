/**
 * NFT Marketplace Page
 * Browse and purchase NFTs
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { nftService, NFT, NFTCollection } from '../../src/services/nftService';
import { THEME } from '../../src/constants/theme';

export default function NFTMarketplacePage() {
  const [nfts, setNFTs] = useState<NFT[]>([]);
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [nftsData, collectionsData] = await Promise.all([
        nftService.getFeaturedNFTs(20),
        nftService.getCollections(),
      ]);

      setNFTs(nftsData);
      setCollections(collectionsData);
    } catch (error) {
      console.error('Error loading NFT data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderNFTCard = ({ item }: { item: NFT }) => (
    <TouchableOpacity
      style={styles.nftCard}
      onPress={() => router.push(`/nft/${item.id}`)}
    >
      <Image source={{ uri: item.image }} style={styles.nftImage} />
      <View style={styles.nftInfo}>
        <Text style={styles.nftName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.nftCollection} numberOfLines={1}>
          {item.collection}
        </Text>
        <View style={styles.nftPrice}>
          <Text style={styles.priceValue}>{item.price}</Text>
          <Text style={styles.priceCurrency}>{item.currency}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCollectionCard = ({ item }: { item: NFTCollection }) => (
    <TouchableOpacity
      style={styles.collectionCard}
      onPress={() => {
        setSelectedCollection(item.id);
        // Load collection NFTs
      }}
    >
      <Image source={{ uri: item.image }} style={styles.collectionImage} />
      <View style={styles.collectionInfo}>
        <View style={styles.collectionHeader}>
          <Text style={styles.collectionName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.verified && (
            <Ionicons name="checkmark-circle" size={16} color={THEME.colors.primary} />
          )}
        </View>
        <Text style={styles.collectionStats}>
          {item.itemsCount} items • Floor: {item.floorPrice} ETH
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NFT Marketplace</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="search" size={24} color={THEME.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Collections */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Collections</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={collections}
          renderItem={renderCollectionCard}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.collectionsList}
        />

        {/* NFTs */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured NFTs</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Loading NFTs...</Text>
          </View>
        ) : (
          <FlatList
            data={nfts}
            renderItem={renderNFTCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.nftGrid}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  seeAll: {
    fontSize: 14,
    color: THEME.colors.primary,
    fontWeight: '500',
  },
  collectionsList: {
    paddingRight: 8,
  },
  collectionCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  collectionImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  collectionInfo: {
    padding: 12,
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  collectionName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  collectionStats: {
    fontSize: 12,
    color: THEME.colors.gray,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.colors.gray,
  },
  nftGrid: {
    justifyContent: 'space-between',
  },
  nftCard: {
    width: '48%',
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  nftImage: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'cover',
  },
  nftInfo: {
    padding: 12,
  },
  nftName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  nftCollection: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginBottom: 8,
  },
  nftPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  priceCurrency: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginLeft: 4,
  },
});