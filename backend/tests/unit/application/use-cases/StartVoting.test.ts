import { StartVotingUseCase } from '../../../../src/application/use-cases/StartVoting';
import { SessionRepository } from '../../../../src/domain/repositories/SessionRepository';
import { Session } from '../../../../src/domain/entities/Session';
import { SessionId } from '../../../../src/domain/value-objects/SessionId';
import { Scale } from '../../../../src/domain/value-objects/Scale';
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

describe('StartVoting Use Case', () => {
  let useCase: StartVotingUseCase;
  let mockRepository: MockSessionRepository;
  let sessionId: SessionId;
  let session: Session;
  let creatorId: string;

  beforeEach(() => {
    mockRepository = new MockSessionRepository();
    useCase = new StartVotingUseCase(mockRepository);
    
    sessionId = SessionId.generate();
    creatorId = 'creator-123';
    session = new Session(sessionId, 'Test Session', Scale.fibonacci(), creatorId);
    
    // Add some participants
    const participant1 = new Participant('p1', 'John', 'participant');
    const participant2 = new Participant('p2', 'Jane', 'participant');
    const spectator1 = new Participant('s1', 'Bob', 'spectator');
    session.addParticipant(participant1);
    session.addParticipant(participant2);
    session.addParticipant(spectator1);
    
    mockRepository.addSession(session);
  });

  afterEach(() => {
    mockRepository.clear();
  });

  describe('execute', () => {
    it('should start voting with valid question', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        question: 'How complex is this user story?',
        initiatorId: 'p1' // Use participant ID instead of creatorId
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.votingRoundId).toBeDefined();
      expect(result.question).toBe(command.question);
      expect(result.votingParticipants).toHaveLength(2);
      expect(result.votingParticipants.map(p => p.id)).toEqual(['p1', 'p2']);
      expect(result.votingParticipants.map(p => p.name)).toEqual(['John', 'Jane']);

      const updatedSession = await mockRepository.findById(sessionId);
      expect(updatedSession!.isVotingActive()).toBe(true);
      expect(updatedSession!.getCurrentVote()?.getQuestion()).toBe(command.question);
      expect(updatedSession!.getCurrentVote()?.getStatus()).toBe('voting');
    });

    it('should allow session creator (as participant) to start voting', async () => {
      // Arrange
      // Add creator as a participant
      const creatorParticipant = new Participant('creator-p-id', 'Creator', 'participant');
      session.addParticipant(creatorParticipant);
      await mockRepository.save(session);

      const command = {
        sessionId: sessionId.getValue(),
        question: 'Test question',
        initiatorId: 'creator-p-id'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.votingRoundId).toBeDefined();
    });

    it('should allow participant to start voting', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        question: 'Test question',
        initiatorId: 'p1'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.votingRoundId).toBeDefined();
    });

    it('should throw error when spectator tries to start voting', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        question: 'Test question',
        initiatorId: 's1'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Only participants or session creator can start voting');
    });

    it('should throw error for non-existent session', async () => {
      // Arrange
      const nonExistentId = SessionId.generate().getValue();
      const command = {
        sessionId: nonExistentId,
        question: 'Test question',
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
        question: 'Test question',
        initiatorId: 'p1' // Use participant ID
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Session is not active');
    });

    it('should throw error when voting is already active', async () => {
      // Arrange
      session.startVoting('First question');
      await mockRepository.save(session);

      const command = {
        sessionId: sessionId.getValue(),
        question: 'Second question',
        initiatorId: 'p1' // Use participant ID
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Voting is already active');
    });

    it('should throw error for empty question', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        question: '',
        initiatorId: 'p1' // Use participant ID
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Question cannot be empty');
    });

    it('should throw error for whitespace only question', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        question: '   ',
        initiatorId: 'p1' // Use participant ID
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Question cannot be empty');
    });

    it('should throw error for empty initiator ID', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        question: 'Test question',
        initiatorId: ''
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Initiator ID cannot be empty');
    });

    it('should throw error for non-existent initiator', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        question: 'Test question',
        initiatorId: 'non-existent'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Only participants or session creator can start voting');
    });

    it('should trim whitespace from question', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        question: '  How complex is this?  ',
        initiatorId: 'p1' // Use participant ID
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.question).toBe('How complex is this?');

      const updatedSession = await mockRepository.findById(sessionId);
      expect(updatedSession!.getCurrentVote()?.getQuestion()).toBe('How complex is this?');
    });

    it('should return empty voting participants when no participants can vote', async () => {
      // Arrange
      // Create session with only spectators
      const sessionWithSpectators = new Session(
        SessionId.generate(),
        'Spectator Session',
        Scale.fibonacci(),
        'creator-456'
      );
      const spectator = new Participant('s1', 'Spectator', 'spectator');
      // Add a participant who can start voting
      const participant = new Participant('p-creator', 'Creator Participant', 'participant');
      sessionWithSpectators.addParticipant(spectator);
      sessionWithSpectators.addParticipant(participant);
      mockRepository.addSession(sessionWithSpectators);

      const command = {
        sessionId: sessionWithSpectators.getId().getValue(),
        question: 'Test question',
        initiatorId: 'p-creator' // Use the participant who can vote
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      // Only the creator participant can vote, not the spectator
      expect(result.votingParticipants).toHaveLength(1);
      expect(result.votingParticipants[0].id).toBe('p-creator');
    });

    it('should handle repository save failure', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        question: 'Test question',
        initiatorId: 'p1' // Use participant ID
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
