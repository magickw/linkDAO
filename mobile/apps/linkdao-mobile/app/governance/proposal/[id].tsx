/**
 * Governance Proposal Detail Page
 * Shows proposal details and allows voting
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { governanceService, Proposal, VotingMetrics, AIProposalAnalysis } from '../../../src/services/governanceService';
import { useAuthStore } from '../../../src/store/authStore';
import { THEME } from '../../../src/constants/theme';

export default function ProposalDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [votingMetrics, setVotingMetrics] = useState<VotingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIProposalAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Load proposal details
  const loadProposal = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [proposalData, metricsData] = await Promise.all([
        governanceService.getProposal(id),
        governanceService.getVotingMetrics(id),
      ]);

      setProposal(proposalData);
      setVotingMetrics(metricsData);
    } catch (error) {
      console.error('Error loading proposal:', error);
      Alert.alert('Error', 'Failed to load proposal details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProposal();
  }, [loadProposal]);

  const handleVote = async (support: boolean) => {
    if (!proposal || !user) {
      Alert.alert('Error', 'Please connect your wallet to vote');
      return;
    }

    if (proposal.status !== 'active') {
      Alert.alert('Error', 'This proposal is not active for voting');
      return;
    }

    if (votingMetrics?.hasVoted) {
      Alert.alert('Already Voted', 'You have already voted on this proposal');
      return;
    }

    Alert.alert(
      'Confirm Vote',
      `Are you sure you want to vote ${support ? 'FOR' : 'AGAINST'} this proposal?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Vote',
          style: 'default',
          onPress: async () => {
            try {
              setVoting(true);
              const result = await governanceService.vote(proposal.id, support);

              if (result.success) {
                Alert.alert('Success', 'Your vote has been recorded');
                await loadProposal(); // Reload to update metrics
              } else {
                Alert.alert('Error', result.error || 'Failed to vote');
              }
            } catch (error) {
              console.error('Error voting:', error);
              Alert.alert('Error', 'Failed to vote');
            } finally {
              setVoting(false);
            }
          },
        },
      ]
    );
  };

  const handleAnalyzeProposal = async () => {
    if (!proposal) return;

    try {
      setIsAnalyzing(true);
      Alert.alert('Analyzing', 'AI is analyzing this proposal...');
      
      const analysis = await governanceService.analyzeProposal(proposal);
      
      if (analysis) {
        setAiAnalysis(analysis);
        setShowAnalysis(true);
        Alert.alert('Analysis Complete', 'AI analysis has been generated');
      } else {
        Alert.alert('Error', 'Failed to analyze proposal');
      }
    } catch (error) {
      console.error('Error analyzing proposal:', error);
      Alert.alert('Error', 'Failed to analyze proposal');
    } finally {
      setIsAnalyzing(false);
    }
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading proposal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!proposal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={THEME.colors.error} />
          <Text style={styles.errorText}>Proposal not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalVotes = proposal.votingPower.for + proposal.votingPower.against + proposal.votingPower.abstain;
  const forPercentage = totalVotes > 0 ? (proposal.votingPower.for / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.votingPower.against / totalVotes) * 100 : 0;
  const abstainPercentage = totalVotes > 0 ? (proposal.votingPower.abstain / totalVotes) * 100 : 0;
  const isPassed = forPercentage >= proposal.requiredMajority && proposal.status === 'active';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={THEME.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Proposal Details</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Badge */}
        <View style={[styles.statusCard, { backgroundColor: getStatusColor(proposal.status) + '10' }]}>
          <View style={styles.statusHeader}>
            <Ionicons
              name={getCategoryIcon(proposal.category) as any}
              size={24}
              color={getStatusColor(proposal.status)}
            />
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(proposal.status) }]}>
              <Text style={styles.statusText}>{proposal.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.proposalTitle}>{proposal.title}</Text>
          
          {/* AI Analysis Button */}
          <TouchableOpacity
            style={[styles.aiButton, isAnalyzing && styles.aiButtonDisabled]}
            onPress={handleAnalyzeProposal}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <ActivityIndicator size="small" color={THEME.colors.primary} />
                <Text style={styles.aiButtonText}>Analyzing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color={THEME.colors.primary} />
                <Text style={styles.aiButtonText}>AI Analysis</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* AI Analysis Display */}
        {showAnalysis && aiAnalysis && (
          <View style={styles.aiAnalysisCard}>
            <View style={styles.aiAnalysisHeader}>
              <Ionicons name="sparkles" size={20} color={THEME.colors.primary} />
              <Text style={styles.aiAnalysisTitle}>AI Analysis</Text>
              <TouchableOpacity onPress={() => setShowAnalysis(false)}>
                <Ionicons name="close" size={20} color={THEME.colors.gray} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.aiAnalysisContent}>
              <View style={styles.aiAnalysisSection}>
                <Text style={styles.aiAnalysisLabel}>Recommendation</Text>
                <View style={[
                  styles.recommendationBadge,
                  {
                    backgroundColor: aiAnalysis.recommendation === 'APPROVE' ? THEME.colors.success + '20' :
                                   aiAnalysis.recommendation === 'REJECT' ? THEME.colors.error + '20' :
                                   THEME.colors.warning + '20'
                  }
                ]}>
                  <Text style={[
                    styles.recommendationText,
                    {
                      color: aiAnalysis.recommendation === 'APPROVE' ? THEME.colors.success :
                             aiAnalysis.recommendation === 'REJECT' ? THEME.colors.error :
                             THEME.colors.warning
                    }
                  ]}>
                    {aiAnalysis.recommendation}
                  </Text>
                </View>
              </View>

              <View style={styles.aiAnalysisSection}>
                <Text style={styles.aiAnalysisLabel}>Confidence</Text>
                <Text style={styles.aiAnalysisValue}>{aiAnalysis.confidence}%</Text>
              </View>

              <View style={styles.aiAnalysisSection}>
                <Text style={styles.aiAnalysisLabel}>Risk Level</Text>
                <Text style={[
                  styles.aiAnalysisValue,
                  {
                    color: aiAnalysis.riskLevel === 'low' ? THEME.colors.success :
                           aiAnalysis.riskLevel === 'medium' ? THEME.colors.warning :
                           THEME.colors.error
                  }
                ]}>
                  {aiAnalysis.riskLevel.toUpperCase()}
                </Text>
              </View>

              <View style={styles.aiAnalysisSection}>
                <Text style={styles.aiAnalysisLabel}>Analysis</Text>
                <Text style={styles.aiAnalysisText}>{aiAnalysis.analysis}</Text>
              </View>

              <View style={styles.aiAnalysisSection}>
                <Text style={styles.aiAnalysisLabel}>Potential Impact</Text>
                <Text style={styles.aiAnalysisText}>{aiAnalysis.potentialImpact}</Text>
              </View>

              {aiAnalysis.keyPoints.length > 0 && (
                <View style={styles.aiAnalysisSection}>
                  <Text style={styles.aiAnalysisLabel}>Key Points</Text>
                  {aiAnalysis.keyPoints.map((point, index) => (
                    <View key={index} style={styles.keyPointItem}>
                      <Ionicons name="checkmark-circle" size={16} color={THEME.colors.primary} />
                      <Text style={styles.keyPointText}>{point}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Voting Progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Voting Progress</Text>

          <View style={styles.voteBars}>
            <View style={styles.voteBarContainer}>
              <View style={styles.voteBarHeader}>
                <Text style={styles.voteBarLabel}>FOR</Text>
                <Text style={styles.voteBarValue}>{forPercentage.toFixed(1)}%</Text>
              </View>
              <View style={styles.voteBar}>
                <View style={[styles.voteBarFill, { width: `${forPercentage}%`, backgroundColor: THEME.colors.success }]} />
              </View>
              <Text style={styles.voteCount}>{proposal.votingPower.for.toLocaleString()} votes</Text>
            </View>

            <View style={styles.voteBarContainer}>
              <View style={styles.voteBarHeader}>
                <Text style={styles.voteBarLabel}>AGAINST</Text>
                <Text style={styles.voteBarValue}>{againstPercentage.toFixed(1)}%</Text>
              </View>
              <View style={styles.voteBar}>
                <View style={[styles.voteBarFill, { width: `${againstPercentage}%`, backgroundColor: THEME.colors.error }]} />
              </View>
              <Text style={styles.voteCount}>{proposal.votingPower.against.toLocaleString()} votes</Text>
            </View>

            <View style={styles.voteBarContainer}>
              <View style={styles.voteBarHeader}>
                <Text style={styles.voteBarLabel}>ABSTAIN</Text>
                <Text style={styles.voteBarValue}>{abstainPercentage.toFixed(1)}%</Text>
              </View>
              <View style={styles.voteBar}>
                <View style={[styles.voteBarFill, { width: `${abstainPercentage}%`, backgroundColor: THEME.colors.gray }]} />
              </View>
              <Text style={styles.voteCount}>{proposal.votingPower.abstain.toLocaleString()} votes</Text>
            </View>
          </View>

          {votingMetrics && (
            <View style={styles.metricsContainer}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Votes</Text>
                <Text style={styles.metricValue}>{totalVotes.toLocaleString()}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Participation</Text>
                <Text style={styles.metricValue}>{votingMetrics.participationRate.toFixed(1)}%</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Required</Text>
                <Text style={styles.metricValue}>{proposal.requiredMajority}%</Text>
              </View>
            </View>
          )}
        </View>

        {/* Proposal Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Proposal Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Proposer</Text>
            <Text style={styles.detailValue}>{proposal.proposer}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{proposal.category.toUpperCase()}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>{new Date(proposal.createdAt).toLocaleDateString()}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ends</Text>
            <Text style={styles.detailValue}>{new Date(proposal.endTime).toLocaleDateString()}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{Math.floor(proposal.votingDuration / (24 * 60 * 60 * 1000))} days</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description</Text>
          <Text style={styles.description}>{proposal.description}</Text>
        </View>

        {/* Voting Actions */}
        {proposal.status === 'active' && (
          <View style={styles.votingCard}>
            <Text style={styles.votingTitle}>Cast Your Vote</Text>

            {votingMetrics?.hasVoted ? (
              <View style={styles.votedContainer}>
                <Ionicons name="checkmark-circle" size={48} color={THEME.colors.success} />
                <Text style={styles.votedText}>You have already voted</Text>
              </View>
            ) : (
              <View style={styles.voteButtonsContainer}>
                <TouchableOpacity
                  style={[styles.voteButton, styles.voteForButton]}
                  onPress={() => handleVote(true)}
                  disabled={voting}
                >
                  <Ionicons name="checkmark-circle" size={24} color={THEME.colors.white} />
                  <Text style={styles.voteButtonText}>VOTE FOR</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.voteButton, styles.voteAgainstButton]}
                  onPress={() => handleVote(false)}
                  disabled={voting}
                >
                  <Ionicons name="close-circle" size={24} color={THEME.colors.white} />
                  <Text style={styles.voteButtonText}>VOTE AGAINST</Text>
                </TouchableOpacity>
              </View>
            )}

            {voting && (
              <View style={styles.votingOverlay}>
                <ActivityIndicator size="large" color={THEME.colors.primary} />
                <Text style={styles.votingText}>Submitting vote...</Text>
              </View>
            )}
          </View>
        )}

        {proposal.status !== 'active' && (
          <View style={[styles.statusMessage, { backgroundColor: isPassed ? THEME.colors.success + '10' : THEME.colors.error + '10' }]}>
            <Ionicons
              name={isPassed ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={isPassed ? THEME.colors.success : THEME.colors.error}
            />
            <Text style={[styles.statusMessageText, { color: isPassed ? THEME.colors.success : THEME.colors.error }]}>
              {proposal.status === 'executed' ? 'This proposal has been executed' :
               proposal.status === 'rejected' ? 'This proposal was rejected' :
               'This proposal has expired'}
            </Text>
          </View>
        )}
      </ScrollView>
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
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.colors.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: THEME.colors.error,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: THEME.colors.white,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: THEME.colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  proposalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.text.primary,
    lineHeight: 28,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary + '10',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  aiAnalysisCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: THEME.colors.primary + '20',
  },
  aiAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiAnalysisTitle: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  aiAnalysisContent: {},
  aiAnalysisSection: {
    marginBottom: 12,
  },
  aiAnalysisLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.gray,
    marginBottom: 6,
  },
  aiAnalysisValue: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  aiAnalysisText: {
    fontSize: 14,
    color: THEME.colors.text.primary,
    lineHeight: 20,
  },
  recommendationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  recommendationText: {
    fontSize: 14,
    fontWeight: '700',
  },
  keyPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  keyPointText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: THEME.colors.text.primary,
    lineHeight: 20,
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
    color: THEME.colors.text.primary,
    marginBottom: 12,
  },
  voteBars: {
    marginBottom: 16,
  },
  voteBarContainer: {
    marginBottom: 16,
  },
  voteBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  voteBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  voteBarValue: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  voteBar: {
    height: 24,
    backgroundColor: THEME.colors.gray + '20',
    borderRadius: 4,
    overflow: 'hidden',
  },
  voteBarFill: {
    height: '100%',
  },
  voteCount: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginTop: 4,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: THEME.colors.gray,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  description: {
    fontSize: 14,
    color: THEME.colors.text.primary,
    lineHeight: 22,
  },
  votingCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  votingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  voteButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  voteForButton: {
    backgroundColor: THEME.colors.success,
  },
  voteAgainstButton: {
    backgroundColor: THEME.colors.error,
  },
  voteButtonText: {
    marginLeft: 8,
    color: THEME.colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  votedContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  votedText: {
    marginTop: 12,
    fontSize: 16,
    color: THEME.colors.success,
    fontWeight: '600',
  },
  votingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  votingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.colors.gray,
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusMessageText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
});