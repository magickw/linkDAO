import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import WorkflowAutomationController from '../controllers/workflowAutomationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';

const router = Router();
const workflowController = new WorkflowAutomationController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Template Management Routes (Admin only)
router.post('/templates', csrfProtection,  validateAdminRole, workflowController.createTemplate.bind(workflowController));
router.get('/templates', validateAdminRole, workflowController.listTemplates.bind(workflowController));
router.get('/templates/:templateId', validateAdminRole, workflowController.getTemplate.bind(workflowController));
router.put('/templates/:templateId', csrfProtection,  validateAdminRole, workflowController.updateTemplate.bind(workflowController));
router.delete('/templates/:templateId', csrfProtection,  validateAdminRole, workflowController.deleteTemplate.bind(workflowController));

// Workflow Execution Routes
router.post('/execute', csrfProtection,  validateAdminRole, workflowController.executeWorkflow.bind(workflowController));
router.get('/instances', validateAdminRole, workflowController.listWorkflowInstances.bind(workflowController));
router.get('/instances/:instanceId', validateAdminRole, workflowController.getWorkflowInstance.bind(workflowController));
router.post('/instances/:instanceId/cancel', csrfProtection,  validateAdminRole, workflowController.cancelWorkflow.bind(workflowController));

// Task Management Routes
router.get('/tasks/my-tasks', workflowController.getUserTasks.bind(workflowController));
router.get('/tasks/:taskId', workflowController.getTask.bind(workflowController));
router.post('/tasks/:taskId/complete', csrfProtection,  workflowController.completeTask.bind(workflowController));
router.post('/tasks/:taskId/assign', csrfProtection,  validateAdminRole, workflowController.assignTask.bind(workflowController));
router.post('/tasks/:taskId/escalate', csrfProtection,  workflowController.escalateTask.bind(workflowController));

// Rule Management Routes (Admin only)
router.post('/rules', csrfProtection,  validateAdminRole, workflowController.createRule.bind(workflowController));
router.get('/rules', validateAdminRole, workflowController.listRules.bind(workflowController));
router.put('/rules/:ruleId', csrfProtection,  validateAdminRole, workflowController.updateRule.bind(workflowController));
router.delete('/rules/:ruleId', csrfProtection,  validateAdminRole, workflowController.deleteRule.bind(workflowController));

// Analytics and Monitoring Routes (Admin only)
router.get('/analytics', validateAdminRole, workflowController.getWorkflowAnalytics.bind(workflowController));
router.get('/metrics', validateAdminRole, workflowController.getWorkflowMetrics.bind(workflowController));
router.get('/bottlenecks', validateAdminRole, workflowController.getBottleneckAnalysis.bind(workflowController));

// Workflow Designer Support Routes (Admin only)
router.post('/validate-design', csrfProtection,  validateAdminRole, workflowController.validateWorkflowDesign.bind(workflowController));
router.post('/test', csrfProtection,  validateAdminRole, workflowController.testWorkflow.bind(workflowController));

export default router;
