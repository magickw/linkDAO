/**
 * CommunityPerformanceDashboard Component
 * Displays community performance metrics and analytics
 */

import React, { useState, useEffect } from 'react';
import { communityPerformanceService, CommunityPerformanceSummary } from '../../services/communityPerformanceService';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface CommunityPerformanceDashboardProps {
  communityId: string;
}

export const CommunityPerformanceDashboard: React.FC<CommunityPerformanceDashboardProps> = ({
  communityId
}) => {
  const [performanceSummary, setPerformanceSummary] = useState<CommunityPerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPerformanceData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const summary = await communityPerformanceService.getPerformanceSummary(communityId);
        setPerformanceSummary(summary);
      } catch (err) {
        console.error('Error loading performance data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load performance data');
      } finally {
        setLoading(false);
      }
    };

    loadPerformanceData();
  }, [communityId]);

  if (loading) {
    return (
      <div className="performance-dashboard-loading">
        <LoadingSpinner size="lg" />
        <p>Loading performance data...</p>
      </div>
    );
  }

  if (error || !performanceSummary) {
    return (
      <div className="performance-dashboard-error">
        <h3>Performance Data Unavailable</h3>
        <p>{error || 'Unable to load community performance metrics.'}</p>
      </div>
    );
  }

  return (
    <div className="community-performance-dashboard">
      <div className="dashboard-header">
        <h2>Community Performance</h2>
        <p>Last updated: {performanceSummary.lastUpdated.toLocaleString()}</p>
      </div>

      {/* Overall Score */}
      <div className="overall-score-card">
        <div className="score-value">{performanceSummary.overallScore}/100</div>
        <div className="score-label">Overall Performance</div>
        <div className="score-trend">
          <span className={`trend ${performanceSummary.engagementTrend}`}>
            {performanceSummary.engagementTrend === 'increasing' ? '↗' : 
             performanceSummary.engagementTrend === 'decreasing' ? '↘' : '→'}
          </span>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="score-breakdown">
        <div className="score-card">
          <div className="score-title">Engagement</div>
          <div className="score-value">{performanceSummary.engagementScore}</div>
          <div className="score-bar">
            <div 
              className="score-fill" 
              style={{ width: `${performanceSummary.engagementScore}%` }}
            ></div>
          </div>
        </div>

        <div className="score-card">
          <div className="score-title">Growth</div>
          <div className="score-value">{performanceSummary.growthScore}</div>
          <div className="score-bar">
            <div 
              className="score-fill" 
              style={{ width: `${performanceSummary.growthScore}%` }}
            ></div>
          </div>
        </div>

        <div className="score-card">
          <div className="score-title">Quality</div>
          <div className="score-value">{performanceSummary.qualityScore}</div>
          <div className="score-bar">
            <div 
              className="score-fill" 
              style={{ width: `${performanceSummary.qualityScore}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="key-metrics">
        <div className="metric-card">
          <div className="metric-value">{performanceSummary.memberCount.toLocaleString()}</div>
          <div className="metric-label">Total Members</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{performanceSummary.activeMembers.toLocaleString()}</div>
          <div className="metric-label">Active Members</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{performanceSummary.totalPosts.toLocaleString()}</div>
          <div className="metric-label">Total Posts</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{performanceSummary.totalComments.toLocaleString()}</div>
          <div className="metric-label">Total Comments</div>
        </div>
      </div>

      {/* Recommendations */}
      {performanceSummary.recommendations.length > 0 && (
        <div className="recommendations">
          <h3>Recommendations</h3>
          <ul>
            {performanceSummary.recommendations.map((recommendation, index) => (
              <li key={index}>{recommendation}</li>
            ))}
          </ul>
        </div>
      )}

      <style jsx>{`
        .community-performance-dashboard {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .dashboard-header {
          margin-bottom: 1.5rem;
        }

        .dashboard-header h2 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .dashboard-header p {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .performance-dashboard-loading,
        .performance-dashboard-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
        }

        .performance-dashboard-loading p,
        .performance-dashboard-error p {
          color: var(--text-secondary);
          margin: 1rem 0;
        }

        .performance-dashboard-error h3 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .overall-score-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 0.75rem;
          padding: 2rem;
          text-align: center;
          color: white;
          margin-bottom: 2rem;
          position: relative;
        }

        .score-value {
          font-size: 3rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .score-label {
          font-size: 1.1rem;
          opacity: 0.9;
        }

        .score-trend {
          position: absolute;
          top: 1rem;
          right: 1rem;
          font-size: 1.5rem;
        }

        .trend.increasing {
          color: #4ade80;
        }

        .trend.decreasing {
          color: #f87171;
        }

        .trend.stable {
          color: #94a3b8;
        }

        .score-breakdown {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .score-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          padding: 1.5rem;
          text-align: center;
        }

        .score-title {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .score-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .score-bar {
          height: 8px;
          background: var(--border-light);
          border-radius: 4px;
          overflow: hidden;
        }

        .score-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 4px;
        }

        .key-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .metric-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          padding: 1.5rem;
          text-align: center;
        }

        .metric-value {
          font-size: 1.75rem;
          font-weight: bold;
          color: var(--primary-color);
          margin-bottom: 0.5rem;
        }

        .metric-label {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .recommendations {
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .recommendations h3 {
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .recommendations ul {
          list-style-type: none;
          padding: 0;
        }

        .recommendations li {
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-light);
          color: var(--text-secondary);
        }

        .recommendations li:last-child {
          border-bottom: none;
        }

        .recommendations li:before {
          content: "•";
          color: var(--primary-color);
          font-weight: bold;
          display: inline-block;
          width: 1em;
          margin-right: 0.5em;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .community-performance-dashboard {
            padding: 1rem;
          }

          .overall-score-card {
            padding: 1.5rem;
          }

          .score-value {
            font-size: 2rem;
          }

          .score-breakdown {
            grid-template-columns: 1fr;
          }

          .key-metrics {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .key-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CommunityPerformanceDashboard;