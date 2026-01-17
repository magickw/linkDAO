/**
 * Wallet Management Screen
 * Multi-wallet support and management functionality
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Wallet {
  id: string;
  address: string;
  nickname?: string;
  isPrimary: boolean;
  network: 'ethereum' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism';
  balance: string;
  lastUsed: string;
}

const NETWORKS = {
  ethereum: { name: 'Ethereum', icon: 'diamond-outline', color: '#627eea' },
  polygon: { name: 'Polygon', icon: 'triangle-outline', color: '#8247e5' },
  bsc: { name: 'BNB Chain', icon: 'logo-bitcoin', color: '#f3ba2f' },
  arbitrum: { name: 'Arbitrum', icon: 'layers-outline', color: '#28a0f0' },
  optimism: { name: 'Optimism', icon: 'flash-outline', color: '#ff0420' },
};

export default function WalletManagementScreen() {
  const { user } = useAuthStore();
  const [wallets, setWallets] = useState<Wallet[]>([
    {
      id: '1',
      address: user?.address || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      nickname: 'Primary Wallet',
      isPrimary: true,
      network: 'ethereum',
      balance: '2.45 ETH',
      lastUsed: new Date().toISOString(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletNickname, setNewWalletNickname] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<keyof typeof NETWORKS>('ethereum');

  const handleSetPrimary = async (walletId: string) => {
    try {
      setLoading(true);
      // Update local state
      setWallets(prev => prev.map(w => ({
        ...w,
        isPrimary: w.id === walletId,
      })));
      
      // TODO: Call API to update primary wallet
      Alert.alert('Success', 'Primary wallet updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update primary wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveWallet = async (walletId: string, walletAddress: string) => {
    if (wallets.length === 1) {
      Alert.alert('Cannot Remove', 'You must have at least one wallet connected');
      return;
    }

    Alert.alert(
      'Remove Wallet',
      `Are you sure you want to remove wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              setWallets(prev => prev.filter(w => w.id !== walletId));
              // TODO: Call API to remove wallet
              Alert.alert('Success', 'Wallet removed successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove wallet');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAddWallet = async () => {
    if (!newWalletAddress) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }

    if (!isValidAddress(newWalletAddress)) {
      Alert.alert('Error', 'Please enter a valid wallet address');
      return;
    }

    if (wallets.some(w => w.address.toLowerCase() === newWalletAddress.toLowerCase())) {
      Alert.alert('Error', 'This wallet is already connected');
      return;
    }

    try {
      setLoading(true);
      
      // TODO: Call API to add wallet and get balance
      const newWallet: Wallet = {
        id: Date.now().toString(),
        address: newWalletAddress,
        nickname: newWalletNickname || `Wallet ${wallets.length + 1}`,
        isPrimary: false,
        network: selectedNetwork,
        balance: '0.00 ETH',
        lastUsed: new Date().toISOString(),
      };

      setWallets(prev => [...prev, newWallet]);
      setShowAddWallet(false);
      setNewWalletAddress('');
      setNewWalletNickname('');
      setSelectedNetwork('ethereum');
      
      Alert.alert('Success', 'Wallet added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add wallet');
    } finally {
      setLoading(false);
    }
  };

  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const shortenAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatLastUsed = (date: string): string => {
    const now = new Date();
    const last = new Date(date);
    const diff = now.getTime() - last.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#3b82f6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Multi-Wallet Support</Text>
            <Text style={styles.infoText}>
              Connect and manage multiple wallets across different networks. Set a primary wallet for transactions.
            </Text>
          </View>
        </View>

        {/* Wallets List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Connected Wallets ({wallets.length})</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddWallet(true)}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>Add Wallet</Text>
            </TouchableOpacity>
          </View>

          {wallets.map((wallet) => (
            <View key={wallet.id} style={styles.walletCard}>
              <View style={styles.walletHeader}>
                <View style={[styles.walletIcon, { backgroundColor: NETWORKS[wallet.network].color }]}>
                  <Ionicons 
                    name={NETWORKS[wallet.network].icon as any} 
                    size={24} 
                    color="#ffffff" 
                  />
                </View>
                <View style={styles.walletInfo}>
                  <View style={styles.walletNameRow}>
                    <Text style={styles.walletName}>
                      {wallet.nickname || shortenAddress(wallet.address)}
                    </Text>
                    {wallet.isPrimary && (
                      <View style={styles.primaryBadge}>
                        <Ionicons name="star" size={12} color="#f59e0b" />
                        <Text style={styles.primaryBadgeText}>Primary</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.walletAddress}>{shortenAddress(wallet.address)}</Text>
                  <Text style={styles.walletNetwork}>{NETWORKS[wallet.network].name}</Text>
                </View>
                <Text style={styles.walletBalance}>{wallet.balance}</Text>
              </View>

              <View style={styles.walletFooter}>
                <View style={styles.walletMeta}>
                  <Ionicons name="time-outline" size={14} color="#9ca3af" />
                  <Text style={styles.walletMetaText}>Last used: {formatLastUsed(wallet.lastUsed)}</Text>
                </View>
                <View style={styles.walletActions}>
                  {!wallet.isPrimary && (
                    <TouchableOpacity
                      style={styles.walletAction}
                      onPress={() => handleSetPrimary(wallet.id)}
                    >
                      <Ionicons name="star-outline" size={18} color="#3b82f6" />
                      <Text style={styles.walletActionText}>Set Primary</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.walletAction}
                    onPress={() => handleRemoveWallet(wallet.id, wallet.address)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text style={[styles.walletActionText, { color: '#ef4444' }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Network Support Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supported Networks</Text>
          <View style={styles.networksGrid}>
            {Object.entries(NETWORKS).map(([key, network]) => (
              <View key={key} style={styles.networkCard}>
                <View style={[styles.networkIcon, { backgroundColor: network.color }]}>
                  <Ionicons name={network.icon as any} size={20} color="#ffffff" />
                </View>
                <Text style={styles.networkName}>{network.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Security Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Tips</Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#10b981" />
              <Text style={styles.tipText}>Always verify wallet addresses before adding</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="lock-closed-outline" size={20} color="#10b981" />
              <Text style={styles.tipText}>Use hardware wallets for large holdings</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="key-outline" size={20} color="#10b981" />
              <Text style={styles.tipText}>Never share your private keys or seed phrases</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Wallet Modal */}
      {showAddWallet && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Wallet</Text>
              <TouchableOpacity onPress={() => setShowAddWallet(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Wallet Address</Text>
              <TextInput
                style={styles.modalInput}
                value={newWalletAddress}
                onChangeText={setNewWalletAddress}
                placeholder="0x..."
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.modalLabel}>Nickname (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={newWalletNickname}
                onChangeText={setNewWalletNickname}
                placeholder="My Wallet"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.modalLabel}>Network</Text>
              <View style={styles.networkSelector}>
                {Object.entries(NETWORKS).map(([key, network]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.networkOption,
                      selectedNetwork === key && styles.networkOptionSelected,
                      { borderColor: selectedNetwork === key ? network.color : '#e5e7eb' },
                    ]}
                    onPress={() => setSelectedNetwork(key as keyof typeof NETWORKS)}
                  >
                    <View style={[styles.networkOptionIcon, { backgroundColor: network.color }]}>
                      <Ionicons name={network.icon as any} size={16} color="#ffffff" />
                    </View>
                    <Text style={[
                      styles.networkOptionText,
                      selectedNetwork === key && styles.networkOptionTextSelected,
                    ]}>
                      {network.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAddWallet(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleAddWallet}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Add Wallet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1e3a8a',
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  walletCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  walletInfo: {
    flex: 1,
  },
  walletNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  walletName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  primaryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d97706',
  },
  walletAddress: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  walletNetwork: {
    fontSize: 11,
    color: '#9ca3af',
  },
  walletBalance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  walletFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  walletMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  walletMetaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  walletActions: {
    flexDirection: 'row',
    gap: 12,
  },
  walletAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  walletActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6',
  },
  networksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  networkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  networkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  networkSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  networkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flex: 1,
    minWidth: '45%',
  },
  networkOptionSelected: {
    backgroundColor: '#f0f9ff',
  },
  networkOptionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkOptionText: {
    fontSize: 13,
    color: '#6b7280',
  },
  networkOptionTextSelected: {
    color: '#1f2937',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonConfirm: {
    backgroundColor: '#3b82f6',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});