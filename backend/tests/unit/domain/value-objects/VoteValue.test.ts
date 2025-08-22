import { VoteValue } from '../../../../src/domain/value-objects/VoteValue';
import { Scale } from '../../../../src/domain/value-objects/Scale';

describe('VoteValue Value Object', () => {
  describe('creation', () => {
    it('should create a valid VoteValue with Fibonacci scale', () => {
      // Arrange
      const scale = Scale.fibonacci();
      const value = '5';

      // Act
      const voteValue = new VoteValue(value, scale);

      // Assert
      expect(voteValue.getValue()).toBe(value);
      expect(voteValue.getScale()).toEqual(scale);
    });

    it('should create a valid VoteValue with T-shirt scale', () => {
      // Arrange
      const scale = Scale.tshirt();
      const value = 'M';

      // Act
      const voteValue = new VoteValue(value, scale);

      // Assert
      expect(voteValue.getValue()).toBe(value);
      expect(voteValue.getScale()).toEqual(scale);
    });

    it('should create a valid VoteValue with custom scale', () => {
      // Arrange
      const scale = Scale.custom('priority', ['Low', 'Medium', 'High']);
      const value = 'High';

      // Act
      const voteValue = new VoteValue(value, scale);

      // Assert
      expect(voteValue.getValue()).toBe(value);
      expect(voteValue.getScale()).toEqual(scale);
    });

    it('should throw error for invalid value in scale', () => {
      // Arrange
      const scale = Scale.fibonacci();
      const invalidValue = '100';

      // Act & Assert
      expect(() => new VoteValue(invalidValue, scale)).toThrow('Vote value "100" is not valid for scale fibonacci');
    });

    it('should throw error for empty value', () => {
      // Arrange
      const scale = Scale.fibonacci();
      const emptyValue = '';

      // Act & Assert
      expect(() => new VoteValue(emptyValue, scale)).toThrow('Vote value cannot be empty');
    });

    it('should throw error for whitespace only value', () => {
      // Arrange
      const scale = Scale.fibonacci();
      const whitespaceValue = '   ';

      // Act & Assert
      expect(() => new VoteValue(whitespaceValue, scale)).toThrow('Vote value cannot be empty');
    });

    it('should throw error for null or undefined value', () => {
      // Arrange
      const scale = Scale.fibonacci();

      // Act & Assert
      expect(() => new VoteValue(null as any, scale)).toThrow('Vote value cannot be empty');
      expect(() => new VoteValue(undefined as any, scale)).toThrow('Vote value cannot be empty');
    });

    it('should throw error for null or undefined scale', () => {
      // Arrange
      const value = '5';

      // Act & Assert
      expect(() => new VoteValue(value, null as any)).toThrow('Scale is required');
      expect(() => new VoteValue(value, undefined as any)).toThrow('Scale is required');
    });
  });

  describe('special values', () => {
    it('should create abstain vote value', () => {
      // Arrange
      const scale = Scale.fibonacci();

      // Act
      const voteValue = VoteValue.abstain(scale);

      // Assert
      expect(voteValue.getValue()).toBe('ABSTAIN');
      expect(voteValue.getScale()).toEqual(scale);
      expect(voteValue.isAbstain()).toBe(true);
    });

    it('should create coffee break vote value', () => {
      // Arrange
      const scale = Scale.fibonacci();

      // Act
      const voteValue = VoteValue.coffeeBreak(scale);

      // Assert
      expect(voteValue.getValue()).toBe('COFFEE');
      expect(voteValue.getScale()).toEqual(scale);
      expect(voteValue.isCoffeeBreak()).toBe(true);
    });

    it('should create question mark vote value', () => {
      // Arrange
      const scale = Scale.fibonacci();

      // Act
      const voteValue = VoteValue.questionMark(scale);

      // Assert
      expect(voteValue.getValue()).toBe('?');
      expect(voteValue.getScale()).toEqual(scale);
      expect(voteValue.isQuestionMark()).toBe(true);
    });

    it('should identify regular vote values correctly', () => {
      // Arrange
      const scale = Scale.fibonacci();
      const regularValue = new VoteValue('5', scale);

      // Act & Assert
      expect(regularValue.isAbstain()).toBe(false);
      expect(regularValue.isCoffeeBreak()).toBe(false);
      expect(regularValue.isQuestionMark()).toBe(false);
      expect(regularValue.isRegularVote()).toBe(true);
    });
  });

  describe('comparison', () => {
    it('should compare Fibonacci values correctly', () => {
      // Arrange
      const scale = Scale.fibonacci();
      const value1 = new VoteValue('3', scale);
      const value2 = new VoteValue('8', scale);
      const value3 = new VoteValue('3', scale);

      // Act & Assert
      expect(value1.compareTo(value2)).toBe(-1); // 3 < 8
      expect(value2.compareTo(value1)).toBe(1);  // 8 > 3
      expect(value1.compareTo(value3)).toBe(0);  // 3 = 3
    });

    it('should compare T-shirt values correctly', () => {
      // Arrange
      const scale = Scale.tshirt();
      const valueS = new VoteValue('S', scale);
      const valueL = new VoteValue('L', scale);
      const valueS2 = new VoteValue('S', scale);

      // Act & Assert
      expect(valueS.compareTo(valueL)).toBe(-1); // S < L
      expect(valueL.compareTo(valueS)).toBe(1);  // L > S
      expect(valueS.compareTo(valueS2)).toBe(0); // S = S
    });

    it('should throw error when comparing values from different scales', () => {
      // Arrange
      const fibScale = Scale.fibonacci();
      const tshirtScale = Scale.tshirt();
      const fibValue = new VoteValue('5', fibScale);
      const tshirtValue = new VoteValue('M', tshirtScale);

      // Act & Assert
      expect(() => fibValue.compareTo(tshirtValue)).toThrow('Cannot compare values from different scales');
    });

    it('should handle special values in comparison', () => {
      // Arrange
      const scale = Scale.fibonacci();
      const regularValue = new VoteValue('5', scale);
      const abstainValue = VoteValue.abstain(scale);

      // Act & Assert
      expect(() => regularValue.compareTo(abstainValue)).toThrow('Cannot compare special vote values');
      expect(() => abstainValue.compareTo(regularValue)).toThrow('Cannot compare special vote values');
    });
  });

  describe('equality', () => {
    it('should be equal when value and scale are the same', () => {
      // Arrange
      const scale = Scale.fibonacci();
      const value1 = new VoteValue('5', scale);
      const value2 = new VoteValue('5', scale);

      // Act & Assert
      expect(value1.equals(value2)).toBe(true);
    });

    it('should not be equal when values are different', () => {
      // Arrange
      const scale = Scale.fibonacci();
      const value1 = new VoteValue('5', scale);
      const value2 = new VoteValue('8', scale);

      // Act & Assert
      expect(value1.equals(value2)).toBe(false);
    });

    it('should not be equal when scales are different', () => {
      // Arrange
      const fibScale = Scale.fibonacci();
      const customScale = Scale.custom('test', ['1', '2', '3', '5', '8']);
      const value1 = new VoteValue('5', fibScale);
      const value2 = new VoteValue('5', customScale);

      // Act & Assert
      expect(value1.equals(value2)).toBe(false);
    });

    it('should not be equal to null or undefined', () => {
      // Arrange
      const scale = Scale.fibonacci();
      const value = new VoteValue('5', scale);

      // Act & Assert
      expect(value.equals(null as any)).toBe(false);
      expect(value.equals(undefined as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the vote value as string', () => {
      // Arrange
      const scale = Scale.fibonacci();
      const voteValue = new VoteValue('13', scale);

      // Act
      const result = voteValue.toString();

      // Assert
      expect(result).toBe('13');
    });

    it('should return special values correctly', () => {
      // Arrange
      const scale = Scale.fibonacci();

      // Act & Assert
      expect(VoteValue.abstain(scale).toString()).toBe('ABSTAIN');
      expect(VoteValue.coffeeBreak(scale).toString()).toBe('COFFEE');
      expect(VoteValue.questionMark(scale).toString()).toBe('?');
    });
  });
});
