const mockState: {
  job: any;
  artisans: Array<{ id: string; data: any }>;
  recentMatches: any[];
  writes: Array<{ type: string; ref: any; data: any }>;
  nextId: number;
} = { job: null, artisans: [], recentMatches: [], writes: [], nextId: 1 };

const mockSnapshot = (records: Array<{ id: string; data: any }>) => ({
  empty: records.length === 0,
  size: records.length,
  docs: records.map(record => ({
    id: record.id,
    data: () => record.data,
    ref: { kind: 'doc', collection: 'unknown', id: record.id }
  }))
});

const mockCollection = (name: string) => ({
  doc: jest.fn((id?: string) => {
    const docId = id || `match-${mockState.nextId++}`;
    return {
      kind: 'doc', collection: name, id: docId,
      get: jest.fn(async () => {
        if (name === 'jobs') {
          return { exists: Boolean(mockState.job), data: () => mockState.job, ref: { kind: 'doc', collection: name, id: docId } };
        }
        const artisan = mockState.artisans.find(item => item.id === docId);
        return { exists: Boolean(artisan), data: () => artisan?.data, ref: { kind: 'doc', collection: name, id: docId } };
      })
    };
  }),
  where: jest.fn(() => {
    const query: any = {
      kind: 'query', collection: name,
      where: jest.fn(() => query),
      orderBy: jest.fn(() => query),
      limit: jest.fn(() => query),
      get: jest.fn(async () => name === 'artisan_profiles'
        ? mockSnapshot(mockState.artisans)
        : mockSnapshot(mockState.recentMatches.map((data, index) => ({ id: `recent-${index}`, data }))))
    };
    return query;
  }),
  add: jest.fn().mockResolvedValue({ id: 'analytics' })
});

const mockDb = {
  collection: jest.fn((name: string) => mockCollection(name)),
  runTransaction: jest.fn(async (callback: any) => callback({
    get: jest.fn(async (ref: any) => {
      if (ref.collection === 'jobs') return { exists: Boolean(mockState.job), data: () => mockState.job };
      const artisan = mockState.artisans.find(item => item.id === ref.id);
      return { exists: Boolean(artisan), data: () => artisan?.data };
    }),
    set: jest.fn((ref: any, data: any) => mockState.writes.push({ type: 'set', ref, data })),
    update: jest.fn((ref: any, data: any) => mockState.writes.push({ type: 'update', ref, data }))
  }))
};

jest.mock('firebase-admin', () => ({
  firestore: Object.assign(jest.fn(() => mockDb), {
    FieldValue: { serverTimestamp: jest.fn(() => 'server-time') }
  })
}));

import { MatchingService } from '../services/matching.service';

describe('MatchingService.matchArtisansToJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.job = { status: 'open', trade_needed: 'Plumber', client_uid: 'client-1' };
    mockState.artisans = [];
    mockState.recentMatches = [];
    mockState.writes = [];
    mockState.nextId = 1;
  });

  it('rejects an unknown job', async () => {
    mockState.job = null;
    await expect(new MatchingService().matchArtisansToJob('missing'))
      .rejects.toThrow('Job not found');
  });

  it('returns an empty result when there are no eligible artisans', async () => {
    await expect(new MatchingService().matchArtisansToJob('job-1'))
      .resolves.toEqual({ matches: [], count: 0 });
  });

  it('orders eligible artisans by priority and caps the requested result', async () => {
    mockState.artisans = [
      { id: 'artisan-a', data: { uid: 'artisan-a', trade: 'Plumber', is_available: true, is_verified: true, completed_jobs: 5, reputation_score: 4.5 } },
      { id: 'artisan-b', data: { uid: 'artisan-b', trade: 'Plumber', is_available: true, is_verified: true, completed_jobs: 10, reputation_score: 4.8 } },
      { id: 'artisan-c', data: { uid: 'artisan-c', trade: 'Plumber', is_available: true, is_verified: true, completed_jobs: 10, reputation_score: 4.2 } }
    ];

    const result = await new MatchingService().matchArtisansToJob('job-1', 2);
    expect(result.count).toBe(2);
    expect(result.matches.map(match => match.artisan_uid)).toEqual(['artisan-b', 'artisan-c']);
    expect(mockState.writes.filter(write => write.type === 'set')).toHaveLength(2);
  });

  it('rechecks availability inside the write transaction', async () => {
    mockState.artisans = [
      { id: 'artisan-a', data: { uid: 'artisan-a', trade: 'Plumber', is_available: false, is_verified: true, completed_jobs: 5, reputation_score: 4.5 } }
    ];
    const result = await new MatchingService().matchArtisansToJob('job-1');
    expect(result.count).toBe(0);
    expect(mockState.writes).toHaveLength(0);
  });
});
