import { Vote } from './Vote';
import { VoteValue } from '../value-objects/VoteValue';

export type VotingStatus = 'voting' | 'revealed' | 'finished';

export class VotingRound {
  private readonly question: string;
  private readonly startedAt: Date;
  private status: VotingStatus;
  private votes: Map<string, Vote>;

  constructor(question: string) {
    this.validateQuestion(question);
    this.question = question.trim();
    this.startedAt = new Date();
    this.status = 'voting';
    this.votes = new Map();
  }

  private validateQuestion(question: string): void {
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      throw new Error('Question cannot be empty');
    }
  }

  getQuestion(): string {
    return this.question;
  }

  getStartedAt(): Date {
    return new Date(this.startedAt);
  }

  getStatus(): VotingStatus {
    return this.status;
  }

  isActive(): boolean {
    return this.status === 'voting';
  }

  areVotesRevealed(): boolean {
    return this.status === 'revealed' || this.status === 'finished';
  }

  isFinished(): boolean {
    return this.status === 'finished';
  }

  submitVote(participantId: string, voteValue: VoteValue): void {
    if (!this.isActive()) {
      throw new Error('Cannot submit vote when voting is not active');
    }

    const vote = new Vote(participantId, voteValue);
    this.votes.set(participantId, vote);
  }

  hasVoted(participantId: string): boolean {
    return this.votes.has(participantId);
  }

  getVote(participantId: string): Vote | null {
    return this.votes.get(participantId) || null;
  }

  getAllVotes(): Vote[] {
    return Array.from(this.votes.values());
  }

  getAllVotesWithParticipants(): Map<string, Vote> {
    return new Map(this.votes);
  }

  getVoteCount(): number {
    return this.votes.size;
  }

  reveal(): void {
    if (!this.isActive()) {
      throw new Error('Cannot reveal votes when voting is not active');
    }

    this.status = 'revealed';
    this.votes.forEach(vote => vote.reveal());
  }

  finish(): void {
    if (this.isFinished()) {
      return;
    }

    this.status = 'finished';
    if (!this.areVotesRevealed()) {
      this.votes.forEach(vote => vote.reveal());
    }
  }

  removeVote(participantId: string): void {
    this.votes.delete(participantId);
  }

  getAllParticipantIds(): string[] {
    return Array.from(this.votes.keys());
  }
}
