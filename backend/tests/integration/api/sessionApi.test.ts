import request from 'supertest';
import { App } from '../../../src/app';
import { RedisSessionRepository } from '../../../src/infrastructure/repositories/RedisSessionRepository';

// Mock Redis for testing
jest.mock('ioredis');

describe('Session API Integration Tests', () => {
  let app: App;
  let server: any;

  beforeAll(async () => {
    const config = {
      port: 0, // Use random port for testing
      redis: {
        host: 'localhost',
        port: 6379,
        db: 1 // Use test database
      }
    };

    app = new App(config);
    server = app.getExpressApp();
  });

  afterAll(async () => {
    if (app) {
      await app.stop();
    }
  });

  describe('POST /api/v1/sessions', () => {
    it('should create a new session successfully', async () => {
      const sessionData = {
        name: 'Test Session',
        scale: 'fibonacci',
        creatorId: 'creator-123'
      };

      const response = await request(server)
        .post('/api/v1/sessions')
        .send(sessionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data.sessionId).toHaveProperty('value');
      
      // Extract the actual session ID for further tests
      const actualSessionId = response.body.data.sessionId.value;
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(server)
        .post('/api/v1/sessions')
        .send({
          name: 'Test Session'
          // Missing scale and creatorId
        })
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 500 for invalid scale', async () => {
      const sessionData = {
        name: 'Test Session',
        scale: 'invalid-scale',
        creatorId: 'creator-123'
      };

      const response = await request(server)
        .post('/api/v1/sessions')
        .send(sessionData)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/sessions/:sessionId/join', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a session first
      const sessionData = {
        name: 'Test Session',
        scale: 'fibonacci',
        creatorId: 'creator-123'
      };

      const createResponse = await request(server)
        .post('/api/v1/sessions')
        .send(sessionData);

      sessionId = createResponse.body.data.sessionId.value;
    });

    it('should join session as participant', async () => {
      const joinData = {
        participantName: 'John Doe',
        role: 'participant'
      };

      const response = await request(server)
        .post(`/api/v1/sessions/${sessionId}/join`)
        .send(joinData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('participantId');
      expect(response.body.data).toHaveProperty('sessionName', 'Test Session');
      expect(response.body.data).toHaveProperty('scale');
      expect(response.body.data.participantId).toContain('participant-');
    });

    it('should join session as spectator', async () => {
      const joinData = {
        participantName: 'Jane Observer',
        role: 'spectator'
      };

      const response = await request(server)
        .post(`/api/v1/sessions/${sessionId}/join`)
        .send(joinData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.participantId).toContain('spectator-');
    });

    it('should return 400 for invalid role', async () => {
      const joinData = {
        participantName: 'Invalid User',
        role: 'invalid-role'
      };

      const response = await request(server)
        .post(`/api/v1/sessions/${sessionId}/join`)
        .send(joinData)
        .expect(400);

      expect(response.body.error).toContain('Role must be either');
    });

    it('should return 404 for non-existent session', async () => {
      const joinData = {
        participantName: 'John Doe',
        role: 'participant'
      };

      const response = await request(server)
        .post('/api/v1/sessions/non-existent-id/join')
        .send(joinData)
        .expect(404);

      expect(response.body.error).toContain('Session not found');
    });
  });

  describe('GET /api/v1/sessions/:sessionId', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a session first
      const sessionData = {
        name: 'Test Session',
        scale: 'fibonacci',
        creatorId: 'creator-123'
      };

      const createResponse = await request(server)
        .post('/api/v1/sessions')
        .send(sessionData);

      sessionId = createResponse.body.data.sessionId.value;
    });

    it('should get session details', async () => {
      const response = await request(server)
        .get(`/api/v1/sessions/${sessionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', sessionId);
      expect(response.body.data).toHaveProperty('name', 'Test Session');
      expect(response.body.data).toHaveProperty('creatorId', 'creator-123');
      expect(response.body.data).toHaveProperty('isActive', true);
      expect(response.body.data).toHaveProperty('participants');
      expect(response.body.data).toHaveProperty('currentVote', null);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(server)
        .get('/api/v1/sessions/non-existent-id')
        .expect(404);

      expect(response.body.error).toContain('Session not found');
    });
  });

  describe('Voting Flow Integration', () => {
    let sessionId: string;
    let participantId: string;

    beforeEach(async () => {
      // Create session
      const sessionData = {
        name: 'Voting Test Session',
        scale: 'fibonacci',
        creatorId: 'creator-123'
      };

      const createResponse = await request(server)
        .post('/api/v1/sessions')
        .send(sessionData);

      sessionId = createResponse.body.data.sessionId;

      // Join as participant
      const joinData = {
        participantName: 'Voter',
        role: 'participant'
      };

      const joinResponse = await request(server)
        .post(`/api/v1/sessions/${sessionId}/join`)
        .send(joinData);

      participantId = joinResponse.body.data.participantId;
    });

    it('should complete full voting flow', async () => {
      // 1. Start voting
      const startVotingData = {
        question: 'How complex is this feature?',
        initiatorId: 'creator-123'
      };

      const startResponse = await request(server)
        .post(`/api/v1/sessions/${sessionId}/voting/start`)
        .send(startVotingData)
        .expect(200);

      expect(startResponse.body.success).toBe(true);
      expect(startResponse.body.data).toHaveProperty('votingRoundId');
      expect(startResponse.body.data).toHaveProperty('question', 'How complex is this feature?');

      // 2. Submit vote
      const voteData = {
        participantId,
        voteValue: '5'
      };

      const voteResponse = await request(server)
        .post(`/api/v1/sessions/${sessionId}/voting/vote`)
        .send(voteData)
        .expect(200);

      expect(voteResponse.body.success).toBe(true);
      expect(voteResponse.body.data).toHaveProperty('voteValue', '5');

      // 3. Reveal votes
      const revealData = {
        initiatorId: 'creator-123'
      };

      const revealResponse = await request(server)
        .post(`/api/v1/sessions/${sessionId}/voting/reveal`)
        .send(revealData)
        .expect(200);

      expect(revealResponse.body.success).toBe(true);
      expect(revealResponse.body.data).toHaveProperty('question', 'How complex is this feature?');
      expect(revealResponse.body.data).toHaveProperty('votes');
      expect(revealResponse.body.data).toHaveProperty('statistics');
      expect(revealResponse.body.data.votes).toHaveLength(1);
      expect(revealResponse.body.data.votes[0]).toHaveProperty('voteValue', '5');
    });

    it('should handle voting errors correctly', async () => {
      // Try to vote without starting voting
      const voteData = {
        participantId,
        voteValue: '5'
      };

      const response = await request(server)
        .post(`/api/v1/sessions/${sessionId}/voting/vote`)
        .send(voteData)
        .expect(400);

      expect(response.body.error).toContain('No active voting round');
    });
  });

  describe('Health and Documentation Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return API documentation', async () => {
      const response = await request(server)
        .get('/api/v1/docs')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Poker Planning API');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('sessions');
      expect(response.body.endpoints).toHaveProperty('voting');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(server)
        .get('/api/v1/unknown-route')
        .expect(404);

      expect(response.body.error).toContain('Route not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(server)
        .post('/api/v1/sessions')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });
});
