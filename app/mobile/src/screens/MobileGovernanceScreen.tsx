// @ts-ignore
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import MobileGovernance from '../components/governance/MobileGovernance';
import MobileGovernanceService from '../services/mobileGovernanceService';
import { Proposal } from '../types';

export default function MobileGovernanceScreen() {
  const [proposals, setProposals] = useState<Proposal[]>([
    {
      id: '1',
      communityId: 'dao-1',
      title: "Increase Community Fund Allocation",
      description: "Proposal to increase the community fund allocation from 10% to 15% of treasury funds for expanded community initiatives.",
      proposerId: 'user-1',
      status: 'active',
      voteCount: {
        yes: 1245,
        no: 321,
        abstain: 45
      },
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdAt: new Date(),
      updatedAt: new Date(),
      proposalType: 'spending'
    },
    {
      id: '2',
      communityId: 'dao-1',
      title: "New Partnership with DeFi Project",
      description: "Proposal to establish a strategic partnership with a leading DeFi project to integrate their services into our platform.",
      proposerId: 'user-2',
      status: 'passed',
      voteCount: {
        yes: 2156,
        no: 432,
        abstain: 67
      },
      endTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Ended yesterday
      createdAt: new Date(),
      updatedAt: new Date(),
      proposalType: 'parameter'
    }
  ]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    totalSessions: 0,
    totalActions: 0,
    averageActionsPerSession: 0,
    biometricUsageRate: 0
  });

  useEffect(() => {
    initializeGovernance();
  }, []);

  const initializeGovernance = async () => {
    try {
      // Load proposals from API
      await loadProposals();
      
      // Load session stats
      await loadSessionStats();
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing governance:', error);
      setIsLoading(false);
    }
  };

  const loadProposals = async () => {
    try {
      // In a real app, this would fetch from your backend API
      // const response = await fetch('/api/governance/proposals');
      // const data = await response.json();
      // setProposals(data);
    } catch (error) {
      console.error('Error loading proposals:', error);
    }
  };

  const loadSessionStats = async () => {
    try {
      const stats = await MobileGovernanceService.getSessionStats();
      setSessionStats(stats);
    } catch (error) {
      console.error('Error loading session stats:', error);
    }
  };

  const handleVote = async (proposalId: string, vote: 'yes' | 'no' | 'abstain') => {
    try {
      // Start session if not already active
      if (!sessionActive) {
        const started = await MobileGovernanceService.startSession('user-address'); // Would come from auth context
        if (!started) {
          Alert.alert('Authentication Required', 'Please authenticate to vote on proposals');
          return;
        }
        setSessionActive(true);
      }
      
      // Record the action
      await MobileGovernanceService.recordAction({
        type: 'vote',
        proposalId,
      });
      
      // In a real app, this would send the vote to your backend API
      // const response = await fetch(`/api/governance/proposals/${proposalId}/vote`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ vote }),
      // });
      
      // Update local state
      setProposals(prev => prev.map(proposal => {
        if (proposal.id === proposalId) {
          const updatedVoteCount = { ...proposal.voteCount };
          if (vote === 'yes') updatedVoteCount.yes += 1;
          if (vote === 'no') updatedVoteCount.no += 1;
          if (vote === 'abstain') updatedVoteCount.abstain += 1;
          return { ...proposal, voteCount: updatedVoteCount };
        }
        return proposal;
      }));
      
      // Update session stats
      await loadSessionStats();
      
      console.log(`Voted ${vote} on proposal ${proposalId}`);
    } catch (error) {
      console.error('Error voting on proposal:', error);
    }
  };

  const handleCreateProposal = async () => {
    try {
      // Start session if not already active
      if (!sessionActive) {
        const started = await MobileGovernanceService.startSession('user-address'); // Would come from auth context
        if (!started) {
          Alert.alert('Authentication Required', 'Please authenticate to create proposals');
          return;
        }
        setSessionActive(true);
      }
      
      // Record the action
      await MobileGovernanceService.recordAction({
        type: 'create',
      });
      
      // Navigate to create proposal screen or show modal
      console.log('Create proposal pressed');
      
      // Update session stats
      await loadSessionStats();
    } catch (error) {
      console.error('Error creating proposal:', error);
    }
  };

  const handleViewProposal = async (proposalId: string) => {
    try {
      // Start session if not already active
      if (!sessionActive) {
        const started = await MobileGovernanceService.startSession('user-address'); // Would come from auth context
        if (!started) {
          // Don't show alert for view actions, just fail silently
          return;
        }
        setSessionActive(true);
      }
      
      // Record the action
      await MobileGovernanceService.recordAction({
        type: 'view',
        proposalId,
      });
      
      // Update session stats
      await loadSessionStats();
      
      console.log(`Viewed proposal ${proposalId}`);
    } catch (error) {
      console.error('Error viewing proposal:', error);
    }
  };

  const endSession = async () => {
    try {
      await MobileGovernanceService.endSession();
      setSessionActive(false);
      await loadSessionStats();
      Alert.alert('Session Ended', 'Governance session has been ended');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading governance data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mobile Governance</Text>
        {sessionActive && (
          <TouchableOpacity 
            style={styles.endSessionButton}
            onPress={endSession}
          >
            <Text style={styles.endSessionButtonText}>End Session</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{sessionStats.totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{sessionStats.totalActions}</Text>
            <Text style={styles.statLabel}>Actions</Text>
          </View>
        </View>
        
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{sessionStats.averageActionsPerSession.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg Actions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{(sessionStats.biometricUsageRate * 100).toFixed(0)}%</Text>
            <Text style={styles.statLabel}>Biometric</Text>
          </View>
        </View>
      </View>

      <MobileGovernance
        proposals={proposals}
        onVote={handleVote}
        onCreateProposal={handleCreateProposal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  endSessionButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  endSessionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
});