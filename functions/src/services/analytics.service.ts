/**
 * Analytics Service
 * Business logic for analytics event tracking
 */

import { BaseService } from './base.service';
import { AnalyticsRepository } from '../repositories';
import { AnalyticsEvent, AnalyticsEventType } from '../models/analytics.model';

export class AnalyticsService extends BaseService {
  private analyticsRepo: AnalyticsRepository;

  constructor() {
    super();
    this.analyticsRepo = new AnalyticsRepository();
  }

  /**
   * Track analytics event
   * Non-blocking - failures don't break application flow
   */
  async trackEvent(
    eventType: AnalyticsEventType,
    userId: string,
    metadata?: Record<string, any>,
    sessionId?: string
  ): Promise<void> {
    try {
      await this.analyticsRepo.trackEvent(eventType, userId, metadata, sessionId);
      
      this.logOperation('analytics-event-tracked', {
        eventType,
        userId
      });
    } catch (error) {
      // Log but don't throw - analytics failures shouldn't break app
      this.logger.error('Failed to track analytics event', {
        eventType,
        userId,
        error
      });
    }
  }

  /**
   * Get user activity
   */
  async getUserActivity(userId: string, limit: number = 50): Promise<AnalyticsEvent[]> {
    try {
      return await this.analyticsRepo.findByUserId(userId, limit);
    } catch (error) {
      this.handleError(error, 'Get user activity');
    }
  }

  /**
   * Get events by type
   */
  async getEventsByType(
    eventType: AnalyticsEventType,
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsEvent[]> {
    try {
      return await this.analyticsRepo.findByEventType(eventType, startDate, endDate);
    } catch (error) {
      this.handleError(error, 'Get events by type');
    }
  }

  /**
   * Get event count
   */
  async getEventCount(
    eventType: AnalyticsEventType,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    try {
      return await this.analyticsRepo.countEventsByType(eventType, startDate, endDate);
    } catch (error) {
      this.handleError(error, 'Get event count');
    }
  }

  /**
   * Get daily metrics for dashboard
   */
  async getDailyMetrics(
    startDate: Date,
    endDate: Date,
    eventType?: AnalyticsEventType
  ): Promise<Record<string, number>> {
    try {
      return await this.analyticsRepo.getDailyEventCounts(startDate, endDate, eventType);
    } catch (error) {
      this.handleError(error, 'Get daily metrics');
    }
  }

  /**
   * Get session events
   */
  async getSessionEvents(sessionId: string): Promise<AnalyticsEvent[]> {
    try {
      return await this.analyticsRepo.findBySessionId(sessionId);
    } catch (error) {
      this.handleError(error, 'Get session events');
    }
  }

  /**
   * Cleanup old events (admin action)
   */
  async cleanupOldEvents(daysToKeep: number = 90): Promise<number> {
    try {
      const deletedCount = await this.analyticsRepo.deleteOldEvents(daysToKeep);
      
      this.logOperation('analytics-cleanup', {
        deletedCount,
        daysToKeep
      });

      return deletedCount;
    } catch (error) {
      this.handleError(error, 'Cleanup old events');
    }
  }
}
