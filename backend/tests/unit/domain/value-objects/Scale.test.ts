import { Scale } from '../../../../src/domain/value-objects/Scale';

describe('Scale Value Object', () => {
  describe('predefined scales', () => {
    it('should create Fibonacci scale', () => {
      // Act
      const scale = Scale.fibonacci();

      // Assert
      expect(scale.getName()).toBe('fibonacci');
      expect(scale.getValues()).toEqual(['1', '2', '3', '5', '8', '13', '21', '34', '55', '89']);
    });

    it('should create T-shirt scale', () => {
      // Act
      const scale = Scale.tshirt();

      // Assert
      expect(scale.getName()).toBe('tshirt');
      expect(scale.getValues()).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
    });

    it('should create Power of 2 scale', () => {
      // Act
      const scale = Scale.powerOfTwo();

      // Assert
      expect(scale.getName()).toBe('power-of-2');
      expect(scale.getValues()).toEqual(['1', '2', '4', '8', '16', '32', '64']);
    });
  });

  describe('custom scale', () => {
    it('should create custom scale with valid values', () => {
      // Arrange
      const name = 'custom-scale';
      const values = ['Low', 'Medium', 'High'];

      // Act
      const scale = Scale.custom(name, values);

      // Assert
      expect(scale.getName()).toBe(name);
      expect(scale.getValues()).toEqual(values);
    });

    it('should throw error for empty name', () => {
      // Arrange
      const emptyName = '';
      const values = ['1', '2', '3'];

      // Act & Assert
      expect(() => Scale.custom(emptyName, values)).toThrow('Scale name cannot be empty');
    });

    it('should throw error for whitespace only name', () => {
      // Arrange
      const whitespaceName = '   ';
      const values = ['1', '2', '3'];

      // Act & Assert
      expect(() => Scale.custom(whitespaceName, values)).toThrow('Scale name cannot be empty');
    });

    it('should throw error for empty values array', () => {
      // Arrange
      const name = 'test-scale';
      const emptyValues: string[] = [];

      // Act & Assert
      expect(() => Scale.custom(name, emptyValues)).toThrow('Scale must have at least 2 values');
    });

    it('should throw error for single value array', () => {
      // Arrange
      const name = 'test-scale';
      const singleValue = ['1'];

      // Act & Assert
      expect(() => Scale.custom(name, singleValue)).toThrow('Scale must have at least 2 values');
    });

    it('should throw error for duplicate values', () => {
      // Arrange
      const name = 'test-scale';
      const duplicateValues = ['1', '2', '1', '3'];

      // Act & Assert
      expect(() => Scale.custom(name, duplicateValues)).toThrow('Scale values must be unique');
    });

    it('should throw error for empty string values', () => {
      // Arrange
      const name = 'test-scale';
      const valuesWithEmpty = ['1', '', '3'];

      // Act & Assert
      expect(() => Scale.custom(name, valuesWithEmpty)).toThrow('Scale values cannot be empty');
    });

    it('should throw error for whitespace only values', () => {
      // Arrange
      const name = 'test-scale';
      const valuesWithWhitespace = ['1', '   ', '3'];

      // Act & Assert
      expect(() => Scale.custom(name, valuesWithWhitespace)).toThrow('Scale values cannot be empty');
    });
  });

  describe('validation', () => {
    it('should validate that a value exists in the scale', () => {
      // Arrange
      const scale = Scale.fibonacci();

      // Act & Assert
      expect(scale.isValidValue('5')).toBe(true);
      expect(scale.isValidValue('13')).toBe(true);
      expect(scale.isValidValue('100')).toBe(false);
      expect(scale.isValidValue('')).toBe(false);
    });

    it('should be case sensitive for validation', () => {
      // Arrange
      const scale = Scale.tshirt();

      // Act & Assert
      expect(scale.isValidValue('M')).toBe(true);
      expect(scale.isValidValue('m')).toBe(false);
      expect(scale.isValidValue('xl')).toBe(false);
      expect(scale.isValidValue('XL')).toBe(true);
    });
  });

  describe('equality', () => {
    it('should be equal when name and values are the same', () => {
      // Arrange
      const scale1 = Scale.fibonacci();
      const scale2 = Scale.fibonacci();

      // Act & Assert
      expect(scale1.equals(scale2)).toBe(true);
    });

    it('should be equal for custom scales with same name and values', () => {
      // Arrange
      const values = ['A', 'B', 'C'];
      const scale1 = Scale.custom('test', values);
      const scale2 = Scale.custom('test', values);

      // Act & Assert
      expect(scale1.equals(scale2)).toBe(true);
    });

    it('should not be equal when names are different', () => {
      // Arrange
      const values = ['A', 'B', 'C'];
      const scale1 = Scale.custom('test1', values);
      const scale2 = Scale.custom('test2', values);

      // Act & Assert
      expect(scale1.equals(scale2)).toBe(false);
    });

    it('should not be equal when values are different', () => {
      // Arrange
      const scale1 = Scale.custom('test', ['A', 'B', 'C']);
      const scale2 = Scale.custom('test', ['A', 'B', 'D']);

      // Act & Assert
      expect(scale1.equals(scale2)).toBe(false);
    });

    it('should not be equal to null or undefined', () => {
      // Arrange
      const scale = Scale.fibonacci();

      // Act & Assert
      expect(scale.equals(null as any)).toBe(false);
      expect(scale.equals(undefined as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return name and values as string', () => {
      // Arrange
      const scale = Scale.custom('test', ['A', 'B', 'C']);

      // Act
      const result = scale.toString();

      // Assert
      expect(result).toBe('Scale(test): A, B, C');
    });
  });
});
