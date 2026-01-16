/**
 * Governance Delegation Page
 * Allows users to delegate their voting power to other addresses
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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { governanceService, Delegation } from '../../src/services/governanceService';
import { useAuthStore } from '../../src/store/authStore';
import { THEME } from '../../src/constants/theme';

export default function DelegationPage() {
  const { user } = useAuthStore();

  const [delegateAddress, setDelegateAddress] = useState('');
  const [delegationAmount, setDelegationAmount] = useState('');
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [userVotingPower, setUserVotingPower] = useState(0);
  const [loading, setLoading] = useState(true);
  const [delegating, setDelegating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [delegationsData, votingPower] = await Promise.all([
        governanceService.getDelegations(),
        governanceService.getUserVotingPower(),
      ]);

      setDelegations(delegationsData);
      setUserVotingPower(votingPower);
    } catch (error) {
      console.error('Error loading delegation data:', error);
      Alert.alert('Error', 'Failed to load delegation data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelegate = async () => {
    if (!user) {
      Alert.alert('Error', 'Please connect your wallet');
      return;
    }

    if (!delegateAddress) {
      Alert.alert('Error', 'Please enter a delegate address');
      return;
    }

    if (delegateAddress === user.walletAddress) {
      Alert.alert('Error', 'You cannot delegate to yourself');
      return;
    }

    const amount = parseFloat(delegationAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid delegation amount');
      return;
    }

    if (amount > userVotingPower) {
      Alert.alert('Error', 'Delegation amount cannot exceed your voting power');
      return;
    }

    Alert.alert(
      'Confirm Delegation',
      `Delegate ${amount.toLocaleString()} voting power to ${delegateAddress}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delegate',
          style: 'default',
          onPress: async () => {
            try {
              setDelegating(true);
              const result = await governanceService.delegateVotingPower(delegateAddress, amount);

              if (result.success) {
                Alert.alert('Success', 'Voting power delegated successfully');
                setDelegateAddress('');
                setDelegationAmount('');
                await loadData();
              } else {
                Alert.alert('Error', result.error || 'Failed to delegate');
              }
            } catch (error) {
              console.error('Error delegating:', error);
              Alert.alert('Error', 'Failed to delegate voting power');
            } finally {
              setDelegating(false);
            }
          },
        },
      ]
    );
  };

  const handleRevoke = async (delegationId: string) => {
    Alert.alert(
      'Confirm Revoke',
      'Are you sure you want to revoke this delegation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              setRevoking(delegationId);
              const result = await governanceService.revokeDelegation(delegationId);

              if (result.success) {
                Alert.alert('Success', 'Delegation revoked successfully');
                await loadData();
              } else {
                Alert.alert('Error', result.error || 'Failed to revoke');
              }
            } catch (error) {
              console.error('Error revoking delegation:', error);
              Alert.alert('Error', 'Failed to revoke delegation');
            } finally {
              setRevoking(null);
            }
          },
        },
      ]
    );
  };

  const renderDelegationCard = (delegation: Delegation) => {
    return (
      <View key={delegation.id} style={styles.delegationCard}>
        <View style={styles.delegationHeader}>
          <View style={styles.delegatorInfo}>
            <Ionicons name="person-outline" size={20} color={THEME.colors.primary} />
            <View style={styles.delegatorDetails}>
              <Text style={styles.delegatorLabel}>Delegate</Text>
              <Text style={styles.delegatorAddress}>{delegation.delegate}</Text>
            </View>
          </View>
          {delegation.isRevocable && (
            <TouchableOpacity
              style={styles.revokeButton}
              onPress={() => handleRevoke(delegation.id)}
              disabled={revoking === delegation.id}
            >
              {revoking === delegation.id ? (
                <ActivityIndicator size="small" color={THEME.colors.error} />
              ) : (
                <>
                  <Ionicons name="close-circle" size={16} color={THEME.colors.error} />
                  <Text style={styles.revokeButtonText}>Revoke</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.delegationStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Voting Power</Text>
            <Text style={styles.statValue}>{delegation.votingPower.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Created</Text>
            <Text style={styles.statValue}>{new Date(delegation.createdAt).toLocaleDateString()}</Text>
          </View>
          {delegation.expiryDate && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Expires</Text>
              <Text style={styles.statValue}>{new Date(delegation.expiryDate).toLocaleDateString()}</Text>
            </View>
          )}
        </View>

        {!delegation.isRevocable && (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={12} color={THEME.colors.gray} />
            <Text style={styles.lockedText}>Locked - Cannot be revoked</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={THEME.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delegate Voting Power</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Voting Power Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Voting Power</Text>
          <View style={styles.votingPowerContainer}>
            <Text style={styles.votingPowerValue}>{userVotingPower.toLocaleString()}</Text>
            <Text style={styles.votingPowerLabel}>Total Votes</Text>
          </View>
        </View>

        {/* Delegate Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delegate to Address</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Delegate Address</Text>
            <TextInput
              style={styles.input}
              placeholder="0x..."
              value={delegateAddress}
              onChangeText={setDelegateAddress}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Voting Power to Delegate</Text>
            <TextInput
              style={styles.input}
              placeholder="Amount"
              value={delegationAmount}
              onChangeText={setDelegationAmount}
              keyboardType="numeric"
            />
            <Text style={styles.inputHint}>Max: {userVotingPower.toLocaleString()}</Text>
          </View>

          <TouchableOpacity
            style={[styles.delegateButton, delegating && styles.disabledButton]}
            onPress={handleDelegate}
            disabled={delegating}
          >
            {delegating ? (
              <ActivityIndicator size="small" color={THEME.colors.white} />
            ) : (
              <>
                <Ionicons name="swap-horizontal" size={20} color={THEME.colors.white} />
                <Text style={styles.delegateButtonText}>Delegate Voting Power</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Active Delegations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Delegations</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.colors.primary} />
            </View>
          ) : delegations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={THEME.colors.gray} />
              <Text style={styles.emptyText}>No active delegations</Text>
            </View>
          ) : (
            delegations.map(renderDelegationCard)
          )}
        </View>

        {/* Info Card */}
        <View style={[styles.card, styles.infoCard]}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color={THEME.colors.primary} />
            <Text style={styles.infoTitle}>About Delegation</Text>
          </View>
          <Text style={styles.infoText}>
            Delegating your voting power allows trusted representatives to vote on governance proposals on your behalf. You maintain ownership of your tokens but transfer voting rights temporarily.
          </Text>
          <Text style={styles.infoText}>
            • You can revoke delegations at any time (unless locked)
          </Text>
          <Text style={styles.infoText}>
            • Delegates cannot transfer your tokens
          </Text>
          <Text style={styles.infoText}>
            • Your voting power is still counted in quorum requirements
          </Text>
        </View>
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
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 12,
  },
  votingPowerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  votingPowerValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  votingPowerLabel: {
    fontSize: 14,
    color: THEME.colors.gray,
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: THEME.colors.text,
  },
  inputHint: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginTop: 4,
  },
  delegateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  delegateButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.white,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.colors.gray,
  },
  delegationCard: {
    backgroundColor: THEME.colors.gray + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  delegationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  delegatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  delegatorDetails: {
    marginLeft: 12,
    flex: 1,
  },
  delegatorLabel: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginBottom: 2,
  },
  delegatorAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  revokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: THEME.colors.error + '10',
    borderRadius: 6,
  },
  revokeButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.error,
  },
  delegationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: THEME.colors.gray,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  lockedText: {
    marginLeft: 4,
    fontSize: 11,
    color: THEME.colors.gray,
  },
  infoCard: {
    backgroundColor: THEME.colors.primary + '5',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  infoText: {
    fontSize: 14,
    color: THEME.colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
});