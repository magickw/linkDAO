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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { governanceService, Proposal, CharityProposal, CharityProposalData } from '../../src/services/governanceService';
import { useAuthStore } from '../../src/store/authStore';
import { THEME } from '../../src/constants/theme';
import { EnhancedProposalCard } from '../../src/components/EnhancedProposalCard';

type TabType = 'active' | 'ended' | 'create' | 'delegation' | 'charity';

export default function GovernancePage() {
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [charityProposals, setCharityProposals] = useState<CharityProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [votingPower, setVotingPower] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [charityView, setCharityView] = useState<'list' | 'create'>('list');
  const [isSubmittingCharity, setIsSubmittingCharity] = useState(false);
  const [charityForm, setCharityForm] = useState<CharityProposalData>({
    title: '',
    description: '',
    charityName: '',
    charityAddress: '',
    donationAmount: '',
    charityDescription: '',
    proofOfVerification: '',
    impactMetrics: '',
  });

  // Load proposals
  const loadProposals = useCallback(async () => {
    try {
      setLoading(true);
      let data: Proposal[] = [];

      if (searchTerm && (activeTab === 'active' || activeTab === 'ended')) {
        // Use search API when search term is provided
        data = await governanceService.searchProposals(searchTerm);
        // Filter by status
        if (activeTab === 'active') {
          data = data.filter(p => p.status === 'active');
        } else if (activeTab === 'ended') {
          data = data.filter(p => p.status === 'executed' || p.status === 'failed' || p.status === 'expired');
        }
      } else if (activeTab === 'active') {
        data = await governanceService.getActiveProposals();
      } else if (activeTab === 'ended') {
        data = await governanceService.getAllProposals('executed');
      } else if (activeTab === 'create' || activeTab === 'delegation' || activeTab === 'charity') {
        // These tabs don't load proposals
        data = [];
      } else {
        data = await governanceService.getAllProposals();
      }

      setProposals(data);
    } catch (error) {
      console.error('Error loading proposals:', error);
      Alert.alert('Error', 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm]);

  // Handle charity proposal creation
  const handleCreateCharityProposal = async () => {
    if (!user?.walletAddress) {
      Alert.alert('Error', 'Please connect your wallet');
      return;
    }

    if (!charityForm.title || !charityForm.description || !charityForm.charityName || !charityForm.charityAddress) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSubmittingCharity(true);
      
      // Create mock charity proposal
      const mockProposal: CharityProposal = {
        id: `charity-${Date.now()}`,
        title: charityForm.title,
        description: charityForm.description,
        charityName: charityForm.charityName,
        charityRecipient: charityForm.charityAddress,
        donationAmount: charityForm.donationAmount,
        charityDescription: charityForm.charityDescription,
        proofOfVerification: charityForm.proofOfVerification,
        impactMetrics: charityForm.impactMetrics,
        isVerifiedCharity: false,
        forVotes: '0',
        againstVotes: '0',
        abstainVotes: '0',
        status: 'active',
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        proposer: user.walletAddress,
      };

      setCharityProposals(prev => [mockProposal, ...prev]);
      Alert.alert('Success', 'Charity proposal created successfully!');
      setCharityView('list');
      
      // Reset form
      setCharityForm({
        title: '',
        description: '',
        charityName: '',
        charityAddress: '',
        donationAmount: '',
        charityDescription: '',
        proofOfVerification: '',
        impactMetrics: '',
      });
    } catch (error) {
      console.error('Error creating charity proposal:', error);
      Alert.alert('Error', 'Failed to create charity proposal');
    } finally {
      setIsSubmittingCharity(false);
    }
  };

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
    return (
      <EnhancedProposalCard
        key={proposal.id}
        proposal={proposal}
        onPress={() => router.push(`/governance/proposal/${proposal.id}`)}
      />
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

  const renderCharityProposalCard = (proposal: CharityProposal) => {
    const totalVotes = parseFloat(proposal.forVotes) + parseFloat(proposal.againstVotes) + parseFloat(proposal.abstainVotes);
    const forPercentage = totalVotes > 0 ? (parseFloat(proposal.forVotes) / totalVotes) * 100 : 0;
    const againstPercentage = totalVotes > 0 ? (parseFloat(proposal.againstVotes) / totalVotes) * 100 : 0;

    return (
      <TouchableOpacity
        key={proposal.id}
        style={styles.proposalCard}
        onPress={() => router.push(`/governance/proposal/${proposal.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.proposalHeader}>
          <View style={styles.proposalTitleContainer}>
            <Ionicons name="heart-outline" size={20} color={THEME.colors.success} style={styles.categoryIcon} />
            <Text style={styles.proposalTitle} numberOfLines={2}>
              {proposal.title}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: THEME.colors.success + '20' }]}>
            <Text style={[styles.statusText, { color: THEME.colors.success }]}>CHARITY</Text>
          </View>
        </View>

        <Text style={styles.proposalDescription} numberOfLines={2}>
          {proposal.description}
        </Text>

        <View style={styles.proposalMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={16} color={THEME.colors.gray} />
            <Text style={styles.metaText}>{proposal.charityName}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={16} color={THEME.colors.gray} />
            <Text style={styles.metaText}>{proposal.donationAmount} tokens</Text>
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
              <Text style={styles.voteCountText}>{proposal.forVotes}</Text>
            </View>
            <View style={styles.voteCount}>
              <Ionicons name="close-circle" size={14} color={THEME.colors.error} />
              <Text style={styles.voteCountText}>{proposal.againstVotes}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
          {renderTabButton('charity', 'Charity', 'heart-outline')}
          {renderTabButton('create', 'Create', 'add-circle-outline')}
          {renderTabButton('delegation', 'Delegate', 'swap-horizontal-outline')}
        </View>

        {/* Search Bar */}
        {(activeTab === 'active' || activeTab === 'ended') && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={THEME.colors.gray} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search proposals..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={THEME.colors.gray}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={20} color={THEME.colors.gray} />
              </TouchableOpacity>
            )}
          </View>
        )}

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

        {activeTab === 'charity' && (
          <View style={styles.charitySection}>
            {charityView === 'list' ? (
              <>
                <View style={styles.charityHeader}>
                  <Text style={styles.sectionTitle}>Charity Proposals</Text>
                  <TouchableOpacity
                    style={styles.createCharityButton}
                    onPress={() => setCharityView('create')}
                  >
                    <Ionicons name="add" size={20} color={THEME.colors.white} />
                    <Text style={styles.createCharityButtonText}>Create</Text>
                  </TouchableOpacity>
                </View>
                {charityProposals.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="heart-outline" size={64} color={THEME.colors.gray} />
                    <Text style={styles.emptyText}>No charity proposals yet</Text>
                  </View>
                ) : (
                  charityProposals.map(renderCharityProposalCard)
                )}
              </>
            ) : (
              <View style={styles.charityFormContainer}>
                <Text style={styles.sectionTitle}>Create Charity Proposal</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Title *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Proposal title"
                    value={charityForm.title}
                    onChangeText={(text) => setCharityForm({ ...charityForm, title: text })}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe your charity proposal"
                    value={charityForm.description}
                    onChangeText={(text) => setCharityForm({ ...charityForm, description: text })}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Charity Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Name of the charity organization"
                    value={charityForm.charityName}
                    onChangeText={(text) => setCharityForm({ ...charityForm, charityName: text })}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Charity Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0x..."
                    value={charityForm.charityAddress}
                    onChangeText={(text) => setCharityForm({ ...charityForm, charityAddress: text })}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Donation Amount *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Amount of tokens to donate"
                    value={charityForm.donationAmount}
                    onChangeText={(text) => setCharityForm({ ...charityForm, donationAmount: text })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Charity Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe the charity organization"
                    value={charityForm.charityDescription}
                    onChangeText={(text) => setCharityForm({ ...charityForm, charityDescription: text })}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Impact Metrics</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe the expected impact"
                    value={charityForm.impactMetrics}
                    onChangeText={(text) => setCharityForm({ ...charityForm, impactMetrics: text })}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Proof of Verification</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="URL or reference to verification proof"
                    value={charityForm.proofOfVerification}
                    onChangeText={(text) => setCharityForm({ ...charityForm, proofOfVerification: text })}
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.formButtons}>
                  <TouchableOpacity
                    style={[styles.formButton, styles.cancelButton]}
                    onPress={() => {
                      setCharityView('list');
                      setCharityForm({
                        title: '',
                        description: '',
                        charityName: '',
                        charityAddress: '',
                        donationAmount: '',
                        charityDescription: '',
                        proofOfVerification: '',
                        impactMetrics: '',
                      });
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.formButton, styles.submitButton]}
                    onPress={handleCreateCharityProposal}
                    disabled={isSubmittingCharity}
                  >
                    {isSubmittingCharity ? (
                      <ActivityIndicator size="small" color={THEME.colors.white} />
                    ) : (
                      <Text style={styles.submitButtonText}>Submit Proposal</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.colors.text,
  },
  charitySection: {
    padding: 16,
  },
  charityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  createCharityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createCharityButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.white,
  },
  charityFormContainer: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
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
    backgroundColor: THEME.colors.background,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  formButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: THEME.colors.gray + '20',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  submitButton: {
    backgroundColor: THEME.colors.success,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.white,
  },
});