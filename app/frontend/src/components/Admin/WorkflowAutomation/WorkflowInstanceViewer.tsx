import React, { useState, useEffect } from 'react';
import { WorkflowInstance, WorkflowStepExecution } from '@/types/workflow';
import { Button, GlassPanel } from '@/design-system';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Calendar
} from 'lucide-react';

interface WorkflowInstanceViewerProps {
  instanceId: string;
  onClose?: () => void;
}

export const WorkflowInstanceViewer: React.FC<WorkflowInstanceViewerProps> = ({ 
  instanceId,
  onClose
}) => {
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [stepExecutions, setStepExecutions] = useState<WorkflowStepExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    // In a real implementation, this would fetch from the API
    const mockInstance: WorkflowInstance = {
      id: instanceId,
      templateId: 'template-1',
      status: 'running',
      priority: 5,
      contextData: { userId: 'user-123', contentId: 'content-456' },
      startedAt: new Date(Date.now() - 3600000), // 1 hour ago
      createdAt: new Date(Date.now() - 3600000)
    };
    
    const mockStepExecutions: WorkflowStepExecution[] = [
      {
        id: 'step-1',
        instanceId,
        stepId: 'step-def-1',
        status: 'completed',
        inputData: { content: 'Sample content for moderation' },
        outputData: { result: 'approved' },
        startedAt: new Date(Date.now() - 3600000),
        completedAt: new Date(Date.now() - 3500000),
        createdAt: new Date(Date.now() - 3600000)
      },
      {
        id: 'step-2',
        instanceId,
        stepId: 'step-def-2',
        status: 'running',
        inputData: { contentId: 'content-456' },
        startedAt: new Date(Date.now() - 3500000),
        createdAt: new Date(Date.now() - 3500000)
      },
      {
        id: 'step-3',
        instanceId,
        stepId: 'step-def-3',
        status: 'pending',
        createdAt: new Date()
      }
    ];
    
    setInstance(mockInstance);
    setStepExecutions(mockStepExecutions);
    setLoading(false);
  }, [instanceId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'running':
        return <Play className="w-5 h-5 text-blue-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'skipped':
        return <Pause className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800',
      running: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      skipped: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </span>
    );
  };

  const handleCancel = async () => {
    try {
      // TODO: Implement API call to cancel workflow instance
      console.log('Cancelling workflow instance:', instanceId);
      alert('Workflow cancellation requested');
    } catch (err) {
      setError('Failed to cancel workflow');
      console.error('Error cancelling workflow:', err);
    }
  };

  const handleRetry = async (stepId: string) => {
    try {
      // TODO: Implement API call to retry failed step
      console.log('Retrying step:', stepId);
      alert('Step retry requested');
    } catch (err) {
      setError('Failed to retry step');
      console.error('Error retrying step:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <h3 className="text-sm font-medium text-red-800">Error</h3>
          </div>
          <div className="mt-2 text-sm text-red-700">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Workflow not found</h3>
          <p className="mt-1 text-sm text-gray-500">The requested workflow instance could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflow Execution</h2>
          <p className="text-gray-600 mt-1">Instance ID: {instance.id}</p>
        </div>
        
        <div className="flex space-x-2">
          {instance.status === 'running' && (
            <Button variant="outline" onClick={handleCancel}>
              <Pause className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
          
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      
      {/* Instance Overview */}
      <GlassPanel className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
            <div className="flex items-center">
              {getStatusBadge(instance.status)}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Priority</h3>
            <div className="flex items-center">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {instance.priority}/10
              </span>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Timeline</h3>
            <div className="flex items-center text-sm text-gray-900">
              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
              {instance.startedAt ? (
                <span>Started {instance.startedAt.toLocaleString()}</span>
              ) : (
                <span>Created {instance.createdAt.toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>
        
        {instance.contextData && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Context Data</h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <pre className="text-xs text-gray-700 overflow-x-auto">
                {JSON.stringify(instance.contextData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </GlassPanel>
      
      {/* Step Executions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Step Executions</h3>
        
        <div className="space-y-4">
          {stepExecutions.map((step, index) => (
            <GlassPanel key={step.id} className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                    <span className="text-sm font-medium text-blue-800">{index + 1}</span>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">Step {index + 1}</h4>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(step.status)}
                      
                      {step.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRetry(step.id)}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {step.startedAt && (
                      <div className="text-sm">
                        <span className="text-gray-500">Started: </span>
                        <span className="text-gray-900">{step.startedAt.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {step.completedAt && (
                      <div className="text-sm">
                        <span className="text-gray-500">Completed: </span>
                        <span className="text-gray-900">{step.completedAt.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {step.assignedTo && (
                      <div className="text-sm">
                        <span className="text-gray-500">Assigned to: </span>
                        <span className="text-gray-900 flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {step.assignedTo}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {step.inputData && (
                    <div className="mt-3">
                      <h5 className="text-xs font-medium text-gray-500 mb-1">Input Data</h5>
                      <div className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                        <pre className="text-gray-700">
                          {JSON.stringify(step.inputData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  {step.outputData && (
                    <div className="mt-3">
                      <h5 className="text-xs font-medium text-gray-500 mb-1">Output Data</h5>
                      <div className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                        <pre className="text-gray-700">
                          {JSON.stringify(step.outputData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  {step.errorMessage && (
                    <div className="mt-3">
                      <h5 className="text-xs font-medium text-gray-500 mb-1">Error</h5>
                      <div className="bg-red-50 p-2 rounded text-xs text-red-700">
                        {step.errorMessage}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </div>
  );
};