import { JoinSessionUseCase } from '../../../../src/application/use-cases/JoinSession';
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

describe('JoinSession Use Case', () => {
  let useCase: JoinSessionUseCase;
  let mockRepository: MockSessionRepository;
  let sessionId: SessionId;
  let session: Session;

  beforeEach(() => {
    mockRepository = new MockSessionRepository();
    useCase = new JoinSessionUseCase(mockRepository);
    
    // Create a test session
    sessionId = SessionId.generate();
    session = new Session(sessionId, 'Test Session', Scale.fibonacci(), 'creator-123');
    mockRepository.addSession(session);
  });

  afterEach(() => {
    mockRepository.clear();
  });

  describe('execute', () => {
    it('should join session as participant', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantName: 'John Doe',
        role: 'participant' as const
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.participantId).toBeDefined();
      expect(result.participantId).toMatch(/^participant-/);
      expect(result.sessionName).toBe('Test Session');
      expect(result.scale).toEqual(Scale.fibonacci());
      
      const updatedSession = await mockRepository.findById(sessionId);
      expect(updatedSession!.getParticipantCount()).toBe(1);
      
      const participant = updatedSession!.findParticipant(result.participantId);
      expect(participant).not.toBeNull();
      expect(participant!.getName()).toBe('John Doe');
      expect(participant!.getRole()).toBe('participant');
      expect(participant!.isConnected()).toBe(true);
    });

    it('should join session as spectator', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantName: 'Jane Smith',
        role: 'spectator' as const
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.participantId).toMatch(/^spectator-/);
      
      const updatedSession = await mockRepository.findById(sessionId);
      const participant = updatedSession!.findParticipant(result.participantId);
      expect(participant!.getRole()).toBe('spectator');
      expect(participant!.canVote()).toBe(false);
    });

    it('should generate unique participant IDs', async () => {
      // Arrange
      const command1 = {
        sessionId: sessionId.getValue(),
        participantName: 'John',
        role: 'participant' as const
      };
      const command2 = {
        sessionId: sessionId.getValue(),
        participantName: 'Jane',
        role: 'participant' as const
      };

      // Act
      const result1 = await useCase.execute(command1);
      const result2 = await useCase.execute(command2);

      // Assert
      expect(result1.participantId).not.toBe(result2.participantId);
      
      const updatedSession = await mockRepository.findById(sessionId);
      expect(updatedSession!.getParticipantCount()).toBe(2);
    });

    it('should allow same name with different roles', async () => {
      // Arrange
      const command1 = {
        sessionId: sessionId.getValue(),
        participantName: 'John Doe',
        role: 'participant' as const
      };
      const command2 = {
        sessionId: sessionId.getValue(),
        participantName: 'John Doe',
        role: 'spectator' as const
      };

      // Act
      const result1 = await useCase.execute(command1);
      const result2 = await useCase.execute(command2);

      // Assert
      expect(result1.participantId).not.toBe(result2.participantId);
      
      const updatedSession = await mockRepository.findById(sessionId);
      expect(updatedSession!.getParticipantCount()).toBe(2);
    });

    it('should throw error for non-existent session', async () => {
      // Arrange
      const nonExistentId = SessionId.generate().getValue();
      const command = {
        sessionId: nonExistentId,
        participantName: 'John Doe',
        role: 'participant' as const
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
        participantName: 'John Doe',
        role: 'participant' as const
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Session is not active');
    });

    it('should throw error for empty session ID', async () => {
      // Arrange
      const command = {
        sessionId: '',
        participantName: 'John Doe',
        role: 'participant' as const
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Session ID cannot be empty');
    });

    it('should throw error for empty participant name', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantName: '',
        role: 'participant' as const
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Participant name cannot be empty');
    });

    it('should throw error for whitespace only participant name', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantName: '   ',
        role: 'participant' as const
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Participant name cannot be empty');
    });

    it('should throw error for invalid role', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantName: 'John Doe',
        role: 'admin' as any
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Role must be either "participant" or "spectator"');
    });

    it('should trim whitespace from participant name', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantName: '  John Doe  ',
        role: 'participant' as const
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      const updatedSession = await mockRepository.findById(sessionId);
      const participant = updatedSession!.findParticipant(result.participantId);
      expect(participant!.getName()).toBe('John Doe');
    });

    it('should handle repository save failure', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantName: 'John Doe',
        role: 'participant' as const
      };

      // Mock repository to throw error on save
      jest.spyOn(mockRepository, 'save').mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Database error');
    });

    it('should handle repository findById failure', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantName: 'John Doe',
        role: 'participant' as const
      };

      // Mock repository to throw error on findById
      jest.spyOn(mockRepository, 'findById').mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Database error');
    });

    it('should return current voting status when joining during active vote', async () => {
      // Arrange
      session.startVoting('Test question');
      await mockRepository.save(session);
      
      const command = {
        sessionId: sessionId.getValue(),
        participantName: 'John Doe',
        role: 'participant' as const
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.currentVote).not.toBeNull();
      expect(result.currentVote!.question).toBe('Test question');
      expect(result.currentVote!.status).toBe('voting');
    });

    it('should return null voting status when no active vote', async () => {
      // Arrange
      const command = {
        sessionId: sessionId.getValue(),
        participantName: 'John Doe',
        role: 'participant' as const
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.currentVote).toBeNull();
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
