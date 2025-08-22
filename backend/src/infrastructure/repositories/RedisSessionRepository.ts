import Redis from 'ioredis';
import { SessionRepository } from '../../domain/repositories/SessionRepository';
import { Session } from '../../domain/entities/Session';
import { SessionId } from '../../domain/value-objects/SessionId';
import { Scale } from '../../domain/value-objects/Scale';
import { Participant } from '../../domain/entities/Participant';
import { VotingRound } from '../../domain/entities/VotingRound';
import { VoteValue } from '../../domain/value-objects/VoteValue';

export interface RedisConfig {
  host: string;
  port: number;
  db?: number;
  password?: string;
}

interface SerializedSession {
  id: string;
  name: string;
  scale: {
    type: string;
    name?: string;
    values: string[];
  };
  creatorId: string;
  isActive: boolean;
  participants: Array<{
    id: string;
    name: string;
    role: 'participant' | 'spectator';
    isConnected: boolean;
  }>;
  currentVote: {
    question: string;
    status: 'voting' | 'revealed' | 'finished';
    startedAt: string;
    votes: Array<{
      participantId: string;
      voteValue: string;
      isRevealed: boolean;
    }>;
  } | null;
  voteHistory: Array<{
    question: string;
    status: 'voting' | 'revealed' | 'finished';
    startedAt: string;
    votes: Array<{
      participantId: string;
      voteValue: string;
      isRevealed: boolean;
    }>;
  }>;
}

export class RedisSessionRepository implements SessionRepository {
  private redis: Redis;
  private readonly keyPrefix = 'session:';
  private readonly defaultTtl: number;

  constructor(config: RedisConfig, ttlSeconds: number = 86400) { // 24 hours default
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      db: config.db || 0,
      password: config.password,
      maxRetriesPerRequest: 3,
    });
    this.defaultTtl = ttlSeconds;
  }

  async save(session: Session): Promise<void> {
    const key = this.getKey(session.getId());
    const serializedSession = this.serializeSession(session);
    
    await this.redis.set(
      key,
      JSON.stringify(serializedSession),
      'EX',
      this.defaultTtl
    );
  }

  async findById(id: SessionId): Promise<Session | null> {
    const key = this.getKey(id);
    const data = await this.redis.get(key);
    
    if (!data) {
      return null;
    }

    try {
      const sessionData: SerializedSession = JSON.parse(data);
      return this.deserializeSession(sessionData);
    } catch (error) {
      throw new Error(`Failed to deserialize session data: ${error}`);
    }
  }

  async findByCreatorId(creatorId: string): Promise<Session[]> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    const sessions: Session[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          const sessionData: SerializedSession = JSON.parse(data);
          if (sessionData.creatorId === creatorId) {
            sessions.push(this.deserializeSession(sessionData));
          }
        } catch (error) {
          // Skip invalid session data
          console.warn(`Skipping invalid session data for key ${key}:`, error);
        }
      }
    }

    return sessions;
  }

  async delete(id: SessionId): Promise<void> {
    const key = this.getKey(id);
    await this.redis.del(key);
  }

  async exists(id: SessionId): Promise<boolean> {
    const key = this.getKey(id);
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }

  private getKey(id: SessionId): string {
    return `${this.keyPrefix}${id.getValue()}`;
  }

  private serializeSession(session: Session): SerializedSession {
    const participants = session.getParticipants().map(p => ({
      id: p.getId(),
      name: p.getName(),
      role: p.getRole(),
      isConnected: p.isConnected()
    }));

    const currentVote = session.getCurrentVote();
    const serializedCurrentVote = currentVote ? {
      question: currentVote.getQuestion(),
      status: currentVote.getStatus(),
      startedAt: currentVote.getStartedAt().toISOString(),
      votes: currentVote.getAllVotesWithParticipants().entries() 
        ? Array.from(currentVote.getAllVotesWithParticipants().entries()).map(([participantId, vote]) => ({
            participantId,
            voteValue: vote.getValue().getValue(),
            isRevealed: vote.isRevealed()
          }))
        : []
    } : null;

    const voteHistory = session.getVoteHistory().map(vote => ({
      question: vote.getQuestion(),
      status: vote.getStatus(),
      startedAt: vote.getStartedAt().toISOString(),
      votes: Array.from(vote.getAllVotesWithParticipants().entries()).map(([participantId, voteObj]) => ({
        participantId,
        voteValue: voteObj.getValue().getValue(),
        isRevealed: voteObj.isRevealed()
      }))
    }));

    const scale = session.getScale();
    const serializedScale = {
      type: scale.getType(),
      name: scale.getName(),
      values: scale.getValues()
    };

    return {
      id: session.getId().getValue(),
      name: session.getName(),
      scale: serializedScale,
      creatorId: session.getCreatorId(),
      isActive: session.isActive(),
      participants,
      currentVote: serializedCurrentVote,
      voteHistory
    };
  }

  private deserializeSession(data: SerializedSession): Session {
    // Recreate SessionId
    const sessionId = new SessionId(data.id);

    // Recreate Scale
    let scale: Scale;
    if (data.scale.type === 'fibonacci') {
      scale = Scale.fibonacci();
    } else if (data.scale.type === 'tshirt') {
      scale = Scale.tshirt();
    } else if (data.scale.type === 'powerOfTwo') {
      scale = Scale.powerOfTwo();
    } else if (data.scale.type === 'custom' && data.scale.name) {
      scale = Scale.custom(data.scale.name, data.scale.values);
    } else {
      throw new Error(`Unknown scale type: ${data.scale.type}`);
    }

    // Create session
    const session = new Session(sessionId, data.name, scale, data.creatorId);

    // Set active status
    if (!data.isActive) {
      session.deactivate();
    }

    // Add participants
    for (const participantData of data.participants) {
      const participant = new Participant(
        participantData.id,
        participantData.name,
        participantData.role
      );
      
      if (!participantData.isConnected) {
        participant.disconnect();
      }
      
      session.addParticipant(participant);
    }

    // Restore current vote if exists
    if (data.currentVote) {
      session.startVoting(data.currentVote.question);
      
      // Submit votes
      for (const voteData of data.currentVote.votes) {
        const voteValue = new VoteValue(voteData.voteValue, scale);
        session.submitVote(voteData.participantId, voteValue);
      }

      // Set status
      if (data.currentVote.status === 'revealed') {
        session.revealVotes();
      } else if (data.currentVote.status === 'finished') {
        session.finishVoting();
      }
    }

    // Note: Vote history is automatically managed by the Session entity
    // when votes are finished, so we don't need to manually restore it

    return session;
  }
}
