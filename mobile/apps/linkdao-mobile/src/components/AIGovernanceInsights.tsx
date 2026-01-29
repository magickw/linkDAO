/**
 * AI Governance Insights Component
 * Displays AI-powered insights and recommendations
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aiGovernanceService, AIProposalAnalysis, AIGovernanceInsight } from '../services/aiGovernanceService';

interface AIGovernanceInsightsProps {
  proposalId?: string;
  showFullAnalysis?: boolean;
}

export default function AIGovernanceInsights({ proposalId, showFullAnalysis = false }: AIGovernanceInsightsProps) {
  const [insights, setInsights] = useState<AIGovernanceInsight | null>(null);
  const [analysis, setAnalysis] = useState<AIProposalAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, []);

  useEffect(() => {
    if (proposalId && showFullAnalysis) {
      loadAnalysis(proposalId);
    }
  }, [proposalId, showFullAnalysis]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const data = await aiGovernanceService.getGovernanceInsights();
      setInsights(data);
    } catch (error) {
      console.error('Failed to load AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async (id: string) => {
    try {
      const data = await aiGovernanceService.analyzeProposal(id);
      setAnalysis(data);
    } catch (error) {
      console.error('Failed to load AI analysis:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* AI Insights Header */}
      <View style={styles.header}>
        <Ionicons name="sparkles" size={20} color="#8b5cf6" />
        <Text style={styles.headerTitle}>AI Insights</Text>
        <TouchableOpacity onPress={loadInsights}>
          <Ionicons name="refresh" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Governance Trends */}
      {insights && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setExpandedSection(expandedSection === 'trends' ? null : 'trends')}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="trending-up" size={20} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Trends</Text>
            </View>
            <Ionicons
              name={expandedSection === 'trends' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
          {expandedSection === 'trends' && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionText}>{insights.trendAnalysis}</Text>
              <Text style={styles.sectionText}>{insights.voterSentiment}</Text>
            </View>
          )}
        </View>
      )}

      {/* Voter Sentiment */}
      {insights && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setExpandedSection(expandedSection === 'sentiment' ? null : 'sentiment')}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="people" size={20} color="#10b981" />
              <Text style={styles.sectionTitle}>Sentiment</Text>
            </View>
            <Ionicons
              name={expandedSection === 'sentiment' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
          {expandedSection === 'sentiment' && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionText}>{insights.voterSentiment}</Text>
            </View>
          )}
        </View>
      )}

      {/* Similar Proposals */}
      {insights && insights.similarProposals.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setExpandedSection(expandedSection === 'similar' ? null : 'similar')}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="copy" size={20} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Similar Proposals</Text>
            </View>
            <Ionicons
              name={expandedSection === 'similar' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
          {expandedSection === 'similar' && (
            <View style={styles.sectionContent}>
              {insights.similarProposals.map((proposal, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listItemText}>• {proposal}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Recommendation */}
      {insights && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="bulb" size={20} color="#fbbf24" />
              <Text style={styles.sectionTitle}>Recommendation</Text>
            </View>
          </View>
          <View style={styles.recommendationBox}>
            <Text style={styles.recommendationText}>{insights.recommendation}</Text>
          </View>
        </View>
      )}

      {/* Proposal Analysis */}
      {proposalId && showFullAnalysis && analysis && (
        <View style={styles.analysisSection}>
          <Text style={styles.analysisTitle}>AI Analysis</Text>
          
          {/* Summary */}
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>Summary</Text>
            <Text style={styles.analysisText}>{analysis.summary}</Text>
          </View>

          {/* Key Points */}
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>Key Points</Text>
            {analysis.keyPoints.map((point, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.listItemText}>{point}</Text>
              </View>
            ))}
          </View>

          {/* Voting Recommendation */}
          <View style={styles.recommendationCard}>
            <View style={styles.recommendationHeader}>
              <Ionicons
                name={analysis.votingRecommendation === 'for' ? 'checkmark-circle' : 
                       analysis.votingRecommendation === 'against' ? 'close-circle' : 'remove-circle'}
                size={24}
                color={analysis.votingRecommendation === 'for' ? '#10b981' : 
                       analysis.votingRecommendation === 'against' ? '#ef4444' : '#f59e0b'}
              />
              <View style={styles.recommendationInfo}>
                <Text style={styles.recommendationTitle}>
                  {analysis.votingRecommendation === 'for' ? 'Vote For' :
                   analysis.votingRecommendation === 'against' ? 'Vote Against' : 'Abstain'}
                </Text>
                <Text style={styles.recommendationConfidence}>
                  {Math.round(analysis.confidence * 100)}% confidence
                </Text>
              </View>
            </View>
            <View style={[
              styles.recommendationBadge,
              analysis.estimatedOutcome === 'pass' && styles.recommendationBadgePass,
              analysis.estimatedOutcome === 'fail' && styles.recommendationBadgeFail
            ]}>
              <Text style={[
                styles.recommendationBadgeText,
                analysis.estimatedOutcome === 'pass' && styles.recommendationBadgeTextPass,
                analysis.estimatedOutcome === 'fail' && styles.recommendationBadgeTextFail
              ]}>
                Estimated to {analysis.estimatedOutcome}
              </Text>
            </View>
          </View>

          {/* Risks & Benefits */}
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>Risks</Text>
            {analysis.risks.map((risk, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="warning" size={16} color="#f59e0b" />
                <Text style={styles.listItemText}>{risk}</Text>
              </View>
            ))}
          </View>

          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>Benefits</Text>
            {analysis.benefits.map((benefit, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.listItemText}>{benefit}</Text>
              </View>
            ))}
          </View>

          {/* Reasoning */}
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>Reasoning</Text>
            <Text style={styles.analysisText}>{analysis.reasoning}</Text>
          </View>
        </View>
      )}

      {/* AI Badge */}
      <View style={styles.aiBadge}>
        <Ionicons name="sparkles" size={14} color="#8b5cf6" />
        <Text style={styles.aiBadgeText}>AI-Powered Insights</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    margin: 16,
    marginBottom: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#faf5ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9d5ff',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7c3aed',
    marginLeft: 8,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  sectionContent: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  sectionText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  listItemText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    marginLeft: 8,
    lineHeight: 18,
  },
  recommendationBox: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderLeftColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 10,
  },
  recommendationText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  analysisSection: {
    padding: 12,
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  analysisItem: {
    marginBottom: 12,
  },
  analysisLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  analysisText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recommendationInfo: {
    marginLeft: 12,
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065f46',
  },
  recommendationConfidence: {
    fontSize: 12,
    color: '#047857',
  },
  recommendationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    marginLeft: 8,
  },
  recommendationBadgePass: {
    backgroundColor: '#d1fae5',
  },
  recommendationBadgeFail: {
    backgroundColor: '#fee2e2',
  },
  recommendationBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  recommendationBadgeTextPass: {
    color: '#065f46',
  },
  recommendationBadgeTextFail: {
    color: '#991b1b',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#faf5ff',
  },
  aiBadgeText: {
    fontSize: 11,
    color: '#7c3aed',
    marginLeft: 6,
  },
});