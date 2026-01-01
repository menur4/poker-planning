import { FinishVotingUseCase } from '../../../../src/application/use-cases/FinishVoting';
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

describe('FinishVoting Use Case', () => {
  let useCase: FinishVotingUseCase;
  let mockRepository: MockSessionRepository;
  let sessionId: SessionId;
  let session: Session;
  let scale: Scale;
  let creatorId: string;

  beforeEach(() => {
    mockRepository = new MockSessionRepository();
    useCase = new FinishVotingUseCase(mockRepository);

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

    // Start voting, add votes, and reveal
    session.startVoting('Test question');
    session.submitVote('p1', new VoteValue('5', scale));
    session.submitVote('p2', new VoteValue('8', scale));
    session.revealVotes();

    mockRepository.addSession(session);
  });

  afterEach(() => {
    mockRepository.clear();
  });

  describe('execute', () => {
    it('should finish voting successfully as participant', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: 'p1' // Use participant ID
      };

      // Act
      await useCase.execute(command);

      // Assert
      const updatedSession = await mockRepository.findById(sessionId);
      expect(updatedSession!.getCurrentVote()).toBeNull();
      expect(updatedSession!.isVotingActive()).toBe(false);
      expect(updatedSession!.getVoteHistory()).toHaveLength(1);
    });

    it('should allow participant to finish voting', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: 'p2' // Another participant
      };

      // Act
      await useCase.execute(command);

      // Assert
      const updatedSession = await mockRepository.findById(sessionId);
      expect(updatedSession!.getCurrentVote()).toBeNull();
      expect(updatedSession!.isVotingActive()).toBe(false);
    });

    it('should throw error when spectator tries to finish voting', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: 's1' // Spectator
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'Only participants or session creator can finish voting'
      );
    });

    it('should throw error when non-existent participant tries to finish voting', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: 'non-existent'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'Only participants or session creator can finish voting'
      );
    });

    it('should throw error for non-existent session', async () => {
      // Arrange
      const nonExistentId = SessionId.generate().getValue();
      const command = {
        sessionId: nonExistentId,
        initiatorId: 'p1'
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
        initiatorId: 'p1' // Use participant ID
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Session is not active');
    });

    it('should throw error when no active vote exists', async () => {
      // Arrange
      // Finish the existing vote first
      session.finishVoting();
      await mockRepository.save(session);

      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: 'p1' // Use participant ID
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('No active vote to finish');
    });

    it('should throw error for empty session ID', async () => {
      // Arrange
      const command = {
        sessionId: '',
        initiatorId: 'p1'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Session ID is required');
    });

    it('should throw error for empty initiator ID', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: ''
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Initiator ID is required');
    });

    it('should move current vote to history', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: 'p1' // Use participant ID
      };

      // Act
      await useCase.execute(command);

      // Assert
      const updatedSession = await mockRepository.findById(sessionId);
      const history = updatedSession!.getVoteHistory();
      expect(history).toHaveLength(1);
      expect(history[0].getQuestion()).toBe('Test question');
      expect(history[0].getStatus()).toBe('finished');
    });

    it('should handle repository save failure', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: 'p1' // Use participant ID
      };

      // Mock repository to throw error on save
      jest.spyOn(mockRepository, 'save').mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Database error');
    });
  });

  describe('validation', () => {
    it('should validate session ID', async () => {
      // Arrange
      const command = {
        sessionId: null as any,
        initiatorId: 'p1'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Session ID is required');
    });

    it('should validate initiator ID', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        initiatorId: null as any
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Initiator ID is required');
    });
  });
});
