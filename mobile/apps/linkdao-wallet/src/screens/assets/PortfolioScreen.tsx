import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, SafeAreaView, TouchableOpacity } from 'react-native';
import { walletService, TokenBalance } from '@linkdao/shared/services/walletService';
import { SecureKeyStorage } from '@linkdao/shared/utils/secureKeyStorage';

export default function PortfolioScreen(props: any) {
  const [address, setAddress] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async (walletAddress: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await walletService.getTokenBalances(walletAddress as any);
      setTokens(data);
      const total = data.reduce((sum, token) => sum + (token.valueUSD || 0), 0);
      setTotalValue(total);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch balances');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const init = useCallback(async () => {
    const activeWallet = await SecureKeyStorage.getActiveWallet();
    if (activeWallet) {
      setAddress(activeWallet);
      fetchBalances(activeWallet);
    }
  }, [fetchBalances]);

  useEffect(() => {
    init();
  }, [init]);

  const onRefresh = () => {
    if (address) {
      fetchBalances(address);
    }
  };

  const renderTokenItem = ({ item }: { item: TokenBalance }) => (
    <View style={styles.tokenItem}>
      <View>
        <Text style={styles.tokenSymbol}>{item.symbol}</Text>
        <Text style={styles.tokenName}>{item.name}</Text>
      </View>
      <View style={styles.tokenValueContainer}>
        <Text style={styles.tokenBalance}>{parseFloat(item.balanceFormatted).toFixed(4)}</Text>
        <Text style={styles.tokenValueUSD}>${(item.valueUSD || 0).toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio</Text>
        <Text style={styles.totalBalance}>${totalValue.toFixed(2)}</Text>
        {address && (
          <Text style={styles.address}>
            {address.slice(0, 6)}...{address.slice(-4)}
          </Text>
        )}
        <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => (props.navigation as any).navigate('Send')}>
                <Text style={styles.actionIcon}>↑</Text>
                <Text style={styles.actionLabel}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => (props.navigation as any).navigate('Receive')}>
                <Text style={styles.actionIcon}>↓</Text>
                <Text style={styles.actionLabel}>Receive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => (props.navigation as any).navigate('Swap')}>
                <Text style={styles.actionIcon}>⇄</Text>
                <Text style={styles.actionLabel}>Swap</Text>
            </TouchableOpacity>
        </View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={tokens}
        renderItem={renderTokenItem}
        keyExtractor={(item) => item.address + item.symbol}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No assets found or wallet not connected</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, alignItems: 'center', backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, color: '#666' },
  totalBalance: { fontSize: 36, fontWeight: 'bold', marginVertical: 5 },
  address: { fontSize: 12, color: '#999', backgroundColor: '#eee', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  actionRow: { flexDirection: 'row', marginTop: 20, gap: 20 },
  actionButton: { alignItems: 'center' },
  actionIcon: { fontSize: 24, backgroundColor: '#007AFF', color: '#fff', width: 50, height: 50, borderRadius: 25, textAlign: 'center', lineHeight: 50, overflow: 'hidden' },
  actionLabel: { marginTop: 5, color: '#007AFF', fontSize: 12 },
  listContent: { padding: 15 },
  tokenItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  tokenSymbol: { fontSize: 18, fontWeight: 'bold' },
  tokenName: { fontSize: 14, color: '#666' },
  tokenValueContainer: { alignItems: 'flex-end' },
  tokenBalance: { fontSize: 16, fontWeight: '500' },
  tokenValueUSD: { fontSize: 14, color: '#666' },
  errorText: { color: 'red', textAlign: 'center', margin: 10 },
  emptyContainer: { marginTop: 50, alignItems: 'center' },
  emptyText: { color: '#999' }
});
