import { db } from '../db';
import { 
  serviceCategories, 
  services, 
  serviceAvailability, 
  serviceBookings, 
  serviceMilestones, 
  serviceProviderProfiles,
  serviceReviews,
  users
} from '../../drizzle/schema';
import {
  Service, 
  ServiceCategory, 
  ServiceBooking, 
  ServiceAvailability as ServiceAvailabilityType,
  ServiceMilestone,
  ServiceProviderProfile,
  CreateServiceRequest,
  UpdateServiceRequest,
  CreateBookingRequest,
  ServiceSearchFilters,
  ServiceStats
} from '../types/service';
import { eq, and, or, gte, lte, like, desc, asc, sql, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export class ServiceService {
  // Service Category Management
  async getCategories(): Promise<ServiceCategory[]> {
    const categories = await db.select().from(serviceCategories)
      .where(eq(serviceCategories.isActive, true))
      .orderBy(asc(serviceCategories.name));
    
    return categories.map(this.mapServiceCategory);
  }

  // Service Management
  async createService(providerId: string, serviceData: CreateServiceRequest): Promise<Service> {
    const serviceId = randomUUID();
    
    const [newService] = await db.insert(services).values({
      id: serviceId,
      providerId,
      categoryId: serviceData.categoryId,
      title: serviceData.title,
      description: serviceData.description,
      shortDescription: serviceData.shortDescription,
      pricingModel: serviceData.pricingModel,
      basePrice: serviceData.basePrice,
      currency: serviceData.currency || 'USD',
      durationMinutes: serviceData.durationMinutes,
      isRemote: serviceData.isRemote ?? true,
      locationRequired: serviceData.locationRequired ?? false,
      serviceLocation: serviceData.serviceLocation ? JSON.stringify(serviceData.serviceLocation) : null,
      tags: serviceData.tags || [],
      requirements: serviceData.requirements,
      deliverables: serviceData.deliverables,
      portfolioItems: serviceData.portfolioItems || [],
      status: 'active',
      featured: false
    }).returning();

    return this.mapService(newService);
  }

  async updateService(serviceId: string, providerId: string, updateData: UpdateServiceRequest): Promise<Service> {
    // Verify ownership
    const existingService = await db.select().from(services)
      .where(and(eq(services.id, serviceId), eq(services.providerId, providerId)))
      .limit(1);

    if (existingService.length === 0) {
      throw new Error('Service not found or access denied');
    }

    const updateFields: any = { ...updateData };
    if (updateData.serviceLocation) {
      updateFields.serviceLocation = JSON.stringify(updateData.serviceLocation);
    }
    updateFields.updatedAt = new Date().toISOString();

    const [updatedService] = await db.update(services)
      .set(updateFields)
      .where(eq(services.id, serviceId))
      .returning();

    return this.mapService(updatedService);
  }

  async getServiceById(serviceId: string): Promise<Service | null> {
    const [service] = await db.select().from(services)
      .where(eq(services.id, serviceId))
      .limit(1);

    return service ? this.mapService(service) : null;
  }

  async searchServices(filters: ServiceSearchFilters, page: number = 1, limit: number = 20) {
    let query = db.select().from(services)
      .where(eq(services.status, 'active'));

    // Apply filters
    const conditions = [eq(services.status, 'active')];

    if (filters.categoryId) {
      conditions.push(eq(services.categoryId, filters.categoryId));
    }

    if (filters.pricingModel) {
      conditions.push(eq(services.pricingModel, filters.pricingModel));
    }

    if (filters.minPrice) {
      conditions.push(gte(services.basePrice, filters.minPrice));
    }

    if (filters.maxPrice) {
      conditions.push(lte(services.basePrice, filters.maxPrice));
    }

    if (filters.isRemote !== undefined) {
      conditions.push(eq(services.isRemote, filters.isRemote));
    }

    if (filters.tags && filters.tags.length > 0) {
      // PostgreSQL array overlap operator
      conditions.push(sql`${services.tags} && ${filters.tags}`);
    }

    const offset = (page - 1) * limit;
    
    const [servicesResult, totalCount] = await Promise.all([
      db.select().from(services)
        .where(and(...conditions))
        .orderBy(desc(services.featured), desc(services.createdAt))
        .limit(limit)
        .offset(offset),
      
      db.select({ count: count() }).from(services)
        .where(and(...conditions))
    ]);

    return {
      services: servicesResult.map(this.mapService),
      pagination: {
        page,
        limit,
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    };
  }

  async getProviderServices(providerId: string): Promise<Service[]> {
    const providerServices = await db.select().from(services)
      .where(eq(services.providerId, providerId))
      .orderBy(desc(services.createdAt));

    return providerServices.map(this.mapService);
  }

  // Service Availability Management
  async setServiceAvailability(serviceId: string, providerId: string, availability: Omit<ServiceAvailabilityType, 'id' | 'serviceId' | 'createdAt'>[]): Promise<ServiceAvailabilityType[]> {
    // Verify service ownership
    const [service] = await db.select().from(services)
      .where(and(eq(services.id, serviceId), eq(services.providerId, providerId)))
      .limit(1);

    if (!service) {
      throw new Error('Service not found or access denied');
    }

    // Delete existing availability
    await db.delete(serviceAvailability)
      .where(eq(serviceAvailability.serviceId, serviceId));

    // Insert new availability
    if (availability.length > 0) {
      const availabilityRecords = availability.map(avail => ({
        id: randomUUID(),
        serviceId,
        dayOfWeek: avail.dayOfWeek,
        startTime: avail.startTime,
        endTime: avail.endTime,
        timezone: avail.timezone,
        isAvailable: avail.isAvailable
      }));

      await db.insert(serviceAvailability).values(availabilityRecords);
    }

    return this.getServiceAvailability(serviceId);
  }

  async getServiceAvailability(serviceId: string): Promise<ServiceAvailabilityType[]> {
    const availability = await db.select().from(serviceAvailability)
      .where(eq(serviceAvailability.serviceId, serviceId))
      .orderBy(asc(serviceAvailability.dayOfWeek), asc(serviceAvailability.startTime));

    return availability.map(this.mapServiceAvailability);
  }

  // Booking Management
  async createBooking(clientId: string, bookingData: CreateBookingRequest): Promise<ServiceBooking> {
    const bookingId = randomUUID();

    // Get service details
    const [service] = await db.select().from(services)
      .where(eq(services.id, bookingData.serviceId))
      .limit(1);

    if (!service) {
      throw new Error('Service not found');
    }

    // Calculate total amount based on pricing model
    let totalAmount = service.basePrice;
    if (bookingData.milestones && bookingData.milestones.length > 0) {
      totalAmount = bookingData.milestones.reduce((sum, milestone) => 
        sum + parseFloat(milestone.amount), 0).toString();
    }

    const [newBooking] = await db.insert(serviceBookings).values({
      id: bookingId,
      serviceId: bookingData.serviceId,
      clientId,
      providerId: service.providerId,
      bookingType: bookingData.bookingType,
      status: 'pending',
      scheduledStart: bookingData.scheduledStart?.toISOString(),
      scheduledEnd: bookingData.scheduledEnd?.toISOString(),
      totalAmount,
      currency: service.currency,
      paymentStatus: 'pending',
      clientRequirements: bookingData.clientRequirements
    }).returning();

    // Create milestones if provided
    if (bookingData.milestones && bookingData.milestones.length > 0) {
      const milestoneRecords = bookingData.milestones.map((milestone, index) => ({
        id: randomUUID(),
        bookingId,
        milestoneNumber: index + 1,
        title: milestone.title,
        description: milestone.description,
        amount: milestone.amount,
        dueDate: milestone.dueDate?.toISOString(),
        status: 'pending' as const
      }));

      await db.insert(serviceMilestones).values(milestoneRecords);
    }

    return this.mapServiceBooking(newBooking);
  }

  async getBookingById(bookingId: string, userId: string): Promise<ServiceBooking | null> {
    const [booking] = await db.select().from(serviceBookings)
      .where(and(
        eq(serviceBookings.id, bookingId),
        or(
          eq(serviceBookings.clientId, userId),
          eq(serviceBookings.providerId, userId)
        )
      ))
      .limit(1);

    return booking ? this.mapServiceBooking(booking) : null;
  }

  async getUserBookings(userId: string, role?: 'client' | 'provider'): Promise<ServiceBooking[]> {
    let condition;
    if (role === 'client') {
      condition = eq(serviceBookings.clientId, userId);
    } else if (role === 'provider') {
      condition = eq(serviceBookings.providerId, userId);
    } else {
      condition = or(
        eq(serviceBookings.clientId, userId),
        eq(serviceBookings.providerId, userId)
      );
    }

    const bookings = await db.select().from(serviceBookings)
      .where(condition)
      .orderBy(desc(serviceBookings.createdAt));

    return bookings.map(this.mapServiceBooking);
  }

  async updateBookingStatus(bookingId: string, userId: string, status: string): Promise<ServiceBooking> {
    // Verify user has access to this booking
    const [booking] = await db.select().from(serviceBookings)
      .where(and(
        eq(serviceBookings.id, bookingId),
        or(
          eq(serviceBookings.clientId, userId),
          eq(serviceBookings.providerId, userId)
        )
      ))
      .limit(1);

    if (!booking) {
      throw new Error('Booking not found or access denied');
    }

    const [updatedBooking] = await db.update(serviceBookings)
      .set({ 
        status: status as any,
        updatedAt: new Date().toISOString()
      })
      .where(eq(serviceBookings.id, bookingId))
      .returning();

    return this.mapServiceBooking(updatedBooking);
  }

  // Provider Profile Management
  async createProviderProfile(userId: string, profileData: Partial<ServiceProviderProfile>): Promise<ServiceProviderProfile> {
    const profileId = randomUUID();

    const [newProfile] = await db.insert(serviceProviderProfiles).values({
      id: profileId,
      userId,
      businessName: profileData.businessName,
      tagline: profileData.tagline,
      bio: profileData.bio,
      skills: profileData.skills || [],
      certifications: profileData.certifications || [],
      languages: profileData.languages || [],
      responseTimeHours: profileData.responseTimeHours || 24,
      availabilityTimezone: profileData.availabilityTimezone || 'UTC',
      portfolioDescription: profileData.portfolioDescription,
      yearsExperience: profileData.yearsExperience,
      education: profileData.education,
      websiteUrl: profileData.websiteUrl,
      linkedinUrl: profileData.linkedinUrl,
      githubUrl: profileData.githubUrl,
      isVerified: false,
      verificationDocuments: profileData.verificationDocuments || []
    }).returning();

    return this.mapServiceProviderProfile(newProfile);
  }

  async updateProviderProfile(userId: string, updateData: Partial<ServiceProviderProfile>): Promise<ServiceProviderProfile> {
    const { createdAt, updatedAt, ...rest } = updateData;
    const [updatedProfile] = await db.update(serviceProviderProfiles)
      .set({
        ...rest,
        updatedAt: new Date().toISOString()
      })
      .where(eq(serviceProviderProfiles.userId, userId))
      .returning();

    if (!updatedProfile) {
      throw new Error('Provider profile not found');
    }

    return this.mapServiceProviderProfile(updatedProfile);
  }

  async getProviderProfile(userId: string): Promise<ServiceProviderProfile | null> {
    const [profile] = await db.select().from(serviceProviderProfiles)
      .where(eq(serviceProviderProfiles.userId, userId))
      .limit(1);

    return profile ? this.mapServiceProviderProfile(profile) : null;
  }

  // Milestone Management
  async updateMilestone(milestoneId: string, userId: string, updateData: { status?: string; deliverables?: string[]; clientFeedback?: string }): Promise<ServiceMilestone> {
    // Verify user has access to this milestone
    const [milestone] = await db.select({
      milestone: serviceMilestones,
      booking: serviceBookings
    })
    .from(serviceMilestones)
    .innerJoin(serviceBookings, eq(serviceMilestones.bookingId, serviceBookings.id))
    .where(and(
      eq(serviceMilestones.id, milestoneId),
      or(
        eq(serviceBookings.clientId, userId),
        eq(serviceBookings.providerId, userId)
      )
    ))
    .limit(1);

    if (!milestone) {
      throw new Error('Milestone not found or access denied');
    }

    const updateFields: any = { ...updateData };
    if (updateData.status === 'completed') {
      updateFields.completedAt = new Date().toISOString();
    }
    if (updateData.status === 'approved') {
      updateFields.approvedAt = new Date().toISOString();
    }

    const [updatedMilestone] = await db.update(serviceMilestones)
      .set(updateFields)
      .where(eq(serviceMilestones.id, milestoneId))
      .returning();

    return this.mapServiceMilestone(updatedMilestone);
  }

  async getBookingMilestones(bookingId: string, userId: string): Promise<ServiceMilestone[]> {
    // Verify user has access to this booking
    const [booking] = await db.select().from(serviceBookings)
      .where(and(
        eq(serviceBookings.id, bookingId),
        or(
          eq(serviceBookings.clientId, userId),
          eq(serviceBookings.providerId, userId)
        )
      ))
      .limit(1);

    if (!booking) {
      throw new Error('Booking not found or access denied');
    }

    const milestones = await db.select().from(serviceMilestones)
      .where(eq(serviceMilestones.bookingId, bookingId))
      .orderBy(asc(serviceMilestones.milestoneNumber));

    return milestones.map(this.mapServiceMilestone);
  }

  // Statistics
  async getProviderStats(providerId: string): Promise<ServiceStats> {
    const [serviceCount] = await db.select({ count: count() })
      .from(services)
      .where(eq(services.providerId, providerId));

    const [activeBookings] = await db.select({ count: count() })
      .from(serviceBookings)
      .where(and(
        eq(serviceBookings.providerId, providerId),
        eq(serviceBookings.status, 'in_progress')
      ));

    const [completedBookings] = await db.select({ count: count() })
      .from(serviceBookings)
      .where(and(
        eq(serviceBookings.providerId, providerId),
        eq(serviceBookings.status, 'completed')
      ));

    const [avgRating] = await db.select({ 
      avg: sql<number>`AVG(${serviceReviews.rating})` 
    })
    .from(serviceReviews)
    .where(eq(serviceReviews.revieweeId, providerId));

    const [totalEarnings] = await db.select({ 
      sum: sql<string>`SUM(${serviceBookings.totalAmount})` 
    })
    .from(serviceBookings)
    .where(and(
      eq(serviceBookings.providerId, providerId),
      eq(serviceBookings.paymentStatus, 'released')
    ));

    return {
      totalServices: serviceCount.count,
      activeBookings: activeBookings.count,
      completedBookings: completedBookings.count,
      averageRating: avgRating.avg || 0,
      totalEarnings: totalEarnings.sum || '0',
      responseRate: 95, // TODO: Calculate based on message response times
      completionRate: completedBookings.count > 0 ? 
        (completedBookings.count / (completedBookings.count + activeBookings.count)) * 100 : 0
    };
  }

  // Mapping functions
  private mapServiceCategory(category: any): ServiceCategory {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      icon: category.icon,
      isActive: category.isActive,
      createdAt: new Date(category.createdAt),
      updatedAt: new Date(category.updatedAt)
    };
  }

  private mapService(service: any): Service {
    return {
      id: service.id,
      providerId: service.providerId,
      categoryId: service.categoryId,
      title: service.title,
      description: service.description,
      shortDescription: service.shortDescription,
      pricingModel: service.pricingModel,
      basePrice: service.basePrice,
      currency: service.currency,
      durationMinutes: service.durationMinutes,
      isRemote: service.isRemote,
      locationRequired: service.locationRequired,
      serviceLocation: service.serviceLocation ? JSON.parse(service.serviceLocation) : null,
      tags: service.tags || [],
      requirements: service.requirements,
      deliverables: service.deliverables,
      portfolioItems: service.portfolioItems || [],
      status: service.status,
      featured: service.featured,
      createdAt: new Date(service.createdAt),
      updatedAt: new Date(service.updatedAt)
    };
  }

  private mapServiceAvailability(availability: any): ServiceAvailabilityType {
    return {
      id: availability.id,
      serviceId: availability.serviceId,
      dayOfWeek: availability.dayOfWeek,
      startTime: availability.startTime,
      endTime: availability.endTime,
      timezone: availability.timezone,
      isAvailable: availability.isAvailable,
      createdAt: new Date(availability.createdAt)
    };
  }

  private mapServiceBooking(booking: any): ServiceBooking {
    return {
      id: booking.id,
      serviceId: booking.serviceId,
      clientId: booking.clientId,
      providerId: booking.providerId,
      bookingType: booking.bookingType,
      status: booking.status,
      scheduledStart: booking.scheduledStart ? new Date(booking.scheduledStart) : undefined,
      scheduledEnd: booking.scheduledEnd ? new Date(booking.scheduledEnd) : undefined,
      actualStart: booking.actualStart ? new Date(booking.actualStart) : undefined,
      actualEnd: booking.actualEnd ? new Date(booking.actualEnd) : undefined,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      paymentStatus: booking.paymentStatus,
      escrowContract: booking.escrowContract,
      clientRequirements: booking.clientRequirements,
      providerNotes: booking.providerNotes,
      meetingLink: booking.meetingLink,
      locationDetails: booking.locationDetails ? JSON.parse(booking.locationDetails) : null,
      createdAt: new Date(booking.createdAt),
      updatedAt: new Date(booking.updatedAt)
    };
  }

  private mapServiceMilestone(milestone: any): ServiceMilestone {
    return {
      id: milestone.id,
      bookingId: milestone.bookingId,
      milestoneNumber: milestone.milestoneNumber,
      title: milestone.title,
      description: milestone.description,
      amount: milestone.amount,
      dueDate: milestone.dueDate ? new Date(milestone.dueDate) : undefined,
      status: milestone.status,
      deliverables: milestone.deliverables || [],
      clientFeedback: milestone.clientFeedback,
      completedAt: milestone.completedAt ? new Date(milestone.completedAt) : undefined,
      approvedAt: milestone.approvedAt ? new Date(milestone.approvedAt) : undefined,
      createdAt: new Date(milestone.createdAt)
    };
  }

  private mapServiceProviderProfile(profile: any): ServiceProviderProfile {
    return {
      id: profile.id,
      userId: profile.userId,
      businessName: profile.businessName,
      tagline: profile.tagline,
      bio: profile.bio,
      skills: profile.skills || [],
      certifications: profile.certifications || [],
      languages: profile.languages || [],
      responseTimeHours: profile.responseTimeHours,
      availabilityTimezone: profile.availabilityTimezone,
      portfolioDescription: profile.portfolioDescription,
      yearsExperience: profile.yearsExperience,
      education: profile.education,
      websiteUrl: profile.websiteUrl,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      isVerified: profile.isVerified,
      verificationDocuments: profile.verificationDocuments || [],
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt)
    };
  }
}

export const serviceService = new ServiceService();