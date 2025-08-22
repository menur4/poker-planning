import { SessionRepository } from '../../domain/repositories/SessionRepository';
import { SessionId } from '../../domain/value-objects/SessionId';
import { VoteValue } from '../../domain/value-objects/VoteValue';

export interface SubmitVoteCommand {
  sessionId: string;
  participantId: string;
  voteValue: string;
}

export interface SubmitVoteResult {
  success: boolean;
  voteValue: string;
  participantName: string;
}

export class SubmitVoteUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(command: SubmitVoteCommand): Promise<SubmitVoteResult> {
    this.validateCommand(command);

    const sessionId = new SessionId(command.sessionId);
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.isActive()) {
      throw new Error('Session is not active');
    }

    if (!session.isVotingActive()) {
      throw new Error('No active voting round');
    }

    // Find participant and validate they can vote
    const participant = session.findParticipant(command.participantId);
    if (!participant || !participant.canVote()) {
      throw new Error('Participant not found or cannot vote');
    }

    // Create vote value and validate against scale
    const voteValue = new VoteValue(command.voteValue, session.getScale());

    // Submit vote
    session.submitVote(command.participantId, voteValue);

    // Save updated session
    await this.sessionRepository.save(session);

    return {
      success: true,
      voteValue: command.voteValue,
      participantName: participant.getName()
    };
  }

  private validateCommand(command: SubmitVoteCommand): void {
    if (!command) {
      throw new Error('Command is required');
    }

    if (!command.sessionId || typeof command.sessionId !== 'string' || command.sessionId.trim().length === 0) {
      throw new Error('Session ID cannot be empty');
    }

    if (!command.participantId || typeof command.participantId !== 'string' || command.participantId.trim().length === 0) {
      throw new Error('Participant ID cannot be empty');
    }

    if (!command.voteValue || typeof command.voteValue !== 'string' || command.voteValue.trim().length === 0) {
      throw new Error('Vote value cannot be empty');
    }
  }
}
