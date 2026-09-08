const mockState: {
  job: any;
  matches: any[];
  escrows: any[];
  updates: Array<{ ref: any; data: any }>;
} = {
  job: null,
  matches: [],
  escrows: [],
  updates: []
};

const mockDocRef = (collection: string, id: string) => ({ kind: 'doc', collection, id });
const mockQuery = (collection: string) => ({
  kind: 'query',
  collection,
  where: jest.fn(function () { return this; }),
  limit: jest.fn(function () { return this; }),
  orderBy: jest.fn(function () { return this; }),
  get: jest.fn()
});

const mockDb = {
  collection: jest.fn((name: string) => ({
    doc: jest.fn((id: string) => mockDocRef(name, id)),
    where: jest.fn(() => mockQuery(name)),
    add: jest.fn().mockResolvedValue({ id: 'analytics' })
  })),
  runTransaction: jest.fn(async (callback: any) => callback({
    get: jest.fn(async (ref: any) => {
      if (ref.kind === 'doc' && ref.collection === 'jobs') {
        return { exists: Boolean(mockState.job), data: () => mockState.job };
      }
      const records = ref.collection === 'matches' ? mockState.matches : mockState.escrows;
      return {
        empty: records.length === 0,
        docs: records.map((data, index) => ({
          id: `${ref.collection}-${index}`,
          data: () => data,
          ref: mockDocRef(ref.collection, `${index}`)
        }))
      };
    }),
    update: jest.fn((ref: any, data: any) => mockState.updates.push({ ref, data }))
  }))
};

jest.mock('firebase-admin', () => ({
  firestore: Object.assign(jest.fn(() => mockDb), {
    FieldValue: {
      serverTimestamp: jest.fn(() => 'server-time'),
      increment: jest.fn((value: number) => ({ increment: value }))
    },
    FieldPath: { documentId: jest.fn() }
  })
}));

import { JobService } from '../services/job.service';

describe('JobService.cancelJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.job = { client_uid: 'client-1', status: 'matched' };
    mockState.matches = [{ status: 'pending' }, { status: 'accepted' }];
    mockState.escrows = [];
    mockState.updates = [];
  });

  it('rejects a caller who does not own the job', async () => {
    await expect(new JobService().cancelJob('job-1', 'client-2'))
      .rejects.toThrow('You can only cancel your own jobs');
    expect(mockState.updates).toHaveLength(0);
  });

  it('rejects cancellation once an active payment intent exists', async () => {
    mockState.escrows = [{ type: 'escrow', escrow_status: 'PENDING', status: 'pending' }];
    await expect(new JobService().cancelJob('job-1', 'client-1'))
      .rejects.toThrow('Paid jobs must be refunded before cancellation');
    expect(mockState.updates).toHaveLength(0);
  });

  it('rejects cancellation from a terminal job state', async () => {
    mockState.job.status = 'completed';
    await expect(new JobService().cancelJob('job-1', 'client-1'))
      .rejects.toThrow('This job can no longer be cancelled');
  });

  it('cancels the job and every candidate in one transaction', async () => {
    await new JobService().cancelJob('job-1', 'client-1');
    expect(mockState.updates).toHaveLength(3);
    expect(mockState.updates[0].data.status).toBe('cancelled');
    expect(mockState.updates.slice(1).every(update => update.data.status === 'cancelled')).toBe(true);
  });
});
