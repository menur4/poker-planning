import { SessionId } from '../value-objects/SessionId';
import { Scale } from '../value-objects/Scale';
import { VoteValue } from '../value-objects/VoteValue';
import { Participant } from './Participant';
import { VotingRound } from './VotingRound';

export class Session {
  private readonly id: SessionId;
  private name: string;
  private readonly scale: Scale;
  private readonly creatorId: string;
  private active: boolean;
  private participants: Map<string, Participant>;
  private currentVote: VotingRound | null;
  private voteHistory: VotingRound[];
  private readonly createdAt: Date;

  constructor(id: SessionId, name: string, scale: Scale, creatorId: string) {
    this.validateId(id);
    this.validateName(name);
    this.validateScale(scale);
    this.validateCreatorId(creatorId);

    this.id = id;
    this.name = name.trim();
    this.scale = scale;
    this.creatorId = creatorId.trim();
    this.active = true;
    this.participants = new Map();
    this.currentVote = null;
    this.voteHistory = [];
    this.createdAt = new Date();
  }

  private validateId(id: SessionId): void {
    if (!id || !(id instanceof SessionId)) {
      throw new Error('Session ID is required');
    }
  }

  private validateName(name: string): void {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Session name cannot be empty');
    }
  }

  private validateScale(scale: Scale): void {
    if (!scale || !(scale instanceof Scale)) {
      throw new Error('Scale is required');
    }
  }

  private validateCreatorId(creatorId: string): void {
    if (!creatorId || typeof creatorId !== 'string' || creatorId.trim().length === 0) {
      throw new Error('Creator ID cannot be empty');
    }
  }

  getId(): SessionId {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getScale(): Scale {
    return this.scale;
  }

  getCreatorId(): string {
    return this.creatorId;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  isActive(): boolean {
    return this.active;
  }

  activate(): void {
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
  }

  updateName(newName: string): void {
    this.validateName(newName);
    this.name = newName.trim();
  }

  // Participant management
  addParticipant(participant: Participant): void {
    if (!participant || !(participant instanceof Participant)) {
      throw new Error('Valid participant is required');
    }
    this.participants.set(participant.getId(), participant);
  }

  removeParticipant(participantId: string): void {
    this.participants.delete(participantId);
    
    // Remove from current vote if exists
    if (this.currentVote) {
      this.currentVote.removeVote(participantId);
    }
  }

  findParticipant(participantId: string): Participant | null {
    return this.participants.get(participantId) || null;
  }

  getParticipants(): Participant[] {
    return Array.from(this.participants.values());
  }

  getVotingParticipants(): Participant[] {
    return this.getParticipants().filter(p => p.canVote());
  }

  getParticipantCount(): number {
    return this.participants.size;
  }

  // Voting management
  startVoting(question: string): void {
    if (this.isVotingActive()) {
      throw new Error('Cannot start voting while another vote is active');
    }

    this.currentVote = new VotingRound(question);
  }

  isVotingActive(): boolean {
    return this.currentVote !== null && this.currentVote.isActive();
  }

  getCurrentVote(): VotingRound | null {
    return this.currentVote;
  }

  submitVote(participantId: string, voteValue: VoteValue): void {
    if (!this.currentVote) {
      throw new Error('No active vote to submit to');
    }

    const participant = this.findParticipant(participantId);
    if (!participant || !participant.canVote()) {
      throw new Error('Participant not found or cannot vote');
    }

    this.currentVote.submitVote(participantId, voteValue);
  }

  revealVotes(): void {
    if (!this.currentVote) {
      throw new Error('No active vote to reveal');
    }

    this.currentVote.reveal();
  }

  finishVoting(): void {
    if (!this.currentVote) {
      throw new Error('No active vote to finish');
    }

    this.currentVote.finish();
    this.voteHistory.push(this.currentVote);
    this.currentVote = null;
  }

  getVoteHistory(): VotingRound[] {
    return [...this.voteHistory];
  }

  equals(other: Session): boolean {
    if (!other || !(other instanceof Session)) {
      return false;
    }
    return this.id.equals(other.id);
  }

  toString(): string {
    const status = this.active ? 'active' : 'inactive';
    const participantCount = this.getParticipantCount();
    return `Session(${this.id.toString()}): ${this.name} [${this.scale.getName()}] - ${status} - ${participantCount} participants`;
  }
}
