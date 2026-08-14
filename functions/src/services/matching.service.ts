import * as admin from 'firebase-admin';
import { BaseService } from './base.service';
import { Job } from '../models/job.model';
import { Artisan } from '../models/artisan.model';

export class MatchingService extends BaseService {
  private db: admin.firestore.Firestore;
  
  constructor() {
    super();
    this.db = admin.firestore();
  }

  /**
   * Match artisans to a job
   */
  async matchArtisansToJob(jobId: string, limit: number = 5): Promise<{ matches: any[], count: number }> {
    const jobDoc = await this.db.collection('jobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      throw new Error('Job not found');
    }
    
    const jobData = jobDoc.data() as Job;
    
    // Query artisans by trade, available, and verified
    const artisansSnapshot = await this.db.collection('artisan_profiles')
      .where('trade', '==', jobData.trade_needed)
      .where('is_available', '==', true)
      .where('is_verified', '==', true)
      .get();

    if (artisansSnapshot.empty) {
      return { matches: [], count: 0 };
    }

    // Sort artisans by completed_jobs (desc) and reputation_score (desc) as tiebreakers
    const artisans = artisansSnapshot.docs.map((doc: any) => ({
      uid: doc.id,
      ...doc.data()
    })) as Artisan[];
    
    artisans.sort((a, b) => {
      // Primary: completed_jobs (descending)
      const aCompleted = a.completed_jobs || 0;
      const bCompleted = b.completed_jobs || 0;
      if (bCompleted !== aCompleted) {
        return bCompleted - aCompleted;
      }
      
      // Tiebreaker: reputation_score (descending, nulls last)
      const aScore = a.reputation_score === null || a.reputation_score === undefined ? -1 : a.reputation_score;
      const bScore = b.reputation_score === null || b.reputation_score === undefined ? -1 : b.reputation_score;
      
      return bScore - aScore;
    });

    // Return top matches
    const topMatches = artisans.slice(0, limit);

    // CRITICAL: Use Firestore transaction to ensure atomicity
    // Create matches and update job status atomically
    const matchResults = await this.db.runTransaction(async (transaction: any) => {
      const matchesRef = this.db.collection('matches');
      const createdMatches: any[] = [];

      // Create match records within transaction
      for (const artisan of topMatches) {
        const matchData = {
          job_id: jobId,
          artisan_uid: artisan.uid,
          status: 'pending',
          rating: null,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        const matchDocRef = matchesRef.doc(); // Generate ID
        transaction.set(matchDocRef, matchData);
        
        createdMatches.push({
          match_id: matchDocRef.id,
          ...matchData,
          artisan: {
            uid: artisan.uid,
            trade: artisan.trade,
            location: artisan.location,
            completed_jobs: artisan.completed_jobs,
            reputation_score: artisan.reputation_score,
            tagline: artisan.tagline
          }
        });
      }

      // Update job status to matched within same transaction
      transaction.update(jobDoc.ref, {
        status: 'matched',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      return createdMatches;
    });

    return { matches: matchResults, count: matchResults.length };
  }
}
