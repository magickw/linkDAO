export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  providerId: string;
  categoryId: string;
  title: string;
  description: string;
  shortDescription?: string;
  pricingModel: 'fixed' | 'hourly' | 'milestone';
  basePrice: string;
  currency: string;
  durationMinutes?: number;
  isRemote: boolean;
  locationRequired: boolean;
  serviceLocation?: any;
  tags?: string[];
  requirements?: string;
  deliverables?: string;
  portfolioItems?: string[];
  status: 'active' | 'paused' | 'inactive';
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
  provider?: {
    id: string;
    handle?: string;
    profileCid?: string;
  };
  category?: ServiceCategory;
  averageRating?: number;
  reviewCount?: number;
}

export interface ServiceAvailability {
  id: string;
  serviceId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  isAvailable: boolean;
  createdAt: Date;
}

export interface ServiceBooking {
  id: string;
  serviceId: string;
  clientId: string;
  providerId: string;
  bookingType: 'consultation' | 'project' | 'ongoing';
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  scheduledStart?: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  totalAmount: string;
  currency: string;
  paymentStatus: 'pending' | 'paid' | 'released' | 'refunded';
  escrowContract?: string;
  clientRequirements?: string;
  providerNotes?: string;
  meetingLink?: string;
  locationDetails?: any;
  createdAt: Date;
  updatedAt: Date;
  service?: Service;
  client?: {
    id: string;
    handle?: string;
    profileCid?: string;
  };
  provider?: {
    id: string;
    handle?: string;
    profileCid?: string;
  };
}

export interface ServiceMilestone {
  id: string;
  bookingId: string;
  milestoneNumber: number;
  title: string;
  description?: string;
  amount: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'disputed';
  deliverables?: string[];
  clientFeedback?: string;
  completedAt?: Date;
  approvedAt?: Date;
  createdAt: Date;
}

export interface ServiceProviderProfile {
  id: string;
  userId: string;
  businessName?: string;
  tagline?: string;
  bio?: string;
  skills?: string[];
  certifications?: string[];
  languages?: string[];
  responseTimeHours: number;
  availabilityTimezone: string;
  portfolioDescription?: string;
  yearsExperience?: number;
  education?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  isVerified: boolean;
  verificationDocuments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceSearchFilters {
  categoryId?: string;
  pricingModel?: 'fixed' | 'hourly' | 'milestone';
  minPrice?: string;
  maxPrice?: string;
  isRemote?: boolean;
  tags?: string[];
  location?: string;
  availability?: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  };
}

export interface ServiceStats {
  totalServices: number;
  activeBookings: number;
  completedBookings: number;
  averageRating: number;
  totalEarnings: string;
  responseRate: number;
  completionRate: number;
}

export interface CreateServiceRequest {
  categoryId: string;
  title: string;
  description: string;
  shortDescription?: string;
  pricingModel: 'fixed' | 'hourly' | 'milestone';
  basePrice: string;
  currency?: string;
  durationMinutes?: number;
  isRemote?: boolean;
  locationRequired?: boolean;
  serviceLocation?: any;
  tags?: string[];
  requirements?: string;
  deliverables?: string;
  portfolioItems?: string[];
}

export interface CreateBookingRequest {
  serviceId: string;
  bookingType: 'consultation' | 'project' | 'ongoing';
  scheduledStart?: Date;
  scheduledEnd?: Date;
  clientRequirements?: string;
  milestones?: {
    title: string;
    description?: string;
    amount: string;
    dueDate?: Date;
  }[];
}

// Enhanced service booking with additional project management data
export interface EnhancedServiceBooking extends ServiceBooking {
  timeTracking?: TimeTracking[];
  deliverables?: ProjectDeliverable[];
  milestonePayments?: MilestonePayment[];
  threads?: ProjectThread[];
  files?: ProjectFile[];
  approvals?: ProjectApproval[];
}

