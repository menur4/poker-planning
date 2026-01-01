import { SessionRepository } from '../../domain/repositories/SessionRepository';
import { SessionId } from '../../domain/value-objects/SessionId';

export interface RevealVotesCommand {
  sessionId: string;
  initiatorId: string;
}

export interface VoteResult {
  participantId: string;
  participantName: string;
  voteValue: string;
}

export interface VotingStatistics {
  totalVotes: number;
  average: number;
  median: number;
  mode: string[];
  distribution: Record<string, number>;
  minVote: string;
  maxVote: string;
  consensus: boolean;
}

export interface RevealVotesResult {
  success: boolean;
  question: string;
  votes: VoteResult[];
  statistics: VotingStatistics;
}

export class RevealVotesUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(command: RevealVotesCommand): Promise<RevealVotesResult> {
    this.validateCommand(command);

    const sessionId = new SessionId(command.sessionId);
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.isActive()) {
      throw new Error('Session is not active');
    }

    const currentVote = session.getCurrentVote();
    if (!currentVote) {
      throw new Error('No active voting round');
    }

    if (currentVote.getStatus() === 'revealed') {
      throw new Error('Votes are already revealed');
    }

    if (!session.isVotingActive() && currentVote.getStatus() !== 'voting') {
      throw new Error('No active voting round');
    }

    // Check if initiator can reveal votes (creator or participant)
    const canReveal = this.canRevealVotes(session, command.initiatorId);
    if (!canReveal) {
      throw new Error('Only participants or session creator can reveal votes');
    }

    // Reveal votes
    session.revealVotes();

    // Save updated session
    await this.sessionRepository.save(session);

    // Collect vote results
    const votes: VoteResult[] = [];
    const allVotes = currentVote.getAllVotesWithParticipants();
    
    for (const [participantId, vote] of allVotes) {
      const participant = session.findParticipant(participantId);
      if (participant) {
        votes.push({
          participantId,
          participantName: participant.getName(),
          voteValue: vote.getValue().getValue()
        });
      }
    }

    // Calculate statistics
    const statistics = this.calculateStatistics(votes);

    return {
      success: true,
      question: currentVote.getQuestion(),
      votes,
      statistics
    };
  }

  private validateCommand(command: RevealVotesCommand): void {
    if (!command) {
      throw new Error('Command is required');
    }

    if (!command.sessionId || typeof command.sessionId !== 'string' || command.sessionId.trim().length === 0) {
      throw new Error('Session ID cannot be empty');
    }

    if (!command.initiatorId || typeof command.initiatorId !== 'string' || command.initiatorId.trim().length === 0) {
      throw new Error('Initiator ID cannot be empty');
    }
  }

  private canRevealVotes(session: any, initiatorId: string): boolean {
    // Check if initiator is a participant (not spectator)
    const participant = session.findParticipant(initiatorId);
    if (!participant) {
      return false;
    }

    // Only participants (not spectators) can reveal votes
    // The creator is also a participant, so they can reveal votes
    return participant.canVote();
  }

  private calculateStatistics(votes: VoteResult[]): VotingStatistics {
    if (votes.length === 0) {
      return {
        totalVotes: 0,
        average: 0,
        median: 0,
        mode: [],
        distribution: {},
        minVote: '',
        maxVote: '',
        consensus: true
      };
    }

    // Filter numeric votes for calculations
    const numericVotes = votes
      .map(v => v.voteValue)
      .filter(value => !isNaN(Number(value)) && value !== 'ABSTAIN' && value !== 'COFFEE' && value !== '?')
      .map(value => Number(value));

    // Calculate average
    const average = numericVotes.length > 0
      ? numericVotes.reduce((sum, vote) => sum + vote, 0) / numericVotes.length
      : 0;

    // Calculate median
    let median = 0;
    if (numericVotes.length > 0) {
      const sortedVotes = [...numericVotes].sort((a, b) => a - b);
      const mid = Math.floor(sortedVotes.length / 2);
      median = sortedVotes.length % 2 === 0
        ? (sortedVotes[mid - 1] + sortedVotes[mid]) / 2
        : sortedVotes[mid];
    }

    // Calculate distribution (frequency of each vote value)
    const distribution: Record<string, number> = {};
    const allVoteValues = votes.map(v => v.voteValue);
    allVoteValues.forEach(value => {
      distribution[value] = (distribution[value] || 0) + 1;
    });

    // Calculate mode (most frequent vote(s))
    const maxFrequency = Math.max(...Object.values(distribution));
    const mode = Object.entries(distribution)
      .filter(([_, count]) => count === maxFrequency)
      .map(([value, _]) => value);

    // Find min and max from numeric votes
    const sortedNumericVotes = [...numericVotes].sort((a, b) => a - b);
    const minVote = sortedNumericVotes.length > 0 ? sortedNumericVotes[0].toString() : allVoteValues[0] || '';
    const maxVote = sortedNumericVotes.length > 0 ? sortedNumericVotes[sortedNumericVotes.length - 1].toString() : allVoteValues[0] || '';

    // Check consensus - all votes must be the same
    const uniqueVotes = new Set(allVoteValues);
    const consensus = uniqueVotes.size <= 1;

    return {
      totalVotes: votes.length,
      average,
      median,
      mode,
      distribution,
      minVote,
      maxVote,
      consensus
    };
  }
}
