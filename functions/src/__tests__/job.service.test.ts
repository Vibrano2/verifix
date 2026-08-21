import { JobService } from '../services/job.service';
import * as admin from 'firebase-admin';

jest.mock('../utils/paystack', () => ({
  initiateTransfer: jest.fn().mockResolvedValue({ status: true })
}));

// Mock Firebase Admin
jest.mock('firebase-admin', () => {
  const getMock = jest.fn();
  const whereMock = jest.fn();
  const limitMock = jest.fn();
  const updateMock = jest.fn();
  
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
  
  whereMock.mockReturnValue({
    where: whereMock,
    limit: limitMock,
    get: getMock
  });
  
  limitMock.mockReturnValue({
    get: getMock
  });
  
  const dbMock = {
    collection: jest.fn(() => collectionMock),
    runTransaction: jest.fn(async (callback) => {
      const transactionMock = {
        update: updateMock,
      };
      return callback(transactionMock);
    })
  };
  
  return {
    firestore: Object.assign(jest.fn(() => dbMock), {
      FieldValue: {
        serverTimestamp: jest.fn(() => 'mock_timestamp'),
        increment: jest.fn((val) => `increment_${val}`)
      }
    }),
    initializeApp: jest.fn()
  };
});

describe('JobService', () => {
  let jobService: JobService;
  let db: any;

  beforeEach(() => {
    jest.clearAllMocks();
    db = (admin as any).firestore();
    jobService = new JobService();
  });

  describe('markComplete', () => {
    it('should throw an error if the job does not exist', async () => {
      // Setup mock to return empty doc for job
      const mockDoc = { exists: false };
      const docRef = db.collection('jobs').doc('job_123');
      (docRef.get as jest.Mock).mockResolvedValueOnce(mockDoc);

      await expect(jobService.markComplete('job_123', 'client_1', 'match_1')).rejects.toThrow('Job not found');
    });

    it('should throw an error if the user is not the client', async () => {
      const mockJobDoc = { 
        exists: true, 
        data: () => ({ client_uid: 'client_2' }) 
      };
      const docRef = db.collection('jobs').doc('job_123');
      (docRef.get as jest.Mock).mockResolvedValueOnce(mockJobDoc);

      await expect(jobService.markComplete('job_123', 'client_1', 'match_1')).rejects.toThrow('Forbidden: Only the client who posted this job can mark it complete');
    });

    it('should throw an error if the match is not found', async () => {
      const mockJobDoc = { 
        exists: true, 
        data: () => ({ client_uid: 'client_1' }) 
      };
      const jobDocRef = db.collection('jobs').doc('job_123');
      (jobDocRef.get as jest.Mock).mockResolvedValueOnce(mockJobDoc);

      const mockMatchDoc = { exists: false };
      const matchDocRef = db.collection('matches').doc('match_1');
      (matchDocRef.get as jest.Mock).mockResolvedValueOnce(mockMatchDoc);

      await expect(jobService.markComplete('job_123', 'client_1', 'match_1')).rejects.toThrow('Match not found');
    });

    it('should throw an error if the match does not belong to the job', async () => {
      const mockJobDoc = { 
        exists: true, 
        data: () => ({ client_uid: 'client_1' }) 
      };
      const jobDocRef = db.collection('jobs').doc('job_123');
      (jobDocRef.get as jest.Mock).mockResolvedValueOnce(mockJobDoc);

      const mockMatchDoc = { 
        exists: true,
        data: () => ({ job_id: 'job_456' })
      };
      const matchDocRef = db.collection('matches').doc('match_1');
      (matchDocRef.get as jest.Mock).mockResolvedValueOnce(mockMatchDoc);

      await expect(jobService.markComplete('job_123', 'client_1', 'match_1')).rejects.toThrow('Match does not belong to this job');
    });

    it('should correctly release escrow and return transaction details', async () => {
      const mockJobDoc = { 
        exists: true, 
        data: () => ({ client_uid: 'client_1' }),
        ref: {}
      };
      
      const mockMatchDoc = { 
        exists: true,
        data: () => ({ job_id: 'job_123', artisan_uid: 'artisan_1' }),
        ref: {}
      };

      const mockTransactionSnapshot = {
        empty: false,
        docs: [{
          id: 'tx_123',
          data: () => ({ status: 'held', locked_job_value: 10000 }),
          ref: {}
        }]
      };

      // Mock Firestore get calls in sequence
      const collectionMock = db.collection as jest.Mock;
      const docMock = collectionMock().doc as jest.Mock;
      
      // We'll just mock the implementations properly
      docMock.mockImplementation((path) => {
        if (path === 'job_123') return { get: jest.fn().mockResolvedValue(mockJobDoc), ref: {} };
        if (path === 'match_1') return { get: jest.fn().mockResolvedValue(mockMatchDoc), ref: {} };
        if (path === 'artisan_1') return { get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ paystack_recipient_code: 'RCP_123' }) }), ref: {} };
        return { get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }), ref: {} };
      });

      const whereMock = collectionMock().where as jest.Mock;
      whereMock.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockTransactionSnapshot)
      }));

      const result = await jobService.markComplete('job_123', 'client_1', 'match_1');

      // Check transaction was called
      expect(db.runTransaction).toHaveBeenCalled();
      
      // Check results
      expect(result.transaction.status).toBe('released');
      expect(result.transaction.locked_job_value).toBe(10000);
      expect(result.transaction.commission_retained).toBe(1000);
      expect(result.transaction.artisan_receives).toBe(9000);
    });
  });
});

