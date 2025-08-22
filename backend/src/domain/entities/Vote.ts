import { VoteValue } from '../value-objects/VoteValue';

export class Vote {
  private readonly participantId: string;
  private value: VoteValue;
  private timestamp: Date;
  private revealed: boolean;

  constructor(participantId: string, value: VoteValue, timestamp?: Date) {
    this.validateParticipantId(participantId);
    this.validateValue(value);

    this.participantId = participantId.trim();
    this.value = value;
    this.timestamp = timestamp || new Date();
    this.revealed = false;
  }

  private validateParticipantId(participantId: string): void {
    if (!participantId || typeof participantId !== 'string' || participantId.trim().length === 0) {
      throw new Error('Participant ID cannot be empty');
    }
  }

  private validateValue(value: VoteValue): void {
    if (!value || !(value instanceof VoteValue)) {
      throw new Error('Vote value is required');
    }
  }

  getParticipantId(): string {
    return this.participantId;
  }

  getValue(): VoteValue {
    return this.value;
  }

  getTimestamp(): Date {
    return new Date(this.timestamp);
  }

  isRevealed(): boolean {
    return this.revealed;
  }

  isRegularVote(): boolean {
    return this.value.isRegularVote();
  }

  isAbstain(): boolean {
    return this.value.isAbstain();
  }

  isCoffeeBreak(): boolean {
    return this.value.isCoffeeBreak();
  }

  isQuestionMark(): boolean {
    return this.value.isQuestionMark();
  }

  reveal(): void {
    this.revealed = true;
  }

  hide(): void {
    this.revealed = false;
  }

  updateValue(newValue: VoteValue): void {
    this.validateValue(newValue);
    this.value = newValue;
    this.timestamp = new Date();
  }

  compareTo(other: Vote): number {
    if (!other || !(other instanceof Vote)) {
      throw new Error('Cannot compare with invalid vote');
    }

    return this.value.compareTo(other.value);
  }

  equals(other: Vote): boolean {
    if (!other || !(other instanceof Vote)) {
      return false;
    }

    return this.participantId === other.participantId && this.value.equals(other.value);
  }

  toString(): string {
    const status = this.revealed ? 'revealed' : 'hidden';
    const timestamp = this.timestamp.toISOString();
    return `Vote(${this.participantId}): ${this.value.toString()} [${status}] - ${timestamp}`;
  }
}
