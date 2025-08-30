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