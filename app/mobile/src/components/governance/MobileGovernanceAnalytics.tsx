// @ts-ignore
import React from 'react';
// @ts-ignore
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface MobileGovernanceAnalyticsProps {
  stats: {
    totalProposals: number;
    activeProposals: number;
    participationRate: number;
    avgVotingTime: number; // in hours
    topVoter: string;
    recentActivity: {
      date: string;
      action: string;
      proposal: string;
    }[];
  };
}

export default function MobileGovernanceAnalytics({ stats }: MobileGovernanceAnalyticsProps) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Governance Analytics</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalProposals}</Text>
            <Text style={styles.statLabel}>Total Proposals</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.activeProposals}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>
        
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.participationRate}%</Text>
            <Text style={styles.statLabel}>Participation</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.avgVotingTime}h</Text>
            <Text style={styles.statLabel}>Avg Voting Time</Text>
          </View>
        </View>
        
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.topVoter}</Text>
            <Text style={styles.statLabel}>Top Voter</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {stats.recentActivity.map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <Text style={styles.activityDate}>{activity.date}</Text>
            <Text style={styles.activityAction}>{activity.action}</Text>
            <Text style={styles.activityProposal}>{activity.proposal}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  activityItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  activityDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  activityAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  activityProposal: {
    fontSize: 14,
    color: '#666',
  },
});