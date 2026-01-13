import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, SafeAreaView, TouchableOpacity } from 'react-native';
import { walletService, Transaction } from '@linkdao/shared/services/walletService';
import { SecureKeyStorage } from '@linkdao/shared/utils/secureKeyStorage';

export default function TransactionHistoryScreen() {
  const [address, setAddress] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (walletAddress: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await walletService.getTransactionHistory(walletAddress as any, 50);
      setTransactions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const init = useCallback(async () => {
    const activeWallet = await SecureKeyStorage.getActiveWallet();
    if (activeWallet) {
      setAddress(activeWallet);
      fetchTransactions(activeWallet);
    }
  }, [fetchTransactions]);

  useEffect(() => {
    init();
  }, [init]);

  const onRefresh = () => {
    if (address) {
      fetchTransactions(address);
    }
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isSend = item.type === 'send';
    return (
      <View style={styles.txItem}>
        <View style={styles.txIconContainer}>
          <Text style={[styles.txIcon, { color: isSend ? '#FF3B30' : '#34C759' }]}>
            {isSend ? '↑' : '↓'}
          </Text>
        </View>
        <View style={styles.txDetails}>
          <Text style={styles.txType}>{item.type.toUpperCase()}</Text>
          <Text style={styles.txTime}>{new Date(item.timestamp).toLocaleString()}</Text>
        </View>
        <View style={styles.txAmountContainer}>
          <Text style={[styles.txAmount, { color: isSend ? '#FF3B30' : '#34C759' }]}>
            {isSend ? '-' : '+'}{parseFloat(item.amount).toFixed(4)} {item.token.symbol}
          </Text>
          <Text style={styles.txStatus}>{item.status}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={transactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions found</Text>
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
  title: { fontSize: 18, fontWeight: 'bold' },
  listContent: { padding: 15 },
  txItem: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  txIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  txIcon: { fontSize: 20, fontWeight: 'bold' },
  txDetails: { flex: 1 },
  txType: { fontSize: 16, fontWeight: 'bold' },
  txTime: { fontSize: 12, color: '#999', marginTop: 2 },
  txAmountContainer: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '600' },
  txStatus: { fontSize: 12, color: '#999', marginTop: 2 },
  errorText: { color: 'red', textAlign: 'center', margin: 10 },
  emptyContainer: { marginTop: 50, alignItems: 'center' },
  emptyText: { color: '#999' }
});
