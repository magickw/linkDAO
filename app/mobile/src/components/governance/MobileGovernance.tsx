import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Proposal, Vote } from '../../types';

interface MobileGovernanceProps {
  proposals: Proposal[];
  onVote: (proposalId: string, vote: 'yes' | 'no' | 'abstain') => void;
  onCreateProposal: () => void;
}

export default function MobileGovernance({ 
  proposals, 
  onVote, 
  onCreateProposal 
}: MobileGovernanceProps) {
  const [authenticated, setAuthenticated] = useState(false);

  const authenticateUser = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        Alert.alert('Authentication not available', 'Please set up biometric authentication on your device');
        return false;
      }
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access governance features',
        fallbackLabel: 'Use PIN',
      });
      
      if (result.success) {
        setAuthenticated(true);
        return true;
      } else {
        Alert.alert('Authentication failed', 'Unable to verify your identity');
        return false;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Authentication error', 'Failed to authenticate');
      return false;
    }
  };

  const handleVote = async (proposalId: string, vote: 'yes' | 'no' | 'abstain') => {
    if (!authenticated) {
      const success = await authenticateUser();
      if (!success) return;
    }
    
    onVote(proposalId, vote);
  };

  const handleCreateProposal = async () => {
    if (!authenticated) {
      const success = await authenticateUser();
      if (!success) return;
    }
    
    onCreateProposal();
  };

  const getProposalStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#3b82f6';
      case 'passed': return '#22c55e';
      case 'rejected': return '#ef4444';
      case 'executed': return '#8b5cf6';
      default: return '#999';
    }
  };

  const formatTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h left`;
    } else {
      return `${hours}h left`;
    }
  };

  const renderProposal = ({ item }: { item: Proposal }) => (
    <View style={styles.proposalCard}>
      <View style={styles.proposalHeader}>
        <Text style={styles.proposalTitle} numberOfLines={2}>{item.title}</Text>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: getProposalStatusColor(item.status) }
        ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.proposalDescription} numberOfLines={3}>
        {item.description}
      </Text>
      
      <View style={styles.proposalMeta}>
        <Text style={styles.metaText}>
          {formatTimeRemaining(item.endTime)}
        </Text>
        <Text style={styles.metaText}>
          {item.voteCount.yes + item.voteCount.no + item.voteCount.abstain} votes
        </Text>
      </View>
      
      {item.status === 'active' && (
        <View style={styles.voteButtons}>
          <TouchableOpacity 
            style={[styles.voteButton, styles.yesButton]}
            onPress={() => handleVote(item.id, 'yes')}
          >
            <Text style={styles.voteButtonText}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.voteButton, styles.noButton]}
            onPress={() => handleVote(item.id, 'no')}
          >
            <Text style={styles.voteButtonText}>No</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.voteButton, styles.abstainButton]}
            onPress={() => handleVote(item.id, 'abstain')}
          >
            <Text style={styles.voteButtonText}>Abstain</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Governance</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={handleCreateProposal}
        >
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>
      
      {!authenticated && (
        <View style={styles.authPrompt}>
          <Text style={styles.authText}>
            Biometric authentication required for governance actions
          </Text>
          <TouchableOpacity 
            style={styles.authButton}
            onPress={authenticateUser}
          >
            <Text style={styles.authButtonText}>Authenticate</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView style={styles.content}>
        {proposals.map(proposal => (
          <View key={proposal.id} style={styles.proposalWrapper}>
            {renderProposal({ item: proposal })}
          </View>
        ))}
        
        {proposals.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active proposals</Text>
            <Text style={styles.emptySubtext}>
              Check back later or create a new proposal
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  authPrompt: {
    backgroundColor: 'white',
    padding: 20,
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  authText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  authButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 10,
  },
  proposalWrapper: {
    marginBottom: 10,
  },
  proposalCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  proposalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  proposalDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 15,
  },
  proposalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  metaText: {
    fontSize: 14,
    color: '#999',
  },
  voteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  voteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  yesButton: {
    backgroundColor: '#22c55e',
  },
  noButton: {
    backgroundColor: '#ef4444',
  },
  abstainButton: {
    backgroundColor: '#94a3b8',
  },
  voteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});