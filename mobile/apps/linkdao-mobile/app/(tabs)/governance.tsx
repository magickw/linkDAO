/**
 * Governance Tab Screen
 * Quick access to governance features from the main tab bar
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { governanceService, Proposal } from '../../src/services/governanceService';
import { useAuthStore } from '../../src/store/authStore';
import { THEME } from '../../src/constants/theme';
import { EnhancedProposalCard } from '../../src/components/EnhancedProposalCard';

export default function GovernanceTabScreen() {
  const { user } = useAuthStore();
  const [activeProposals, setActiveProposals] = useState<Proposal[]>([]);
  const [userVotingPower, setUserVotingPower] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const proposals = await governanceService.getActiveProposals();
      setActiveProposals(proposals.slice(0, 3));

      // Get user voting power from API
      if (user?.walletAddress) {
        const votingPower = await governanceService.getUserVotingPower();
        setUserVotingPower(votingPower);
      }
    } catch (error) {
      console.error('Error loading governance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Governance</Text>
        <TouchableOpacity onPress={() => router.push('/governance/index')}>
          <Ionicons name="arrow-forward" size={24} color={THEME.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Voting Power Card */}
        <View style={styles.votingPowerCard}>
          <View style={styles.votingPowerHeader}>
            <Ionicons name="bar-chart" size={24} color={THEME.colors.primary} />
            <Text style={styles.votingPowerTitle}>Your Voting Power</Text>
          </View>
          <Text style={styles.votingPowerValue}>{userVotingPower.toLocaleString()}</Text>
          <Text style={styles.votingPowerLabel}>LDAO tokens</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/governance/index')}
          >
            <Ionicons name="list" size={28} color={THEME.colors.primary} />
            <Text style={styles.actionTitle}>Proposals</Text>
            <Text style={styles.actionDescription}>View all proposals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/governance/delegation')}
          >
            <Ionicons name="people" size={28} color={THEME.colors.secondary} />
            <Text style={styles.actionTitle}>Delegate</Text>
            <Text style={styles.actionDescription}>Delegate votes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/modal/create-proposal')}
          >
            <Ionicons name="create" size={28} color={THEME.colors.success} />
            <Text style={styles.actionTitle}>Create</Text>
            <Text style={styles.actionDescription}>New proposal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/governance/index#analytics')}
          >
            <Ionicons name="stats-chart" size={28} color={THEME.colors.info} />
            <Text style={styles.actionTitle}>Analytics</Text>
            <Text style={styles.actionDescription}>View insights</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/staking/index')}
          >
            <Ionicons name="wallet" size={28} color={THEME.colors.warning} />
            <Text style={styles.actionTitle}>Stake</Text>
            <Text style={styles.actionDescription}>Earn rewards</Text>
          </TouchableOpacity>
        </View>

        {/* Active Proposals */}
        <Text style={styles.sectionTitle}>Active Proposals</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
          </View>
        ) : activeProposals.length > 0 ? (
          activeProposals.map((proposal) => (
            <EnhancedProposalCard
              key={proposal.id}
              proposal={proposal}
              onPress={() => router.push(`/governance/proposal/${proposal.id}`)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text" size={48} color={THEME.colors.gray} />
            <Text style={styles.emptyText}>No active proposals</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/modal/create-proposal')}
            >
              <Text style={styles.createButtonText}>Create Proposal</Text>
            </TouchableOpacity>
          </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  votingPowerCard: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  votingPowerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  votingPowerTitle: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.white,
  },
  votingPowerValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: THEME.colors.white,
  },
  votingPowerLabel: {
    fontSize: 14,
    color: THEME.colors.white + 'CC',
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
    marginTop: 8,
  },
  actionDescription: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  proposalCard: {
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
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  proposalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.success,
  },
  proposalTime: {
    fontSize: 12,
    color: THEME.colors.gray,
  },
  proposalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 12,
    lineHeight: 22,
  },
  proposalVoting: {
    marginTop: 8,
  },
  votingBar: {
    height: 6,
    backgroundColor: THEME.colors.gray + '20',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  votingProgress: {
    height: '100%',
    backgroundColor: THEME.colors.success,
    borderRadius: 3,
  },
  votingText: {
    fontSize: 12,
    color: THEME.colors.gray,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: THEME.colors.gray,
    marginTop: 12,
  },
  createButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.white,
  },
});