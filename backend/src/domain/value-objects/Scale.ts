export class Scale {
  private readonly name: string;
  private readonly values: string[];

  private constructor(name: string, values: string[]) {
    this.validateName(name);
    this.validateValues(values);
    this.name = name.trim();
    this.values = [...values];
  }

  private validateName(name: string): void {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Scale name cannot be empty');
    }
  }

  private validateValues(values: string[]): void {
    if (!values || values.length < 2) {
      throw new Error('Scale must have at least 2 values');
    }

    // Check for empty values
    for (const value of values) {
      if (!value || typeof value !== 'string' || value.trim().length === 0) {
        throw new Error('Scale values cannot be empty');
      }
    }

    // Check for duplicates
    const uniqueValues = new Set(values);
    if (uniqueValues.size !== values.length) {
      throw new Error('Scale values must be unique');
    }
  }

  getName(): string {
    return this.name;
  }

  getType(): string {
    // Map known scale names to types
    if (this.name === 'fibonacci') return 'fibonacci';
    if (this.name === 'tshirt') return 'tshirt';
    if (this.name === 'power-of-2') return 'powerOfTwo';
    return 'custom';
  }

  getValues(): string[] {
    return [...this.values];
  }

  isValidValue(value: string): boolean {
    return this.values.includes(value);
  }

  equals(other: Scale): boolean {
    if (!other || !(other instanceof Scale)) {
      return false;
    }

    return this.name === other.name && 
           this.values.length === other.values.length &&
           this.values.every((value, index) => value === other.values[index]);
  }

  toString(): string {
    return `Scale(${this.name}): ${this.values.join(', ')}`;
  }

  static fibonacci(): Scale {
    return new Scale('fibonacci', ['1', '2', '3', '5', '8', '13', '21', '34', '55', '89']);
  }

  static tshirt(): Scale {
    return new Scale('tshirt', ['XS', 'S', 'M', 'L', 'XL', 'XXL']);
  }

  static powerOfTwo(): Scale {
    return new Scale('power-of-2', ['1', '2', '4', '8', '16', '32', '64']);
  }

  static custom(name: string, values: string[]): Scale {
    return new Scale(name, values);
  }
}
