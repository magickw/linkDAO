import React, { useState, useEffect } from 'react';
import { LayoutConfig } from '../../../../stores/adminDashboardStore';
import { adminService } from '@/services/adminService';
import { AuthUser } from '@/types/auth';

interface TableWidgetProps {
  widget: LayoutConfig;
  isEditMode: boolean;
  onAction: (widgetId: string, action: string) => void;
}

export const TableWidget: React.FC<TableWidgetProps> = ({
  widget,
  isEditMode,
  onAction
}) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getUsers({ limit: 5 });
      setUsers(response.users);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (widget.minimized) {
    return (
      <div className="table-widget minimized">
        <div className="minimized-content">
          <span className="widget-title">{widget.config.title || 'Data Table'}</span>
          <span className="row-count">{users.length} rows</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="table-widget">
        <div className="widget-header">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3"></div>
          <div className="flex space-x-2">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse w-8"></div>
          </div>
        </div>
        <div className="widget-content p-4 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="table-widget">
        <div className="widget-content p-4 text-center">
          <p className="text-red-500">Error: {error}</p>
          <button 
            onClick={loadUsers}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="table-widget">
      <div className="widget-header">
        <h3 className="widget-title">{widget.config.title || 'Admin Users'}</h3>
        <div className="table-controls">
          <input
            type="text"
            placeholder="Search..."
            className="search-input"
          />
          <button className="export-btn">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="widget-content">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {user.handle ? user.handle.charAt(0).toUpperCase() : '?'}
                      </div>
                      <span className="user-email">{user.handle || 'N/A'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${user.isSuspended ? 'inactive' : 'active'}`}>
                      {user.isSuspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="last-login">
                    {user.lastLogin 
                      ? new Date(user.lastLogin).toLocaleDateString() 
                      : 'Never'}
                  </td>
                  <td>
                    <span className="role-badge">{user.role}</span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="action-btn delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <div className="pagination-info">
            Showing 1-{users.length} of {users.length} entries
          </div>
          <div className="pagination-controls">
            <button className="pagination-btn" disabled>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="page-number">1</span>
            <button className="pagination-btn" disabled>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isEditMode && (
        <div className="edit-overlay">
          <div className="edit-message">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Configure table</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .table-widget {
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          background: white;
        }

        .table-widget.minimized {
          height: 40px;
          overflow: hidden;
        }

        .minimized-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          height: 100%;
        }

        .row-count {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .widget-header {
          padding: 12px 16px 8px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .widget-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }

        .table-controls {
          display: flex;
          align-items: center;
          space-x: 8px;
        }

        .search-input {
          font-size: 0.75rem;
          padding: 6px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          width: 120px;
        }

        .export-btn {
          padding: 6px;
          color: #6b7280;
          hover:color: #374151;
          hover:background: #f3f4f6;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .widget-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .table-container {
          flex: 1;
          overflow: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .data-table th {
          background: #f9fafb;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .data-table td {
          padding: 12px 8px;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: middle;
        }

        .data-table tr:hover {
          background: #f9fafb;
        }

        .user-cell {
          display: flex;
          align-items: center;
          space-x: 8px;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .user-email {
          color: #374151;
          font-weight: 500;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status-badge.active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .role-badge {
          background: #e0e7ff;
          color: #3730a3;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .last-login {
          color: #6b7280;
          font-size: 0.8125rem;
        }

        .action-buttons {
          display: flex;
          space-x: 4px;
        }

        .action-btn {
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .action-btn.edit {
          color: #3b82f6;
          hover:background: #dbeafe;
        }

        .action-btn.delete {
          color: #ef4444;
          hover:background: #fee2e2;
        }

        .table-footer {
          padding: 12px 16px;
          border-top: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f9fafb;
        }

        .pagination-info {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          space-x: 8px;
        }

        .pagination-btn {
          padding: 4px;
          color: #6b7280;
          hover:color: #374151;
          hover:background: #f3f4f6;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-number {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          padding: 4px 8px;
        }

        .edit-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(59, 130, 246, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
          cursor: pointer;
        }

        .table-widget:hover .edit-overlay {
          opacity: 1;
        }

        .edit-message {
          display: flex;
          align-items: center;
          space-x: 8px;
          color: #3b82f6;
          font-size: 0.875rem;
          font-weight: 500;
          background: white;
          padding: 8px 12px;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .table-controls {
            flex-direction: column;
            space-y: 4px;
          }
          
          .search-input {
            width: 100px;
          }
          
          .data-table {
            font-size: 0.8125rem;
          }
          
          .data-table th,
          .data-table td {
            padding: 8px 4px;
          }
          
          .user-avatar {
            width: 24px;
            height: 24px;
            font-size: 0.75rem;
          }
          
          .table-footer {
            flex-direction: column;
            space-y: 8px;
          }
        }
      `}</style>
    </div>
  );
};