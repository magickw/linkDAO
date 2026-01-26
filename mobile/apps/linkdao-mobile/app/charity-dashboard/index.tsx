/**
 * Charity Dashboard
 * Mobile-optimized dashboard for charity governance and donation management
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { enhancedAuthService } from '@linkdao/shared/services/enhancedAuthService';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface CharityProposal {
  id: string;
  title: string;
  description: string;
  charityAddress: string;
  amount: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  votesFor: number;
  votesAgainst: number;
  deadline: string;
  createdAt: string;
}

interface Charity {
  id: string;
  name: string;
  description: string;
  address: string;
  verified: boolean;
  totalDonations: string;
  donationCount: number;
  imageUrl?: string;
  category: string;
}

interface Donation {
  id: string;
  charityId: string;
  charityName: string;
  amount: string;
  timestamp: string;
  txHash: string;
  nftTokenId?: string;
}

type TabType = 'proposals' | 'charities' | 'donations';

export default function CharityDashboardScreen() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('proposals');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [proposals, setProposals] = useState<CharityProposal[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [showCreateProposalModal, setShowCreateProposalModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [selectedCharity, setSelectedCharity] = useState<Charity | null>(null);
  const [donationAmount, setDonationAmount] = useState('');

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
      const [proposalsRes, charitiesRes, donationsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/charity/proposals`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/charity/verified`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/charity/donations`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      const [proposalsData, charitiesData, donationsData] = await Promise.all([
        proposalsRes.json(),
        charitiesRes.json(),
        donationsRes.json(),
      ]);

      if (proposalsData.success) {
        setProposals(proposalsData.data || []);
      }
      if (charitiesData.success) {
        setCharities(charitiesData.data || []);
      }
      if (donationsData.success) {
        setDonations(donationsData.data || []);
      }
    } catch (error) {
      console.error('Failed to load charity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleVote = async (proposalId: string, support: boolean) => {
    try {
      const token = await enhancedAuthService.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/charity/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ support }),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', support ? 'Vote recorded successfully!' : 'Vote recorded successfully!');
        await loadData();
      } else {
        Alert.alert('Error', result.message || 'Failed to record vote');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to record vote');
    }
  };

  const handleDonate = async () => {
    if (!selectedCharity || !donationAmount) {
      Alert.alert('Error', 'Please enter a donation amount');
      return;
    }

    try {
      const token = await enhancedAuthService.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/charity/donate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          charityId: selectedCharity.id,
          amount: donationAmount,
        }),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Donation recorded successfully! You will receive a Proof of Donation NFT.');
        setShowDonateModal(false);
        setDonationAmount('');
        setSelectedCharity(null);
        await loadData();
      } else {
        Alert.alert('Error', result.message || 'Failed to record donation');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to record donation');
    }
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'completed': return '#3b82f6';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const renderTabButton = (tab: TabType, label: string, icon: string, count?: number) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons name={icon as any} size={20} color={activeTab === tab ? '#ffffff' : '#9ca3af'} />
      <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{label}</Text>
      {count !== undefined && (
        <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
          <Text style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderProposals = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Charity Proposals</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateProposalModal(true)}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Create Proposal</Text>
        </TouchableOpacity>
      </View>

      {proposals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No proposals yet</Text>
          <Text style={styles.emptySubtitle}>Create a proposal to start charity governance</Text>
        </View>
      ) : (
        <View style={styles.proposalsList}>
          {proposals.map((proposal) => (
            <View key={proposal.id} style={styles.proposalCard}>
              <View style={styles.proposalHeader}>
                <View style={styles.proposalStatusBadge} style={{ backgroundColor: getStatusColor(proposal.status) }}>
                  <Text style={styles.proposalStatusText}>{proposal.status}</Text>
                </View>
                <Text style={styles.proposalDate}>
                  {new Date(proposal.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <Text style={styles.proposalTitle}>{proposal.title}</Text>
              <Text style={styles.proposalDescription} numberOfLines={2}>{proposal.description}</Text>

              <View style={styles.proposalDetails}>
                <View style={styles.proposalDetail}>
                  <Ionicons name="wallet-outline" size={16} color="#8b5cf6" />
                  <Text style={styles.proposalDetailText}>{proposal.amount}</Text>
                </View>
                <View style={styles.proposalDetail}>
                  <Ionicons name="time-outline" size={16} color="#f59e0b" />
                  <Text style={styles.proposalDetailText}>
                    {new Date(proposal.deadline).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <View style={styles.proposalVotes}>
                <View style={styles.voteBar}>
                  <View
                    style={[
                      styles.voteBarFill,
                      {
                        width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%`,
                        backgroundColor: '#10b981',
                      },
                    ]}
                  />
                </View>
                <View style={styles.voteLabels}>
                  <Text style={styles.voteLabel}>✓ {proposal.votesFor}</Text>
                  <Text style={styles.voteLabel}>✗ {proposal.votesAgainst}</Text>
                </View>
              </View>

              {proposal.status === 'pending' && (
                <View style={styles.proposalActions}>
                  <TouchableOpacity
                    style={[styles.voteButton, styles.voteButtonFor]}
                    onPress={() => handleVote(proposal.id, true)}
                  >
                    <Text style={styles.voteButtonText}>Vote For</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.voteButton, styles.voteButtonAgainst]}
                    onPress={() => handleVote(proposal.id, false)}
                  >
                    <Text style={styles.voteButtonText}>Vote Against</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderCharities = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Verified Charities</Text>

      {charities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No verified charities yet</Text>
          <Text style={styles.emptySubtitle}>Charities will appear here once verified</Text>
        </View>
      ) : (
        <View style={styles.charitiesList}>
          {charities.map((charity) => (
            <View key={charity.id} style={styles.charityCard}>
              <View style={styles.charityHeader}>
                <View style={styles.charityLogo}>
                  <Text style={styles.charityLogoText}>{charity.name.charAt(0)}</Text>
                </View>
                <View style={styles.charityInfo}>
                  <Text style={styles.charityName}>{charity.name}</Text>
                  <Text style={styles.charityCategory}>{charity.category}</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>

              <Text style={styles.charityDescription} numberOfLines={2}>{charity.description}</Text>

              <View style={styles.charityStats}>
                <View style={styles.charityStat}>
                  <Ionicons name="cash-outline" size={16} color="#10b981" />
                  <Text style={styles.charityStatValue}>{charity.totalDonations}</Text>
                  <Text style={styles.charityStatLabel}>Donated</Text>
                </View>
                <View style={styles.charityStat}>
                  <Ionicons name="people-outline" size={16} color="#3b82f6" />
                  <Text style={styles.charityStatValue}>{charity.donationCount}</Text>
                  <Text style={styles.charityStatLabel}>Donors</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.donateButton}
                onPress={() => {
                  setSelectedCharity(charity);
                  setShowDonateModal(true);
                }}
              >
                <Ionicons name="gift-outline" size={18} color="#ffffff" />
                <Text style={styles.donateButtonText}>Donate</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderDonations = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Your Donations</Text>

      {donations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="gift-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No donations yet</Text>
          <Text style={styles.emptySubtitle}>Your donation history will appear here</Text>
        </View>
      ) : (
        <View style={styles.donationsList}>
          {donations.map((donation) => (
            <View key={donation.id} style={styles.donationCard}>
              <View style={styles.donationHeader}>
                <View style={styles.donationIcon}>
                  <Ionicons name="heart-outline" size={24} color="#10b981" />
                </View>
                <View style={styles.donationInfo}>
                  <Text style={styles.donationCharity}>{donation.charityName}</Text>
                  <Text style={styles.donationDate}>
                    {new Date(donation.timestamp).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.donationAmount}>{donation.amount}</Text>
              </View>

              {donation.nftTokenId && (
                <View style={styles.nftBadge}>
                  <Ionicons name="diamond-outline" size={14} color="#8b5cf6" />
                  <Text style={styles.nftBadgeText}>Proof of Donation NFT #{donation.nftTokenId}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading charity dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Charity Dashboard</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <ActivityIndicator refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="document-text-outline" size={24} color="#8b5cf6" />
            <Text style={styles.statValue}>{proposals.length}</Text>
            <Text style={styles.statLabel}>Proposals</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="heart-outline" size={24} color="#10b981" />
            <Text style={styles.statValue}>{charities.length}</Text>
            <Text style={styles.statLabel}>Charities</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="gift-outline" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>{donations.length}</Text>
            <Text style={styles.statLabel}>Donations</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {renderTabButton('proposals', 'Proposals', 'document-text-outline', proposals.length)}
          {renderTabButton('charities', 'Charities', 'heart-outline', charities.length)}
          {renderTabButton('donations', 'Donations', 'gift-outline', donations.length)}
        </View>

        {/* Tab Content */}
        {activeTab === 'proposals' && renderProposals()}
        {activeTab === 'charities' && renderCharities()}
        {activeTab === 'donations' && renderDonations()}
      </ScrollView>

      {/* Donate Modal */}
      <Modal
        visible={showDonateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDonateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Donate to {selectedCharity?.name}</Text>
              <TouchableOpacity onPress={() => setShowDonateModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Donation Amount (LDAO)</Text>
              <TextInput
                style={styles.modalInput}
                value={donationAmount}
                onChangeText={setDonationAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
              />

              <View style={styles.modalInfo}>
                <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                <Text style={styles.modalInfoText}>
                  You will receive a Proof of Donation NFT as confirmation
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowDonateModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleDonate}
              >
                <Text style={styles.modalButtonTextConfirm}>Donate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabBadgeTextActive: {
    color: '#ffffff',
  },
  tabContent: {
    padding: 16,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  proposalsList: {
    gap: 12,
  },
  proposalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  proposalStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proposalStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  proposalDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  proposalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  proposalDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  proposalDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  proposalDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proposalDetailText: {
    fontSize: 13,
    color: '#6b7280',
  },
  proposalVotes: {
    marginBottom: 12,
  },
  voteBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  voteBarFill: {
    height: '100%',
  },
  voteLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  voteLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  proposalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  voteButtonFor: {
    backgroundColor: '#10b981',
  },
  voteButtonAgainst: {
    backgroundColor: '#ef4444',
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  charitiesList: {
    gap: 12,
  },
  charityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  charityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  charityLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  charityLogoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  charityInfo: {
    flex: 1,
  },
  charityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  charityCategory: {
    fontSize: 12,
    color: '#6b7280',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#d1fae5',
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  charityDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  charityStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  charityStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  charityStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  charityStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  donateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  donationsList: {
    gap: 12,
  },
  donationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  donationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  donationInfo: {
    flex: 1,
  },
  donationCharity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  donationDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  donationAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  nftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  nftBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8b5cf6',
  },
  modalContainer: {
    flex: 1,
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
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  modalInfoText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
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
    backgroundColor: '#10b981',
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