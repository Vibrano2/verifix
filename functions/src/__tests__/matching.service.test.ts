import { MatchingService } from '../services/matching.service';
import * as admin from 'firebase-admin';

// Mock Firebase Admin
jest.mock('firebase-admin', () => {
  const getMock = jest.fn();
  const whereMock = jest.fn();
  const updateMock = jest.fn();
  const setMock = jest.fn();
  
  const docRefMock = {
    get: getMock,
    id: 'mock_doc_id',
    ref: {}
  };
  
  const collectionMock = {
    doc: jest.fn(() => docRefMock),
    where: whereMock,
    get: getMock,
  };
  
  whereMock.mockReturnValue(collectionMock);
  
  const dbMock = {
    collection: jest.fn(() => collectionMock),
    runTransaction: jest.fn(async (callback) => {
      const transactionMock = {
        update: updateMock,
        set: setMock
      };
      return callback(transactionMock);
    })
  };
  
  return {
    firestore: Object.assign(jest.fn(() => dbMock), {
      FieldValue: {
        serverTimestamp: jest.fn(() => 'mock_timestamp')
      }
    }),
    initializeApp: jest.fn()
  };
});

describe('MatchingService', () => {
  let matchingService: MatchingService;
  let db: any;

  beforeEach(() => {
    jest.clearAllMocks();
    db = (admin as any).firestore();
    matchingService = new MatchingService();
  });

  describe('matchArtisansToJob', () => {
    it('should throw an error if the job does not exist', async () => {
      // Setup mock to return empty doc
      const mockDoc = { exists: false };
      const docRef = db.collection('jobs').doc('invalid_job');
      (docRef.get as jest.Mock).mockResolvedValueOnce(mockDoc);

      await expect(matchingService.matchArtisansToJob('invalid_job')).rejects.toThrow('Job not found');
    });

    it('should return empty matches if no available artisans found', async () => {
      // Setup mock for job
      const mockJobDoc = { 
        exists: true, 
        data: () => ({ trade_needed: 'plumber' }) 
      };
      const docRef = db.collection('jobs').doc('job_123');
      (docRef.get as jest.Mock).mockResolvedValueOnce(mockJobDoc);

      // Setup mock for artisans to return empty
      const queryRef = db.collection('artisan_profiles').where('trade', '==', 'plumber');
      (queryRef.get as jest.Mock).mockResolvedValueOnce({ empty: true });

      const result = await matchingService.matchArtisansToJob('job_123');

      expect(result).toEqual({ matches: [], count: 0 });
    });

    it('should match artisans correctly and sort by score/completed_jobs', async () => {
      const mockJobDoc = { 
        exists: true, 
        data: () => ({ trade_needed: 'plumber' }),
        ref: {}
      };
      const docRef = db.collection('jobs').doc('job_123');
      (docRef.get as jest.Mock).mockResolvedValueOnce(mockJobDoc);

      // Artisans to be sorted: 
      // A: completed=5, score=4.5
      // B: completed=10, score=4.8
      // C: completed=10, score=4.2
      // Expected order: B, C, A
      const mockArtisansSnapshot = {
        empty: false,
        docs: [
          { id: 'artisan_A', data: () => ({ trade: 'plumber', completed_jobs: 5, reputation_score: 4.5 }) },
          { id: 'artisan_B', data: () => ({ trade: 'plumber', completed_jobs: 10, reputation_score: 4.8 }) },
          { id: 'artisan_C', data: () => ({ trade: 'plumber', completed_jobs: 10, reputation_score: 4.2 }) }
        ]
      };

      const queryRef = db.collection('artisan_profiles').where('trade', '==', 'plumber');
      (queryRef.get as jest.Mock).mockResolvedValueOnce(mockArtisansSnapshot);

      const result = await matchingService.matchArtisansToJob('job_123', 2);

      // Check transaction was called
      expect(db.runTransaction).toHaveBeenCalled();
      
      // Check results
      expect(result.count).toBe(2);
      expect(result.matches[0].artisan_uid).toBe('artisan_B');
      expect(result.matches[1].artisan_uid).toBe('artisan_A');
    });
  });
});
