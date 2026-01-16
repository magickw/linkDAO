/**
 * Governance Page
 * Main governance interface showing active proposals and voting options
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { governanceService, Proposal } from '../../src/services/governanceService';
import { useAuthStore } from '../../src/store/authStore';
import { THEME } from '../../src/constants/theme';

type TabType = 'active' | 'ended' | 'create' | 'delegation';

export default function GovernancePage() {
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [votingPower, setVotingPower] = useState(0);

  // Load proposals
  const loadProposals = useCallback(async () => {
    try {
      setLoading(true);
      let data: Proposal[] = [];

      if (activeTab === 'active') {
        data = await governanceService.getActiveProposals();
      } else {
        data = await governanceService.getAllProposals(activeTab === 'ended' ? 'executed' : undefined);
      }

      setProposals(data);
    } catch (error) {
      console.error('Error loading proposals:', error);
      Alert.alert('Error', 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Load voting power
  const loadVotingPower = useCallback(async () => {
    try {
      const power = await governanceService.getUserVotingPower();
      setVotingPower(power);
    } catch (error) {
      console.error('Error loading voting power:', error);
    }
  }, []);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProposals(), loadVotingPower()]);
    setRefreshing(false);
  }, [loadProposals, loadVotingPower]);

  useEffect(() => {
    loadProposals();
    loadVotingPower();
  }, [loadProposals, loadVotingPower]);

  const handleCreateProposal = () => {
    router.push('/modal/create-proposal');
  };

  const handleDelegation = () => {
    router.push('/governance/delegation');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return THEME.colors.success;
      case 'executed':
        return THEME.colors.primary;
      case 'rejected':
        return THEME.colors.error;
      case 'expired':
        return THEME.colors.gray;
      default:
        return THEME.colors.warning;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'treasury':
        return 'wallet-outline';
      case 'protocol':
        return 'settings-outline';
      case 'community':
        return 'people-outline';
      case 'charity':
        return 'heart-outline';
      default:
        return 'document-text-outline';
    }
  };

  const renderProposalCard = (proposal: Proposal) => {
    const totalVotes = proposal.votingPower.for + proposal.votingPower.against + proposal.votingPower.abstain;
    const forPercentage = totalVotes > 0 ? (proposal.votingPower.for / totalVotes) * 100 : 0;
    const againstPercentage = totalVotes > 0 ? (proposal.votingPower.against / totalVotes) * 100 : 0;

    return (
      <TouchableOpacity
        key={proposal.id}
        style={styles.proposalCard}
        onPress={() => router.push(`/governance/proposal/${proposal.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.proposalHeader}>
          <View style={styles.proposalTitleContainer}>
            <Ionicons
              name={getCategoryIcon(proposal.category) as any}
              size={20}
              color={THEME.colors.primary}
              style={styles.categoryIcon}
            />
            <Text style={styles.proposalTitle} numberOfLines={2}>
              {proposal.title}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(proposal.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(proposal.status) }]}>
              {proposal.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.proposalDescription} numberOfLines={3}>
          {proposal.description}
        </Text>

        <View style={styles.proposalMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={16} color={THEME.colors.gray} />
            <Text style={styles.metaText}>{proposal.proposer.slice(0, 8)}...</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={THEME.colors.gray} />
            <Text style={styles.metaText}>
              {new Date(proposal.endTime).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.votingProgress}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${forPercentage}%`, backgroundColor: THEME.colors.success }]} />
            <View style={[styles.progressFill, { width: `${againstPercentage}%`, backgroundColor: THEME.colors.error }]} />
          </View>
          <View style={styles.voteCounts}>
            <View style={styles.voteCount}>
              <Ionicons name="checkmark-circle" size={14} color={THEME.colors.success} />
              <Text style={styles.voteCountText}>{proposal.votingPower.for.toLocaleString()}</Text>
            </View>
            <View style={styles.voteCount}>
              <Ionicons name="close-circle" size={14} color={THEME.colors.error} />
              <Text style={styles.voteCountText}>{proposal.votingPower.against.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabButton = (tab: TabType, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={activeTab === tab ? THEME.colors.primary : THEME.colors.gray}
      />
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Governance</Text>
        <View style={styles.votingPowerBadge}>
          <Ionicons name="bar-chart" size={16} color={THEME.colors.primary} />
          <Text style={styles.votingPowerText}>{votingPower.toLocaleString()} Votes</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.tabsContainer}>
          {renderTabButton('active', 'Active', 'list-outline')}
          {renderTabButton('ended', 'Ended', 'checkmark-done-outline')}
          {renderTabButton('create', 'Create', 'add-circle-outline')}
          {renderTabButton('delegation', 'Delegate', 'swap-horizontal-outline')}
        </View>

        {activeTab === 'create' && (
          <View style={styles.createSection}>
            <Text style={styles.sectionTitle}>Create Proposal</Text>
            <Text style={styles.sectionDescription}>
              Submit a new governance proposal for the community to vote on.
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateProposal}>
              <Ionicons name="add" size={24} color={THEME.colors.white} />
              <Text style={styles.createButtonText}>Create Proposal</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'delegation' && (
          <View style={styles.delegationSection}>
            <Text style={styles.sectionTitle}>Delegate Voting Power</Text>
            <Text style={styles.sectionDescription}>
              Delegate your voting power to a trusted representative.
            </Text>
            <TouchableOpacity style={styles.delegateButton} onPress={handleDelegation}>
              <Ionicons name="swap-horizontal" size={24} color={THEME.colors.white} />
              <Text style={styles.delegateButtonText}>Manage Delegation</Text>
            </TouchableOpacity>
          </View>
        )}

        {(activeTab === 'active' || activeTab === 'ended') && (
          <View style={styles.proposalsContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.colors.primary} />
                <Text style={styles.loadingText}>Loading proposals...</Text>
              </View>
            ) : proposals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={64} color={THEME.colors.gray} />
                <Text style={styles.emptyText}>No proposals found</Text>
              </View>
            ) : (
              proposals.map(renderProposalCard)
            )}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  votingPowerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  votingPowerText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  content: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: THEME.colors.primary + '10',
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    color: THEME.colors.gray,
  },
  activeTabText: {
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  createSection: {
    padding: 16,
  },
  delegationSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: THEME.colors.gray,
    marginBottom: 16,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  createButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.white,
  },
  delegateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  delegateButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.white,
  },
  proposalsContainer: {
    padding: 16,
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  proposalTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIcon: {
    marginRight: 8,
  },
  proposalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  proposalDescription: {
    fontSize: 14,
    color: THEME.colors.gray,
    lineHeight: 20,
    marginBottom: 12,
  },
  proposalMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    marginLeft: 4,
    fontSize: 12,
    color: THEME.colors.gray,
  },
  votingProgress: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: THEME.colors.gray + '20',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressFill: {
    height: '100%',
  },
  voteCounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  voteCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteCountText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: THEME.colors.gray,
  },
});