import { Request, Response } from 'express';
import { projectManagementService } from '../services/projectManagementService.js';
import { 
  StartTimeTrackingRequest,
  StopTimeTrackingRequest,
  CreateDeliverableRequest,
  UpdateDeliverableRequest,
  CreateMilestonePaymentRequest,
  CreateProjectThreadRequest,
  SendProjectMessageRequest,
  CreateApprovalRequest,
  ProcessApprovalRequest,
  UploadProjectFileRequest
} from '../types/service.js';

export class ProjectManagementController {
  // Time Tracking Endpoints
  async startTimeTracking(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const request: StartTimeTrackingRequest = req.body;
      const timeTracking = await projectManagementService.startTimeTracking(userId, request);
      
      res.status(201).json({
        success: true,
        data: timeTracking
      });
    } catch (error) {
      console.error('Error starting time tracking:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start time tracking'
      });
    }
  }

  async stopTimeTracking(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const request: StopTimeTrackingRequest = req.body;
      const timeTracking = await projectManagementService.stopTimeTracking(userId, request);
      
      res.json({
        success: true,
        data: timeTracking
      });
    } catch (error) {
      console.error('Error stopping time tracking:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop time tracking'
      });
    }
  }

  async getTimeTracking(req: Request, res: Response) {
    try {
      const { bookingId } = req.params;
      const timeTracking = await projectManagementService.getTimeTrackingByBooking(bookingId);
      
      res.json({
        success: true,
        data: timeTracking
      });
    } catch (error) {
      console.error('Error getting time tracking:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get time tracking'
      });
    }
  }

  async getActiveTimeTracking(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const activeTracking = await projectManagementService.getActiveTimeTracking(userId);
      
      res.json({
        success: true,
        data: activeTracking
      });
    } catch (error) {
      console.error('Error getting active time tracking:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active time tracking'
      });
    }
  }

  // Deliverables Endpoints
  async createDeliverable(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const request: CreateDeliverableRequest = req.body;
      const deliverable = await projectManagementService.createDeliverable(userId, request);
      
      res.status(201).json({
        success: true,
        data: deliverable
      });
    } catch (error) {
      console.error('Error creating deliverable:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create deliverable'
      });
    }
  }

  async updateDeliverable(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { deliverableId } = req.params;
      const request: UpdateDeliverableRequest = req.body;
      const deliverable = await projectManagementService.updateDeliverable(userId, deliverableId, request);
      
      res.json({
        success: true,
        data: deliverable
      });
    } catch (error) {
      console.error('Error updating deliverable:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update deliverable'
      });
    }
  }

  async getDeliverables(req: Request, res: Response) {
    try {
      const { bookingId } = req.params;
      const deliverables = await projectManagementService.getDeliverablesByBooking(bookingId);
      
      res.json({
        success: true,
        data: deliverables
      });
    } catch (error) {
      console.error('Error getting deliverables:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get deliverables'
      });
    }
  }

  // Milestone Payments Endpoints
  async createMilestonePayment(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const request: CreateMilestonePaymentRequest = req.body;
      const payment = await projectManagementService.createMilestonePayment(userId, request);
      
      res.status(201).json({
        success: true,
        data: payment
      });
    } catch (error) {
      console.error('Error creating milestone payment:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create milestone payment'
      });
    }
  }

  async processMilestonePayment(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const { status, transactionHash } = req.body;
      
      const payment = await projectManagementService.processMilestonePayment(paymentId, status, transactionHash);
      
      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      console.error('Error processing milestone payment:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process milestone payment'
      });
    }
  }

  // Communication Endpoints
  async createProjectThread(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const request: CreateProjectThreadRequest = req.body;
      const thread = await projectManagementService.createProjectThread(userId, request);
      
      res.status(201).json({
        success: true,
        data: thread
      });
    } catch (error) {
      console.error('Error creating project thread:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create project thread'
      });
    }
  }

  async sendProjectMessage(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const request: SendProjectMessageRequest = req.body;
      const message = await projectManagementService.sendProjectMessage(userId, request);
      
      res.status(201).json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('Error sending project message:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send project message'
      });
    }
  }

  async getProjectThreads(req: Request, res: Response) {
    try {
      const { bookingId } = req.params;
      const threads = await projectManagementService.getProjectThreads(bookingId);
      
      res.json({
        success: true,
        data: threads
      });
    } catch (error) {
      console.error('Error getting project threads:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get project threads'
      });
    }
  }

  async getProjectMessages(req: Request, res: Response) {
    try {
      const { threadId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      const messages = await projectManagementService.getProjectMessages(
        threadId, 
        parseInt(limit as string), 
        parseInt(offset as string)
      );
      
      res.json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Error getting project messages:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get project messages'
      });
    }
  }

  // Approval Endpoints
  async createApproval(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const request: CreateApprovalRequest = req.body;
      const approval = await projectManagementService.createApproval(userId, request);
      
      res.status(201).json({
        success: true,
        data: approval
      });
    } catch (error) {
      console.error('Error creating approval:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create approval'
      });
    }
  }

  async processApproval(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const request: ProcessApprovalRequest = {
        approvalId: req.params.approvalId,
        ...req.body
      };
      
      const approval = await projectManagementService.processApproval(userId, request);
      
      res.json({
        success: true,
        data: approval
      });
    } catch (error) {
      console.error('Error processing approval:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process approval'
      });
    }
  }

  // File Management Endpoints
  async uploadProjectFile(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const request: UploadProjectFileRequest = req.body;
      const file = await projectManagementService.uploadProjectFile(userId, request);
      
      res.status(201).json({
        success: true,
        data: file
      });
    } catch (error) {
      console.error('Error uploading project file:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload project file'
      });
    }
  }

  async getProjectFiles(req: Request, res: Response) {
    try {
      const { bookingId } = req.params;
      const { milestoneId } = req.query;
      
      const files = await projectManagementService.getProjectFiles(
        bookingId, 
        milestoneId as string | undefined
      );
      
      res.json({
        success: true,
        data: files
      });
    } catch (error) {
      console.error('Error getting project files:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get project files'
      });
    }
  }

  // Dashboard Endpoint
  async getProjectDashboard(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { bookingId } = req.params;
      const dashboard = await projectManagementService.getProjectDashboard(bookingId, userId);
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Error getting project dashboard:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get project dashboard'
      });
    }
  }
}

export const projectManagementController = new ProjectManagementController();