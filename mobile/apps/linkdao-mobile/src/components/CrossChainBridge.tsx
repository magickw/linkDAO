/**
 * Cross-Chain Bridge Component
 * Allows users to sync their identity and assets across different networks
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { walletService } from '../services/walletConnectService';

interface Chain {
  id: number;
  name: string;
  icon: string;
  nativeToken: string;
}

const SUPPORTED_CHAINS: Chain[] = [
  { id: 1, name: 'Ethereum', icon: 'logo-github', nativeToken: 'ETH' },
  { id: 137, name: 'Polygon', icon: 'layers', nativeToken: 'MATIC' },
  { id: 10, name: 'Optimism', icon: 'trending-up', nativeToken: 'ETH' },
  { id: 42161, name: 'Arbitrum', icon: 'git-branch', nativeToken: 'ETH' },
  { id: 8453, name: 'Base', icon: 'radio-button-on', nativeToken: 'ETH' },
];

export const CrossChainBridge: React.FC = () => {
  const [sourceChain, setSourceChain] = useState(SUPPORTED_CHAINS[0]);
  const [targetChain, setTargetChain] = useState(SUPPORTED_CHAINS[1]);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncIdentity = async () => {
    try {
      setIsSyncing(true);
      
      // 1. Ensure wallet is on source chain
      if (walletService.getChainId() !== sourceChain.id) {
        await walletService.switchChain(sourceChain.id);
      }
      
      // 2. Sign sync message
      const address = walletService.getAddress();
      if (!address) throw new Error('Wallet not connected');
      
      const message = `Sync LinkDAO Identity from ${sourceChain.name} to ${targetChain.name}\nTimestamp: ${Date.now()}`;
      await walletService.signMessage(message, address);
      
      // 3. Simulate bridge delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Success',
        `Your identity has been successfully bridged to ${targetChain.name}!`,
        [{ text: 'Great!' }]
      );
    } catch (error: any) {
      console.error('Bridge sync error:', error);
      Alert.alert('Bridge Error', error.message || 'Failed to sync across chains');
    } finally {
      setIsSyncing(false);
    }
  };

  const swapChains = () => {
    const temp = sourceChain;
    setSourceChain(targetChain);
    setTargetChain(temp);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Identity Bridge</Text>
        <Text style={styles.subtitle}>Sync your Web3 profile across networks</Text>
      </View>

      <View style={styles.bridgeContainer}>
        {/* Source Chain */}
        <TouchableOpacity style={styles.chainCard}>
          <Text style={styles.label}>From</Text>
          <View style={styles.chainInfo}>
            <Ionicons name={sourceChain.icon as any} size={24} color={THEME.colors.primary} />
            <Text style={styles.chainName}>{sourceChain.name}</Text>
          </View>
        </TouchableOpacity>

        {/* Swap Button */}
        <TouchableOpacity style={styles.swapButton} onPress={swapChains}>
          <Ionicons name="swap-vertical" size={24} color={THEME.colors.text.white} />
        </TouchableOpacity>

        {/* Target Chain */}
        <TouchableOpacity style={styles.chainCard}>
          <Text style={styles.label}>To</Text>
          <View style={styles.chainInfo}>
            <Ionicons name={targetChain.icon as any} size={24} color={THEME.colors.secondary} />
            <Text style={styles.chainName}>{targetChain.name}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={THEME.colors.text.secondary} />
        <Text style={styles.infoText}>
          Bridging your identity allows you to maintain your reputation, badges, and verification status on both networks.
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.syncButton, isSyncing && styles.disabledButton]}
        onPress={handleSyncIdentity}
        disabled={isSyncing}
      >
        {isSyncing ? (
          <ActivityIndicator color={THEME.colors.text.white} />
        ) : (
          <>
            <Ionicons name="sync" size={20} color={THEME.colors.text.white} />
            <Text style={styles.syncButtonText}>Sync Across Chains</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.background.cardLight,
    borderRadius: THEME.borderRadius.xl,
    margin: THEME.spacing.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    marginBottom: THEME.spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.text.secondary,
    marginTop: 2,
  },
  bridgeContainer: {
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.lg,
  },
  chainCard: {
    padding: THEME.spacing.md,
    backgroundColor: '#f3f4f6',
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text.muted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  chainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chainName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text.primary,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    zIndex: 1,
    marginVertical: -20,
    borderWidth: 3,
    borderColor: THEME.colors.background.cardLight,
  },
  infoBox: {
    flexDirection: 'row',
    padding: THEME.spacing.md,
    backgroundColor: '#eff6ff',
    borderRadius: THEME.borderRadius.md,
    gap: 10,
    marginBottom: THEME.spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.colors.text.secondary,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.lg,
    gap: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: THEME.colors.text.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
