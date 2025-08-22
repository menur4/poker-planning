import { SessionRepository } from '../../domain/repositories/SessionRepository';
import { SessionId } from '../../domain/value-objects/SessionId';
import { Scale } from '../../domain/value-objects/Scale';
import { Participant, ParticipantRole } from '../../domain/entities/Participant';
import { v4 as uuidv4 } from 'uuid';

export interface JoinSessionCommand {
  sessionId: string;
  participantName: string;
  role: ParticipantRole;
}

export interface CurrentVoteInfo {
  question: string;
  status: 'voting' | 'revealed' | 'finished';
  startedAt: Date;
}

export interface JoinSessionResult {
  participantId: string;
  sessionName: string;
  scale: Scale;
  currentVote: CurrentVoteInfo | null;
}

export class JoinSessionUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(command: JoinSessionCommand): Promise<JoinSessionResult> {
    this.validateCommand(command);

    const sessionId = new SessionId(command.sessionId);
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.isActive()) {
      throw new Error('Session is not active');
    }

    // Generate participant ID based on role
    const participantId = this.generateParticipantId(command.role);
    
    // Create and add participant
    const participant = new Participant(participantId, command.participantName, command.role);
    session.addParticipant(participant);

    // Save updated session
    await this.sessionRepository.save(session);

    // Get current vote info if exists
    const currentVote = this.getCurrentVoteInfo(session);

    return {
      participantId,
      sessionName: session.getName(),
      scale: session.getScale(),
      currentVote
    };
  }

  private validateCommand(command: JoinSessionCommand): void {
    if (!command) {
      throw new Error('Command is required');
    }

    if (!command.sessionId || typeof command.sessionId !== 'string' || command.sessionId.trim().length === 0) {
      throw new Error('Session ID cannot be empty');
    }

    if (!command.participantName || typeof command.participantName !== 'string' || command.participantName.trim().length === 0) {
      throw new Error('Participant name cannot be empty');
    }

    if (!command.role || (command.role !== 'participant' && command.role !== 'spectator')) {
      throw new Error('Role must be either "participant" or "spectator"');
    }
  }

  private generateParticipantId(role: ParticipantRole): string {
    const uuid = uuidv4();
    return `${role}-${uuid}`;
  }

  private getCurrentVoteInfo(session: any): CurrentVoteInfo | null {
    const currentVote = session.getCurrentVote();
    if (!currentVote) {
      return null;
    }

    return {
      question: currentVote.getQuestion(),
      status: currentVote.getStatus(),
      startedAt: currentVote.getStartedAt()
    };
  }
}
