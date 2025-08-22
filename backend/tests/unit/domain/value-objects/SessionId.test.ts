import { SessionId } from '../../../../src/domain/value-objects/SessionId';

describe('SessionId Value Object', () => {
  describe('creation', () => {
    it('should create a valid SessionId with a string value', () => {
      // Arrange
      const validId = 'session-123-abc';

      // Act
      const sessionId = new SessionId(validId);

      // Assert
      expect(sessionId.getValue()).toBe(validId);
    });

    it('should create a SessionId with UUID format', () => {
      // Arrange
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';

      // Act
      const sessionId = new SessionId(uuidId);

      // Assert
      expect(sessionId.getValue()).toBe(uuidId);
    });

    it('should throw error for empty string', () => {
      // Arrange
      const emptyId = '';

      // Act & Assert
      expect(() => new SessionId(emptyId)).toThrow('SessionId cannot be empty');
    });

    it('should throw error for whitespace only string', () => {
      // Arrange
      const whitespaceId = '   ';

      // Act & Assert
      expect(() => new SessionId(whitespaceId)).toThrow('SessionId cannot be empty');
    });

    it('should throw error for null or undefined', () => {
      // Act & Assert
      expect(() => new SessionId(null as any)).toThrow('SessionId cannot be empty');
      expect(() => new SessionId(undefined as any)).toThrow('SessionId cannot be empty');
    });

    it('should throw error for too short id', () => {
      // Arrange
      const shortId = 'ab';

      // Act & Assert
      expect(() => new SessionId(shortId)).toThrow('SessionId must be at least 3 characters long');
    });

    it('should throw error for too long id', () => {
      // Arrange
      const longId = 'a'.repeat(101);

      // Act & Assert
      expect(() => new SessionId(longId)).toThrow('SessionId must be at most 100 characters long');
    });
  });

  describe('equality', () => {
    it('should be equal when values are the same', () => {
      // Arrange
      const id1 = new SessionId('session-123');
      const id2 = new SessionId('session-123');

      // Act & Assert
      expect(id1.equals(id2)).toBe(true);
    });

    it('should not be equal when values are different', () => {
      // Arrange
      const id1 = new SessionId('session-123');
      const id2 = new SessionId('session-456');

      // Act & Assert
      expect(id1.equals(id2)).toBe(false);
    });

    it('should not be equal to null or undefined', () => {
      // Arrange
      const id = new SessionId('session-123');

      // Act & Assert
      expect(id.equals(null as any)).toBe(false);
      expect(id.equals(undefined as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string representation', () => {
      // Arrange
      const idValue = 'session-123';
      const sessionId = new SessionId(idValue);

      // Act
      const result = sessionId.toString();

      // Assert
      expect(result).toBe(idValue);
    });
  });

  describe('static methods', () => {
    it('should generate a new unique SessionId', () => {
      // Act
      const id1 = SessionId.generate();
      const id2 = SessionId.generate();

      // Assert
      expect(id1).toBeInstanceOf(SessionId);
      expect(id2).toBeInstanceOf(SessionId);
      expect(id1.equals(id2)).toBe(false);
      expect(id1.getValue()).toMatch(/^session-[a-f0-9-]+$/);
    });
  });
});
