/**
 * Advanced Governance Analytics Screen
 * Comprehensive analytics for governance participation and proposal insights
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

type TimeRange = '7d' | '30d' | '90d' | 'all';

interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  yourVotes: number;
  votingPower: string;
  participationRate: number;
  proposalsCreated: number;
  proposalsPassed: number;
  proposalsFailed: number;
}

interface ProposalTrend {
  date: string;
  created: number;
  voted: number;
}

interface TopVoter {
  address: string;
  votes: number;
  proposalsSupported: number;
}

export default function GovernanceAnalyticsScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [stats, setStats] = useState<GovernanceStats>({
    totalProposals: 45,
    activeProposals: 8,
    yourVotes: 23,
    votingPower: '15,420',
    participationRate: 51.1,
    proposalsCreated: 3,
    proposalsPassed: 2,
    proposalsFailed: 1,
  });

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Governance Analytics</Text>
        <TouchableOpacity>
          <Ionicons name="share-outline" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range && styles.timeRangeButtonActive,
              ]}
              onPress={() => handleTimeRangeChange(range)}
            >
              <Text style={[
                styles.timeRangeText,
                timeRange === range && styles.timeRangeTextActive,
              ]}>
                {range === 'all' ? 'All Time' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Voting Power Card */}
        <View style={styles.votingPowerCard}>
          <View style={styles.votingPowerHeader}>
            <View style={styles.votingPowerIcon}>
              <Ionicons name="diamond-outline" size={28} color="#8b5cf6" />
            </View>
            <View style={styles.votingPowerInfo}>
              <Text style={styles.votingPowerLabel}>Your Voting Power</Text>
              <Text style={styles.votingPowerValue}>{stats.votingPower} LDAO</Text>
            </View>
          </View>
          <View style={styles.votingPowerTrend}>
            <Ionicons name="trending-up" size={16} color="#10b981" />
            <Text style={styles.votingPowerTrendText}>+5.2% this period</Text>
          </View>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="document-text-outline" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.metricValue}>{stats.totalProposals}</Text>
            <Text style={styles.metricLabel}>Total Proposals</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#10b981" />
            </View>
            <Text style={styles.metricValue}>{stats.activeProposals}</Text>
            <Text style={styles.metricLabel}>Active</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="vote-outline" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.metricValue}>{stats.yourVotes}</Text>
            <Text style={styles.metricLabel}>Your Votes</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="people-outline" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.metricValue}>{stats.participationRate}%</Text>
            <Text style={styles.metricLabel}>Participation</Text>
          </View>
        </View>

        {/* Your Proposals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Proposals</Text>
          <View style={styles.proposalsStats}>
            <View style={styles.proposalStat}>
              <Text style={styles.proposalStatValue}>{stats.proposalsCreated}</Text>
              <Text style={styles.proposalStatLabel}>Created</Text>
            </View>
            <View style={styles.proposalStatDivider} />
            <View style={styles.proposalStat}>
              <Text style={[styles.proposalStatValue, { color: '#10b981' }]}>
                {stats.proposalsPassed}
              </Text>
              <Text style={styles.proposalStatLabel}>Passed</Text>
            </View>
            <View style={styles.proposalStatDivider} />
            <View style={styles.proposalStat}>
              <Text style={[styles.proposalStatValue, { color: '#ef4444' }]}>
                {stats.proposalsFailed}
              </Text>
              <Text style={styles.proposalStatLabel}>Failed</Text>
            </View>
          </View>
          <View style={styles.successRate}>
            <Text style={styles.successRateLabel}>Success Rate</Text>
            <Text style={styles.successRateValue}>
              {((stats.proposalsPassed / stats.proposalsCreated) * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Voting Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voting Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <View style={styles.activityBar}>
                <View style={[styles.activityBarFill, { width: '75%', backgroundColor: '#10b981' }]} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityLabel}>For</Text>
                <Text style={styles.activityValue}>75%</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityBar}>
                <View style={[styles.activityBarFill, { width: '20%', backgroundColor: '#ef4444' }]} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityLabel}>Against</Text>
                <Text style={styles.activityValue}>20%</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityBar}>
                <View style={[styles.activityBarFill, { width: '5%', backgroundColor: '#f59e0b' }]} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityLabel}>Abstain</Text>
                <Text style={styles.activityValue}>5%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Top Topics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Topics Voted On</Text>
          <View style={styles.topicsList}>
            <View style={styles.topicItem}>
              <View style={styles.topicIcon}>
                <Ionicons name="cash-outline" size={20} color="#10b981" />
              </View>
              <View style={styles.topicInfo}>
                <Text style={styles.topicName}>Treasury Management</Text>
                <Text style={styles.topicVotes}>12 votes</Text>
              </View>
              <View style={styles.topicBar}>
                <View style={[styles.topicBarFill, { width: '52%', backgroundColor: '#10b981' }]} />
              </View>
            </View>
            <View style={styles.topicItem}>
              <View style={styles.topicIcon}>
                <Ionicons name="rocket-outline" size={20} color="#3b82f6" />
              </View>
              <View style={styles.topicInfo}>
                <Text style={styles.topicName}>Feature Development</Text>
                <Text style={styles.topicVotes}>8 votes</Text>
              </View>
              <View style={styles.topicBar}>
                <View style={[styles.topicBarFill, { width: '35%', backgroundColor: '#3b82f6' }]} />
              </View>
            </View>
            <View style={styles.topicItem}>
              <View style={styles.topicIcon}>
                <Ionicons name="heart-outline" size={20} color="#f59e0b" />
              </View>
              <View style={styles.topicInfo}>
                <Text style={styles.topicName}>Charity Initiatives</Text>
                <Text style={styles.topicVotes}>3 votes</Text>
              </View>
              <View style={styles.topicBar}>
                <View style={[styles.topicBarFill, { width: '13%', backgroundColor: '#f59e0b' }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Governance Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Governance Insights</Text>
          <View style={styles.insightsList}>
            <View style={styles.insightCard}>
              <Ionicons name="trending-up-outline" size={20} color="#10b981" />
              <Text style={styles.insightText}>
                Your voting power has increased by 5.2% this period. Keep participating to earn more rewards!
              </Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="star-outline" size={20} color="#f59e0b" />
              <Text style={styles.insightText}>
                You're in the top 15% of voters by participation rate. Your voice matters in our community!
              </Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
              <Text style={styles.insightText}>
                Treasury proposals have the highest engagement. Consider voting on upcoming budget allocations.
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Governance Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Actions</Text>
          <View style={styles.actionsList}>
            <View style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="checkmark" size={18} color="#10b981" />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Voted on Proposal #42</Text>
                <Text style={styles.actionSubtitle}>Community Fund Allocation</Text>
                <Text style={styles.actionTime}>2 hours ago</Text>
              </View>
            </View>
            <View style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="create-outline" size={18} color="#3b82f6" />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Created Proposal #45</Text>
                <Text style={styles.actionSubtitle}>New Feature Request</Text>
                <Text style={styles.actionTime}>1 day ago</Text>
              </View>
            </View>
            <View style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="trophy-outline" size={18} color="#f59e0b" />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Earned Voting Rewards</Text>
                <Text style={styles.actionSubtitle}>+50 LDAO tokens</Text>
                <Text style={styles.actionTime}>3 days ago</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    flex: 1,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  timeRangeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  timeRangeTextActive: {
    color: '#ffffff',
  },
  votingPowerCard: {
    backgroundColor: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  votingPowerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  votingPowerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  votingPowerInfo: {
    flex: 1,
  },
  votingPowerLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  votingPowerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  votingPowerTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  votingPowerTrendText: {
    fontSize: 12,
    color: '#ffffff',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  proposalsStats: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  proposalStat: {
    flex: 1,
    alignItems: 'center',
  },
  proposalStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  proposalStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  proposalStatDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  successRate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  successRateLabel: {
    fontSize: 13,
    color: '#166534',
  },
  successRateValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  activityCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activityItem: {
    marginBottom: 12,
  },
  activityBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  activityBarFill: {
    height: '100%',
  },
  activityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  activityValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  topicsList: {
    gap: 12,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  topicIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topicInfo: {
    flex: 1,
  },
  topicName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  topicVotes: {
    fontSize: 12,
    color: '#6b7280',
  },
  topicBar: {
    width: 60,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  topicBarFill: {
    height: '100%',
  },
  insightsList: {
    gap: 12,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  actionsList: {
    gap: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  actionTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
});