import { Vote } from '../../../../src/domain/entities/Vote';
import { VoteValue } from '../../../../src/domain/value-objects/VoteValue';
import { Scale } from '../../../../src/domain/value-objects/Scale';

describe('Vote Entity', () => {
  let scale: Scale;
  let voteValue: VoteValue;

  beforeEach(() => {
    scale = Scale.fibonacci();
    voteValue = new VoteValue('5', scale);
  });

  describe('creation', () => {
    it('should create a vote with valid data', () => {
      // Arrange
      const participantId = 'participant-123';
      const timestamp = new Date();

      // Act
      const vote = new Vote(participantId, voteValue, timestamp);

      // Assert
      expect(vote.getParticipantId()).toBe(participantId);
      expect(vote.getValue()).toEqual(voteValue);
      expect(vote.getTimestamp()).toEqual(timestamp);
      expect(vote.isRevealed()).toBe(false);
    });

    it('should create a vote with current timestamp if not provided', () => {
      // Arrange
      const participantId = 'participant-123';
      const beforeCreation = new Date();

      // Act
      const vote = new Vote(participantId, voteValue);
      const afterCreation = new Date();

      // Assert
      expect(vote.getParticipantId()).toBe(participantId);
      expect(vote.getValue()).toEqual(voteValue);
      expect(vote.getTimestamp().getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(vote.getTimestamp().getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('should throw error for empty participant ID', () => {
      // Arrange
      const emptyId = '';

      // Act & Assert
      expect(() => new Vote(emptyId, voteValue)).toThrow('Participant ID cannot be empty');
    });

    it('should throw error for whitespace only participant ID', () => {
      // Arrange
      const whitespaceId = '   ';

      // Act & Assert
      expect(() => new Vote(whitespaceId, voteValue)).toThrow('Participant ID cannot be empty');
    });

    it('should throw error for null or undefined participant ID', () => {
      // Act & Assert
      expect(() => new Vote(null as any, voteValue)).toThrow('Participant ID cannot be empty');
      expect(() => new Vote(undefined as any, voteValue)).toThrow('Participant ID cannot be empty');
    });

    it('should throw error for null or undefined vote value', () => {
      // Arrange
      const participantId = 'participant-123';

      // Act & Assert
      expect(() => new Vote(participantId, null as any)).toThrow('Vote value is required');
      expect(() => new Vote(participantId, undefined as any)).toThrow('Vote value is required');
    });

    it('should trim whitespace from participant ID', () => {
      // Arrange
      const participantId = '  participant-123  ';

      // Act
      const vote = new Vote(participantId, voteValue);

      // Assert
      expect(vote.getParticipantId()).toBe('participant-123');
    });
  });

  describe('vote types', () => {
    it('should identify regular vote', () => {
      // Arrange
      const regularValue = new VoteValue('8', scale);
      const vote = new Vote('participant-1', regularValue);

      // Act & Assert
      expect(vote.isRegularVote()).toBe(true);
      expect(vote.isAbstain()).toBe(false);
      expect(vote.isCoffeeBreak()).toBe(false);
      expect(vote.isQuestionMark()).toBe(false);
    });

    it('should identify abstain vote', () => {
      // Arrange
      const abstainValue = VoteValue.abstain(scale);
      const vote = new Vote('participant-1', abstainValue);

      // Act & Assert
      expect(vote.isRegularVote()).toBe(false);
      expect(vote.isAbstain()).toBe(true);
      expect(vote.isCoffeeBreak()).toBe(false);
      expect(vote.isQuestionMark()).toBe(false);
    });

    it('should identify coffee break vote', () => {
      // Arrange
      const coffeeValue = VoteValue.coffeeBreak(scale);
      const vote = new Vote('participant-1', coffeeValue);

      // Act & Assert
      expect(vote.isRegularVote()).toBe(false);
      expect(vote.isAbstain()).toBe(false);
      expect(vote.isCoffeeBreak()).toBe(true);
      expect(vote.isQuestionMark()).toBe(false);
    });

    it('should identify question mark vote', () => {
      // Arrange
      const questionValue = VoteValue.questionMark(scale);
      const vote = new Vote('participant-1', questionValue);

      // Act & Assert
      expect(vote.isRegularVote()).toBe(false);
      expect(vote.isAbstain()).toBe(false);
      expect(vote.isCoffeeBreak()).toBe(false);
      expect(vote.isQuestionMark()).toBe(true);
    });
  });

  describe('reveal management', () => {
    it('should start as not revealed', () => {
      // Arrange
      const vote = new Vote('participant-1', voteValue);

      // Act & Assert
      expect(vote.isRevealed()).toBe(false);
    });

    it('should reveal vote', () => {
      // Arrange
      const vote = new Vote('participant-1', voteValue);

      // Act
      vote.reveal();

      // Assert
      expect(vote.isRevealed()).toBe(true);
    });

    it('should hide vote', () => {
      // Arrange
      const vote = new Vote('participant-1', voteValue);
      vote.reveal();

      // Act
      vote.hide();

      // Assert
      expect(vote.isRevealed()).toBe(false);
    });

    it('should handle multiple reveal calls gracefully', () => {
      // Arrange
      const vote = new Vote('participant-1', voteValue);

      // Act
      vote.reveal();
      vote.reveal();

      // Assert
      expect(vote.isRevealed()).toBe(true);
    });

    it('should handle multiple hide calls gracefully', () => {
      // Arrange
      const vote = new Vote('participant-1', voteValue);

      // Act
      vote.hide();
      vote.hide();

      // Assert
      expect(vote.isRevealed()).toBe(false);
    });
  });

  describe('value updates', () => {
    it('should update vote value', () => {
      // Arrange
      const vote = new Vote('participant-1', voteValue);
      const newValue = new VoteValue('13', scale);

      // Act
      vote.updateValue(newValue);

      // Assert
      expect(vote.getValue()).toEqual(newValue);
    });

    it('should throw error when updating to null or undefined value', () => {
      // Arrange
      const vote = new Vote('participant-1', voteValue);

      // Act & Assert
      expect(() => vote.updateValue(null as any)).toThrow('Vote value is required');
      expect(() => vote.updateValue(undefined as any)).toThrow('Vote value is required');
    });

    it('should update timestamp when value is updated', () => {
      // Arrange
      const originalTimestamp = new Date('2023-01-01T10:00:00Z');
      const vote = new Vote('participant-1', voteValue, originalTimestamp);
      const newValue = new VoteValue('13', scale);
      
      // Wait a bit to ensure timestamp difference
      const beforeUpdate = new Date();

      // Act
      vote.updateValue(newValue);
      const afterUpdate = new Date();

      // Assert
      expect(vote.getTimestamp().getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(vote.getTimestamp().getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
      expect(vote.getTimestamp()).not.toEqual(originalTimestamp);
    });
  });

  describe('comparison', () => {
    it('should compare regular votes correctly', () => {
      // Arrange
      const vote1 = new Vote('participant-1', new VoteValue('3', scale));
      const vote2 = new Vote('participant-2', new VoteValue('8', scale));
      const vote3 = new Vote('participant-3', new VoteValue('3', scale));

      // Act & Assert
      expect(vote1.compareTo(vote2)).toBe(-1); // 3 < 8
      expect(vote2.compareTo(vote1)).toBe(1);  // 8 > 3
      expect(vote1.compareTo(vote3)).toBe(0);  // 3 = 3
    });

    it('should throw error when comparing special votes', () => {
      // Arrange
      const regularVote = new Vote('participant-1', new VoteValue('5', scale));
      const abstainVote = new Vote('participant-2', VoteValue.abstain(scale));

      // Act & Assert
      expect(() => regularVote.compareTo(abstainVote)).toThrow('Cannot compare special vote values');
      expect(() => abstainVote.compareTo(regularVote)).toThrow('Cannot compare special vote values');
    });

    it('should throw error when comparing votes from different scales', () => {
      // Arrange
      const fibScale = Scale.fibonacci();
      const tshirtScale = Scale.tshirt();
      const vote1 = new Vote('participant-1', new VoteValue('5', fibScale));
      const vote2 = new Vote('participant-2', new VoteValue('M', tshirtScale));

      // Act & Assert
      expect(() => vote1.compareTo(vote2)).toThrow('Cannot compare values from different scales');
    });
  });

  describe('equality', () => {
    it('should be equal when participant ID and value are the same', () => {
      // Arrange
      const participantId = 'participant-1';
      const vote1 = new Vote(participantId, voteValue);
      const vote2 = new Vote(participantId, voteValue);

      // Act & Assert
      expect(vote1.equals(vote2)).toBe(true);
    });

    it('should not be equal when participant IDs are different', () => {
      // Arrange
      const vote1 = new Vote('participant-1', voteValue);
      const vote2 = new Vote('participant-2', voteValue);

      // Act & Assert
      expect(vote1.equals(vote2)).toBe(false);
    });

    it('should not be equal when values are different', () => {
      // Arrange
      const participantId = 'participant-1';
      const value1 = new VoteValue('5', scale);
      const value2 = new VoteValue('8', scale);
      const vote1 = new Vote(participantId, value1);
      const vote2 = new Vote(participantId, value2);

      // Act & Assert
      expect(vote1.equals(vote2)).toBe(false);
    });

    it('should not be equal to null or undefined', () => {
      // Arrange
      const vote = new Vote('participant-1', voteValue);

      // Act & Assert
      expect(vote.equals(null as any)).toBe(false);
      expect(vote.equals(undefined as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation for regular vote', () => {
      // Arrange
      const vote = new Vote('participant-1', voteValue);

      // Act
      const result = vote.toString();

      // Assert
      expect(result).toMatch(/^Vote\(participant-1\): 5 \[hidden\] - \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return string representation for revealed vote', () => {
      // Arrange
      const vote = new Vote('participant-1', voteValue);
      vote.reveal();

      // Act
      const result = vote.toString();

      // Assert
      expect(result).toMatch(/^Vote\(participant-1\): 5 \[revealed\] - \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return string representation for special vote', () => {
      // Arrange
      const abstainValue = VoteValue.abstain(scale);
      const vote = new Vote('participant-1', abstainValue);

      // Act
      const result = vote.toString();

      // Assert
      expect(result).toMatch(/^Vote\(participant-1\): ABSTAIN \[hidden\] - \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
