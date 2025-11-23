/**
 * ModerationDashboard Component
 * Comprehensive moderation tools for community managers
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate, formatNumber } from '../../utils/formatters';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ModerationItem {
  id: string;
  type: 'post' | 'comment' | 'user' | 'report';
  content: string;
  author: {
    address: string;
    ensName?: string;
    reputation: number;
  };
  reportedBy?: string;
  reason?: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  createdAt: Date;
  reportedAt?: Date;
  metadata?: any;
}

interface ModerationStats {
  pendingItems: number;
  approvedToday: number;
  rejectedToday: number;
  totalReports: number;
  averageResponseTime: number;
  activeReports: number;
}

interface ModerationDashboardProps {
  communityId: string;
  canModerate: boolean;
}

export const ModerationDashboard: React.FC<ModerationDashboardProps> = ({
  communityId,
  canModerate
}) => {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'reports'>('pending');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'escalate' | ''>('');

  // Load moderation items
  const loadModerationItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [itemsResponse, statsResponse] = await Promise.all([
        fetch(`/api/communities/${communityId}/moderation/items?status=${activeTab}&limit=50`),
        fetch(`/api/communities/${communityId}/moderation/stats`)
      ]);

      if (!itemsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to load moderation data');
      }

      const [itemsData, statsData] = await Promise.all([
        itemsResponse.json(),
        statsResponse.json()
      ]);

      setItems(itemsData.items);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading moderation data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load moderation data');
    } finally {
      setLoading(false);
    }
  }, [communityId, activeTab]);

  // Handle individual item action
  const handleItemAction = async (itemId: string, action: 'approve' | 'reject' | 'escalate', reason?: string) => {
    try {
      const response = await fetch(`/api/communities/${communityId}/moderation/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, reason })
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      // Update item in local state
      setItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, status: action === 'escalate' ? 'escalated' : action === 'approve' ? 'approved' : 'rejected' }
          : item
      ));

      // Remove from current view if status changed
      if (activeTab === 'pending') {
        setItems(prev => prev.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction || selectedItems.length === 0) return;

    try {
      const response = await fetch(`/api/communities/${communityId}/moderation/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: bulkAction,
          itemIds: selectedItems
        })
      });

      if (!response.ok) {
        throw new Error('Failed to perform bulk action');
      }

      // Update items in local state
      setItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      setBulkAction('');
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Select all items
  const selectAllItems = () => {
    setSelectedItems(items.map(item => item.id));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedItems([]);
  };

  // Load data when component mounts or dependencies change
  useEffect(() => {
    if (canModerate) {
      loadModerationItems();
    }
  }, [loadModerationItems, canModerate]);

  if (!canModerate) {
    return (
      <div className="access-denied">
        <h3>Access Denied</h3>
        <p>You don't have permission to access moderation tools.</p>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return 'ℹ️';
      default: return '❓';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return '📝';
      case 'comment': return '💬';
      case 'user': return '👤';
      case 'report': return '🚩';
      default: return '❓';
    }
  };

  return (
    <div className="moderation-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h2>Moderation Dashboard</h2>
        <p>Manage community content and user reports</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-value">{formatNumber(stats.pendingItems)}</div>
            <div className="stat-label">Pending Review</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatNumber(stats.approvedToday)}</div>
            <div className="stat-label">Approved Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatNumber(stats.rejectedToday)}</div>
            <div className="stat-label">Rejected Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatNumber(stats.activeReports)}</div>
            <div className="stat-label">Active Reports</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="moderation-tabs">
        <button
          onClick={() => setActiveTab('pending')}
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
        >
          ⏳ Pending ({stats?.pendingItems || 0})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
        >
          🚩 Reports ({stats?.activeReports || 0})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`tab ${activeTab === 'approved' ? 'active' : ''}`}
        >
          ✅ Approved
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`tab ${activeTab === 'rejected' ? 'active' : ''}`}
        >
          ❌ Rejected
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div className="bulk-actions">
          <div className="selection-info">
            {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            <button onClick={clearSelection} className="clear-selection">
              Clear
            </button>
          </div>
          
          <div className="bulk-controls">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as any)}
              className="bulk-select"
            >
              <option value="">Select Action</option>
              <option value="approve">Approve All</option>
              <option value="reject">Reject All</option>
              <option value="escalate">Escalate All</option>
            </select>
            
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction}
              className="bulk-apply-btn"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="moderation-items">
        {loading ? (
          <div className="loading-state">
            <LoadingSpinner size="lg" />
            <p>Loading moderation items...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <h3>Failed to load items</h3>
            <p>{error}</p>
            <button onClick={loadModerationItems} className="retry-button">
              Try Again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h3>No items to review</h3>
            <p>All caught up! Check back later for new items.</p>
          </div>
        ) : (
          <>
            {/* Select All */}
            <div className="list-controls">
              <button onClick={selectAllItems} className="select-all-btn">
                Select All ({items.length})
              </button>
            </div>

            {/* Items */}
            <div className="items-list">
              {items.map(item => (
                <div key={item.id} className="moderation-item">
                  <div className="item-header">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      className="item-checkbox"
                    />
                    
                    <div className="item-meta">
                      <span className="item-type">
                        {getTypeIcon(item.type)} {item.type}
                      </span>
                      
                      <span 
                        className="severity-badge"
                        style={{ color: getSeverityColor(item.severity) }}
                      >
                        {getSeverityIcon(item.severity)} {item.severity}
                      </span>
                      
                      <span className="item-date">
                        {formatDate(item.createdAt, { format: 'relative' })}
                      </span>
                    </div>
                  </div>

                  <div className="item-content">
                    <div className="author-info">
                      <strong>
                        {item.author.ensName || 
                         `${item.author.address.slice(0, 6)}...${item.author.address.slice(-4)}`}
                      </strong>
                      <span className="reputation">
                        ({formatNumber(item.author.reputation)} rep)
                      </span>
                    </div>
                    
                    <div className="content-preview">
                      {item.content.length > 200
                        ? `${item.content.slice(0, 200)}...`
                        : item.content}
                    </div>

                    {item.reason && (
                      <div className="report-reason">
                        <strong>Report reason:</strong> {item.reason}
                      </div>
                    )}

                    {item.reportedBy && (
                      <div className="reported-by">
                        <strong>Reported by:</strong> {item.reportedBy}
                      </div>
                    )}
                  </div>

                  <div className="item-actions">
                    <button
                      onClick={() => handleItemAction(item.id, 'approve')}
                      className="action-btn approve"
                      title="Approve"
                    >
                      ✅ Approve
                    </button>
                    
                    <button
                      onClick={() => handleItemAction(item.id, 'reject')}
                      className="action-btn reject"
                      title="Reject"
                    >
                      ❌ Reject
                    </button>
                    
                    <button
                      onClick={() => handleItemAction(item.id, 'escalate')}
                      className="action-btn escalate"
                      title="Escalate to admin"
                    >
                      ⬆️ Escalate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .moderation-dashboard {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
        }

        .access-denied {
          text-align: center;
          padding: 3rem;
          color: var(--text-secondary);
        }

        .access-denied h3 {
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .dashboard-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .dashboard-header h2 {
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
        }

        .dashboard-header p {
          color: var(--text-secondary);
          margin: 0;
        }

        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          padding: 1.5rem;
          text-align: center;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .moderation-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border-light);
        }

        .tab {
          padding: 1rem 1.5rem;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
          font-weight: 500;
        }

        .tab:hover {
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }

        .tab.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
        }

        .bulk-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }

        .selection-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          color: var(--text-primary);
          font-weight: 500;
        }

        .clear-selection {
          background: none;
          border: none;
          color: var(--primary-color);
          cursor: pointer;
          text-decoration: underline;
        }

        .bulk-controls {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .bulk-select {
          padding: 0.5rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: 0.25rem;
          color: var(--text-primary);
        }

        .bulk-apply-btn {
          padding: 0.5rem 1rem;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          font-weight: 500;
        }

        .bulk-apply-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-state,
        .error-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
        }

        .loading-state p,
        .error-state p,
        .empty-state p {
          color: var(--text-secondary);
          margin: 1rem 0;
        }

        .error-state h3,
        .empty-state h3 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .retry-button {
          padding: 0.75rem 1.5rem;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
        }

        .list-controls {
          margin-bottom: 1rem;
        }

        .select-all-btn {
          padding: 0.5rem 1rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-light);
          border-radius: 0.25rem;
          color: var(--text-primary);
          cursor: pointer;
        }

        .items-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .moderation-item {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .item-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .item-checkbox {
          width: 18px;
          height: 18px;
        }

        .item-meta {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex: 1;
        }

        .item-type {
          font-weight: 500;
          color: var(--text-primary);
        }

        .severity-badge {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .item-date {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .item-content {
          margin-bottom: 1rem;
        }

        .author-info {
          margin-bottom: 0.5rem;
        }

        .author-info strong {
          color: var(--text-primary);
        }

        .reputation {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-left: 0.5rem;
        }

        .content-preview {
          color: var(--text-primary);
          line-height: 1.5;
          margin-bottom: 0.5rem;
        }

        .report-reason,
        .reported-by {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-top: 0.5rem;
        }

        .report-reason strong,
        .reported-by strong {
          color: var(--text-primary);
        }

        .item-actions {
          display: flex;
          gap: 1rem;
        }

        .action-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .action-btn.approve {
          background: var(--success-color);
          color: white;
        }

        .action-btn.reject {
          background: var(--error-color);
          color: white;
        }

        .action-btn.escalate {
          background: var(--warning-color);
          color: white;
        }

        .action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .moderation-dashboard {
            padding: 1rem;
          }

          .stats-overview {
            grid-template-columns: repeat(2, 1fr);
          }

          .moderation-tabs {
            flex-wrap: wrap;
          }

          .bulk-actions {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .item-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .item-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default ModerationDashboard;