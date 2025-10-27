import React, { useState } from 'react';
import { WorkflowDesigner } from './WorkflowDesigner';
import { WorkflowList } from './WorkflowList';
import { WorkflowInstanceViewer } from './WorkflowInstanceViewer';
import { EnhancedWorkflowDesigner } from './EnhancedWorkflowDesigner';
import { Button, GlassPanel } from '@/design-system';
import { 
  BarChart3, 
  List, 
  Play, 
  Settings,
  ArrowLeft,
  Palette
} from 'lucide-react';

type ViewMode = 'list' | 'designer' | 'enhanced-designer' | 'viewer';

export const WorkflowAutomationDashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  const handleCreateWorkflow = () => {
    setSelectedTemplateId(null);
    setViewMode('designer');
  };

  const handleCreateEnhancedWorkflow = () => {
    setSelectedTemplateId(null);
    setViewMode('enhanced-designer');
  };

  const handleEditWorkflow = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setViewMode('designer');
  };

  const handleEditEnhancedWorkflow = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setViewMode('enhanced-designer');
  };

  const handleViewWorkflow = (templateId: string) => {
    // In a real implementation, this would show workflow details
    alert(`Viewing workflow: ${templateId}`);
  };

  const handleExecuteWorkflow = (templateId: string) => {
    // In a real implementation, this would start a new workflow instance
    alert(`Executing workflow: ${templateId}`);
  };

  const handleViewInstance = (instanceId: string) => {
    setSelectedInstanceId(instanceId);
    setViewMode('viewer');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedTemplateId(null);
    setSelectedInstanceId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Workflow Automation</h1>
              <p className="text-gray-300 mt-2">
                Design, manage, and monitor automated workflows
              </p>
            </div>
            
            {viewMode !== 'list' && (
              <Button 
                variant="outline" 
                onClick={handleBackToList}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to List
              </Button>
            )}
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex space-x-1 mt-6 bg-white/10 p-1 rounded-lg w-fit">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <List className="w-4 h-4 mr-2" />
              Workflows
            </button>
            
            <button
              onClick={() => setViewMode('designer')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'designer'
                  ? 'bg-white text-gray-900'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Designer
            </button>
            
            <button
              onClick={() => setViewMode('enhanced-designer')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'enhanced-designer'
                  ? 'bg-white text-gray-900'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Palette className="w-4 h-4 mr-2" />
              Enhanced Designer
            </button>
            
            <button
              onClick={() => setViewMode('viewer')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'viewer'
                  ? 'bg-white text-gray-900'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Play className="w-4 h-4 mr-2" />
              Execution
            </button>
          </div>
        </div>
        
        {/* Content */}
        <GlassPanel className="p-6 rounded-xl">
          {viewMode === 'list' && (
            <div>
              <div className="flex justify-end mb-4">
                <Button 
                  variant="primary" 
                  onClick={handleCreateEnhancedWorkflow}
                  className="flex items-center mr-2"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Create Enhanced Workflow
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCreateWorkflow}
                  className="flex items-center"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Create Workflow
                </Button>
              </div>
              <WorkflowList
                onCreate={handleCreateWorkflow}
                onEdit={handleEditWorkflow}
                onView={handleViewWorkflow}
                onExecute={handleExecuteWorkflow}
                onEditEnhanced={handleEditEnhancedWorkflow}
              />
            </div>
          )}
          
          {viewMode === 'designer' && (
            <WorkflowDesigner
              templateId={selectedTemplateId || undefined}
              onCancel={handleBackToList}
            />
          )}
          
          {viewMode === 'enhanced-designer' && (
            <EnhancedWorkflowDesigner
              templateId={selectedTemplateId || undefined}
              onCancel={handleBackToList}
            />
          )}
          
          {viewMode === 'viewer' && selectedInstanceId && (
            <WorkflowInstanceViewer
              instanceId={selectedInstanceId}
              onClose={handleBackToList}
            />
          )}
          
          {viewMode === 'viewer' && !selectedInstanceId && (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No instance selected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a workflow instance to view details
              </p>
              <div className="mt-6">
                <Button onClick={handleBackToList}>
                  Back to Workflow List
                </Button>
              </div>
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
};