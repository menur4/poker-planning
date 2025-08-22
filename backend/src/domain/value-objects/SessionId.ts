import { v4 as uuidv4 } from 'uuid';

export class SessionId {
  private readonly value: string;

  constructor(value: string) {
    this.validateValue(value);
    this.value = value.trim();
  }

  private validateValue(value: string): void {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('SessionId cannot be empty');
    }

    const trimmedValue = value.trim();
    
    if (trimmedValue.length < 3) {
      throw new Error('SessionId must be at least 3 characters long');
    }

    if (trimmedValue.length > 100) {
      throw new Error('SessionId must be at most 100 characters long');
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: SessionId): boolean {
    if (!other || !(other instanceof SessionId)) {
      return false;
    }
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  static generate(): SessionId {
    const uuid = uuidv4();
    return new SessionId(`session-${uuid}`);
  }
}
