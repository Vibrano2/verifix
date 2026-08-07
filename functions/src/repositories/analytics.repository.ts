/**
 * Analytics Repository
 * Handles all analytics event tracking operations
 * Per PRD Section 8.8: for Data Analysis dashboard
 */

import { BaseRepository } from './base.repository';
import { COLLECTIONS } from '../constants';
import { AnalyticsEvent, AnalyticsEventType } from '../models/analytics.model';
import { Logger } from '../utils/logger';
import * as admin from 'firebase-admin';

export class AnalyticsRepository extends BaseRepository<AnalyticsEvent> {
  constructor() {
    super(COLLECTIONS.ANALYTICS_EVENTS);
  }

  /**
   * Track an analytics event
   */
  async trackEvent(
    eventType: AnalyticsEventType,
    userId: string,
    metadata?: Record<string, any>,
    sessionId?: string
  ): Promise<AnalyticsEvent> {
    try {
      const eventData = {
        event_type: eventType,
        user_id: userId,
        session_id: sessionId,
        metadata,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.getCollection().add(eventData);

      return {
        event_id: docRef.id,
        event_type: eventType,
        user_id: userId,
        session_id: sessionId,
        metadata,
        timestamp: new Date()
      };
    } catch (error) {
      Logger.error('Error tracking analytics event', { eventType, userId, error });
      // Don't throw - analytics failures should not break application flow
      throw error;
    }
  }

  /**
   * Get events by user ID
   */
  async findByUserId(userId: string, limit: number = 100): Promise<AnalyticsEvent[]> {
    try {
      const snapshot = await this.getCollection()
        .where('user_id', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
        event_id: doc.id,
        ...doc.data()
      } as AnalyticsEvent));
    } catch (error) {
      Logger.error('Error finding events by user ID', { userId, error });
      throw error;
    }
  }

  /**
   * Get events by type
   */
  async findByEventType(
    eventType: AnalyticsEventType,
    startDate?: Date,
    endDate?: Date,
    limit: number = 1000
  ): Promise<AnalyticsEvent[]> {
    try {
      let query = this.getCollection()
        .where('event_type', '==', eventType);

      if (startDate) {
        query = query.where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate));
      }

      if (endDate) {
        query = query.where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endDate));
      }

      const snapshot = await query
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
        event_id: doc.id,
        ...doc.data()
      } as AnalyticsEvent));
    } catch (error) {
      Logger.error('Error finding events by type', { eventType, error });
      throw error;
    }
  }

  /**
   * Get event count by type
   */
  async countEventsByType(
    eventType: AnalyticsEventType,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    try {
      let query = this.getCollection()
        .where('event_type', '==', eventType);

      if (startDate) {
        query = query.where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate));
      }

      if (endDate) {
        query = query.where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endDate));
      }

      const snapshot = await query.get();
      return snapshot.size;
    } catch (error) {
      Logger.error('Error counting events by type', { eventType, error });
      throw error;
    }
  }

  /**
   * Get events by session
   */
  async findBySessionId(sessionId: string): Promise<AnalyticsEvent[]> {
    try {
      const snapshot = await this.getCollection()
        .where('session_id', '==', sessionId)
        .orderBy('timestamp', 'asc')
        .get();

      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
        event_id: doc.id,
        ...doc.data()
      } as AnalyticsEvent));
    } catch (error) {
      Logger.error('Error finding events by session ID', { sessionId, error });
      throw error;
    }
  }

  /**
   * Get daily event counts (for dashboard charts)
   */
  async getDailyEventCounts(
    startDate: Date,
    endDate: Date,
    eventType?: AnalyticsEventType
  ): Promise<Record<string, number>> {
    try {
      let query = this.getCollection()
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endDate));

      if (eventType) {
        query = query.where('event_type', '==', eventType);
      }

      const snapshot = await query.get();

      const dailyCounts: Record<string, number> = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const timestamp = data.timestamp instanceof admin.firestore.Timestamp
          ? data.timestamp.toDate()
          : new Date(data.timestamp);
        
        const dateKey = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
        dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
      });

      return dailyCounts;
    } catch (error) {
      Logger.error('Error getting daily event counts', { startDate, endDate, eventType, error });
      throw error;
    }
  }

  /**
   * Delete old events (cleanup - keep last 90 days)
   */
  async deleteOldEvents(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const snapshot = await this.getCollection()
        .where('timestamp', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = admin.firestore().batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      
      Logger.info('Deleted old analytics events', { 
        count: snapshot.size, 
        cutoffDate 
      });

      return snapshot.size;
    } catch (error) {
      Logger.error('Error deleting old events', { daysToKeep, error });
      throw error;
    }
  }
}
