import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { serviceService } from '../services/serviceService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { CreateServiceRequest, UpdateServiceRequest, CreateBookingRequest, ServiceSearchFilters } from '../types/service';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class ServiceController {
  // Service Category Management
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await serviceService.getCategories();
      return res.json({ success: true, data: categories });
    } catch (error) {
      safeLogger.error('Error fetching service categories:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
  }

  // Service Management
  async createService(req: Request, res: Response) {
    try {
      const providerId = req.user?.userId;
      if (!providerId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const serviceData: CreateServiceRequest = req.body;
      const service = await serviceService.createService(providerId, serviceData);
      
      return res.status(201).json({ success: true, data: service });
    } catch (error) {
      safeLogger.error('Error creating service:', error);
      return res.status(500).json({ success: false, error: 'Failed to create service' });
    }
  }

  async updateService(req: Request, res: Response) {
    try {
      const { serviceId } = req.params;
      const providerId = req.user?.userId;
      const updateData: UpdateServiceRequest = req.body;

      if (!providerId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const service = await serviceService.updateService(serviceId, providerId, updateData);
      return res.json({ success: true, data: service });
    } catch (error) {
      safeLogger.error('Error updating service:', error);
      return res.status(500).json({ success: false, error: 'Failed to update service' });
    }
  }

  async getService(req: Request, res: Response) {
    try {
      const { serviceId } = req.params;
      const service = await serviceService.getServiceById(serviceId);
      
      if (!service) {
        return res.status(404).json({ success: false, error: 'Service not found' });
      }

      return res.json({ success: true, data: service });
    } catch (error) {
      safeLogger.error('Error fetching service:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch service' });
    }
  }

  async searchServices(req: Request, res: Response) {
    try {
      const filters: ServiceSearchFilters = req.query as any;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await serviceService.searchServices(filters, page, limit);
      return res.json({ success: true, data: result });
    } catch (error) {
      safeLogger.error('Error searching services:', error);
      return res.status(500).json({ success: false, error: 'Failed to search services' });
    }
  }

  async getProviderServices(req: Request, res: Response) {
    try {
      const providerId = req.user?.userId;
      if (!providerId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const services = await serviceService.getProviderServices(providerId);
      return res.json({ success: true, data: services });
    } catch (error) {
      safeLogger.error('Error fetching provider services:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch services' });
    }
  }

  // Service Availability Management
  async setAvailability(req: Request, res: Response) {
    try {
      const { serviceId } = req.params;
      const providerId = req.user?.userId;
      const { availability } = req.body;

      if (!providerId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const result = await serviceService.setServiceAvailability(serviceId, providerId, availability);
      return res.json({ success: true, data: result });
    } catch (error) {
      safeLogger.error('Error setting availability:', error);
      return res.status(500).json({ success: false, error: 'Failed to set availability' });
    }
  }

  async getAvailability(req: Request, res: Response) {
    try {
      const { serviceId } = req.params;
      const availability = await serviceService.getServiceAvailability(serviceId);
      return res.json({ success: true, data: availability });
    } catch (error) {
      safeLogger.error('Error fetching availability:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch availability' });
    }
  }

  // Booking Management
  async createBooking(req: Request, res: Response) {
    try {
      const clientId = req.user?.userId;
      if (!clientId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const bookingData: CreateBookingRequest = req.body;
      const booking = await serviceService.createBooking(clientId, bookingData);
      
      return res.status(201).json({ success: true, data: booking });
    } catch (error) {
      safeLogger.error('Error creating booking:', error);
      return res.status(500).json({ success: false, error: 'Failed to create booking' });
    }
  }

  async getBooking(req: Request, res: Response) {
    try {
      const { bookingId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const booking = await serviceService.getBookingById(bookingId, userId);
      
      if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      return res.json({ success: true, data: booking });
    } catch (error) {
      safeLogger.error('Error fetching booking:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch booking' });
    }
  }

  async getUserBookings(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { role } = req.query; // 'client' or 'provider'

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const bookings = await serviceService.getUserBookings(userId, role as 'client' | 'provider');
      return res.json({ success: true, data: bookings });
    } catch (error) {
      safeLogger.error('Error fetching user bookings:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
    }
  }

  async updateBookingStatus(req: Request, res: Response) {
    try {
      const { bookingId } = req.params;
      const { status } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const booking = await serviceService.updateBookingStatus(bookingId, userId, status);
      return res.json({ success: true, data: booking });
    } catch (error) {
      safeLogger.error('Error updating booking status:', error);
      return res.status(500).json({ success: false, error: 'Failed to update booking status' });
    }
  }

  // Provider Profile Management
  async createProviderProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const profileData = req.body;
      const profile = await serviceService.createProviderProfile(userId, profileData);
      
      return res.status(201).json({ success: true, data: profile });
    } catch (error) {
      safeLogger.error('Error creating provider profile:', error);
      return res.status(500).json({ success: false, error: 'Failed to create provider profile' });
    }
  }

  async updateProviderProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const updateData = req.body;
      const profile = await serviceService.updateProviderProfile(userId, updateData);
      
      return res.json({ success: true, data: profile });
    } catch (error) {
      safeLogger.error('Error updating provider profile:', error);
      return res.status(500).json({ success: false, error: 'Failed to update provider profile' });
    }
  }

  async getProviderProfile(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const profile = await serviceService.getProviderProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ success: false, error: 'Provider profile not found' });
      }

      return res.json({ success: true, data: profile });
    } catch (error) {
      safeLogger.error('Error fetching provider profile:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch provider profile' });
    }
  }

  // Milestone Management
  async updateMilestone(req: Request, res: Response) {
    try {
      const { milestoneId } = req.params;
      const { status, deliverables, clientFeedback } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const milestone = await serviceService.updateMilestone(milestoneId, userId, {
        status,
        deliverables,
        clientFeedback
      });

      return res.json({ success: true, data: milestone });
    } catch (error) {
      safeLogger.error('Error updating milestone:', error);
      return res.status(500).json({ success: false, error: 'Failed to update milestone' });
    }
  }

  async getBookingMilestones(req: Request, res: Response) {
    try {
      const { bookingId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const milestones = await serviceService.getBookingMilestones(bookingId, userId);
      return res.json({ success: true, data: milestones });
    } catch (error) {
      safeLogger.error('Error fetching milestones:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch milestones' });
    }
  }

  // Service Statistics
  async getProviderStats(req: Request, res: Response) {
    try {
      const providerId = req.user?.userId;
      if (!providerId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const stats = await serviceService.getProviderStats(providerId);
      return res.json({ success: true, data: stats });
    } catch (error) {
      safeLogger.error('Error fetching provider stats:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
  }
}

export const serviceController = new ServiceController();