// Time tracking interfaces
export interface TimeTracking {
  id: string;
  bookingId: string;
  providerId: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
  description?: string;
  isBillable: boolean;
  hourlyRate?: string;
  totalAmount?: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface StartTimeTrackingRequest {
  bookingId: string;
  description?: string;
  hourlyRate?: string;
  milestoneId?: string;
}

export interface StopTimeTrackingRequest {
  timeTrackingId: string;
  description?: string;
}

// Project deliverables
export interface ProjectDeliverable {
  id: string;
  bookingId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  fileHash?: string;
  fileName?: string;
  fileSize?: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested';
  submittedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  clientFeedback?: string;
  providerNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliverableRequest {
  bookingId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  fileHash?: string;
  fileName?: string;
  fileSize?: number;
}

export interface UpdateDeliverableRequest {
  title?: string;
  description?: string;
  fileHash?: string;
  fileName?: string;
  fileSize?: number;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested';
  clientFeedback?: string;
  providerNotes?: string;
}

// Milestone payments
export interface MilestonePayment {
  id: string;
  bookingId: string;
  milestoneId: string;
  amount: string;
  currency: string;
  status: 'pending' | 'escrowed' | 'released' | 'disputed' | 'refunded';
  transactionHash?: string;
  escrowContract?: string;
  dueDate?: Date;
  paidAt?: Date;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  milestone?: ServiceMilestone;
}

export interface CreateMilestonePaymentRequest {
  bookingId: string;
  milestoneId: string;
  amount: string;
  currency?: string;
  dueDate?: Date;
}

// Project communication
export interface ProjectThread {
  id: string;
  bookingId: string;
  title: string;
  description?: string;
  status: 'active' | 'resolved' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: ProjectMessage[];
  messageCount: number;
  unreadCount: number;
}

export interface ProjectMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  attachments?: ProjectFile[];
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  sender?: {
    id: string;
    handle?: string;
    profileCid?: string;
  };
}

export interface CreateProjectThreadRequest {
  bookingId: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
}

export interface SendProjectMessageRequest {
  threadId: string;
  content: string;
  attachments?: string[];
}

// Project approvals
export interface ProjectApproval {
  id: string;
  bookingId: string;
  requesterId: string;
  approverId: string;
  type: 'deliverable' | 'milestone' | 'payment' | 'change_request';
  entityId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestMessage?: string;
  responseMessage?: string;
  requestedAt: Date;
  respondedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApprovalRequest {
  bookingId: string;
  approverId: string;
  type: 'deliverable' | 'milestone' | 'payment' | 'change_request';
  entityId: string;
  requestMessage?: string;
  expiresAt?: Date;
}

export interface ProcessApprovalRequest {
  approvalId: string;
  status: 'approved' | 'rejected';
  feedback?: string;
}

// Project files
export interface ProjectFile {
  id: string;
  bookingId: string;
  milestoneId?: string;
  deliverableId?: string;
  uploadedBy: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileHash: string;
  description?: string;
  isPublic: boolean;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
  uploader?: {
    id: string;
    handle?: string;
    profileCid?: string;
  };
}

export interface UploadProjectFileRequest {
  bookingId: string;
  milestoneId?: string;
  deliverableId?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileHash: string;
  description?: string;
  isPublic?: boolean;
}

// Project activity
export interface ProjectActivity {
  id: string;
  bookingId: string;
  userId: string;
  type: 'time_start' | 'time_stop' | 'deliverable_upload' | 'message_sent' | 'payment_made' | 'milestone_completed';
  description: string;
  entityId?: string;
  metadata?: any;
  createdAt: Date;
  user?: {
    id: string;
    handle?: string;
    profileCid?: string;
  };
}

// Dashboard data structures
export interface ProjectDashboardData {
  booking: EnhancedServiceBooking;
  timeTrackingSummary: {
    totalHours: number;
    thisWeekHours: number;
    totalAmount: string;
    activeSession?: TimeTracking;
  };
  deliverablesSummary: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  communicationSummary: {
    totalMessages: number;
    unreadMessages: number;
    activeThreads: number;
  };
  milestones: ServiceMilestone[];
  recentActivities: ProjectActivity[];
  upcomingDeadlines: Array<{
    milestoneId: string;
    title: string;
    dueDate: Date;
    status: string;
  }>;
}

// Alias for backwards compatibility
export type ProjectDashboard = ProjectDashboardData;