/**
 * Enhanced Proposal Card Component
 * Displays proposal with enhanced UI including circular progress timer
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Proposal, AIProposalAnalysis } from '../services/governanceService';
import { THEME } from '../constants/theme';

interface EnhancedProposalCardProps {
  proposal: Proposal;
  analysis?: AIProposalAnalysis;
  userVote?: 'For' | 'Against' | 'Abstain';
  onPress?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const EnhancedProposalCard: React.FC<EnhancedProposalCardProps> = ({
  proposal,
  analysis,
  userVote,
  onPress,
}) => {
  const totalVotes = parseFloat(proposal.forVotes) + parseFloat(proposal.againstVotes) + parseFloat(proposal.abstainVotes || '0');
  const forPercentage = totalVotes > 0 ? (parseFloat(proposal.forVotes) / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (parseFloat(proposal.againstVotes) / totalVotes) * 100 : 0;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return THEME.colors.success;
      case 'executed':
      case 'succeeded':
      case 'passed':
        return THEME.colors.primary;
      case 'failed':
      case 'rejected':
        return THEME.colors.error;
      case 'expired':
      case 'cancelled':
        return THEME.colors.gray;
      default:
        return THEME.colors.warning;
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'treasury':
      case 'funding':
        return 'wallet-outline';
      case 'protocol':
      case 'governance':
        return 'settings-outline';
      case 'community':
        return 'people-outline';
      case 'charity':
        return 'heart-outline';
      case 'technical':
        return 'code-outline';
      default:
        return 'document-text-outline';
    }
  };

  const getTimeRemaining = () => {
    const now = Date.now();
    const endTime = new Date(proposal.endTime).getTime();
    const remaining = endTime - now;

    if (remaining <= 0) return 'Ended';

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return '1h';
  };

  const isActive = proposal.status === 'active';
  const statusColor = getStatusColor(proposal.status);
  const timeRemaining = getTimeRemaining();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Status Bar */}
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {proposal.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.proposalId}>#{proposal.id.slice(0, 8)}</Text>
            {userVote && (
              <View style={[
                styles.userVoteBadge,
                {
                  backgroundColor: userVote === 'For' ? THEME.colors.success + '10' :
                                  userVote === 'Against' ? THEME.colors.error + '10' :
                                  THEME.colors.gray + '10',
                  borderColor: userVote === 'For' ? THEME.colors.success :
                                userVote === 'Against' ? THEME.colors.error :
                                THEME.colors.gray,
                }
              ]}>
                <Text style={[
                  styles.userVoteText,
                  {
                    color: userVote === 'For' ? THEME.colors.success :
                          userVote === 'Against' ? THEME.colors.error :
                          THEME.colors.gray,
                  }
                ]}>
                  You: {userVote}
                </Text>
              </View>
            )}
          </View>

          {/* Timer for active proposals */}
          {isActive && (
            <View style={styles.timerContainer}>
              <CircularProgressTimer
                endTime={new Date(proposal.endTime)}
                size={60}
                strokeWidth={4}
                color={statusColor}
              />
            </View>
          )}
        </View>

        <View style={styles.titleRow}>
          <Ionicons
            name={getCategoryIcon(proposal.category) as any}
            size={20}
            color={THEME.colors.primary}
            style={styles.categoryIcon}
          />
          <Text style={styles.title} numberOfLines={2}>
            {proposal.title}
          </Text>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {proposal.description}
        </Text>

        {/* Voting Stats */}
        <View style={styles.votingStats}>
          <View style={styles.votingInfo}>
            <Text style={styles.votesLabel}>Votes: {totalVotes.toLocaleString()}</Text>
            <View style={styles.votePercentages}>
              <Text style={[styles.votePercentage, { color: THEME.colors.success }]}>
                For: {forPercentage.toFixed(1)}%
              </Text>
              <Text style={[styles.votePercentage, { color: THEME.colors.error }]}>
                Against: {againstPercentage.toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${forPercentage}%`, backgroundColor: THEME.colors.success }]}
            />
            <View
              style={[styles.progressFill, { width: `${againstPercentage}%`, backgroundColor: THEME.colors.error }]}
            />
          </View>
        </View>

        {/* AI Analysis Summary */}
        {analysis && (
          <View style={styles.aiAnalysis}>
            <View style={styles.aiAnalysisRow}>
              <Ionicons name="sparkles" size={16} color={THEME.colors.primary} />
              <Text style={styles.aiAnalysisLabel}>AI Insight:</Text>
              <Text style={styles.aiAnalysisText} numberOfLines={1}>
                {analysis.analysis.split('.')[0]}.
              </Text>
            </View>
            <View style={[
              styles.recommendationBadge,
              {
                backgroundColor: analysis.recommendation === 'APPROVE' ? THEME.colors.success + '20' :
                                analysis.recommendation === 'REJECT' ? THEME.colors.error + '20' :
                                THEME.colors.warning + '20',
              }
            ]}>
              <Text style={[
                styles.recommendationText,
                {
                  color: analysis.recommendation === 'APPROVE' ? THEME.colors.success :
                        analysis.recommendation === 'REJECT' ? THEME.colors.error :
                        THEME.colors.warning,
                }
              ]}>
                {analysis.recommendation}
              </Text>
            </View>
          </View>
        )}

        {/* Meta Info */}
        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={14} color={THEME.colors.gray} />
            <Text style={styles.metaText}>
              {proposal.proposer.slice(0, 10)}...
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={THEME.colors.gray} />
            <Text style={styles.metaText}>
              {isActive ? `${timeRemaining} remaining` : 'Ended'}
            </Text>
          </View>
          {proposal.participationRate > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={THEME.colors.gray} />
              <Text style={styles.metaText}>
                {proposal.participationRate.toFixed(1)}% participation
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Circular Progress Timer Component
interface CircularProgressTimerProps {
  endTime: Date;
  size: number;
  strokeWidth: number;
  color: string;
}

const CircularProgressTimer: React.FC<CircularProgressTimerProps> = ({
  endTime,
  size,
  strokeWidth,
  color,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const [progress, setProgress] = React.useState(100);

  React.useEffect(() => {
    const updateProgress = () => {
      const now = Date.now();
      const end = endTime.getTime();
      const totalDuration = 7 * 24 * 60 * 60 * 1000; // Assume 7 days total
      const remaining = Math.max(0, end - now);
      const newProgress = (remaining / totalDuration) * 100;
      setProgress(newProgress);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 1000); // Update every second

    return () => clearInterval(interval);
  }, [endTime]);

  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[styles.timerWrapper, { width: size, height: size }]}>
      <View style={[styles.timerBackground, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: color + '20' }]} />
      <View style={[styles.timerProgress, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: color, borderLeftColor: 'transparent', borderBottomColor: 'transparent', transform: [{ rotate: `${(progress / 100) * 360}deg` }] }]} />
      <View style={styles.timerTextContainer}>
        <Text style={[styles.timerText, { color }]}>
          {Math.ceil(progress)}%
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  statusBar: {
    height: 4,
    width: '100%',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
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
  proposalId: {
    fontSize: 11,
    color: THEME.colors.gray,
  },
  userVoteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  userVoteText: {
    fontSize: 10,
    fontWeight: '600',
  },
  timerContainer: {
    marginLeft: 12,
  },
  timerWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBackground: {
    position: 'absolute',
  },
  timerProgress: {
    position: 'absolute',
  },
  timerTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  categoryIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    color: THEME.colors.gray,
    lineHeight: 20,
    marginBottom: 12,
  },
  votingStats: {
    marginBottom: 12,
  },
  votingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  votesLabel: {
    fontSize: 12,
    color: THEME.colors.gray,
  },
  votePercentages: {
    flexDirection: 'row',
    gap: 12,
  },
  votePercentage: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: THEME.colors.gray + '20',
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressFill: {
    height: '100%',
  },
  aiAnalysis: {
    backgroundColor: THEME.colors.primary + '5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  aiAnalysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiAnalysisLabel: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.primary,
    flex: 1,
  },
  aiAnalysisText: {
    fontSize: 12,
    color: THEME.colors.text,
    flex: 1,
  },
  recommendationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recommendationText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 4,
    fontSize: 12,
    color: THEME.colors.gray,
  },
});