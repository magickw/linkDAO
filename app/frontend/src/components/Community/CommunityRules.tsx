/**
 * CommunityRules Component
 * Displays and manages community rules with enforcement indicators
 */

import React, { useState } from 'react';

interface Rule {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  enforced: boolean;
  violationCount?: number;
}

interface CommunityRulesProps {
  communityId: string;
  rules: string[];
  canEdit: boolean;
  onRulesUpdate: (rules: string[]) => void;
}

export const CommunityRules: React.FC<CommunityRulesProps> = ({
  communityId,
  rules,
  canEdit,
  onRulesUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRules, setEditedRules] = useState<string[]>(rules);
  const [newRule, setNewRule] = useState('');

  // Convert string rules to structured rules for display
  const structuredRules: Rule[] = rules.map((rule, index) => ({
    id: `rule-${index}`,
    title: `Rule ${index + 1}`,
    description: rule,
    severity: 'medium' as const,
    enforced: true,
    violationCount: Math.floor(Math.random() * 10) // Mock data
  }));

  const handleSaveRules = async () => {
    try {
      // Filter out empty rules
      const filteredRules = editedRules.filter(rule => rule.trim() !== '');
      
      // Update rules via API
      const response = await fetch(`/api/communities/${communityId}/rules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rules: filteredRules })
      });

      if (!response.ok) {
        throw new Error('Failed to update rules');
      }

      onRulesUpdate(filteredRules);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating rules:', error);
      // Show error message to user
    }
  };

  const handleCancelEdit = () => {
    setEditedRules(rules);
    setNewRule('');
    setIsEditing(false);
  };

  const handleAddRule = () => {
    if (newRule.trim()) {
      setEditedRules([...editedRules, newRule.trim()]);
      setNewRule('');
    }
  };

  const handleRemoveRule = (index: number) => {
    setEditedRules(editedRules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, value: string) => {
    const updated = [...editedRules];
    updated[index] = value;
    setEditedRules(updated);
  };

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
      case 'high':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        );
      case 'medium':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
      case 'low':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  if (rules.length === 0 && !canEdit) {
    return (
      <div className="no-rules">
        <h3>No Rules Set</h3>
        <p>This community hasn't established any rules yet.</p>
      </div>
    );
  }

  return (
    <div className="community-rules">
      <div className="rules-header">
        <h2>Community Rules</h2>
        {canEdit && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-outline"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            Edit Rules
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="rules-editor">
          <div className="editor-header">
            <h3>Edit Community Rules</h3>
            <p>Clear and specific rules help maintain a healthy community environment.</p>
          </div>

          <div className="rules-list">
            {editedRules.map((rule, index) => (
              <div key={index} className="rule-editor">
                <div className="rule-number">{index + 1}</div>
                <textarea
                  value={rule}
                  onChange={(e) => handleRuleChange(index, e.target.value)}
                  placeholder="Enter rule description..."
                  className="rule-textarea"
                  rows={3}
                />
                <button
                  onClick={() => handleRemoveRule(index)}
                  className="remove-rule-btn"
                  title="Remove rule"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="add-rule">
            <div className="rule-number">{editedRules.length + 1}</div>
            <textarea
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="Add a new rule..."
              className="rule-textarea"
              rows={3}
            />
            <button
              onClick={handleAddRule}
              disabled={!newRule.trim()}
              className="add-rule-btn"
              title="Add rule"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
          </div>

          <div className="editor-actions">
            <button onClick={handleCancelEdit} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleSaveRules} className="btn btn-primary">
              Save Rules
            </button>
          </div>
        </div>
      ) : (
        <div className="rules-display">
          {structuredRules.length === 0 ? (
            <div className="no-rules">
              <p>No rules have been set for this community.</p>
              {canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-primary"
                >
                  Add First Rule
                </button>
              )}
            </div>
          ) : (
            <div className="rules-list">
              {structuredRules.map((rule, index) => (
                <div key={rule.id} className="rule-item">
                  <div className="rule-header">
                    <div className="rule-number">{index + 1}</div>
                    <div className="rule-meta">
                      <span 
                        className="severity-badge"
                        style={{ color: getSeverityColor(rule.severity) }}
                      >
                        {getSeverityIcon(rule.severity)}
                        {rule.severity}
                      </span>
                      {rule.enforced && (
                        <span className="enforced-badge">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                          </svg>
                          Enforced
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="rule-content">
                    <p>{rule.description}</p>
                  </div>

                  {rule.violationCount !== undefined && rule.violationCount > 0 && (
                    <div className="rule-stats">
                      <span className="violation-count">
                        {rule.violationCount} violation{rule.violationCount !== 1 ? 's' : ''} this month
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {structuredRules.length > 0 && (
            <div className="rules-footer">
              <div className="enforcement-info">
                <h4>Rule Enforcement</h4>
                <p>
                  Rules are automatically monitored and enforced by community moderators. 
                  Violations may result in warnings, temporary restrictions, or permanent bans 
                  depending on severity and frequency.
                </p>
              </div>

              <div className="reporting-info">
                <h4>Report Violations</h4>
                <p>
                  If you see content that violates these rules, please report it using the 
                  report button on posts and comments. All reports are reviewed by moderators.
                </p>
                <button className="btn btn-outline">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
                  </svg>
                  Report Content
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .community-rules {
          max-width: 800px;
        }

        .no-rules {
          text-align: center;
          padding: 3rem;
          color: var(--text-secondary);
        }

        .no-rules h3 {
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .rules-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .rules-header h2 {
          color: var(--text-primary);
          margin: 0;
        }

        .rules-editor {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          padding: 2rem;
        }

        .editor-header {
          margin-bottom: 2rem;
        }

        .editor-header h3 {
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
        }

        .editor-header p {
          color: var(--text-secondary);
          margin: 0;
        }

        .rules-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .rule-editor,
        .add-rule {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .rule-item {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .rule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .rule-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--primary-color);
          color: white;
          border-radius: 50%;
          font-weight: bold;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .rule-meta {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .severity-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .enforced-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--success-color);
          background: rgba(76, 175, 80, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
        }

        .rule-content p {
          color: var(--text-primary);
          line-height: 1.6;
          margin: 0;
        }

        .rule-stats {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-light);
        }

        .violation-count {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .rule-textarea {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid var(--border-light);
          border-radius: 0.25rem;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
        }

        .rule-textarea:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        .remove-rule-btn,
        .add-rule-btn {
          padding: 0.5rem;
          background: var(--error-color);
          border: none;
          border-radius: 0.25rem;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-rule-btn {
          background: var(--success-color);
        }

        .add-rule-btn:disabled {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          cursor: not-allowed;
        }

        .remove-rule-btn:hover:not(:disabled) {
          background: var(--error-color-dark);
        }

        .add-rule-btn:hover:not(:disabled) {
          background: var(--success-color-dark);
        }

        .editor-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border-light);
        }

        .rules-footer {
          margin-top: 3rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .enforcement-info,
        .reporting-info {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .enforcement-info h4,
        .reporting-info h4 {
          color: var(--text-primary);
          margin: 0 0 1rem 0;
          font-size: 1rem;
        }

        .enforcement-info p,
        .reporting-info p {
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 1rem 0;
          font-size: 0.875rem;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .btn-primary {
          background: var(--primary-color);
          color: white;
        }

        .btn-primary:hover {
          background: var(--primary-color-dark);
        }

        .btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-light);
        }

        .btn-secondary:hover {
          background: var(--bg-quaternary);
        }

        .btn-outline {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-light);
        }

        .btn-outline:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .rules-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .rule-editor,
          .add-rule {
            flex-direction: column;
          }

          .rule-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .rule-meta {
            flex-wrap: wrap;
          }

          .rules-footer {
            grid-template-columns: 1fr;
          }

          .editor-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default CommunityRules;