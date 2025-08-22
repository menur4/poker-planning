import { RevealVotesUseCase } from '../../../../src/application/use-cases/RevealVotes';
import { SessionRepository } from '../../../../src/domain/repositories/SessionRepository';
import { Session } from '../../../../src/domain/entities/Session';
import { SessionId } from '../../../../src/domain/value-objects/SessionId';
import { Scale } from '../../../../src/domain/value-objects/Scale';
import { VoteValue } from '../../../../src/domain/value-objects/VoteValue';
import { Participant } from '../../../../src/domain/entities/Participant';

// Mock repository
class MockSessionRepository implements SessionRepository {
  private sessions: Map<string, Session> = new Map();

  async save(session: Session): Promise<void> {
    this.sessions.set(session.getId().getValue(), session);
  }

  async findById(id: SessionId): Promise<Session | null> {
    return this.sessions.get(id.getValue()) || null;
  }

  async findByCreatorId(creatorId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(s => s.getCreatorId() === creatorId);
  }

  async delete(id: SessionId): Promise<void> {
    this.sessions.delete(id.getValue());
  }

  async exists(id: SessionId): Promise<boolean> {
    return this.sessions.has(id.getValue());
  }

  // Test helper
  addSession(session: Session): void {
    this.sessions.set(session.getId().getValue(), session);
  }

  clear(): void {
    this.sessions.clear();
  }
}

