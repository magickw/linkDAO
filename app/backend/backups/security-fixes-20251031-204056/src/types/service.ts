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
  serviceLocation?: any; // JSON object
  tags?: string[];
  requirements?: string;
  deliverables?: string;
  portfolioItems?: string[];
  status: 'active' | 'paused' | 'inactive';
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceAvailability {
  id: string;
  serviceId: string;
  dayOfWeek: number; // 0-6, Sunday = 0
  startTime: string; // HH:MM:SS format
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
  locationDetails?: any; // JSON object
  createdAt: Date;
  updatedAt: Date;
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

export interface ServiceReview {
  id: string;
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  serviceId: string;
  rating: number; // 1-5
  communicationRating?: number;
  qualityRating?: number;
  timelinessRating?: number;
  title?: string;
  comment?: string;
  wouldRecommend?: boolean;
  ipfsHash?: string;
  blockchainTxHash?: string;
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

export interface ServiceMessage {
  id: string;
  bookingId: string;
  senderId: string;
  recipientId: string;
  messageType: 'text' | 'file' | 'milestone_update' | 'system';
  content?: string;
  fileAttachments?: string[];
  isRead: boolean;
  createdAt: Date;
}

// Request/Response types
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

export interface UpdateServiceRequest extends Partial<CreateServiceRequest> {
  status?: 'active' | 'paused' | 'inactive';
  featured?: boolean;
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

// Project Management Types

export interface TimeTracking {
  id: string;
  bookingId: string;
  milestoneId?: string;
  providerId: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
  description?: string;
  isBillable: boolean;
  hourlyRate?: string;
  totalAmount?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDeliverable {
  id: string;
  bookingId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  deliverableType: 'file' | 'link' | 'text' | 'code' | 'design';
  fileHash?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  content?: string;
  url?: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: Date;
  reviewedAt?: Date;
  clientFeedback?: string;
  revisionNotes?: string;
  versionNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MilestonePayment {
  id: string;
  milestoneId: string;
  bookingId: string;
  amount: string;
  currency: string;
  paymentMethod: 'crypto' | 'fiat' | 'escrow';
  escrowContract?: string;
  paymentProcessorId?: string;
  transactionHash?: string;
  status: 'pending' | 'processing' | 'held' | 'released' | 'refunded' | 'disputed';
  heldUntil?: Date;
  releaseConditions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectThread {
  id: string;
  bookingId: string;
  milestoneId?: string;
  threadType: 'general' | 'milestone' | 'deliverable' | 'payment' | 'support';
  title: string;
  isPrivate: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMessage {
  id: string;
  threadId: string;
  bookingId: string;
  senderId: string;
  messageType: 'text' | 'file' | 'image' | 'code' | 'milestone_update' | 'payment_update' | 'system';
  content?: string;
  fileAttachments?: FileAttachment[];
  codeLanguage?: string;
  isRead: boolean;
  isPinned: boolean;
  replyTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileAttachment {
  fileName: string;
  fileHash: string;
  fileSize: number;
  fileType: string;
  uploadedAt: Date;
}

export interface ProjectApproval {
  id: string;
  bookingId: string;
  milestoneId?: string;
  deliverableId?: string;
  approverId: string;
  approvalType: 'milestone' | 'deliverable' | 'payment' | 'completion';
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  feedback?: string;
  approvedAt?: Date;
  autoApproveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectActivity {
  id: string;
  bookingId: string;
  milestoneId?: string;
  userId: string;
  activityType: string;
  description: string;
  metadata?: any;
  createdAt: Date;
}

export interface ProjectFile {
  id: string;
  bookingId: string;
  milestoneId?: string;
  deliverableId?: string;
  uploaderId: string;
  fileName: string;
  fileHash: string;
  fileSize: number;
  fileType: string;
  versionNumber: number;
  isCurrentVersion: boolean;
  accessLevel: 'public' | 'project' | 'milestone' | 'private';
  downloadCount: number;
  createdAt: Date;
}

// Request/Response types for project management
export interface StartTimeTrackingRequest {
  bookingId: string;
  milestoneId?: string;
  description?: string;
  hourlyRate?: string;
}

export interface StopTimeTrackingRequest {
  timeTrackingId: string;
  description?: string;
}

export interface CreateDeliverableRequest {
  bookingId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  deliverableType: 'file' | 'link' | 'text' | 'code' | 'design';
  content?: string;
  url?: string;
  fileHash?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

export interface UpdateDeliverableRequest {
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  status?: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  revisionNotes?: string;
}

export interface CreateMilestonePaymentRequest {
  milestoneId: string;
  amount: string;
  currency: string;
  paymentMethod: 'crypto' | 'fiat' | 'escrow';
  releaseConditions?: string;
  heldUntil?: Date;
}

export interface CreateProjectThreadRequest {
  bookingId: string;
  milestoneId?: string;
  threadType: 'general' | 'milestone' | 'deliverable' | 'payment' | 'support';
  title: string;
  isPrivate?: boolean;
}

export interface SendProjectMessageRequest {
  threadId: string;
  messageType?: 'text' | 'file' | 'image' | 'code' | 'milestone_update' | 'payment_update';
  content?: string;
  fileAttachments?: FileAttachment[];
  codeLanguage?: string;
  replyTo?: string;
}

export interface CreateApprovalRequest {
  bookingId: string;
  milestoneId?: string;
  deliverableId?: string;
  approvalType: 'milestone' | 'deliverable' | 'payment' | 'completion';
  autoApproveAt?: Date;
}

export interface ProcessApprovalRequest {
  approvalId: string;
  status: 'approved' | 'rejected' | 'changes_requested';
  feedback?: string;
}

export interface UploadProjectFileRequest {
  bookingId: string;
  milestoneId?: string;
  deliverableId?: string;
  fileName: string;
  fileHash: string;
  fileSize: number;
  fileType: string;
  accessLevel?: 'public' | 'project' | 'milestone' | 'private';
}

// Enhanced booking with project management features
export interface EnhancedServiceBooking extends ServiceBooking {
  timeTracking?: TimeTracking[];
  deliverables?: ProjectDeliverable[];
  threads?: ProjectThread[];
  approvals?: ProjectApproval[];
  activities?: ProjectActivity[];
  files?: ProjectFile[];
  totalTimeTracked?: number;
  totalBillableHours?: number;
  completedDeliverables?: number;
  pendingApprovals?: number;
}

// Project dashboard data
export interface ProjectDashboard {
  booking: EnhancedServiceBooking;
  milestones: ServiceMilestone[];
  recentActivities: ProjectActivity[];
  upcomingDeadlines: {
    milestoneId: string;
    title: string;
    dueDate: Date;
    status: string;
  }[];
  timeTrackingSummary: {
    totalHours: number;
    billableHours: number;
    totalAmount: string;
    thisWeekHours: number;
  };
  deliverablesSummary: {
    total: number;
    pending: number;
    inProgress: number;
    submitted: number;
    approved: number;
  };
  communicationSummary: {
    totalMessages: number;
    unreadMessages: number;
    activeThreads: number;
  };
}