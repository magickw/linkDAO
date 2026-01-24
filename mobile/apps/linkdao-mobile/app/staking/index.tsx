/**
 * Staking Page
 * Interface for staking LDAO tokens
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { stakingService, StakingPool, UserStakingInfo } from '../../src/services/stakingService';
import { useAuthStore } from '../../src/store/authStore';
import { THEME } from '../../src/constants/theme';

export default function StakingPage() {
  const { user } = useAuthStore();

  const [pools, setPools] = useState<StakingPool[]>([]);
  const [userStakingInfo, setUserStakingInfo] = useState<UserStakingInfo[]>([]);
  const [summary, setSummary] = useState({ totalStaked: 0, totalRewards: 0, activePools: 0 });
  const [tokenBalance, setTokenBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [actionModal, setActionModal] = useState<'stake' | 'unstake' | null>(null);
  const [processing, setProcessing] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [poolsData, stakingData, summaryData, balanceData] = await Promise.all([
        stakingService.getPools(),
        stakingService.getUserStakingInfo(),
        stakingService.getStakingSummary(),
        stakingService.getTokenBalance(),
      ]);

      setPools(poolsData);
      setUserStakingInfo(stakingData);
      setSummary(summaryData);
      setTokenBalance(balanceData);
    } catch (error) {
      console.error('Error loading staking data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStake = async () => {
    if (!selectedPool || !user) return;

    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount > tokenBalance) {
      Alert.alert('Error', 'Insufficient token balance');
      return;
    }

    if (amount < selectedPool.minStake) {
      Alert.alert('Error', `Minimum stake is ${selectedPool.minStake} LDAO`);
      return;
    }

    Alert.alert(
      'Confirm Stake',
      `Stake ${amount} LDAO in ${selectedPool.name}?\n\nAPY: ${selectedPool.apy}%\nLock Period: ${selectedPool.lockPeriod} days`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stake',
          style: 'default',
          onPress: async () => {
            try {
              setProcessing(true);
              const result = await stakingService.stake(selectedPool.id, amount);

              if (result.success) {
                Alert.alert('Success', 'Tokens staked successfully');
                setActionModal(null);
                setStakeAmount('');
                await loadData();
              } else {
                Alert.alert('Error', result.error || 'Failed to stake');
              }
            } catch (error) {
              console.error('Error staking:', error);
              Alert.alert('Error', 'Failed to stake');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleUnstake = async () => {
    if (!selectedPool) return;

    const userStake = userStakingInfo.find((s) => s.poolId === selectedPool.id);
    if (!userStake) return;

    const amount = parseFloat(unstakeAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount > userStake.stakedAmount) {
      Alert.alert('Error', 'Amount exceeds staked balance');
      return;
    }

    if (userStake.unlockTime && Date.now() < userStake.unlockTime) {
      Alert.alert(
        'Warning',
        'Early unstake may result in reduced rewards. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: async () => {
              try {
                setProcessing(true);
                const result = await stakingService.unstake(selectedPool.id, amount);

                if (result.success) {
                  Alert.alert('Success', 'Tokens unstaked successfully');
                  setActionModal(null);
                  setUnstakeAmount('');
                  await loadData();
                } else {
                  Alert.alert('Error', result.error || 'Failed to unstake');
                }
              } catch (error) {
                console.error('Error unstaking:', error);
                Alert.alert('Error', 'Failed to unstake');
              } finally {
                setProcessing(false);
              }
            },
          },
        ]
      );
    } else {
      try {
        setProcessing(true);
        const result = await stakingService.unstake(selectedPool.id, amount);

        if (result.success) {
          Alert.alert('Success', 'Tokens unstaked successfully');
          setActionModal(null);
          setUnstakeAmount('');
          await loadData();
        } else {
          Alert.alert('Error', result.error || 'Failed to unstake');
        }
      } catch (error) {
        console.error('Error unstaking:', error);
        Alert.alert('Error', 'Failed to unstake');
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleClaimRewards = async (poolId: string) => {
    Alert.alert(
      'Claim Rewards',
      'Claim all available rewards?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim',
          style: 'default',
          onPress: async () => {
            try {
              const result = await stakingService.claimRewards(poolId);

              if (result.success) {
                Alert.alert('Success', `Claimed ${result.amount} LDAO in rewards`);
                await loadData();
              } else {
                Alert.alert('Error', result.error || 'Failed to claim');
              }
            } catch (error) {
              console.error('Error claiming rewards:', error);
              Alert.alert('Error', 'Failed to claim');
            }
          },
        },
      ]
    );
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return THEME.colors.success;
      case 'medium':
        return THEME.colors.warning;
      case 'high':
        return THEME.colors.error;
      default:
        return THEME.colors.gray;
    }
  };

  const renderPoolCard = (pool: StakingPool) => {
    const userStake = userStakingInfo.find((s) => s.poolId === pool.id);

    return (
      <View key={pool.id} style={styles.poolCard}>
        <View style={styles.poolHeader}>
          <View style={styles.poolInfo}>
            <Text style={styles.poolName}>{pool.name}</Text>
            <View style={[styles.riskBadge, { backgroundColor: getRiskColor(pool.risk) + '20' }]}>
              <Text style={[styles.riskText, { color: getRiskColor(pool.risk) }]}>
                {pool.risk.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.apyContainer}>
            <Text style={styles.apyValue}>{pool.apy}%</Text>
            <Text style={styles.apyLabel}>APY</Text>
          </View>
        </View>

        <View style={styles.poolStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>TVL</Text>
            <Text style={styles.statValue}>${(pool.tvl / 1000000).toFixed(2)}M</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Min Stake</Text>
            <Text style={styles.statValue}>{pool.minStake} LDAO</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Lock Period</Text>
            <Text style={styles.statValue}>{pool.lockPeriod} days</Text>
          </View>
        </View>

        {userStake && (
          <View style={styles.userStakeInfo}>
            <Text style={styles.userStakeLabel}>Your Stake</Text>
            <View style={styles.userStakeStats}>
              <View style={styles.userStakeStat}>
                <Text style={styles.userStakeValue}>{userStake.stakedAmount.toLocaleString()}</Text>
                <Text style={styles.userStakeStatLabel}>Staked</Text>
              </View>
              <View style={styles.userStakeStat}>
                <Text style={styles.userStakeValue}>{userStake.rewards.toFixed(2)}</Text>
                <Text style={styles.userStakeStatLabel}>Rewards</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.poolActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectedPool(pool);
              setActionModal('stake');
            }}
          >
            <Ionicons name="add-circle" size={20} color={THEME.colors.primary} />
            <Text style={styles.actionButtonText}>Stake</Text>
          </TouchableOpacity>

          {userStake && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setSelectedPool(pool);
                  setActionModal('unstake');
                }}
              >
                <Ionicons name="remove-circle" size={20} color={THEME.colors.warning} />
                <Text style={styles.actionButtonText}>Unstake</Text>
              </TouchableOpacity>

              {userStake.rewards > 0 && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleClaimRewards(pool.id)}
                >
                  <Ionicons name="gift" size={20} color={THEME.colors.success} />
                  <Text style={styles.actionButtonText}>Claim</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Staking</Text>
        <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={THEME.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Staked</Text>
            <Text style={styles.summaryValue}>{summary.totalStaked.toLocaleString()} LDAO</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pending Rewards</Text>
            <Text style={[styles.summaryValue, styles.rewardsValue]}>
              {summary.totalRewards.toFixed(2)} LDAO
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={styles.summaryValue}>{tokenBalance.toLocaleString()} LDAO</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={THEME.colors.primary} />
            <Text style={styles.infoTitle}>About Staking</Text>
          </View>
          <Text style={styles.infoText}>
            Earn rewards by staking your LDAO tokens. Higher APY pools have longer lock periods.
          </Text>
          <Text style={styles.infoText}>
            • Rewards are distributed daily
          </Text>
          <Text style={styles.infoText}>
            • Early unstake may reduce rewards
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Loading pools...</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Available Pools</Text>
            {pools.map(renderPoolCard)}
          </View>
        )}
      </ScrollView>

      {/* Action Modal */}
      <Modal visible={actionModal !== null} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionModal === 'stake' ? 'Stake Tokens' : 'Unstake Tokens'}
              </Text>
              <TouchableOpacity onPress={() => setActionModal(null)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={THEME.colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedPool && (
              <>
                <View style={styles.modalPoolInfo}>
                  <Text style={styles.modalPoolName}>{selectedPool.name}</Text>
                  <Text style={styles.modalPoolDetails}>
                    APY: {selectedPool.apy}% | Lock: {selectedPool.lockPeriod} days
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Amount (LDAO)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    value={actionModal === 'stake' ? stakeAmount : unstakeAmount}
                    onChangeText={actionModal === 'stake' ? setStakeAmount : setUnstakeAmount}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.inputHint}>
                    Available: {actionModal === 'stake' ? tokenBalance.toLocaleString() : userStakingInfo.find((s) => s.poolId === selectedPool.id)?.stakedAmount.toLocaleString() || 0} LDAO
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.modalButton, processing && styles.disabledButton]}
                  onPress={actionModal === 'stake' ? handleStake : handleUnstake}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color={THEME.colors.white} />
                  ) : (
                    <Text style={styles.modalButtonText}>
                      {actionModal === 'stake' ? 'Stake' : 'Unstake'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background.default,
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
    color: THEME.colors.text.primary,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.text.primary,
  },
  rewardsValue: {
    color: THEME.colors.success,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: THEME.colors.border,
  },
  infoCard: {
    backgroundColor: THEME.colors.primary + '5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  infoText: {
    fontSize: 13,
    color: THEME.colors.text.primary,
    lineHeight: 18,
    marginBottom: 4,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginBottom: 12,
  },
  poolCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  poolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  poolInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  poolName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  riskBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskText: {
    fontSize: 10,
    fontWeight: '700',
  },
  apyContainer: {
    alignItems: 'flex-end',
  },
  apyValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.colors.success,
  },
  apyLabel: {
    fontSize: 12,
    color: THEME.colors.gray,
  },
  poolStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.gray,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  userStakeInfo: {
    backgroundColor: THEME.colors.gray + '10',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  userStakeLabel: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginBottom: 8,
  },
  userStakeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  userStakeStat: {
    alignItems: 'center',
  },
  userStakeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.colors.text.primary,
  },
  userStakeStatLabel: {
    fontSize: 11,
    color: THEME.colors.gray,
  },
  poolActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.gray + '10',
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.white,
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
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPoolInfo: {
    backgroundColor: THEME.colors.gray + '10',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalPoolName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginBottom: 4,
  },
  modalPoolDetails: {
    fontSize: 13,
    color: THEME.colors.gray,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: THEME.colors.gray + '10',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: THEME.colors.text.primary,
  },
  inputHint: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginTop: 4,
  },
  modalButton: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.white,
  },
});
