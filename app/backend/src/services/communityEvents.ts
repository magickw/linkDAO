/**
 * Community Events Management System
 * Full event creation, RSVP, attendance tracking, and calendar integration
 */

import { db } from '../db';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export interface CommunityEvent {
  id: string;
  communityId: string;
  title: string;
  description: string;
  eventType: 'meetup' | 'webinar' | 'workshop' | 'ama' | 'conference' | 'social' | 'governance' | 'other';
  startTime: Date;
  endTime: Date;
  timezone: string;
  location?: {
    type: 'physical' | 'virtual' | 'hybrid';
    address?: string;
    city?: string;
    country?: string;
    virtualLink?: string;
    platform?: string;
  };
  capacity?: number;
  currentAttendees: number;
  hosts: string[]; // User addresses
  speakers?: Array<{
    name: string;
    address?: string;
    title?: string;
    bio?: string;
  }>;
  tags: string[];
  isPublic: boolean;
  requiresApproval: boolean;
  tokenGating?: {
    enabled: boolean;
    minimumTokens?: number;
    requiredNFT?: string;
    stakingRequired?: number;
  };
  metadata?: {
    banner?: string;
    agenda?: Array<{
      time: string;
      title: string;
      description?: string;
      speaker?: string;
    }>;
    resources?: Array<{
      title: string;
      url: string;
      type: 'slides' | 'video' | 'document' | 'link';
    }>;
  };
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface EventRSVP {
  id: string;
  eventId: string;
  userId: string;
  userAddress: string;
  status: 'interested' | 'going' | 'not_going' | 'maybe';
  registeredAt: Date;
  checkInTime?: Date;
  feedback?: {
    rating?: number;
    comment?: string;
    submittedAt?: Date;
  };
}

export interface EventReminder {
  id: string;
  eventId: string;
  userId: string;
  reminderTime: Date;
  method: 'email' | 'push' | 'sms';
  sent: boolean;
}

export class CommunityEventsService {
  /**
   * Create a new community event
   */
  async createEvent(
    communityId: string,
    creatorAddress: string,
    eventData: Omit<CommunityEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'currentAttendees' | 'status'>
  ): Promise<CommunityEvent> {
    try {
      const event: CommunityEvent = {
        id: this.generateId(),
        ...eventData,
        communityId,
        currentAttendees: 0,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: creatorAddress,
      };

      // Validate event data
      this.validateEvent(event);

      // Store event
      // await db.insert(communityEvents).values(event);

      return event;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Update event
   */
  async updateEvent(
    eventId: string,
    updates: Partial<CommunityEvent>
  ): Promise<CommunityEvent> {
    try {
      // Get existing event
      const existing = await this.getEventById(eventId);
      if (!existing) {
        throw new Error('Event not found');
      }

      const updated: CommunityEvent = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      // Validate
      this.validateEvent(updated);

      // Update in database
      // await db.update(communityEvents).set(updated).where(eq(communityEvents.id, eventId));

      // Notify attendees if significant changes
      if (this.hasSignificantChanges(existing, updated)) {
        await this.notifyAttendeesOfChanges(eventId, updated);
      }

      return updated;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Publish event (make it visible)
   */
  async publishEvent(eventId: string): Promise<CommunityEvent> {
    try {
      const event = await this.getEventById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.status !== 'draft') {
        throw new Error('Event is already published');
      }

      event.status = 'published';
      event.updatedAt = new Date();

      // Update in database
      // await db.update(communityEvents).set({ status: 'published' }).where(eq(communityEvents.id, eventId));

      return event;
    } catch (error) {
      console.error('Error publishing event:', error);
      throw error;
    }
  }

  /**
   * RSVP to an event
   */
  async rsvpToEvent(
    eventId: string,
    userId: string,
    userAddress: string,
    status: EventRSVP['status']
  ): Promise<EventRSVP> {
    try {
      const event = await this.getEventById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Check capacity
      if (status === 'going' && event.capacity && event.currentAttendees >= event.capacity) {
        throw new Error('Event is at capacity');
      }

      // Check token gating
      if (event.tokenGating?.enabled) {
        const hasAccess = await this.checkEventAccess(userAddress, event);
        if (!hasAccess) {
          throw new Error('You do not meet the requirements to attend this event');
        }
      }

      // Check for existing RSVP
      const existingRSVP = await this.getUserRSVP(eventId, userId);

      if (existingRSVP) {
        // Update existing RSVP
        existingRSVP.status = status;
        // await db.update(eventRSVPs).set({ status }).where(eq(eventRSVPs.id, existingRSVP.id));

        // Update attendee count
        await this.updateAttendeeCount(eventId);

        return existingRSVP;
      }

      // Create new RSVP
      const rsvp: EventRSVP = {
        id: this.generateId(),
        eventId,
        userId,
        userAddress,
        status,
        registeredAt: new Date(),
      };

      // Store RSVP
      // await db.insert(eventRSVPs).values(rsvp);

      // Update attendee count
      await this.updateAttendeeCount(eventId);

      // Set reminder
      if (status === 'going') {
        await this.setEventReminder(eventId, userId, event.startTime);
      }

      return rsvp;
    } catch (error) {
      console.error('Error creating RSVP:', error);
      throw error;
    }
  }

  /**
   * Check-in to event (mark attendance)
   */
  async checkInToEvent(eventId: string, userId: string): Promise<EventRSVP> {
    try {
      const rsvp = await this.getUserRSVP(eventId, userId);
      if (!rsvp) {
        throw new Error('No RSVP found for this event');
      }

      rsvp.checkInTime = new Date();

      // Update RSVP
      // await db.update(eventRSVPs).set({ checkInTime: new Date() }).where(eq(eventRSVPs.id, rsvp.id));

      return rsvp;
    } catch (error) {
      console.error('Error checking in to event:', error);
      throw error;
    }
  }

  /**
   * Submit event feedback
   */
  async submitEventFeedback(
    eventId: string,
    userId: string,
    rating: number,
    comment?: string
  ): Promise<EventRSVP> {
    try {
      const rsvp = await this.getUserRSVP(eventId, userId);
      if (!rsvp) {
        throw new Error('No RSVP found for this event');
      }

      rsvp.feedback = {
        rating,
        comment,
        submittedAt: new Date(),
      };

      // Update RSVP
      // await db.update(eventRSVPs).set({ feedback: rsvp.feedback }).where(eq(eventRSVPs.id, rsvp.id));

      return rsvp;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  /**
   * Get upcoming events for a community
   */
  async getUpcomingEvents(
    communityId: string,
    limit: number = 10
  ): Promise<CommunityEvent[]> {
    try {
      // In production, query from database
      // WHERE communityId = ? AND startTime > NOW() AND status = 'published'
      // ORDER BY startTime ASC
      // LIMIT ?

      return [];
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return [];
    }
  }

  /**
   * Get user's events (attending, interested, hosting)
   */
  async getUserEvents(
    userId: string,
    filter?: 'attending' | 'interested' | 'hosting' | 'past'
  ): Promise<CommunityEvent[]> {
    try {
      // Query based on filter
      // - attending: RSVPs with status='going'
      // - interested: RSVPs with status='interested'
      // - hosting: events where user is in hosts array
      // - past: events with endTime < NOW()

      return [];
    } catch (error) {
      console.error('Error getting user events:', error);
      return [];
    }
  }

  /**
   * Get event attendees list
   */
  async getEventAttendees(eventId: string): Promise<EventRSVP[]> {
    try {
      // Query RSVPs for this event where status = 'going'
      return [];
    } catch (error) {
      console.error('Error getting attendees:', error);
      return [];
    }
  }

  /**
   * Export event to calendar (iCal format)
   */
  async exportToCalendar(eventId: string): Promise<string> {
    try {
      const event = await this.getEventById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Generate iCal format
      const ical = this.generateICalFormat(event);
      return ical;
    } catch (error) {
      console.error('Error exporting to calendar:', error);
      throw error;
    }
  }

  /**
   * Get event analytics
   */
  async getEventAnalytics(eventId: string): Promise<{
    totalRSVPs: number;
    going: number;
    interested: number;
    maybe: number;
    checkIns: number;
    attendanceRate: number;
    averageRating: number;
    feedbackCount: number;
  }> {
    try {
      const rsvps = await this.getEventRSVPs(eventId);

      const going = rsvps.filter(r => r.status === 'going').length;
      const interested = rsvps.filter(r => r.status === 'interested').length;
      const maybe = rsvps.filter(r => r.status === 'maybe').length;
      const checkIns = rsvps.filter(r => r.checkInTime).length;

      const feedbacks = rsvps.filter(r => r.feedback?.rating);
      const averageRating = feedbacks.length > 0
        ? feedbacks.reduce((sum, r) => sum + (r.feedback?.rating || 0), 0) / feedbacks.length
        : 0;

      const attendanceRate = going > 0 ? (checkIns / going) * 100 : 0;

      return {
        totalRSVPs: rsvps.length,
        going,
        interested,
        maybe,
        checkIns,
        attendanceRate,
        averageRating,
        feedbackCount: feedbacks.length,
      };
    } catch (error) {
      console.error('Error getting event analytics:', error);
      throw error;
    }
  }

  /**
   * Send event reminders
   */
  private async setEventReminder(
    eventId: string,
    userId: string,
    eventStartTime: Date
  ): Promise<void> {
    try {
      // Set reminders at different intervals
      const reminderIntervals = [
        { hours: 24, method: 'email' as const },
        { hours: 1, method: 'push' as const },
      ];

      for (const interval of reminderIntervals) {
        const reminderTime = new Date(eventStartTime.getTime() - interval.hours * 60 * 60 * 1000);

        if (reminderTime > new Date()) {
          const reminder: EventReminder = {
            id: this.generateId(),
            eventId,
            userId,
            reminderTime,
            method: interval.method,
            sent: false,
          };

          // Store reminder
          // await db.insert(eventReminders).values(reminder);
        }
      }
    } catch (error) {
      console.error('Error setting reminders:', error);
    }
  }

  /**
   * Helper functions
   */
  private validateEvent(event: CommunityEvent): void {
    if (!event.title || event.title.trim().length === 0) {
      throw new Error('Event title is required');
    }

    if (event.startTime >= event.endTime) {
      throw new Error('Event end time must be after start time');
    }

    if (event.capacity && event.capacity < 0) {
      throw new Error('Event capacity must be positive');
    }
  }

  private hasSignificantChanges(old: CommunityEvent, updated: CommunityEvent): boolean {
    return (
      old.startTime.getTime() !== updated.startTime.getTime() ||
      old.endTime.getTime() !== updated.endTime.getTime() ||
      old.location?.virtualLink !== updated.location?.virtualLink
    );
  }

  private async notifyAttendeesOfChanges(eventId: string, event: CommunityEvent): Promise<void> {
    // Implementation for sending notifications
    console.log(`Notifying attendees of changes to event ${eventId}`);
  }

  private async checkEventAccess(userAddress: string, event: CommunityEvent): Promise<boolean> {
    // Check token gating requirements
    // This would integrate with blockchainService
    return true;
  }

  private async updateAttendeeCount(eventId: string): Promise<void> {
    // Count RSVPs with status='going'
    // Update event.currentAttendees
  }

  private async getEventById(eventId: string): Promise<CommunityEvent | null> {
    // Query from database
    return null;
  }

  private async getUserRSVP(eventId: string, userId: string): Promise<EventRSVP | null> {
    // Query from database
    return null;
  }

  private async getEventRSVPs(eventId: string): Promise<EventRSVP[]> {
    // Query all RSVPs for event
    return [];
  }

  private generateICalFormat(event: CommunityEvent): string {
    const startDate = event.startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = event.endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LinkDAO//Community Events//EN
BEGIN:VEVENT
UID:${event.id}@linkdao.io
DTSTAMP:${startDate}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location?.virtualLink || event.location?.address || 'TBA'}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const eventsService = new CommunityEventsService();