describe('RevealVotes Use Case', () => {
  let useCase: RevealVotesUseCase;
  let mockRepository: MockSessionRepository;
  let sessionId: SessionId;
  let session: Session;
  let scale: Scale;
  let creatorId: string;

  beforeEach(() => {
    mockRepository = new MockSessionRepository();
    useCase = new RevealVotesUseCase(mockRepository);
    
    sessionId = SessionId.generate();
    scale = Scale.fibonacci();
    creatorId = 'creator-123';
    session = new Session(sessionId, 'Test Session', scale, creatorId);
    
    // Add participants
    const participant1 = new Participant('p1', 'John', 'participant');
    const participant2 = new Participant('p2', 'Jane', 'participant');
    const spectator1 = new Participant('s1', 'Bob', 'spectator');
    session.addParticipant(participant1);
    session.addParticipant(participant2);
    session.addParticipant(spectator1);
    
    // Start voting and add some votes
    session.startVoting('Test question');
    session.submitVote('p1', new VoteValue('5', scale));
    session.submitVote('p2', new VoteValue('8', scale));
    
    mockRepository.addSession(session);
  });

  afterEach(() => {
    mockRepository.clear();
  });

  describe('execute', () => {
    it('should reveal votes successfully', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: creatorId
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.question).toBe('Test question');
      expect(result.votes).toHaveLength(2);
      
      const johnVote = result.votes.find(v => v.participantName === 'John');
      const janeVote = result.votes.find(v => v.participantName === 'Jane');
      
      expect(johnVote).toBeDefined();
      expect(johnVote!.voteValue).toBe('5');
      expect(johnVote!.participantId).toBe('p1');
      
      expect(janeVote).toBeDefined();
      expect(janeVote!.voteValue).toBe('8');
      expect(janeVote!.participantId).toBe('p2');
      
      const updatedSession = await mockRepository.findById(sessionId);
      const currentVote = updatedSession!.getCurrentVote();
      expect(currentVote!.getStatus()).toBe('revealed');
    });

    it('should calculate statistics correctly', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: creatorId
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalVotes).toBe(2);
      expect(result.statistics.averageVote).toBe(6.5); // (5 + 8) / 2
      expect(result.statistics.minVote).toBe('5');
      expect(result.statistics.maxVote).toBe('8');
      expect(result.statistics.consensus).toBe(false); // Different votes
    });

    it('should handle consensus when all votes are the same', async () => {
      // Arrange
      // Reset session with same votes
      session = new Session(sessionId, 'Test Session', scale, creatorId);
      const participant1 = new Participant('p1', 'John', 'participant');
      const participant2 = new Participant('p2', 'Jane', 'participant');
      session.addParticipant(participant1);
      session.addParticipant(participant2);
      session.startVoting('Test question');
      session.submitVote('p1', new VoteValue('5', scale));
      session.submitVote('p2', new VoteValue('5', scale));
      mockRepository.addSession(session);
      
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: creatorId
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.statistics.consensus).toBe(true);
      expect(result.statistics.averageVote).toBe(5);
      expect(result.statistics.minVote).toBe('5');
      expect(result.statistics.maxVote).toBe('5');
    });

    it('should handle special votes in statistics', async () => {
      // Arrange
      session = new Session(sessionId, 'Test Session', scale, creatorId);
      const participant1 = new Participant('p1', 'John', 'participant');
      const participant2 = new Participant('p2', 'Jane', 'participant');
      const participant3 = new Participant('p3', 'Alice', 'participant');
      session.addParticipant(participant1);
      session.addParticipant(participant2);
      session.addParticipant(participant3);
      session.startVoting('Test question');
      session.submitVote('p1', new VoteValue('5', scale));
      session.submitVote('p2', new VoteValue('ABSTAIN', scale));
      session.submitVote('p3', new VoteValue('?', scale));
      mockRepository.addSession(session);
      
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: creatorId
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.statistics.totalVotes).toBe(3);
      expect(result.statistics.averageVote).toBe(5); // Only numeric votes counted
      expect(result.statistics.minVote).toBe('5');
      expect(result.statistics.maxVote).toBe('5');
      expect(result.statistics.consensus).toBe(false); // Different vote types
    });

    it('should allow session creator to reveal votes', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: creatorId
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should allow participant to reveal votes', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: 'p1'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should throw error when spectator tries to reveal votes', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: 's1'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Only participants or session creator can reveal votes');
    });

    it('should throw error for non-existent session', async () => {
      // Arrange
      const nonExistentId = SessionId.generate().getValue();
      const command = {
        sessionId: nonExistentId,
        initiatorId: creatorId
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Session not found');
    });

    it('should throw error for inactive session', async () => {
      // Arrange
      session.deactivate();
      await mockRepository.save(session);
      
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: creatorId
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Session is not active');
    });

    it('should throw error when no voting is active', async () => {
      // Arrange
      session.finishVoting();
      await mockRepository.save(session);
      
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: creatorId
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('No active voting round');
    });

    it('should throw error when votes are already revealed', async () => {
      // Arrange
      session.revealVotes();
      await mockRepository.save(session);
      
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: creatorId
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Votes are already revealed');
    });

    it('should handle session with no votes', async () => {
      // Arrange
      const emptySession = new Session(
        SessionId.generate(),
        'Empty Session',
        scale,
        'creator-456'
      );
      const participant = new Participant('p1', 'John', 'participant');
      emptySession.addParticipant(participant);
      emptySession.startVoting('Empty question');
      mockRepository.addSession(emptySession);
      
      const command = {
        sessionId: emptySession.getId().getValue(),
        initiatorId: 'creator-456'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.votes).toHaveLength(0);
      expect(result.statistics.totalVotes).toBe(0);
      expect(result.statistics.averageVote).toBe(0);
      expect(result.statistics.consensus).toBe(true); // No votes = consensus
    });

    it('should throw error for empty session ID', async () => {
      // Arrange
      const command = {
        sessionId: '',
        initiatorId: creatorId
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Session ID cannot be empty');
    });

    it('should throw error for empty initiator ID', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: ''
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Initiator ID cannot be empty');
    });

    it('should throw error for non-existent initiator', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: 'non-existent'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Only participants or session creator can reveal votes');
    });

    it('should handle repository save failure', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: creatorId
      };

      // Mock repository to throw error on save
      jest.spyOn(mockRepository, 'save').mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Database error');
    });
  });

  describe('validation', () => {
    it('should validate command object', async () => {
      // Act & Assert
      await expect(useCase.execute(null as any)).rejects.toThrow('Command is required');
      await expect(useCase.execute(undefined as any)).rejects.toThrow('Command is required');
    });
  });
});
