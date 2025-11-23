import React, { useState } from 'react';
import { Users, Filter, Save, Plus, Trash2, Edit3 } from 'lucide-react';
import { Button, GlassPanel } from '@/design-system';

interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    role?: string;
    status?: string;
    kycStatus?: string;
    activityLevel?: 'low' | 'medium' | 'high';
    registrationDate?: { from?: string; to?: string };
  };
  userCount: number;
  createdAt: string;
}

export function UserSegmentation() {
  const [segments, setSegments] = useState<UserSegment[]>([
    {
      id: '1',
      name: 'High-Value Users',
      description: 'Users with advanced KYC and high activity',
      criteria: {
        kycStatus: 'advanced',
        activityLevel: 'high'
      },
      userCount: 1247,
      createdAt: '2023-06-15'
    },
    {
      id: '2',
      name: 'New Registrations',
      description: 'Users who registered in the last 30 days',
      criteria: {
        registrationDate: {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      },
      userCount: 892,
      createdAt: '2023-06-10'
    },
    {
      id: '3',
      name: 'Inactive Users',
      description: 'Users with no activity in the last 90 days',
      criteria: {
        activityLevel: 'low'
      },
      userCount: 3421,
      createdAt: '2023-06-05'
    }
  ]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSegment, setEditingSegment] = useState<UserSegment | null>(null);
  const [newSegment, setNewSegment] = useState<Omit<UserSegment, 'id' | 'userCount' | 'createdAt'>>({
    name: '',
    description: '',
    criteria: {}
  });

  const handleCreateSegment = () => {
    const segment: UserSegment = {
      id: Math.random().toString(36).substr(2, 9),
      ...newSegment,
      userCount: 0, // In a real implementation, this would be calculated
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setSegments([...segments, segment]);
    setNewSegment({ name: '', description: '', criteria: {} });
    setShowCreateModal(false);
  };

  const handleUpdateSegment = () => {
    if (!editingSegment) return;
    
    setSegments(segments.map(seg => 
      seg.id === editingSegment.id ? editingSegment : seg
    ));
    setEditingSegment(null);
  };

  const handleDeleteSegment = (id: string) => {
    setSegments(segments.filter(seg => seg.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Segmentation</h2>
          <p className="text-gray-400">Create and manage user segments for targeted actions</p>
        </div>
        <Button 
          variant="primary" 
          className="flex items-center gap-2"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4" />
          Create Segment
        </Button>
      </div>

      {/* Segments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {segments.map((segment) => (
          <GlassPanel key={segment.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{segment.name}</h3>
                <p className="text-gray-400 text-sm mt-1">{segment.description}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setEditingSegment(segment)}
                  className="text-gray-400 hover:text-white"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteSegment(segment.id)}
                  className="text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Users</span>
                <span className="text-white font-medium">{segment.userCount.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Created</span>
                <span className="text-white text-sm">{segment.createdAt}</span>
              </div>
              
              <div className="pt-3 border-t border-gray-700">
                <div className="flex flex-wrap gap-1">
                  {segment.criteria.role && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                      Role: {segment.criteria.role}
                    </span>
                  )}
                  {segment.criteria.status && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                      Status: {segment.criteria.status}
                    </span>
                  )}
                  {segment.criteria.kycStatus && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                      KYC: {segment.criteria.kycStatus}
                    </span>
                  )}
                  {segment.criteria.activityLevel && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                      Activity: {segment.criteria.activityLevel}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1">
                  View Users
                </Button>
                <Button variant="primary" size="sm" className="flex-1">
                  Take Action
                </Button>
              </div>
            </div>
          </GlassPanel>
        ))}
      </div>

      {/* Create Segment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">Create User Segment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Segment Name</label>
                <input
                  type="text"
                  value={newSegment.name}
                  onChange={(e) => setNewSegment({...newSegment, name: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="e.g., High-Value Users"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Description</label>
                <textarea
                  value={newSegment.description}
                  onChange={(e) => setNewSegment({...newSegment, description: e.target.value})}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Describe this segment..."
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Segmentation Criteria</label>
                <div className="space-y-3">
                  <select
                    value={newSegment.criteria.role || ''}
                    onChange={(e) => setNewSegment({
                      ...newSegment, 
                      criteria: {...newSegment.criteria, role: e.target.value || undefined}
                    })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select Role (Optional)</option>
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  
                  <select
                    value={newSegment.criteria.status || ''}
                    onChange={(e) => setNewSegment({
                      ...newSegment, 
                      criteria: {...newSegment.criteria, status: e.target.value || undefined}
                    })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select Status (Optional)</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  
                  <select
                    value={newSegment.criteria.kycStatus || ''}
                    onChange={(e) => setNewSegment({
                      ...newSegment, 
                      criteria: {...newSegment.criteria, kycStatus: e.target.value || undefined}
                    })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select KYC Status (Optional)</option>
                    <option value="none">None</option>
                    <option value="pending">Pending</option>
                    <option value="basic">Basic</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  
                  <select
                    value={newSegment.criteria.activityLevel || ''}
                    onChange={(e) => setNewSegment({
                      ...newSegment, 
                      criteria: {...newSegment.criteria, activityLevel: e.target.value as any || undefined}
                    })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select Activity Level (Optional)</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button onClick={handleCreateSegment} variant="primary">
                Create Segment
              </Button>
              <Button onClick={() => setShowCreateModal(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Edit Segment Modal */}
      {editingSegment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">Edit User Segment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Segment Name</label>
                <input
                  type="text"
                  value={editingSegment.name}
                  onChange={(e) => setEditingSegment({...editingSegment, name: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Description</label>
                <textarea
                  value={editingSegment.description}
                  onChange={(e) => setEditingSegment({...editingSegment, description: e.target.value})}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Segmentation Criteria</label>
                <div className="space-y-3">
                  <select
                    value={editingSegment.criteria.role || ''}
                    onChange={(e) => setEditingSegment({
                      ...editingSegment, 
                      criteria: {...editingSegment.criteria, role: e.target.value || undefined}
                    })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select Role (Optional)</option>
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  
                  <select
                    value={editingSegment.criteria.status || ''}
                    onChange={(e) => setEditingSegment({
                      ...editingSegment, 
                      criteria: {...editingSegment.criteria, status: e.target.value || undefined}
                    })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select Status (Optional)</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  
                  <select
                    value={editingSegment.criteria.kycStatus || ''}
                    onChange={(e) => setEditingSegment({
                      ...editingSegment, 
                      criteria: {...editingSegment.criteria, kycStatus: e.target.value || undefined}
                    })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select KYC Status (Optional)</option>
                    <option value="none">None</option>
                    <option value="pending">Pending</option>
                    <option value="basic">Basic</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  
                  <select
                    value={editingSegment.criteria.activityLevel || ''}
                    onChange={(e) => setEditingSegment({
                      ...editingSegment, 
                      criteria: {...editingSegment.criteria, activityLevel: e.target.value as any || undefined}
                    })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select Activity Level (Optional)</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button onClick={handleUpdateSegment} variant="primary">
                Update Segment
              </Button>
              <Button onClick={() => setEditingSegment(null)} variant="outline">
                Cancel
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}