import { SessionRepository } from '../../domain/repositories/SessionRepository';
import { SessionId } from '../../domain/value-objects/SessionId';

export interface FinishVotingCommand {
  sessionId: string;
  initiatorId: string;
}

export class FinishVotingUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(command: FinishVotingCommand): Promise<void> {
    this.validateCommand(command);

    const sessionId = new SessionId(command.sessionId);
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.isActive()) {
      throw new Error('Session is not active');
    }

    // Check if initiator can finish voting (creator or participant)
    const canFinish = this.canFinishVoting(session, command.initiatorId);
    if (!canFinish) {
      throw new Error('Only participants or session creator can finish voting');
    }

    // Finish voting
    session.finishVoting();

    // Save session
    await this.sessionRepository.save(session);
  }

  private validateCommand(command: FinishVotingCommand): void {
    if (!command.sessionId || typeof command.sessionId !== 'string') {
      throw new Error('Session ID is required');
    }

    if (!command.initiatorId || typeof command.initiatorId !== 'string') {
      throw new Error('Initiator ID is required');
    }
  }

  private canFinishVoting(session: any, initiatorId: string): boolean {
    // Check if initiator is a participant (not spectator)
    const participant = session.findParticipant(initiatorId);
    if (!participant) {
      return false;
    }

    // Only participants (not spectators) can finish voting
    // The creator is also a participant, so they can finish voting
    return participant.canVote();
  }
}
