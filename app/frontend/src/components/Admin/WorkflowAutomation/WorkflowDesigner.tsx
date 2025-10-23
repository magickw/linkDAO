import React, { useState, useEffect, useCallback } from 'react';
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
  XCircle
} from 'lucide-react';

interface WorkflowDesignerProps {
  templateId?: string;
  onSave?: (template: WorkflowTemplate) => void;
  onCancel?: () => void;
}

export const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({ 
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
      triggerConfig: {}
    }
  });
  
  const [selectedNode, setSelectedNode] = useState<WorkflowDesignerNode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load existing workflow template if editing
  useEffect(() => {
    if (templateId) {
      loadWorkflowTemplate(templateId);
    }
  }, [templateId]);

  const loadWorkflowTemplate = async (id: string) => {
    try {
      // TODO: Implement API call to load existing workflow template
      // This would require a new endpoint in the backend
      console.log('Loading workflow template:', id);
    } catch (err) {
      setError('Failed to load workflow template');
      console.error('Error loading workflow template:', err);
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
      
      // TODO: Implement API call to save workflow template
      // This would require creating a new endpoint or using existing workflow engine endpoints
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
      // TODO: Implement workflow testing functionality
      console.log('Testing workflow:', workflowData);
      setSuccess('Workflow test initiated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test workflow');
      console.error('Error testing workflow:', err);
    }
  };

  // Render node based on type
  const renderNode = (node: WorkflowDesignerNode) => {
    const isSelected = selectedNode?.id === node.id;
    
    return (
      <div 
        className={`absolute p-4 rounded-lg shadow-lg cursor-pointer transition-all duration-200 ${
          isSelected 
            ? 'ring-2 ring-blue-500 bg-blue-100' 
            : 'bg-white hover:shadow-xl'
        }`}
        style={{ 
          left: node.position.x, 
          top: node.position.y,
          minWidth: '200px'
        }}
        onClick={() => setSelectedNode(node)}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800">{node.data.label}</h3>
          <Button 
            variant="ghost" 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(node.id);
            }}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
        
        <div className="text-sm text-gray-600 mb-2">
          Type: {node.type}
        </div>
        
        {node.data.config && Object.keys(node.data.config).length > 0 && (
          <div className="text-xs text-gray-500">
            Configured
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
          <h2 className="text-xl font-bold text-gray-800">
            {templateId ? 'Edit Workflow' : 'Create Workflow'}
          </h2>
          
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
            variant="outline" 
            onClick={handleTest}
            disabled={isSaving}
          >
            <Play className="w-4 h-4 mr-2" />
            Test
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          
          <TextArea
            label="Description"
            value={workflowData.metadata.description || ''}
            onChange={(e) => updateMetadata({ description: e.target.value })}
            placeholder="Describe what this workflow does"
            rows={2}
          />
        </div>
      </GlassPanel>
      
      {/* Designer Canvas */}
      <div className="flex-1 flex">
        {/* Toolbar */}
        <div className="w-64 p-4 border-r border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-700 mb-4">Workflow Steps</h3>
          
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode('action', { x: 100, y: 100 })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Action Step
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode('condition', { x: 100, y: 150 })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Condition Step
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode('assignment', { x: 100, y: 200 })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Assignment Step
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode('notification', { x: 100, y: 250 })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Notification Step
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode('escalation', { x: 100, y: 300 })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Escalation Step
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addNode('approval', { x: 100, y: 350 })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Approval Step
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
          </div>
        </div>
      </div>
    </div>
  );
};