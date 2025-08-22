import { CreateSessionUseCase } from '../../../../src/application/use-cases/CreateSession';
import { SessionRepository } from '../../../../src/domain/repositories/SessionRepository';
import { Session } from '../../../../src/domain/entities/Session';
import { SessionId } from '../../../../src/domain/value-objects/SessionId';
import { Scale } from '../../../../src/domain/value-objects/Scale';

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
  clear(): void {
    this.sessions.clear();
  }
}

describe('CreateSession Use Case', () => {
  let useCase: CreateSessionUseCase;
  let mockRepository: MockSessionRepository;

  beforeEach(() => {
    mockRepository = new MockSessionRepository();
    useCase = new CreateSessionUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.clear();
  });

  describe('execute', () => {
    it('should create a session with Fibonacci scale', async () => {
      // Arrange
      const command = {
        name: 'Sprint Planning',
        scale: 'fibonacci' as const,
        creatorId: 'creator-123'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.sessionId).toBeDefined();
      expect(result.sessionId).toBeInstanceOf(SessionId);
      
      const savedSession = await mockRepository.findById(result.sessionId);
      expect(savedSession).not.toBeNull();
      expect(savedSession!.getName()).toBe(command.name);
      expect(savedSession!.getScale()).toEqual(Scale.fibonacci());
      expect(savedSession!.getCreatorId()).toBe(command.creatorId);
      expect(savedSession!.isActive()).toBe(true);
    });

    it('should create a session with T-shirt scale', async () => {
      // Arrange
      const command = {
        name: 'Story Estimation',
        scale: 'tshirt' as const,
        creatorId: 'creator-456'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      const savedSession = await mockRepository.findById(result.sessionId);
      expect(savedSession!.getScale()).toEqual(Scale.tshirt());
    });

    it('should create a session with Power of 2 scale', async () => {
      // Arrange
      const command = {
        name: 'Technical Estimation',
        scale: 'power-of-2' as const,
        creatorId: 'creator-789'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      const savedSession = await mockRepository.findById(result.sessionId);
      expect(savedSession!.getScale()).toEqual(Scale.powerOfTwo());
    });

    it('should create a session with custom scale', async () => {
      // Arrange
      const command = {
        name: 'Priority Estimation',
        scale: 'custom' as const,
        customScaleName: 'priority',
        customScaleValues: ['Low', 'Medium', 'High', 'Critical'],
        creatorId: 'creator-custom'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      const savedSession = await mockRepository.findById(result.sessionId);
      const expectedScale = Scale.custom('priority', ['Low', 'Medium', 'High', 'Critical']);
      expect(savedSession!.getScale()).toEqual(expectedScale);
    });

    it('should throw error for empty session name', async () => {
      // Arrange
      const command = {
        name: '',
        scale: 'fibonacci' as const,
        creatorId: 'creator-123'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Session name cannot be empty');
    });

    it('should throw error for whitespace only session name', async () => {
      // Arrange
      const command = {
        name: '   ',
        scale: 'fibonacci' as const,
        creatorId: 'creator-123'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Session name cannot be empty');
    });

    it('should throw error for empty creator ID', async () => {
      // Arrange
      const command = {
        name: 'Test Session',
        scale: 'fibonacci' as const,
        creatorId: ''
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Creator ID cannot be empty');
    });

    it('should throw error for invalid scale type', async () => {
      // Arrange
      const command = {
        name: 'Test Session',
        scale: 'invalid' as any,
        creatorId: 'creator-123'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Invalid scale type');
    });

    it('should throw error for custom scale without name', async () => {
      // Arrange
      const command = {
        name: 'Test Session',
        scale: 'custom' as const,
        customScaleValues: ['A', 'B', 'C'],
        creatorId: 'creator-123'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Custom scale name is required');
    });

    it('should throw error for custom scale without values', async () => {
      // Arrange
      const command = {
        name: 'Test Session',
        scale: 'custom' as const,
        customScaleName: 'test',
        creatorId: 'creator-123'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Custom scale values are required');
    });

    it('should throw error for custom scale with empty values array', async () => {
      // Arrange
      const command = {
        name: 'Test Session',
        scale: 'custom' as const,
        customScaleName: 'test',
        customScaleValues: [],
        creatorId: 'creator-123'
      };

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Scale must have at least 2 values');
    });

    it('should generate unique session IDs', async () => {
      // Arrange
      const command1 = {
        name: 'Session 1',
        scale: 'fibonacci' as const,
        creatorId: 'creator-1'
      };
      const command2 = {
        name: 'Session 2',
        scale: 'fibonacci' as const,
        creatorId: 'creator-2'
      };

      // Act
      const result1 = await useCase.execute(command1);
      const result2 = await useCase.execute(command2);

      // Assert
      expect(result1.sessionId.equals(result2.sessionId)).toBe(false);
    });

    it('should trim whitespace from session name and creator ID', async () => {
      // Arrange
      const command = {
        name: '  Sprint Planning  ',
        scale: 'fibonacci' as const,
        creatorId: '  creator-123  '
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      const savedSession = await mockRepository.findById(result.sessionId);
      expect(savedSession!.getName()).toBe('Sprint Planning');
      expect(savedSession!.getCreatorId()).toBe('creator-123');
    });

    it('should handle repository save failure', async () => {
      // Arrange
      const command = {
        name: 'Test Session',
        scale: 'fibonacci' as const,
        creatorId: 'creator-123'
      };

      // Mock repository to throw error
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
