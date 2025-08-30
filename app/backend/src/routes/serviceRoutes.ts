import { Router } from 'express';
import { serviceController } from '../controllers/serviceController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { body, param, query } from 'express-validator';

const router = Router();

// Service Categories
router.get('/categories', serviceController.getCategories);

// Service Management
router.post('/services',
  authMiddleware,
  [
    body('categoryId').isUUID().withMessage('Valid category ID is required'),
    body('title').isLength({ min: 1, max: 255 }).withMessage('Title is required and must be less than 255 characters'),
    body('description').isLength({ min: 1 }).withMessage('Description is required'),
    body('pricingModel').isIn(['fixed', 'hourly', 'milestone']).withMessage('Valid pricing model is required'),
    body('basePrice').isNumeric().withMessage('Valid base price is required'),
    body('currency').optional().isLength({ min: 3, max: 10 }),
    body('durationMinutes').optional().isInt({ min: 1 }),
    body('isRemote').optional().isBoolean(),
    body('locationRequired').optional().isBoolean(),
    body('tags').optional().isArray(),
    body('portfolioItems').optional().isArray()
  ],
  validateRequest,
  serviceController.createService
);

router.put('/services/:serviceId',
  authMiddleware,
  [
    param('serviceId').isUUID().withMessage('Valid service ID is required')
  ],
  validateRequest,
  serviceController.updateService
);

router.get('/services/search',
  [
    query('categoryId').optional().isUUID(),
    query('pricingModel').optional().isIn(['fixed', 'hourly', 'milestone']),
    query('minPrice').optional().isNumeric(),
    query('maxPrice').optional().isNumeric(),
    query('isRemote').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  serviceController.searchServices
);

router.get('/services/my-services',
  authMiddleware,
  serviceController.getProviderServices
);

router.get('/services/:serviceId',
  [
    param('serviceId').isUUID().withMessage('Valid service ID is required')
  ],
  validateRequest,
  serviceController.getService
);

// Service Availability
router.post('/services/:serviceId/availability',
  authMiddleware,
  [
    param('serviceId').isUUID().withMessage('Valid service ID is required'),
    body('availability').isArray().withMessage('Availability array is required'),
    body('availability.*.dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Valid day of week is required'),
    body('availability.*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).withMessage('Valid start time is required'),
    body('availability.*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).withMessage('Valid end time is required'),
    body('availability.*.timezone').isLength({ min: 1 }).withMessage('Timezone is required')
  ],
  validateRequest,
  serviceController.setAvailability
);

router.get('/services/:serviceId/availability',
  [
    param('serviceId').isUUID().withMessage('Valid service ID is required')
  ],
  validateRequest,
  serviceController.getAvailability
);

// Booking Management
router.post('/bookings',
  authMiddleware,
  [
    body('serviceId').isUUID().withMessage('Valid service ID is required'),
    body('bookingType').isIn(['consultation', 'project', 'ongoing']).withMessage('Valid booking type is required'),
    body('scheduledStart').optional().isISO8601().withMessage('Valid scheduled start date is required'),
    body('scheduledEnd').optional().isISO8601().withMessage('Valid scheduled end date is required'),
    body('milestones').optional().isArray(),
    body('milestones.*.title').optional().isLength({ min: 1 }).withMessage('Milestone title is required'),
    body('milestones.*.amount').optional().isNumeric().withMessage('Valid milestone amount is required')
  ],
  validateRequest,
  serviceController.createBooking
);

router.get('/bookings/:bookingId',
  authMiddleware,
  [
    param('bookingId').isUUID().withMessage('Valid booking ID is required')
  ],
  validateRequest,
  serviceController.getBooking
);

router.get('/bookings',
  authMiddleware,
  [
    query('role').optional().isIn(['client', 'provider'])
  ],
  validateRequest,
  serviceController.getUserBookings
);

router.patch('/bookings/:bookingId/status',
  authMiddleware,
  [
    param('bookingId').isUUID().withMessage('Valid booking ID is required'),
    body('status').isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed']).withMessage('Valid status is required')
  ],
  validateRequest,
  serviceController.updateBookingStatus
);

// Provider Profile Management
router.post('/provider-profile',
  authMiddleware,
  [
    body('businessName').optional().isLength({ max: 255 }),
    body('tagline').optional().isLength({ max: 500 }),
    body('skills').optional().isArray(),
    body('languages').optional().isArray(),
    body('responseTimeHours').optional().isInt({ min: 1 }),
    body('yearsExperience').optional().isInt({ min: 0 }),
    body('websiteUrl').optional().isURL(),
    body('linkedinUrl').optional().isURL(),
    body('githubUrl').optional().isURL()
  ],
  validateRequest,
  serviceController.createProviderProfile
);

router.put('/provider-profile',
  authMiddleware,
  serviceController.updateProviderProfile
);

router.get('/provider-profile/:userId',
  [
    param('userId').isUUID().withMessage('Valid user ID is required')
  ],
  validateRequest,
  serviceController.getProviderProfile
);

// Milestone Management
router.patch('/milestones/:milestoneId',
  authMiddleware,
  [
    param('milestoneId').isUUID().withMessage('Valid milestone ID is required'),
    body('status').optional().isIn(['pending', 'in_progress', 'completed', 'approved', 'disputed']),
    body('deliverables').optional().isArray(),
    body('clientFeedback').optional().isString()
  ],
  validateRequest,
  serviceController.updateMilestone
);

router.get('/bookings/:bookingId/milestones',
  authMiddleware,
  [
    param('bookingId').isUUID().withMessage('Valid booking ID is required')
  ],
  validateRequest,
  serviceController.getBookingMilestones
);

// Statistics
router.get('/provider/stats',
  authMiddleware,
  serviceController.getProviderStats
);

export default router;