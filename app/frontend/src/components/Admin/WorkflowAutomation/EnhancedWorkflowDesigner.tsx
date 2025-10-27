import React, { useState, useEffect } from 'react';
import {
  WorkflowTemplate,
  WorkflowStep,
  WorkflowDesignerData,
  WorkflowDesignerNode,
  WorkflowDesignerEdge,
  WorkflowCategory,
  TriggerType,
  StepType
} from '@/types/workflow';
import { adminService } from '@/services/adminService';
import { Button, GlassPanel } from '@/design-system';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TextArea } from '@/components/ui/textarea';
import { 
  Plus, 
  Save, 
  Play, 
  Trash2, 
  Settings, 
  ArrowRight, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Copy,
  Zap,
  Clock,
  Users,
  Database,
  GitBranch,
  Palette,
  Eye,
  EyeOff,
  Bell,
  Edit3,
  AlertTriangle
} from 'lucide-react';

interface EnhancedWorkflowDesignerProps {
  templateId?: string;
  onSave?: (template: WorkflowTemplate) => void;
  onCancel?: () => void;
}

interface WorkflowTemplateVersion {
  id: string;
  version: string;
  createdAt: string;
  createdBy: string;
  changes: string;
}

export const EnhancedWorkflowDesigner: React.FC<EnhancedWorkflowDesignerProps> = ({ 
  templateId, 
  onSave, 
  onCancel 
}) => {
  const [workflowData, setWorkflowData] = useState<WorkflowDesignerData>({
    nodes: [],
    edges: [],
    metadata: {
      name: '',
      description: '',
      category: 'moderation',
      triggerType: 'event',
      triggerConfig: {},
      version: '1.0.0',
      tags: [],
      priority: 'medium'
    }
  });
  
  const [selectedNode, setSelectedNode] = useState<WorkflowDesignerNode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [versions, setVersions] = useState<WorkflowTemplateVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [showExecutionHistory, setShowExecutionHistory] = useState(false);

  // Load existing workflow template if editing
  useEffect(() => {
    if (templateId) {
      loadWorkflowTemplate(templateId);
      loadVersions();
      loadExecutionHistory();
    }
  }, [templateId]);

  const loadWorkflowTemplate = async (id: string) => {
    try {
      // In a real implementation, this would call an API endpoint
      console.log('Loading workflow template:', id);
    } catch (err) {
      setError('Failed to load workflow template');
      console.error('Error loading workflow template:', err);
    }
  };

  const loadVersions = async () => {
    try {
      // Mock versions data
      const mockVersions: WorkflowTemplateVersion[] = [
        { id: 'v1', version: '1.0.0', createdAt: '2023-06-01', createdBy: 'admin1', changes: 'Initial version' },
        { id: 'v2', version: '1.1.0', createdAt: '2023-06-10', createdBy: 'admin2', changes: 'Added approval step' },
        { id: 'v3', version: '1.2.0', createdAt: '2023-06-15', createdBy: 'admin1', changes: 'Updated notification logic' }
      ];
      setVersions(mockVersions);
    } catch (err) {
      console.error('Error loading versions:', err);
    }
  };

  const loadExecutionHistory = async () => {
    try {
      // Mock execution history data
      const mockHistory = [
        { id: '1', startedAt: '2023-06-15T10:30:00Z', status: 'completed', duration: '2.4s' },
        { id: '2', startedAt: '2023-06-15T09:15:00Z', status: 'failed', duration: '1.2s' },
        { id: '3', startedAt: '2023-06-14T16:45:00Z', status: 'completed', duration: '3.1s' }
      ];
      setExecutionHistory(mockHistory);
    } catch (err) {
      console.error('Error loading execution history:', err);
    }
  };

  const addNode = (type: StepType, position: { x: number; y: number }) => {
    const newNode: WorkflowDesignerNode = {
      id: `node-${Date.now()}`,
      type,
      position,
      data: {
        label: `${type} Step`,
        config: {},
        conditions: {}
      }
    };
    
    setWorkflowData(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
  };

  const updateNode = (nodeId: string, updates: Partial<WorkflowDesignerNode>) => {
    setWorkflowData(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }));
  };

  const deleteNode = (nodeId: string) => {
    setWorkflowData(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      edges: prev.edges.filter(
        edge => edge.source !== nodeId && edge.target !== nodeId
      )
    }));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const duplicateNode = (node: WorkflowDesignerNode) => {
    const duplicatedNode: WorkflowDesignerNode = {
      ...node,
      id: `node-${Date.now()}`,
      position: { x: node.position.x + 50, y: node.position.y + 50 }
    };
    
    setWorkflowData(prev => ({
      ...prev,
      nodes: [...prev.nodes, duplicatedNode]
    }));
  };

  const addEdge = (source: string, target: string) => {
    const newEdge: WorkflowDesignerEdge = {
      id: `edge-${Date.now()}`,
      source,
      target,
      type: 'default'
    };
    
    setWorkflowData(prev => ({
      ...prev,
      edges: [...prev.edges, newEdge]
    }));
  };

  const updateMetadata = (updates: Partial<WorkflowDesignerData['metadata']>) => {
    setWorkflowData(prev => ({
      ...prev,
      metadata: { ...prev.metadata, ...updates }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validate workflow
      if (!workflowData.metadata.name.trim()) {
        throw new Error('Workflow name is required');
      }
      
      if (workflowData.nodes.length === 0) {
        throw new Error('Workflow must have at least one step');
      }
      
      // In a real implementation, this would call an API endpoint
      console.log('Saving workflow:', workflowData);
      
      setSuccess('Workflow saved successfully');
      if (onSave) {
        // Create a mock template for the callback
        const template: WorkflowTemplate = {
          id: templateId || `template-${Date.now()}`,
          name: workflowData.metadata.name,
          description: workflowData.metadata.description,
          category: workflowData.metadata.category,
          triggerType: workflowData.metadata.triggerType,
          triggerConfig: workflowData.metadata.triggerConfig,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        onSave(template);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workflow');
      console.error('Error saving workflow:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      // In a real implementation, this would call an API endpoint
      console.log('Testing workflow:', workflowData);
      setSuccess('Workflow test initiated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test workflow');
      console.error('Error testing workflow:', err);
    }
  };

  const handlePublish = async () => {
    try {
      // In a real implementation, this would call an API endpoint
      console.log('Publishing workflow:', workflowData);
      setSuccess('Workflow published successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish workflow');
      console.error('Error publishing workflow:', err);
    }
  };

  const getNodeIcon = (type: StepType) => {
    switch (type) {
      case 'action': return <Zap className="w-4 h-4" />;
      case 'condition': return <GitBranch className="w-4 h-4" />;
      case 'assignment': return <Users className="w-4 h-4" />;
      case 'notification': return <Bell className="w-4 h-4" />;
      case 'escalation': return <AlertTriangle className="w-4 h-4" />;
      case 'approval': return <CheckCircle className="w-4 h-4" />;
      case 'data': return <Database className="w-4 h-4" />;
      case 'delay': return <Clock className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getNodeColor = (type: StepType) => {
    switch (type) {
      case 'action': return 'bg-blue-100 border-blue-300';
      case 'condition': return 'bg-yellow-100 border-yellow-300';
      case 'assignment': return 'bg-purple-100 border-purple-300';
      case 'notification': return 'bg-green-100 border-green-300';
      case 'escalation': return 'bg-red-100 border-red-300';
      case 'approval': return 'bg-indigo-100 border-indigo-300';
      case 'data': return 'bg-teal-100 border-teal-300';
      case 'delay': return 'bg-orange-100 border-orange-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  // Render node based on type
  const renderNode = (node: WorkflowDesignerNode) => {
    const isSelected = selectedNode?.id === node.id;
    
    return (
      <div 
        className={`absolute p-4 rounded-lg shadow-lg cursor-pointer transition-all duration-200 border-2 ${
          isSelected 
            ? 'ring-2 ring-blue-500 bg-blue-50' 
            : getNodeColor(node.type)
        }`}
        style={{ 
          left: node.position.x, 
          top: node.position.y,
          minWidth: '220px'
        }}
        onClick={() => setSelectedNode(node)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="mr-2 text-gray-600">
              {getNodeIcon(node.type)}
            </div>
            <h3 className="font-semibold text-gray-800 truncate">{node.data.label}</h3>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                duplicateNode(node);
              }}
            >
              <Copy className="w-3 h-3 text-gray-500" />
            </Button>
            <Button 
              variant="ghost" 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                deleteNode(node.id);
              }}
            >
              <Trash2 className="w-3 h-3 text-red-500" />
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-gray-600 mb-2 flex items-center">
          <span className="bg-gray-200 px-2 py-1 rounded mr-2">{node.type}</span>
          {node.data.config && Object.keys(node.data.config).length > 0 && (
            <span className="text-green-600 flex items-center">
              <CheckCircle className="w-3 h-3 mr-1" />
              Configured
            </span>
          )}
        </div>
        
        {node.data.conditions && Object.keys(node.data.conditions).length > 0 && (
          <div className="text-xs text-purple-600 flex items-center">
            <GitBranch className="w-3 h-3 mr-1" />
            Conditional logic
          </div>
        )}
      </div>
    );
  };

  // Render edge (connection line)
  const renderEdge = (edge: WorkflowDesignerEdge) => {
    // In a real implementation, this would use a library like react-flow
    // For now, we'll just show a simple representation
    return (
      <div 
        key={edge.id}
        className="absolute text-xs text-gray-400 flex items-center"
        style={{ 
          left: '50%', 
          top: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        <ArrowRight className="w-4 h-4 mx-1" />
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Palette className="w-5 h-5 mr-2 text-blue-600" />
            {templateId ? 'Edit Workflow' : 'Create Workflow'}
          </h2>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">v{workflowData.metadata.version}</span>
            {versions.length > 0 && (
              <button 
                onClick={() => setShowVersions(!showVersions)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                ({versions.length} versions)
              </button>
            )}
          </div>
          
          {error && (
            <div className="flex items-center text-red-600 bg-red-50 px-3 py-1 rounded-md">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-md">
              <CheckCircle className="w-4 h-4 mr-1" />
              <span className="text-sm">{success}</span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant={previewMode ? "primary" : "outline"} 
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {previewMode ? 'Exit Preview' : 'Preview'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowExecutionHistory(!showExecutionHistory)}
          >
            <Clock className="w-4 h-4 mr-2" />
            History
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleTest}
            disabled={isSaving}
          >
            <Play className="w-4 h-4 mr-2" />
            Test
          </Button>
          
          <Button 
            onClick={handlePublish}
            disabled={isSaving}
          >
            <Zap className="w-4 h-4 mr-2" />
            Publish
          </Button>
          
          <Button 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
          
          {onCancel && (
            <Button 
              variant="ghost" 
              onClick={onCancel}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>
      
      {/* Workflow Metadata Form */}
      <GlassPanel className="p-4 m-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Workflow Name"
            value={workflowData.metadata.name}
            onChange={(e) => updateMetadata({ name: e.target.value })}
            placeholder="Enter workflow name"
            required
          />
          
          <Select
            label="Category"
            value={workflowData.metadata.category}
            onChange={(e) => updateMetadata({ category: e.target.value as WorkflowCategory })}
          >
            <option value="moderation">Content Moderation</option>
            <option value="seller_management">Seller Management</option>
            <option value="dispute_resolution">Dispute Resolution</option>
            <option value="user_onboarding">User Onboarding</option>
            <option value="content_review">Content Review</option>
            <option value="system_maintenance">System Maintenance</option>
            <option value="compliance">Compliance</option>
            <option value="security">Security</option>
            <option value="analytics">Analytics</option>
            <option value="notifications">Notifications</option>
          </Select>
          
          <Select
            label="Trigger Type"
            value={workflowData.metadata.triggerType}
            onChange={(e) => updateMetadata({ triggerType: e.target.value as TriggerType })}
          >
            <option value="event">Event</option>
            <option value="schedule">Schedule</option>
            <option value="manual">Manual</option>
            <option value="condition">Condition</option>
            <option value="webhook">Webhook</option>
            <option value="api_call">API Call</option>
          </Select>
          
          <Select
            label="Priority"
            value={workflowData.metadata.priority || 'medium'}
            onChange={(e) => updateMetadata({ priority: e.target.value as any })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
          
          <div className="lg:col-span-2">
            <Input
              label="Tags"
              value={workflowData.metadata.tags?.join(', ') || ''}
              onChange={(e) => updateMetadata({ 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
              })}
              placeholder="Enter tags separated by commas"
            />
          </div>
          
          <TextArea
            label="Description"
            value={workflowData.metadata.description || ''}
            onChange={(e) => updateMetadata({ description: e.target.value })}
            placeholder="Describe what this workflow does"
            rows={2}
          />
        </div>
      </GlassPanel>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="w-64 p-4 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <h3 className="font-semibold text-gray-700 mb-4">Workflow Steps</h3>
          
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode('action', { x: 100, y: 100 })}
            >
              <Zap className="w-4 h-4 mr-2 text-blue-500" />
              Action Step
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode('condition', { x: 100, y: 150 })}
            >
              <GitBranch className="w-4 h-4 mr-2 text-yellow-500" />
              Condition Step
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode('assignment', { x: 100, y: 200 })}
            >
              <Users className="w-4 h-4 mr-2 text-purple-500" />
              Assignment Step
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode('notification', { x: 100, y: 250 })}
            >
              <Bell className="w-4 h-4 mr-2 text-green-500" />
              Notification Step
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode('escalation', { x: 100, y: 300 })}
            >
              <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
              Escalation Step
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode('approval', { x: 100, y: 350 })}
            >
              <CheckCircle className="w-4 h-4 mr-2 text-indigo-500" />
              Approval Step
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode('data', { x: 100, y: 400 })}
            >
              <Database className="w-4 h-4 mr-2 text-teal-500" />
              Data Step
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode('delay', { x: 100, y: 450 })}
            >
              <Clock className="w-4 h-4 mr-2 text-orange-500" />
              Delay Step
            </Button>
          </div>
          
          {selectedNode && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 mb-2">Step Configuration</h3>
              <div className="bg-white p-3 rounded-lg shadow">
                <Input
                  label="Step Name"
                  value={selectedNode.data.label}
                  onChange={(e) => updateNode(selectedNode.id, {
                    data: { ...selectedNode.data, label: e.target.value }
                  })}
                  className="mb-2"
                />
                
                <TextArea
                  label="Step Configuration"
                  value={JSON.stringify(selectedNode.data.config, null, 2)}
                  onChange={(e) => {
                    try {
                      const config = JSON.parse(e.target.value);
                      updateNode(selectedNode.id, {
                        data: { ...selectedNode.data, config }
                      });
                    } catch (err) {
                      // Ignore invalid JSON
                    }
                  }}
                  rows={4}
                  className="font-mono text-xs"
                />
                
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => setSelectedNode(null)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Advanced Settings
                </Button>
              </div>
            </div>
          )}
          
          {/* Versions Panel */}
          {showVersions && versions.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 mb-2">Versions</h3>
              <div className="bg-white p-3 rounded-lg shadow max-h-60 overflow-y-auto">
                {versions.map(version => (
                  <div key={version.id} className="py-2 border-b border-gray-100 last:border-0">
                    <div className="flex justify-between">
                      <span className="font-medium">v{version.version}</span>
                      <span className="text-xs text-gray-500">{version.createdAt}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{version.changes}</div>
                    <div className="text-xs text-gray-500">by {version.createdBy}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Execution History Panel */}
          {showExecutionHistory && executionHistory.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 mb-2">Execution History</h3>
              <div className="bg-white p-3 rounded-lg shadow max-h-60 overflow-y-auto">
                {executionHistory.map(history => (
                  <div key={history.id} className="py-2 border-b border-gray-100 last:border-0">
                    <div className="flex justify-between">
                      <span className={`font-medium ${
                        history.status === 'completed' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {history.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(history.startedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Duration: {history.duration}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Canvas Area */}
        <div className="flex-1 relative bg-gray-100 overflow-hidden">
          <div 
            className="w-full h-full relative"
            style={{ 
              backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          >
            {/* Render nodes */}
            {workflowData.nodes.map(node => renderNode(node))}
            
            {/* Render edges */}
            {workflowData.edges.map(edge => renderEdge(edge))}
            
            {/* Empty state */}
            {workflowData.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-lg mb-2">No workflow steps added yet</div>
                  <div className="text-sm">Use the toolbar to add steps to your workflow</div>
                </div>
              </div>
            )}
            
            {/* Preview Overlay */}
            {previewMode && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
                  <h3 className="text-lg font-bold mb-2">Preview Mode</h3>
                  <p className="text-gray-600 mb-4">
                    You are viewing this workflow in preview mode. Changes made here won't be saved.
                  </p>
                  <Button onClick={() => setPreviewMode(false)}>Exit Preview</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};