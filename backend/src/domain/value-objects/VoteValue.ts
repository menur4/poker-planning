import { Scale } from './Scale';

export class VoteValue {
  private readonly value: string;
  private readonly scale: Scale;

  // Special vote values
  private static readonly ABSTAIN = 'ABSTAIN';
  private static readonly COFFEE_BREAK = 'COFFEE';
  private static readonly QUESTION_MARK = '?';

  constructor(value: string, scale: Scale) {
    this.validateValue(value);
    this.validateScale(scale);
    
    // For special values, skip scale validation
    if (!this.isSpecialValue(value) && !scale.isValidValue(value)) {
      throw new Error(`Vote value "${value}" is not valid for scale ${scale.getName()}`);
    }

    this.value = value.trim();
    this.scale = scale;
  }

  private validateValue(value: string): void {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('Vote value cannot be empty');
    }
  }

  private validateScale(scale: Scale): void {
    if (!scale || !(scale instanceof Scale)) {
      throw new Error('Scale is required');
    }
  }

  private isSpecialValue(value: string): boolean {
    return value === VoteValue.ABSTAIN || 
           value === VoteValue.COFFEE_BREAK || 
           value === VoteValue.QUESTION_MARK;
  }

  getValue(): string {
    return this.value;
  }

  getScale(): Scale {
    return this.scale;
  }

  isAbstain(): boolean {
    return this.value === VoteValue.ABSTAIN;
  }

  isCoffeeBreak(): boolean {
    return this.value === VoteValue.COFFEE_BREAK;
  }

  isQuestionMark(): boolean {
    return this.value === VoteValue.QUESTION_MARK;
  }

  isRegularVote(): boolean {
    return !this.isSpecialValue(this.value);
  }

  compareTo(other: VoteValue): number {
    if (!other || !(other instanceof VoteValue)) {
      throw new Error('Cannot compare with invalid vote value');
    }

    if (!this.scale.equals(other.scale)) {
      throw new Error('Cannot compare values from different scales');
    }

    if (!this.isRegularVote() || !other.isRegularVote()) {
      throw new Error('Cannot compare special vote values');
    }

    const thisIndex = this.scale.getValues().indexOf(this.value);
    const otherIndex = this.scale.getValues().indexOf(other.value);

    if (thisIndex < otherIndex) return -1;
    if (thisIndex > otherIndex) return 1;
    return 0;
  }

  equals(other: VoteValue): boolean {
    if (!other || !(other instanceof VoteValue)) {
      return false;
    }

    return this.value === other.value && this.scale.equals(other.scale);
  }

  toString(): string {
    return this.value;
  }

  static abstain(scale: Scale): VoteValue {
    return new VoteValue(VoteValue.ABSTAIN, scale);
  }

  static coffeeBreak(scale: Scale): VoteValue {
    return new VoteValue(VoteValue.COFFEE_BREAK, scale);
  }

  static questionMark(scale: Scale): VoteValue {
    return new VoteValue(VoteValue.QUESTION_MARK, scale);
  }
}
