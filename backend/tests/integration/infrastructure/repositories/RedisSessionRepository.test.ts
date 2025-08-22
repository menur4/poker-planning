import { RedisSessionRepository } from '../../../../src/infrastructure/repositories/RedisSessionRepository';
import { Session } from '../../../../src/domain/entities/Session';
import { SessionId } from '../../../../src/domain/value-objects/SessionId';
import { Scale } from '../../../../src/domain/value-objects/Scale';
import { Participant } from '../../../../src/domain/entities/Participant';
import { VoteValue } from '../../../../src/domain/value-objects/VoteValue';
import Redis from 'ioredis';

// Mock Redis for testing
jest.mock('ioredis');
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

describe('RedisSessionRepository Integration Tests', () => {
  let repository: RedisSessionRepository;
  let mockRedis: jest.Mocked<Redis>;
  let session: Session;
  let sessionId: SessionId;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock Redis instance
    mockRedis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      keys: jest.fn(),
      disconnect: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock Redis constructor to return our mock instance
    MockedRedis.mockImplementation(() => mockRedis);

    repository = new RedisSessionRepository({
      host: 'localhost',
      port: 6379,
      db: 1 // Use test database
    });

    // Create test session
    sessionId = SessionId.generate();
    session = new Session(sessionId, 'Test Session', Scale.fibonacci(), 'creator-123');
    
    // Add some participants and votes for comprehensive testing
    const participant1 = new Participant('p1', 'John', 'participant');
    const participant2 = new Participant('p2', 'Jane', 'participant');
    session.addParticipant(participant1);
    session.addParticipant(participant2);
    session.startVoting('Test question');
    session.submitVote('p1', new VoteValue('5', Scale.fibonacci()));
  });

  afterEach(async () => {
    await repository.disconnect();
  });

  describe('save', () => {
    it('should save session to Redis', async () => {
      // Arrange
      mockRedis.set.mockResolvedValue('OK');

      // Act
      await repository.save(session);

      // Assert
      expect(mockRedis.set).toHaveBeenCalledWith(
        `session:${sessionId.getValue()}`,
        expect.any(String),
        'EX',
        86400 // 24 hours TTL
      );

      // Verify the serialized data contains expected fields
      const serializedData = (mockRedis.set as jest.Mock).mock.calls[0][1];
      const parsedData = JSON.parse(serializedData);
      
      expect(parsedData).toHaveProperty('id');
      expect(parsedData).toHaveProperty('name', 'Test Session');
      expect(parsedData).toHaveProperty('creatorId', 'creator-123');
      expect(parsedData).toHaveProperty('participants');
      expect(parsedData).toHaveProperty('currentVote');
      expect(parsedData.participants).toHaveLength(2);
    });

    it('should handle Redis save failure', async () => {
      // Arrange
      mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));

      // Act & Assert
      await expect(repository.save(session)).rejects.toThrow('Redis connection failed');
    });

    it('should save session with custom TTL', async () => {
      // Arrange
      const customTtl = 3600; // 1 hour
      const repositoryWithCustomTtl = new RedisSessionRepository({
        host: 'localhost',
        port: 6379,
        db: 1
      }, customTtl);
      mockRedis.set.mockResolvedValue('OK');

      // Act
      await repositoryWithCustomTtl.save(session);

      // Assert
      expect(mockRedis.set).toHaveBeenCalledWith(
        `session:${sessionId.getValue()}`,
        expect.any(String),
        'EX',
        customTtl
      );
    });
  });

  describe('findById', () => {
    it('should find existing session', async () => {
      // Arrange
      const sessionData = {
        id: sessionId.getValue(),
        name: 'Test Session',
        scale: { type: 'fibonacci', values: ['1', '2', '3', '5', '8', '13', '21'] },
        creatorId: 'creator-123',
        isActive: true,
        participants: [
          { id: 'p1', name: 'John', role: 'participant', isConnected: true },
          { id: 'p2', name: 'Jane', role: 'participant', isConnected: true }
        ],
        currentVote: {
          question: 'Test question',
          status: 'voting',
          startedAt: new Date().toISOString(),
          votes: [
            { participantId: 'p1', voteValue: '5', isRevealed: false }
          ]
        },
        voteHistory: []
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));

      // Act
      const result = await repository.findById(sessionId);

      // Assert
      expect(mockRedis.get).toHaveBeenCalledWith(`session:${sessionId.getValue()}`);
      expect(result).not.toBeNull();
      expect(result!.getId().getValue()).toBe(sessionId.getValue());
      expect(result!.getName()).toBe('Test Session');
      expect(result!.getCreatorId()).toBe('creator-123');
      expect(result!.getParticipants()).toHaveLength(2);
      expect(result!.isVotingActive()).toBe(true);
    });

    it('should return null for non-existent session', async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null);

      // Act
      const result = await repository.findById(sessionId);

      // Assert
      expect(mockRedis.get).toHaveBeenCalledWith(`session:${sessionId.getValue()}`);
      expect(result).toBeNull();
    });

    it('should handle Redis get failure', async () => {
      // Arrange
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      // Act & Assert
      await expect(repository.findById(sessionId)).rejects.toThrow('Redis connection failed');
    });

    it('should handle invalid JSON data', async () => {
      // Arrange
      mockRedis.get.mockResolvedValue('invalid json');

      // Act & Assert
      await expect(repository.findById(sessionId)).rejects.toThrow();
    });
  });

  describe('findByCreatorId', () => {
    it('should find sessions by creator ID', async () => {
      // Arrange
      const creatorId = 'creator-123';
      const sessionKeys = [`session:${sessionId.getValue()}`, 'session:other-id'];
      
      const sessionData1 = {
        id: sessionId.getValue(),
        name: 'Session 1',
        creatorId: 'creator-123',
        scale: { type: 'fibonacci', values: ['1', '2', '3', '5', '8'] },
        isActive: true,
        participants: [],
        currentVote: null,
        voteHistory: []
      };

      const sessionData2 = {
        id: 'other-id',
        name: 'Session 2',
        creatorId: 'other-creator',
        scale: { type: 'fibonacci', values: ['1', '2', '3', '5', '8'] },
        isActive: true,
        participants: [],
        currentVote: null,
        voteHistory: []
      };

      mockRedis.keys.mockResolvedValue(sessionKeys);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(sessionData1))
        .mockResolvedValueOnce(JSON.stringify(sessionData2));

      // Act
      const result = await repository.findByCreatorId(creatorId);

      // Assert
      expect(mockRedis.keys).toHaveBeenCalledWith('session:*');
      expect(result).toHaveLength(1);
      expect(result[0].getCreatorId()).toBe(creatorId);
      expect(result[0].getName()).toBe('Session 1');
    });

    it('should return empty array when no sessions found', async () => {
      // Arrange
      mockRedis.keys.mockResolvedValue([]);

      // Act
      const result = await repository.findByCreatorId('non-existent');

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle Redis keys failure', async () => {
      // Arrange
      mockRedis.keys.mockRejectedValue(new Error('Redis connection failed'));

      // Act & Assert
      await expect(repository.findByCreatorId('creator-123')).rejects.toThrow('Redis connection failed');
    });
  });

  describe('delete', () => {
    it('should delete existing session', async () => {
      // Arrange
      mockRedis.del.mockResolvedValue(1);

      // Act
      await repository.delete(sessionId);

      // Assert
      expect(mockRedis.del).toHaveBeenCalledWith(`session:${sessionId.getValue()}`);
    });

    it('should handle deletion of non-existent session', async () => {
      // Arrange
      mockRedis.del.mockResolvedValue(0);

      // Act
      await repository.delete(sessionId);

      // Assert
      expect(mockRedis.del).toHaveBeenCalledWith(`session:${sessionId.getValue()}`);
    });

    it('should handle Redis delete failure', async () => {
      // Arrange
      mockRedis.del.mockRejectedValue(new Error('Redis connection failed'));

      // Act & Assert
      await expect(repository.delete(sessionId)).rejects.toThrow('Redis connection failed');
    });
  });

  describe('exists', () => {
    it('should return true for existing session', async () => {
      // Arrange
      mockRedis.exists.mockResolvedValue(1);

      // Act
      const result = await repository.exists(sessionId);

      // Assert
      expect(mockRedis.exists).toHaveBeenCalledWith(`session:${sessionId.getValue()}`);
      expect(result).toBe(true);
    });

    it('should return false for non-existent session', async () => {
      // Arrange
      mockRedis.exists.mockResolvedValue(0);

      // Act
      const result = await repository.exists(sessionId);

      // Assert
      expect(mockRedis.exists).toHaveBeenCalledWith(`session:${sessionId.getValue()}`);
      expect(result).toBe(false);
    });

    it('should handle Redis exists failure', async () => {
      // Arrange
      mockRedis.exists.mockRejectedValue(new Error('Redis connection failed'));

      // Act & Assert
      await expect(repository.exists(sessionId)).rejects.toThrow('Redis connection failed');
    });
  });

  describe('connection management', () => {
    it('should disconnect from Redis', async () => {
      // Act
      await repository.disconnect();

      // Assert
      expect(mockRedis.disconnect).toHaveBeenCalled();
    });
  });
});
