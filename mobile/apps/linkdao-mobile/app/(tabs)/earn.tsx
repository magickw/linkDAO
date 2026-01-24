/**
 * Earn Screen
 * "Earn-to-Own" gamification and RWA dashboard
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store';
import { earnToOwnService, EarnToOwnChallenge, EarnToOwnProgress } from '../../src/services/earnToOwnService';
import { THEME } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

export default function EarnScreen() {
  const { user } = useAuthStore();
  const [challenges, setChallenges] = useState<EarnToOwnChallenge[]>([]);
  const [progress, setProgress] = useState<EarnToOwnProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [challengesData, progressData] = await Promise.all([
        earnToOwnService.getActiveChallenges(),
        user?.address ? earnToOwnService.getUserProgress(user.address) : Promise.resolve(null)
      ]);
      setChallenges(challengesData);
      setProgress(progressData);
    } catch (error) {
      console.error('Error loading earn data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleClaim = async (challenge: EarnToOwnChallenge) => {
    if (challenge.progress < challenge.target) return;
    
    setClaimingId(challenge.id);
    try {
      const success = await earnToOwnService.claimReward(challenge.id);
      if (success) {
        Alert.alert('Success', `You earned ${challenge.rewardAmount} ${challenge.rewardCurrency}!`);
        // Optimistically update or reload
        loadData();
      } else {
        Alert.alert('Error', 'Failed to claim reward. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setClaimingId(null);
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'daily': return 'time-outline';
      case 'weekly': return 'calendar-outline';
      case 'monthly': return 'trophy-outline';
      case 'milestone': return 'ribbon-outline';
      default: return 'star-outline';
    }
  };

  const getChallengeGradient = (type: string) => {
    switch (type) {
      case 'daily': return ['#3b82f6', '#06b6d4']; // blue to cyan
      case 'weekly': return ['#8b5cf6', '#ec4899']; // purple to pink
      case 'monthly': return ['#f59e0b', '#f97316']; // amber to orange
      case 'milestone': return ['#10b981', '#34d399']; // emerald
      default: return ['#6b7280', '#4b5563'];
    }
  };

  const renderChallengeCard = (challenge: EarnToOwnChallenge) => {
    const isCompleted = challenge.progress >= challenge.target;
    const percent = Math.min(100, (challenge.progress / challenge.target) * 100);

    return (
      <View key={challenge.id} style={styles.challengeCard}>
        <View style={styles.challengeHeader}>
          <LinearGradient
            colors={getChallengeGradient(challenge.type) as any}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={getChallengeIcon(challenge.type) as any} size={24} color="#fff" />
          </LinearGradient>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardText}>+{challenge.rewardAmount} {challenge.rewardCurrency}</Text>
          </View>
        </View>

        <Text style={styles.challengeTitle}>{challenge.title}</Text>
        <Text style={styles.challengeDesc}>{challenge.description}</Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressValue}>{challenge.progress}/{challenge.target}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={getChallengeGradient(challenge.type) as any}
              style={[styles.progressBarFill, { width: `${percent}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.typeLabel}>{challenge.type.toUpperCase()}</Text>
          {isCompleted ? (
            <TouchableOpacity 
              style={[styles.claimButton, claimingId === challenge.id && styles.disabledButton]}
              onPress={() => handleClaim(challenge)}
              disabled={claimingId === challenge.id}
            >
              {claimingId === challenge.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.claimButtonText}>Claim Reward</Text>
              )}
            </TouchableOpacity>
          ) : (
             challenge.expiresAt && (
                <Text style={styles.expiryText}>
                  {Math.ceil((new Date(challenge.expiresAt).getTime() - Date.now()) / 86400000)}d left
                </Text>
             )
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} />}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={['#7c3aed', '#2563eb']}
          style={styles.heroSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Ionicons name="gift-outline" size={16} color="#fff" />
              <Text style={styles.heroBadgeText}>Earn-to-Own Program</Text>
            </View>
            <Text style={styles.heroTitle}>Participate & Earn LDAO Tokens</Text>
            <Text style={styles.heroSubtitle}>
              Complete challenges, build your reputation, and own a stake in the platform.
            </Text>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        {progress && (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{progress.totalEarned}</Text>
                <Text style={styles.statLabel}>Total Earned</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{progress.currentBalance}</Text>
                <Text style={styles.statLabel}>Current Balance</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{progress.completedChallenges}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>#{progress.rank}</Text>
                <Text style={styles.statLabel}>Rank</Text>
              </View>
            </View>
          </View>
        )}

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stepsScroll}>
            {[
              { icon: 'list', title: 'Pick Challenges', desc: 'Find tasks that match your skills' },
              { icon: 'flash', title: 'Complete Actions', desc: 'Engage, vote, and trade' },
              { icon: 'wallet', title: 'Get Paid', desc: 'Claim LDAO tokens instantly' },
            ].map((step, index) => (
              <View key={index} style={styles.stepCard}>
                <View style={styles.stepIcon}>
                  <Ionicons name={step.icon as any} size={24} color={THEME.colors.primary} />
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Active Challenges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Challenges</Text>
          {loading ? (
             <ActivityIndicator size="large" color={THEME.colors.primary} style={{ marginTop: 20 }} />
          ) : (
            challenges.map(renderChallengeCard)
          )}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroSection: {
    padding: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
  },
  heroContent: {
    alignItems: 'flex-start',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroBadgeText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginTop: -30, 
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  stepsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  stepCard: {
    backgroundColor: '#fff',
    width: 140,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rewardText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 12,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  challengeDesc: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.5,
  },
  expiryText: {
    fontSize: 12,
    color: '#f97316',
    fontWeight: '500',
  },
  claimButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
