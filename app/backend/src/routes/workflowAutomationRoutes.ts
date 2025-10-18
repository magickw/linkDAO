import { Router } from 'express';
import WorkflowAutomationController from '../controllers/workflowAutomationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';

const router = Router();
const workflowController = new WorkflowAutomationController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Template Management Routes (Admin only)
router.post('/templates', validateAdminRole, workflowController.createTemplate.bind(workflowController));
router.get('/templates', validateAdminRole, workflowController.listTemplates.bind(workflowController));
router.get('/templates/:templateId', validateAdminRole, workflowController.getTemplate.bind(workflowController));
router.put('/templates/:templateId', validateAdminRole, workflowController.updateTemplate.bind(workflowController));
router.delete('/templates/:templateId', validateAdminRole, workflowController.deleteTemplate.bind(workflowController));

// Workflow Execution Routes
router.post('/execute', validateAdminRole, workflowController.executeWorkflow.bind(workflowController));
router.get('/instances', validateAdminRole, workflowController.listWorkflowInstances.bind(workflowController));
router.get('/instances/:instanceId', validateAdminRole, workflowController.getWorkflowInstance.bind(workflowController));
router.post('/instances/:instanceId/cancel', validateAdminRole, workflowController.cancelWorkflow.bind(workflowController));

// Task Management Routes
router.get('/tasks/my-tasks', workflowController.getUserTasks.bind(workflowController));
router.get('/tasks/:taskId', workflowController.getTask.bind(workflowController));
router.post('/tasks/:taskId/complete', workflowController.completeTask.bind(workflowController));
router.post('/tasks/:taskId/assign', validateAdminRole, workflowController.assignTask.bind(workflowController));
router.post('/tasks/:taskId/escalate', workflowController.escalateTask.bind(workflowController));

// Rule Management Routes (Admin only)
router.post('/rules', validateAdminRole, workflowController.createRule.bind(workflowController));
router.get('/rules', validateAdminRole, workflowController.listRules.bind(workflowController));
router.put('/rules/:ruleId', validateAdminRole, workflowController.updateRule.bind(workflowController));
router.delete('/rules/:ruleId', validateAdminRole, workflowController.deleteRule.bind(workflowController));

// Analytics and Monitoring Routes (Admin only)
router.get('/analytics', validateAdminRole, workflowController.getWorkflowAnalytics.bind(workflowController));
router.get('/metrics', validateAdminRole, workflowController.getWorkflowMetrics.bind(workflowController));
router.get('/bottlenecks', validateAdminRole, workflowController.getBottleneckAnalysis.bind(workflowController));

// Workflow Designer Support Routes (Admin only)
router.post('/validate-design', validateAdminRole, workflowController.validateWorkflowDesign.bind(workflowController));
router.post('/test', validateAdminRole, workflowController.testWorkflow.bind(workflowController));

export default router;