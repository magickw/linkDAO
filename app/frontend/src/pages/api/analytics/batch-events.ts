import { NextApiRequest, NextApiResponse } from 'next';

interface BatchEvent {
  eventType: string;
  data: Record<string, unknown>;
  timestamp: string | Date;
}

interface BatchEventRequest {
  events: BatchEvent[];
  sessionId: string;
  userId: string;
}

interface EventStats {
  totalEvents: number;
  eventTypes: Record<string, number>;
  lastProcessed: string;
}

// In-memory store for demo purposes - in production, use a proper database/analytics service
const eventStats: EventStats = {
  totalEvents: 0,
  eventTypes: {},
  lastProcessed: new Date().toISOString(),
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { events, sessionId, userId } = req.body as BatchEventRequest;

    // Validate request
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: events array is required',
      });
    }

    if (events.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No events to process',
        processed: 0,
      });
    }

    // Rate limiting: max 100 events per batch
    if (events.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Too many events. Maximum 100 events per batch.',
      });
    }

    // Process events
    const processedEvents: Array<{
      eventType: string;
      timestamp: string;
      processed: boolean;
    }> = [];

    for (const event of events) {
      try {
        // Validate event structure
        if (!event.eventType || typeof event.eventType !== 'string') {
          continue; // Skip invalid events
        }

        // Update stats
        eventStats.totalEvents++;
        eventStats.eventTypes[event.eventType] =
          (eventStats.eventTypes[event.eventType] || 0) + 1;

        // In production, you would:
        // 1. Store events in a database (e.g., ClickHouse, BigQuery, PostgreSQL)
        // 2. Send to an analytics service (e.g., Segment, Mixpanel, Amplitude)
        // 3. Forward to a message queue (e.g., Kafka, RabbitMQ) for processing

        // For now, we log and track
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Analytics] Event: ${event.eventType}`, {
            sessionId,
            userId,
            data: event.data,
            timestamp: event.timestamp,
          });
        }

        processedEvents.push({
          eventType: event.eventType,
          timestamp: event.timestamp instanceof Date
            ? event.timestamp.toISOString()
            : event.timestamp,
          processed: true,
        });
      } catch (eventError) {
        // Log error but continue processing other events
        console.error('Error processing event:', event.eventType, eventError);
        processedEvents.push({
          eventType: event.eventType,
          timestamp: event.timestamp instanceof Date
            ? event.timestamp.toISOString()
            : String(event.timestamp),
          processed: false,
        });
      }
    }

    eventStats.lastProcessed = new Date().toISOString();

    // Return success response
    return res.status(200).json({
      success: true,
      message: `Processed ${processedEvents.filter(e => e.processed).length} events`,
      processed: processedEvents.filter(e => e.processed).length,
      failed: processedEvents.filter(e => !e.processed).length,
      stats: {
        totalEvents: eventStats.totalEvents,
        uniqueEventTypes: Object.keys(eventStats.eventTypes).length,
      },
    });
  } catch (error) {
    console.error('Batch events processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process batch events',
    });
  }
}

// Export config to increase body size limit for batch events
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
