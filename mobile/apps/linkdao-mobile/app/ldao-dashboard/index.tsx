/**
 * LDAO Token Dashboard
 * Mobile-optimized dashboard for LDAO token management
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { enhancedAuthService } from '@linkdao/shared/services/enhancedAuthService';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface TokenBalance {
  balance: string;
  staked: string;
  rewards: string;
  totalValue: string;
}

interface ReferralStats {
  referralCount: number;
  totalEarned: string;
  referralCode: string;
}

interface Transaction {
  id: string;
  type: 'purchase' | 'stake' | 'unstake' | 'reward' | 'transfer';
  amount: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

type TabType = 'overview' | 'staking' | 'referral' | 'history';

export default function LDAODashboardScreen() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance>({
    balance: '0',
    staked: '0',
    rewards: '0',
    totalValue: '0',
  });
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    referralCount: 0,
    totalEarned: '0',
    referralCode: '',
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await enhancedAuthService.getAuthToken();
      if (!token) {
        Alert.alert('Authentication Required', 'Please connect your wallet first');
        router.replace('/auth');
        return;
      }

      // Load all data in parallel
      const [balanceRes, referralRes, transactionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/ldao/balance`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/ldao/referrals`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/ldao/transactions`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      const [balanceData, referralData, transactionsData] = await Promise.all([
        balanceRes.json(),
        referralRes.json(),
        transactionsRes.json(),
      ]);

      if (balanceData.success) {
        setTokenBalance(balanceData.data);
      }
      if (referralData.success) {
        setReferralStats(referralData.data);
      }
      if (transactionsData.success) {
        setTransactions(transactionsData.data || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCopyReferralCode = () => {
    if (referralStats.referralCode) {
      // TODO: Implement clipboard copy
      Alert.alert('Referral Code', `Your referral code: ${referralStats.referralCode}`);
    }
  };

  const handleBuyTokens = () => {
    router.push('/marketplace/seller/create-listing');
  };

  const renderTabButton = (tab: TabType, label: string, icon: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons name={icon as any} size={20} color={activeTab === tab ? '#ffffff' : '#9ca3af'} />
      <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderStatCard = (title: string, value: string, subtitle: string, icon: string, color: string) => (
    <View style={[styles.statCard, { borderColor: color }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={24} color="#ffffff" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Token Overview</Text>
      
      <View style={styles.statsGrid}>
        {renderStatCard('Balance', tokenBalance.balance, 'Available tokens', 'wallet-outline', '#8b5cf6')}
        {renderStatCard('Staked', tokenBalance.staked, 'Currently staked', 'lock-closed-outline', '#10b981')}
        {renderStatCard('Rewards', tokenBalance.rewards, 'Earned rewards', 'gift-outline', '#f59e0b')}
        {renderStatCard('Total Value', tokenBalance.totalValue, 'Portfolio value', 'bar-chart-outline', '#3b82f6')}
      </View>

      <View style={styles.actionCard}>
        <View style={styles.actionInfo}>
          <Ionicons name="rocket-outline" size={32} color="#8b5cf6" />
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Grow Your Portfolio</Text>
            <Text style={styles.actionSubtitle}>Buy LDAO tokens to participate in governance and earn rewards</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.actionButton} onPress={handleBuyTokens}>
          <Ionicons name="cart-outline" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Buy Tokens</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStaking = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Staking</Text>
      
      <View style={styles.stakingCard}>
        <View style={styles.stakingHeader}>
          <Ionicons name="lock-closed-outline" size={32} color="#10b981" />
          <View style={styles.stakingInfo}>
            <Text style={styles.stakingTitle}>Stake LDAO Tokens</Text>
            <Text style={styles.stakingDescription}>Earn up to 15% APY by staking your tokens</Text>
          </View>
        </View>

        <View style={styles.stakingStats}>
          <View style={styles.stakingStat}>
            <Text style={styles.stakingStatValue}>{tokenBalance.staked}</Text>
            <Text style={styles.stakingStatLabel}>Currently Staked</Text>
          </View>
          <View style={styles.stakingStat}>
            <Text style={styles.stakingStatValue}>{tokenBalance.rewards}</Text>
            <Text style={styles.stakingStatLabel}>Total Rewards Earned</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.stakingButton}>
          <Text style={styles.stakingButtonText}>Start Staking</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReferral = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Referral Program</Text>
      
      <View style={styles.referralCard}>
        <View style={styles.referralHeader}>
          <Ionicons name="people-outline" size={32} color="#f59e0b" />
          <View style={styles.referralInfo}>
            <Text style={styles.referralTitle}>Earn by Referring</Text>
            <Text style={styles.referralDescription}>Get 5% of every purchase made by your referrals</Text>
          </View>
        </View>

        <View style={styles.referralCodeContainer}>
          <Text style={styles.referralCodeLabel}>Your Referral Code</Text>
          <View style={styles.referralCodeBox}>
            <Text style={styles.referralCode}>{referralStats.referralCode || 'Loading...'}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyReferralCode}
            >
              <Ionicons name="copy-outline" size={20} color="#8b5cf6" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.referralStats}>
          <View style={styles.referralStat}>
            <Text style={styles.referralStatValue}>{referralStats.referralCount}</Text>
            <Text style={styles.referralStatLabel}>Total Referrals</Text>
          </View>
          <View style={styles.referralStat}>
            <Text style={styles.referralStatValue}>${referralStats.totalEarned}</Text>
            <Text style={styles.referralStatLabel}>Total Earned</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-social-outline" size={20} color="#ffffff" />
          <Text style={styles.shareButtonText}>Share Referral Link</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHistory = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Transaction History</Text>
      
      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptySubtitle}>Your transaction history will appear here</Text>
        </View>
      ) : (
        <View style={styles.transactionsList}>
          {transactions.map((tx) => (
            <View key={tx.id} style={styles.transactionCard}>
              <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(tx.type) }]}>
                <Ionicons name={getTransactionIcon(tx.type)} size={20} color="#ffffff" />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>{getTransactionTitle(tx.type)}</Text>
                <Text style={styles.transactionAmount}>{tx.amount} LDAO</Text>
                <Text style={styles.transactionDate}>
                  {new Date(tx.timestamp).toLocaleDateString()}
                </Text>
              </View>
              <View style={[styles.transactionStatus, { backgroundColor: getStatusColor(tx.status) }]}>
                <Text style={styles.transactionStatusText}>{tx.status}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return 'cart-outline';
      case 'stake': return 'lock-closed-outline';
      case 'unstake': return 'lock-open-outline';
      case 'reward': return 'gift-outline';
      case 'transfer': return 'swap-horizontal-outline';
      default: return 'receipt-outline';
    }
  };

  const getTransactionTitle = (type: string) => {
    switch (type) {
      case 'purchase': return 'Token Purchase';
      case 'stake': return 'Tokens Staked';
      case 'unstake': return 'Tokens Unstaked';
      case 'reward': return 'Reward Received';
      case 'transfer': return 'Transfer';
      default: return 'Transaction';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'purchase': return '#8b5cf6';
      case 'stake': return '#10b981';
      case 'unstake': return '#f59e0b';
      case 'reward': return '#10b981';
      case 'transfer': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LDAO Dashboard</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <ActivityIndicator refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* User Info */}
        <View style={styles.userInfoCard}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>
                {user?.displayName?.charAt(0) || user?.address?.slice(0, 2) || '?'}
              </Text>
            </View>
            <View style={styles.userInfoText}>
              <Text style={styles.userName}>
                {user?.displayName || `${user?.address?.slice(0, 6)}...${user?.address?.slice(-4)}`}
              </Text>
              <Text style={styles.userAddress}>{user?.address || 'Not connected'}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {renderTabButton('overview', 'Overview', 'flash-outline')}
          {renderTabButton('staking', 'Staking', 'lock-closed-outline')}
          {renderTabButton('referral', 'Referral', 'people-outline')}
          {renderTabButton('history', 'History', 'receipt-outline')}
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'staking' && renderStaking()}
        {activeTab === 'referral' && renderReferral()}
        {activeTab === 'history' && renderHistory()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  userInfoCard: {
    backgroundColor: '#1e293b',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userInfoText: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  userAddress: {
    fontSize: 12,
    color: '#9ca3af',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabContent: {
    padding: 16,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  actionCard: {
    backgroundColor: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionText: {
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  actionButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  stakingCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  stakingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stakingInfo: {
    marginLeft: 12,
    flex: 1,
  },
  stakingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  stakingDescription: {
    fontSize: 14,
    color: '#9ca3af',
  },
  stakingStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  stakingStat: {
    alignItems: 'center',
  },
  stakingStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 2,
  },
  stakingStatLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  stakingButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  stakingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  referralCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  referralInfo: {
    marginLeft: 12,
    flex: 1,
  },
  referralTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  referralDescription: {
    fontSize: 14,
    color: '#9ca3af',
  },
  referralCodeContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  referralCodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  referralCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
  },
  referralCode: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  copyButton: {
    backgroundColor: '#8b5cf6',
    padding: 8,
    borderRadius: 6,
  },
  referralStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  referralStat: {
    alignItems: 'center',
  },
  referralStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 2,
  },
  referralStatLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  shareButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  transactionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  transactionStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});