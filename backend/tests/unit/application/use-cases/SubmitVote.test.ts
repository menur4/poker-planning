import { SubmitVoteUseCase } from '../../../../src/application/use-cases/SubmitVote';
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

describe('SubmitVote Use Case', () => {
  let useCase: SubmitVoteUseCase;
  let mockRepository: MockSessionRepository;
  let sessionId: SessionId;
  let session: Session;
  let scale: Scale;

  beforeEach(() => {
    mockRepository = new MockSessionRepository();
    useCase = new SubmitVoteUseCase(mockRepository);
    
    sessionId = SessionId.generate();
    scale = Scale.fibonacci();
    session = new Session(sessionId, 'Test Session', scale, 'creator-123');
    
    // Add participants
    const participant1 = new Participant('p1', 'John', 'participant');
    const participant2 = new Participant('p2', 'Jane', 'participant');
    const spectator1 = new Participant('s1', 'Bob', 'spectator');
    session.addParticipant(participant1);
    session.addParticipant(participant2);
    session.addParticipant(spectator1);
    
    // Start voting
    session.startVoting('Test question');
    
    mockRepository.addSession(session);
  });

  afterEach(() => {
    mockRepository.clear();
  });

  describe('execute', () => {
    it('should submit regular vote successfully', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantId: 'p1',
        voteValue: '5'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.voteValue).toBe('5');
      expect(result.participantName).toBe('John');
      
      const updatedSession = await mockRepository.findById(sessionId);
      const currentVote = updatedSession!.getCurrentVote();
      expect(currentVote!.hasVoted('p1')).toBe(true);
      expect(currentVote!.getVote('p1')!.getValue().getValue()).toBe('5');
    });

    it('should submit abstain vote successfully', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantId: 'p1',
        voteValue: 'ABSTAIN'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.voteValue).toBe('ABSTAIN');
      
      const updatedSession = await mockRepository.findById(sessionId);
      const currentVote = updatedSession!.getCurrentVote();
      expect(currentVote!.getVote('p1')!.isAbstain()).toBe(true);
    });

    it('should submit coffee break vote successfully', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantId: 'p1',
        voteValue: 'COFFEE'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.voteValue).toBe('COFFEE');
      
      const updatedSession = await mockRepository.findById(sessionId);
      const currentVote = updatedSession!.getCurrentVote();
      expect(currentVote!.getVote('p1')!.isCoffeeBreak()).toBe(true);
    });

    it('should submit question mark vote successfully', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantId: 'p1',
        voteValue: '?'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.voteValue).toBe('?');
      
      const updatedSession = await mockRepository.findById(sessionId);
      const currentVote = updatedSession!.getCurrentVote();
      expect(currentVote!.getVote('p1')!.isQuestionMark()).toBe(true);
    });

    it('should update existing vote', async () => {
      // Arrange
      const firstCommand = {
        sessionId: sessionId.getValue(),
        participantId: 'p1',
        voteValue: '3'
      };
      const secondCommand = {
        sessionId: sessionId.getValue(),
        participantId: 'p1',
        voteValue: '8'
      };

      // Act
      await useCase.execute(firstCommand);
      const result = await useCase.execute(secondCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.voteValue).toBe('8');
      
      const updatedSession = await mockRepository.findById(sessionId);
      const currentVote = updatedSession!.getCurrentVote();
      expect(currentVote!.getVote('p1')!.getValue().getValue()).toBe('8');
      expect(currentVote!.getVoteCount()).toBe(1); // Still only one vote from p1
    });

    it('should throw error for non-existent session', async () => {
      // Arrange
      const nonExistentId = SessionId.generate().getValue();
      const command = {
        sessionId: nonExistentId,
        participantId: 'p1',
        voteValue: '5'
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
        participantId: 'p1',
        voteValue: '5'
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
        participantId: 'p1',
        voteValue: '5'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('No active voting round');
    });

    it('should throw error for non-existent participant', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantId: 'non-existent',
        voteValue: '5'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Participant not found or cannot vote');
    });

    it('should throw error when spectator tries to vote', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantId: 's1',
        voteValue: '5'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Participant not found or cannot vote');
    });

    it('should throw error for invalid vote value', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantId: 'p1',
        voteValue: '100' // Not in Fibonacci scale
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Vote value "100" is not valid for scale fibonacci');
    });

    it('should throw error for empty vote value', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantId: 'p1',
        voteValue: ''
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Vote value cannot be empty');
    });

    it('should throw error for empty session ID', async () => {
      // Arrange
      const command = {
        sessionId: '',
        participantId: 'p1',
        voteValue: '5'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Session ID cannot be empty');
    });

    it('should throw error for empty participant ID', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantId: '',
        voteValue: '5'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Participant ID cannot be empty');
    });

    it('should work with T-shirt scale', async () => {
      // Arrange
      const tshirtSession = new Session(
        SessionId.generate(),
        'T-shirt Session',
        Scale.tshirt(),
        'creator-456'
      );
      const participant = new Participant('p1', 'John', 'participant');
      tshirtSession.addParticipant(participant);
      tshirtSession.startVoting('T-shirt question');
      mockRepository.addSession(tshirtSession);
      
      const command = {
        sessionId: tshirtSession.getId().getValue(),
        participantId: 'p1',
        voteValue: 'M'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.voteValue).toBe('M');
    });

    it('should work with custom scale', async () => {
      // Arrange
      const customScale = Scale.custom('priority', ['Low', 'Medium', 'High']);
      const customSession = new Session(
        SessionId.generate(),
        'Custom Session',
        customScale,
        'creator-789'
      );
      const participant = new Participant('p1', 'John', 'participant');
      customSession.addParticipant(participant);
      customSession.startVoting('Priority question');
      mockRepository.addSession(customSession);
      
      const command = {
        sessionId: customSession.getId().getValue(),
        participantId: 'p1',
        voteValue: 'High'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.voteValue).toBe('High');
    });

    it('should handle repository save failure', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantId: 'p1',
        voteValue: '5'
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
