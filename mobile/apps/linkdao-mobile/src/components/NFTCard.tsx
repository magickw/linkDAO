/**
 * NFT Card Component
 * Displays an NFT with image, name, price, and seller information
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { NFT } from '../services/nftService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

interface NFTCardProps {
  nft: NFT;
  onPress: (nft: NFT) => void;
}

export const NFTCard: React.FC<NFTCardProps> = ({ nft, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(nft)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: nft.image }} style={styles.image} />

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {nft.name}
        </Text>

        <Text style={styles.collection} numberOfLines={1}>
          {nft.collection}
        </Text>

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.price}>
              {nft.price} {nft.currency}
            </Text>
          </View>

          {nft.isListed && (
            <View style={styles.listedBadge}>
              <Text style={styles.listedText}>Listed</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#16213e',
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  collection: {
    fontSize: 12,
    color: '#a0a0a0',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 10,
    color: '#a0a0a0',
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4ecca3',
  },
  listedBadge: {
    backgroundColor: '#4ecca3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  listedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0f0f23',
  },
});

export default NFTCard;