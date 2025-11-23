import React, { useState, useEffect } from 'react';
import { WorkflowTemplate } from '@/types/workflow';
import { Button, GlassPanel } from '@/design-system';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { 
  Plus, 
  Play, 
  Edit, 
  Trash2, 
  Eye, 
  BarChart3,
  Filter,
  Search,
  Palette
} from 'lucide-react';

interface WorkflowListProps {
  onCreate: () => void;
  onEdit: (id: string) => void;
  onEditEnhanced: (id: string) => void;
  onView: (id: string) => void;
  onExecute: (id: string) => void;
}

export const WorkflowList: React.FC<WorkflowListProps> = ({ 
  onCreate, 
  onEdit, 
  onEditEnhanced,
  onView, 
  onExecute 
}) => {
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Mock data for demonstration
  useEffect(() => {
    // In a real implementation, this would fetch from the API
    const mockWorkflows: WorkflowTemplate[] = [
      {
        id: '1',
        name: 'Content Moderation Workflow',
        description: 'Automated content moderation with human review',
        category: 'moderation',
        triggerType: 'event',
        triggerConfig: {},
        isActive: true,
        createdAt: new Date('2023-01-15'),
        updatedAt: new Date('2023-01-20')
      },
      {
        id: '2',
        name: 'Seller Application Review',
        description: 'Review and approve new seller applications',
        category: 'seller_management',
        triggerType: 'manual',
        triggerConfig: {},
        isActive: true,
        createdAt: new Date('2023-02-01'),
        updatedAt: new Date('2023-02-05')
      },
      {
        id: '3',
        name: 'Dispute Resolution Process',
        description: 'Standard process for resolving user disputes',
        category: 'dispute_resolution',
        triggerType: 'event',
        triggerConfig: {},
        isActive: false,
        createdAt: new Date('2023-01-10'),
        updatedAt: new Date('2023-01-12')
      }
    ];
    
    setWorkflows(mockWorkflows);
    setFilteredWorkflows(mockWorkflows);
    setLoading(false);
  }, []);

  // Filter workflows based on search and filters
  useEffect(() => {
    let result = [...workflows];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(workflow => 
        workflow.name.toLowerCase().includes(term) || 
        workflow.description?.toLowerCase().includes(term)
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(workflow => workflow.category === categoryFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      result = result.filter(workflow => workflow.isActive === isActive);
    }
    
    setFilteredWorkflows(result);
  }, [workflows, searchTerm, categoryFilter, statusFilter]);

  const handleDelete = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        // TODO: Implement API call to delete workflow
        setWorkflows(prev => prev.filter(w => w.id !== templateId));
        console.log('Deleting workflow:', templateId);
      } catch (err) {
        console.error('Error deleting workflow:', err);
        alert('Failed to delete workflow');
      }
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      moderation: 'bg-blue-100 text-blue-800',
      seller_management: 'bg-green-100 text-green-800',
      dispute_resolution: 'bg-red-100 text-red-800',
      user_onboarding: 'bg-purple-100 text-purple-800',
      content_review: 'bg-yellow-100 text-yellow-800',
      system_maintenance: 'bg-gray-100 text-gray-800',
      compliance: 'bg-indigo-100 text-indigo-800',
      security: 'bg-orange-100 text-orange-800'
    };
    
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Inactive
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Workflow Automation</h2>
        
        <Button onClick={onCreate} className="flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      </div>
      
      {/* Filters */}
      <GlassPanel className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search workflows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="moderation">Content Moderation</option>
            <option value="seller_management">Seller Management</option>
            <option value="dispute_resolution">Dispute Resolution</option>
            <option value="user_onboarding">User Onboarding</option>
            <option value="content_review">Content Review</option>
            <option value="system_maintenance">System Maintenance</option>
            <option value="compliance">Compliance</option>
            <option value="security">Security</option>
          </Select>
          
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          
          <Button variant="outline" className="flex items-center justify-center">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>
      </GlassPanel>
      
      {/* Workflow List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredWorkflows.map((workflow) => (
          <GlassPanel key={workflow.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {workflow.name}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {workflow.description}
                </p>
              </div>
              {getStatusBadge(workflow.isActive)}
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(workflow.category)}`}>
                {workflow.category.replace('_', ' ')}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {workflow.triggerType}
              </span>
            </div>
            
            <div className="flex items-center text-xs text-gray-500 mb-4">
              <span>Created: {workflow.createdAt.toLocaleDateString()}</span>
              <span className="mx-2">•</span>
              <span>Updated: {workflow.updatedAt.toLocaleDateString()}</span>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEdit(workflow.id)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEditEnhanced(workflow.id)}
              >
                <Palette className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onExecute(workflow.id)}
              >
                <Play className="w-4 h-4" />
              </Button>
            </div>
          </GlassPanel>
        ))}
      </div>
      
      {filteredWorkflows.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No workflows found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by creating a new workflow'}
          </p>
          <div className="mt-6">
            <Button onClick={onCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};