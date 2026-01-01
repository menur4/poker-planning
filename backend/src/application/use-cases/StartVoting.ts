import { SessionRepository } from '../../domain/repositories/SessionRepository';
import { SessionId } from '../../domain/value-objects/SessionId';

export interface StartVotingCommand {
  sessionId: string;
  question: string;
  initiatorId: string;
}

export interface VotingParticipant {
  id: string;
  name: string;
}

export interface StartVotingResult {
  votingRoundId: string;
  question: string;
  votingParticipants: VotingParticipant[];
}

export class StartVotingUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(command: StartVotingCommand): Promise<StartVotingResult> {
    this.validateCommand(command);

    const sessionId = new SessionId(command.sessionId);
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.isActive()) {
      throw new Error('Session is not active');
    }

    if (session.isVotingActive()) {
      throw new Error('Voting is already active');
    }

    // Check if initiator can start voting (creator or participant)
    const canInitiate = this.canInitiateVoting(session, command.initiatorId);
    if (!canInitiate) {
      throw new Error('Only participants or session creator can start voting');
    }

    // Start voting
    session.startVoting(command.question);

    // Save updated session
    await this.sessionRepository.save(session);

    // Get voting participants
    const votingParticipants = session.getVotingParticipants().map(p => ({
      id: p.getId(),
      name: p.getName()
    }));

    // Generate voting round ID (could be improved with proper ID generation)
    const votingRoundId = `voting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      votingRoundId,
      question: command.question.trim(),
      votingParticipants
    };
  }

  private validateCommand(command: StartVotingCommand): void {
    if (!command) {
      throw new Error('Command is required');
    }

    if (!command.sessionId || typeof command.sessionId !== 'string' || command.sessionId.trim().length === 0) {
      throw new Error('Session ID cannot be empty');
    }

    if (!command.question || typeof command.question !== 'string' || command.question.trim().length === 0) {
      throw new Error('Question cannot be empty');
    }

    if (!command.initiatorId || typeof command.initiatorId !== 'string' || command.initiatorId.trim().length === 0) {
      throw new Error('Initiator ID cannot be empty');
    }
  }

  private canInitiateVoting(session: any, initiatorId: string): boolean {
    // Check if initiator is a participant (not spectator)
    const participant = session.findParticipant(initiatorId);
    if (!participant) {
      return false;
    }

    // Only participants (not spectators) can start voting
    // The creator is also a participant, so they can start voting
    return participant.canVote();
  }
}
