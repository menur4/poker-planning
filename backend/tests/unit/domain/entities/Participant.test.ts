import { Participant } from '../../../../src/domain/entities/Participant';

describe('Participant Entity', () => {
  describe('creation', () => {
    it('should create a participant with valid data', () => {
      // Arrange
      const id = 'participant-123';
      const name = 'John Doe';
      const role = 'participant';

      // Act
      const participant = new Participant(id, name, role);

      // Assert
      expect(participant.getId()).toBe(id);
      expect(participant.getName()).toBe(name);
      expect(participant.getRole()).toBe(role);
      expect(participant.isConnected()).toBe(true);
      expect(participant.isParticipant()).toBe(true);
      expect(participant.isSpectator()).toBe(false);
    });

    it('should create a spectator with valid data', () => {
      // Arrange
      const id = 'spectator-456';
      const name = 'Jane Smith';
      const role = 'spectator';

      // Act
      const participant = new Participant(id, name, role);

      // Assert
      expect(participant.getId()).toBe(id);
      expect(participant.getName()).toBe(name);
      expect(participant.getRole()).toBe(role);
      expect(participant.isConnected()).toBe(true);
      expect(participant.isParticipant()).toBe(false);
      expect(participant.isSpectator()).toBe(true);
    });

    it('should throw error for empty id', () => {
      // Arrange
      const emptyId = '';
      const name = 'John Doe';
      const role = 'participant';

      // Act & Assert
      expect(() => new Participant(emptyId, name, role)).toThrow('Participant ID cannot be empty');
    });

    it('should throw error for whitespace only id', () => {
      // Arrange
      const whitespaceId = '   ';
      const name = 'John Doe';
      const role = 'participant';

      // Act & Assert
      expect(() => new Participant(whitespaceId, name, role)).toThrow('Participant ID cannot be empty');
    });

    it('should throw error for empty name', () => {
      // Arrange
      const id = 'participant-123';
      const emptyName = '';
      const role = 'participant';

      // Act & Assert
      expect(() => new Participant(id, emptyName, role)).toThrow('Participant name cannot be empty');
    });

    it('should throw error for whitespace only name', () => {
      // Arrange
      const id = 'participant-123';
      const whitespaceName = '   ';
      const role = 'participant';

      // Act & Assert
      expect(() => new Participant(id, whitespaceName, role)).toThrow('Participant name cannot be empty');
    });

    it('should throw error for invalid role', () => {
      // Arrange
      const id = 'participant-123';
      const name = 'John Doe';
      const invalidRole = 'admin';

      // Act & Assert
      expect(() => new Participant(id, name, invalidRole as any)).toThrow('Role must be either "participant" or "spectator"');
    });

    it('should throw error for null or undefined values', () => {
      // Arrange
      const id = 'participant-123';
      const name = 'John Doe';
      const role = 'participant';

      // Act & Assert
      expect(() => new Participant(null as any, name, role)).toThrow('Participant ID cannot be empty');
      expect(() => new Participant(id, null as any, role)).toThrow('Participant name cannot be empty');
      expect(() => new Participant(id, name, null as any)).toThrow('Role must be either "participant" or "spectator"');
    });

    it('should trim whitespace from id and name', () => {
      // Arrange
      const id = '  participant-123  ';
      const name = '  John Doe  ';
      const role = 'participant';

      // Act
      const participant = new Participant(id, name, role);

      // Assert
      expect(participant.getId()).toBe('participant-123');
      expect(participant.getName()).toBe('John Doe');
    });
  });

  describe('connection management', () => {
    it('should start as connected by default', () => {
      // Arrange
      const participant = new Participant('id-1', 'John', 'participant');

      // Act & Assert
      expect(participant.isConnected()).toBe(true);
    });

    it('should disconnect participant', () => {
      // Arrange
      const participant = new Participant('id-1', 'John', 'participant');

      // Act
      participant.disconnect();

      // Assert
      expect(participant.isConnected()).toBe(false);
    });

    it('should reconnect participant', () => {
      // Arrange
      const participant = new Participant('id-1', 'John', 'participant');
      participant.disconnect();

      // Act
      participant.connect();

      // Assert
      expect(participant.isConnected()).toBe(true);
    });

    it('should handle multiple disconnect calls gracefully', () => {
      // Arrange
      const participant = new Participant('id-1', 'John', 'participant');

      // Act
      participant.disconnect();
      participant.disconnect();

      // Assert
      expect(participant.isConnected()).toBe(false);
    });

    it('should handle multiple connect calls gracefully', () => {
      // Arrange
      const participant = new Participant('id-1', 'John', 'participant');

      // Act
      participant.connect();
      participant.connect();

      // Assert
      expect(participant.isConnected()).toBe(true);
    });
  });

  describe('role checking', () => {
    it('should correctly identify participant role', () => {
      // Arrange
      const participant = new Participant('id-1', 'John', 'participant');

      // Act & Assert
      expect(participant.isParticipant()).toBe(true);
      expect(participant.isSpectator()).toBe(false);
      expect(participant.canVote()).toBe(true);
    });

    it('should correctly identify spectator role', () => {
      // Arrange
      const spectator = new Participant('id-1', 'Jane', 'spectator');

      // Act & Assert
      expect(spectator.isParticipant()).toBe(false);
      expect(spectator.isSpectator()).toBe(true);
      expect(spectator.canVote()).toBe(false);
    });
  });

  describe('equality', () => {
    it('should be equal when IDs are the same', () => {
      // Arrange
      const participant1 = new Participant('id-1', 'John', 'participant');
      const participant2 = new Participant('id-1', 'Jane', 'spectator');

      // Act & Assert
      expect(participant1.equals(participant2)).toBe(true);
    });

    it('should not be equal when IDs are different', () => {
      // Arrange
      const participant1 = new Participant('id-1', 'John', 'participant');
      const participant2 = new Participant('id-2', 'John', 'participant');

      // Act & Assert
      expect(participant1.equals(participant2)).toBe(false);
    });

    it('should not be equal to null or undefined', () => {
      // Arrange
      const participant = new Participant('id-1', 'John', 'participant');

      // Act & Assert
      expect(participant.equals(null as any)).toBe(false);
      expect(participant.equals(undefined as any)).toBe(false);
    });
  });

  describe('name updates', () => {
    it('should update participant name', () => {
      // Arrange
      const participant = new Participant('id-1', 'John', 'participant');
      const newName = 'John Smith';

      // Act
      participant.updateName(newName);

      // Assert
      expect(participant.getName()).toBe(newName);
    });

    it('should throw error when updating to empty name', () => {
      // Arrange
      const participant = new Participant('id-1', 'John', 'participant');

      // Act & Assert
      expect(() => participant.updateName('')).toThrow('Participant name cannot be empty');
      expect(() => participant.updateName('   ')).toThrow('Participant name cannot be empty');
    });

    it('should trim whitespace when updating name', () => {
      // Arrange
      const participant = new Participant('id-1', 'John', 'participant');
      const newName = '  John Smith  ';

      // Act
      participant.updateName(newName);

      // Assert
      expect(participant.getName()).toBe('John Smith');
    });
  });

  describe('toString', () => {
    it('should return string representation for participant', () => {
      // Arrange
      const participant = new Participant('id-1', 'John Doe', 'participant');

      // Act
      const result = participant.toString();

      // Assert
      expect(result).toBe('Participant(id-1): John Doe [participant] - connected');
    });

    it('should return string representation for spectator', () => {
      // Arrange
      const spectator = new Participant('id-2', 'Jane Smith', 'spectator');

      // Act
      const result = spectator.toString();

      // Assert
      expect(result).toBe('Participant(id-2): Jane Smith [spectator] - connected');
    });

    it('should show disconnected status', () => {
      // Arrange
      const participant = new Participant('id-1', 'John', 'participant');
      participant.disconnect();

      // Act
      const result = participant.toString();

      // Assert
      expect(result).toBe('Participant(id-1): John [participant] - disconnected');
    });
  });
});
