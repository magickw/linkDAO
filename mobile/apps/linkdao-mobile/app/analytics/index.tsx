/**
 * User Analytics Dashboard
 * Basic analytics for regular users
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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  userAnalyticsService,
  UserActivity,
  EngagementMetrics,
  SocialMetrics,
  ContentPerformance,
} from '../../src/services/userAnalyticsService';
import { THEME } from '../../src/constants/theme';

type TabType = 'activity' | 'engagement' | 'social' | 'content';

export default function UserAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [engagement, setEngagement] = useState<EngagementMetrics | null>(null);
  const [social, setSocial] = useState<SocialMetrics | null>(null);
  const [content, setContent] = useState<ContentPerformance | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [activityData, engagementData, socialData, contentData, insightsData] = await Promise.all([
        userAnalyticsService.getActivitySummary(),
        userAnalyticsService.getEngagementMetrics(),
        userAnalyticsService.getSocialMetrics(),
        userAnalyticsService.getContentPerformance(),
        userAnalyticsService.getInsights(),
      ]);

      setActivity(activityData);
      setEngagement(engagementData);
      setSocial(socialData);
      setContent(contentData);
      setInsights(insightsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderTab = (tab: TabType, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === tab && styles.activeTab]}
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

  const renderStatCard = (title: string, value: string | number, icon: string, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={18} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={THEME.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Analytics</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
          <Ionicons name="refresh" size={24} color={THEME.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {renderTab('activity', 'Activity', 'bar-chart')}
        {renderTab('engagement', 'Engagement', 'pulse')}
        {renderTab('social', 'Social', 'people')}
        {renderTab('content', 'Content', 'document-text')}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            {/* Activity Tab */}
            {activeTab === 'activity' && activity && (
              <>
                <Text style={styles.sectionTitle}>Activity Overview</Text>
                <View style={styles.statsGrid}>
                  {renderStatCard('Total Posts', activity.totalPosts, 'create', THEME.colors.primary)}
                  {renderStatCard('Total Comments', activity.totalComments, 'chatbubbles', THEME.colors.secondary)}
                  {renderStatCard('Total Likes', activity.totalLikes, 'heart', THEME.colors.error)}
                  {renderStatCard('Total Shares', activity.totalShares, 'share', THEME.colors.info)}
                </View>

                <Text style={styles.sectionTitle}>Active Users</Text>
                <View style={styles.activityCard}>
                  <View style={styles.activityItem}>
                    <Text style={styles.activityValue}>{activity.dailyActive}</Text>
                    <Text style={styles.activityLabel}>Daily</Text>
                  </View>
                  <View style={styles.activityDivider} />
                  <View style={styles.activityItem}>
                    <Text style={styles.activityValue}>{activity.weeklyActive}</Text>
                    <Text style={styles.activityLabel}>Weekly</Text>
                  </View>
                  <View style={styles.activityDivider} />
                  <View style={styles.activityItem}>
                    <Text style={styles.activityValue}>{activity.monthlyActive}</Text>
                    <Text style={styles.activityLabel}>Monthly</Text>
                  </View>
                </View>
              </>
            )}

            {/* Engagement Tab */}
            {activeTab === 'engagement' && engagement && (
              <>
                <Text style={styles.sectionTitle}>Engagement Metrics</Text>
                <View style={styles.statsGrid}>
                  {renderStatCard('Avg Session', `${engagement.averageSessionDuration}m`, 'time', THEME.colors.info)}
                  {renderStatCard('Pages/Session', engagement.pagesPerSession.toFixed(1), 'layers', THEME.colors.primary)}
                  {renderStatCard('Bounce Rate', `${engagement.bounceRate}%`, 'trending-down', THEME.colors.warning)}
                  {renderStatCard('Total Sessions', engagement.totalSessions.toLocaleString(), 'pulse', THEME.colors.success)}
                </View>

                <View style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Ionicons name="bulb" size={20} color={THEME.colors.warning} />
                    <Text style={styles.insightTitle}>Insight</Text>
                  </View>
                  <Text style={styles.insightText}>
                    Your average session duration is {engagement.averageSessionDuration} minutes, which is
                    {engagement.averageSessionDuration > 10 ? ' above average' : ' below average'}. Try engaging with more content to increase your session time.
                  </Text>
                </View>
              </>
            )}

            {/* Social Tab */}
            {activeTab === 'social' && social && (
              <>
                <Text style={styles.sectionTitle}>Social Metrics</Text>
                <View style={styles.statsGrid}>
                  {renderStatCard('Followers', social.followers.toLocaleString(), 'people', THEME.colors.primary)}
                  {renderStatCard('Following', social.following.toLocaleString(), 'person-add', THEME.colors.secondary)}
                  {renderStatCard('Reputation', social.reputation.toLocaleString(), 'star', THEME.colors.warning)}
                  {renderStatCard('Achievements', social.achievements, 'trophy', THEME.colors.success)}
                </View>

                <Text style={styles.sectionTitle}>Tipping Activity</Text>
                <View style={styles.tippingCard}>
                  <View style={styles.tippingItem}>
                    <Ionicons name="arrow-up-circle" size={24} color={THEME.colors.success} />
                    <Text style={styles.tippingValue}>{social.tipsSent}</Text>
                    <Text style={styles.tippingLabel}>Tips Sent</Text>
                  </View>
                  <View style={styles.tippingDivider} />
                  <View style={styles.tippingItem}>
                    <Ionicons name="arrow-down-circle" size={24} color={THEME.colors.success} />
                    <Text style={styles.tippingValue}>{social.tipsReceived}</Text>
                    <Text style={styles.tippingLabel}>Tips Received</Text>
                  </View>
                </View>
              </>
            )}

            {/* Content Tab */}
            {activeTab === 'content' && content && (
              <>
                <Text style={styles.sectionTitle}>Top Performing Posts</Text>
                <View style={styles.contentContainer}>
                  {content.topPosts.slice(0, 5).map((post, index) => (
                    <View key={post.id} style={styles.contentCard}>
                      <View style={styles.contentRank}>
                        <Text style={styles.contentRankText}>#{index + 1}</Text>
                      </View>
                      <View style={styles.contentInfo}>
                        <Text style={styles.contentTitle} numberOfLines={1}>
                          {post.title}
                        </Text>
                        <View style={styles.contentStats}>
                          <View style={styles.contentStat}>
                            <Ionicons name="eye" size={14} color={THEME.colors.gray} />
                            <Text style={styles.contentStatText}>{post.views}</Text>
                          </View>
                          <View style={styles.contentStat}>
                            <Ionicons name="heart" size={14} color={THEME.colors.error} />
                            <Text style={styles.contentStatText}>{post.likes}</Text>
                          </View>
                          <View style={styles.contentStat}>
                            <Ionicons name="chatbubbles" size={14} color={THEME.colors.secondary} />
                            <Text style={styles.contentStatText}>{post.comments}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.contentEngagement}>
                        <Text style={styles.contentEngagementRate}>{post.engagementRate}%</Text>
                        <Text style={styles.contentEngagementLabel}>Engagement</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {content.engagementTrend && content.engagementTrend.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Engagement Trend (7 Days)</Text>
                    <View style={styles.trendCard}>
                      {content.engagementTrend.map((item, index) => (
                        <View key={index} style={styles.trendItem}>
                          <View
                            style={[
                              styles.trendBar,
                              {
                                height: Math.max(20, item.rate * 3),
                                backgroundColor: item.rate >= 9 ? THEME.colors.success : THEME.colors.warning,
                              },
                            ]}
                          />
                          <Text style={styles.trendLabel}>{item.date.split('-')[2]}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}

            {/* Insights Section */}
            {insights && (
              <>
                <Text style={styles.sectionTitle}>Your Insights</Text>
                <View style={styles.scoreCard}>
                  <View style={styles.scoreHeader}>
                    <Text style={styles.scoreLabel}>Your Score</Text>
                    <Text style={styles.scoreValue}>{insights.score}/100</Text>
                  </View>
                  <Text style={styles.scoreLevel}>{insights.level}</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${insights.score}%` }]} />
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Recommendations</Text>
                {insights.recommendations.map((rec: string, index: number) => (
                  <View key={index} style={styles.recommendationCard}>
                    <Ionicons name="checkmark-circle" size={20} color={THEME.colors.success} />
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </>
            )}
          </>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: THEME.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: THEME.colors.gray,
  },
  activeTabText: {
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginTop: 20,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    marginLeft: 8,
    fontSize: 12,
    color: THEME.colors.gray,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.text.primary,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flex: 1,
    alignItems: 'center',
  },
  activityValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.colors.text.primary,
  },
  activityLabel: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginTop: 4,
  },
  activityDivider: {
    width: 1,
    backgroundColor: THEME.colors.border,
  },
  insightCard: {
    backgroundColor: THEME.colors.warning + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.warning,
  },
  insightText: {
    fontSize: 14,
    color: THEME.colors.text.primary,
    lineHeight: 20,
  },
  tippingCard: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tippingItem: {
    flex: 1,
    alignItems: 'center',
  },
  tippingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.colors.text.primary,
    marginTop: 8,
  },
  tippingLabel: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginTop: 4,
  },
  tippingDivider: {
    width: 1,
    backgroundColor: THEME.colors.border,
  },
  contentContainer: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
  },
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  contentRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  contentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginBottom: 4,
  },
  contentStats: {
    flexDirection: 'row',
    gap: 12,
  },
  contentStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contentStatText: {
    fontSize: 12,
    color: THEME.colors.gray,
  },
  contentEngagement: {
    alignItems: 'flex-end',
  },
  contentEngagementRate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.success,
  },
  contentEngagementLabel: {
    fontSize: 10,
    color: THEME.colors.gray,
  },
  trendCard: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
  },
  trendItem: {
    alignItems: 'center',
    flex: 1,
  },
  trendBar: {
    width: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  trendLabel: {
    fontSize: 10,
    color: THEME.colors.gray,
  },
  scoreCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 14,
    color: THEME.colors.gray,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  scoreLevel: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: THEME.colors.gray + '20',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 4,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.colors.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: THEME.colors.text.primary,
    lineHeight: 20,
  },
});