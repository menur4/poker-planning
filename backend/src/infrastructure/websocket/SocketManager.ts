import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { SessionRepository } from '../../domain/repositories/SessionRepository';
import { SessionId } from '../../domain/value-objects/SessionId';
import { JoinSessionUseCase } from '../../application/use-cases/JoinSession';
import { StartVotingUseCase } from '../../application/use-cases/StartVoting';
import { SubmitVoteUseCase } from '../../application/use-cases/SubmitVote';
import { RevealVotesUseCase } from '../../application/use-cases/RevealVotes';

export interface SocketData {
  sessionId?: string;
  participantId?: string;
  participantName?: string;
  role?: 'participant' | 'spectator';
}

export interface ServerToClientEvents {
  // Session events
  'session:updated': (sessionData: any) => void;
  'participant:joined': (participant: any) => void;
  'participant:left': (participantId: string) => void;
  'participant:connected': (participantId: string) => void;
  'participant:disconnected': (participantId: string) => void;

  // Voting events
  'voting:started': (votingData: any) => void;
  'vote:submitted': (voteData: any) => void;
  'votes:revealed': (resultsData: any) => void;
  'voting:finished': () => void;

  // Error events
  'error': (error: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
  // Session events
  'session:join': (data: { sessionId: string; participantName: string; role: 'participant' | 'spectator' }) => void;
  'session:leave': () => void;

  // Voting events
  'voting:start': (data: { question: string }) => void;
  'vote:submit': (data: { voteValue: string }) => void;
  'votes:reveal': () => void;
}

export class SocketManager {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
  private sessionParticipants: Map<string, Set<string>> = new Map(); // sessionId -> Set<socketId>

  constructor(
    httpServer: HttpServer,
    private readonly sessionRepository: SessionRepository,
    private readonly joinSessionUseCase: JoinSessionUseCase,
    private readonly startVotingUseCase: StartVotingUseCase,
    private readonly submitVoteUseCase: SubmitVoteUseCase,
    private readonly revealVotesUseCase: RevealVotesUseCase
  ) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://your-frontend-domain.com']
          : ['http://localhost:3000', 'http://localhost:5173'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>) => {
      console.log(`Socket connected: ${socket.id}`);

      // Session events
      socket.on('session:join', async (data) => {
        await this.handleSessionJoin(socket, data);
      });

      socket.on('session:leave', () => {
        this.handleSessionLeave(socket);
      });

      // Voting events
      socket.on('voting:start', async (data) => {
        await this.handleVotingStart(socket, data);
      });

      socket.on('vote:submit', async (data) => {
        await this.handleVoteSubmit(socket, data);
      });

      socket.on('votes:reveal', async () => {
        await this.handleVotesReveal(socket);
      });

      // Disconnect handling
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private async handleSessionJoin(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    data: { sessionId: string; participantName: string; role: 'participant' | 'spectator'; participantId?: string }
  ): Promise<void> {
    try {
      // Validate session exists
      const sessionId = new SessionId(data.sessionId);
      const session = await this.sessionRepository.findById(sessionId);

      if (!session) {
        socket.emit('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND' });
        return;
      }

      if (!session.isActive()) {
        socket.emit('error', { message: 'Session is not active', code: 'SESSION_INACTIVE' });
        return;
      }

      let participantId: string;

      // If participantId is provided, use existing participant (don't create a new one)
      if (data.participantId) {
        const participant = session.findParticipant(data.participantId);
        if (!participant) {
          socket.emit('error', { message: 'Participant not found in session', code: 'PARTICIPANT_NOT_FOUND' });
          return;
        }
        participantId = data.participantId;
        console.log(`Participant ${data.participantName} (${participantId}) reconnecting to session ${data.sessionId}`);
      } else {
        // Only create a new participant if no participantId is provided
        // This should rarely happen as the API should handle participant creation
        const joinResult = await this.joinSessionUseCase.execute({
          sessionId: data.sessionId,
          participantName: data.participantName,
          role: data.role
        });
        participantId = joinResult.participantId;
        console.log(`New participant ${data.participantName} (${participantId}) joined session ${data.sessionId}`);
      }

      // Store socket data
      socket.data.sessionId = data.sessionId;
      socket.data.participantId = participantId;
      socket.data.participantName = data.participantName;
      socket.data.role = data.role;

      // Join socket room
      await socket.join(data.sessionId);

      // Track participant in session
      if (!this.sessionParticipants.has(data.sessionId)) {
        this.sessionParticipants.set(data.sessionId, new Set());
      }
      this.sessionParticipants.get(data.sessionId)!.add(socket.id);

      // Send session data to ALL participants (including the one who just joined)
      // This ensures everyone sees the updated participant list in real-time
      // Using io.to() instead of socket.emit() + socket.to() to ensure ALL sockets in the room receive the event
      const updatedSession = await this.sessionRepository.findById(sessionId);
      if (updatedSession) {
        const serializedSession = this.serializeSession(updatedSession);
        // Send to ALL sockets in the room (including all sockets of the joining participant)
        this.io.to(data.sessionId).emit('session:updated', { session: serializedSession });
        console.log(`[WebSocket] Notified all participants in session ${data.sessionId} about participant join`);
      }
    } catch (error) {
      console.error('Error joining session:', error);
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to join session',
        code: 'JOIN_SESSION_ERROR'
      });
    }
  }

  private handleSessionLeave(socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>): void {
    const { sessionId, participantId } = socket.data;
    
    if (sessionId && participantId) {
      // Leave socket room
      socket.leave(sessionId);

      // Remove from tracking
      const participants = this.sessionParticipants.get(sessionId);
      if (participants) {
        participants.delete(socket.id);
        if (participants.size === 0) {
          this.sessionParticipants.delete(sessionId);
        }
      }

      // Notify other participants
      socket.to(sessionId).emit('participant:left', participantId);

      console.log(`Participant ${participantId} left session ${sessionId}`);
    }

    // Clear socket data
    socket.data = {};
  }

  private async handleVotingStart(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    data: { question: string }
  ): Promise<void> {
    const { sessionId, participantId } = socket.data;

    if (!sessionId || !participantId) {
      socket.emit('error', { message: 'Not joined to any session', code: 'NOT_IN_SESSION' });
      return;
    }

    try {
      const result = await this.startVotingUseCase.execute({
        sessionId,
        question: data.question,
        initiatorId: participantId
      });

      // Notify all participants in the session
      this.io.to(sessionId).emit('voting:started', {
        votingRoundId: result.votingRoundId,
        question: result.question,
        votingParticipants: result.votingParticipants
      });

      console.log(`Voting started in session ${sessionId} by ${participantId}`);
    } catch (error) {
      console.error('Error starting voting:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to start voting',
        code: 'START_VOTING_ERROR'
      });
    }
  }

  private async handleVoteSubmit(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    data: { voteValue: string }
  ): Promise<void> {
    const { sessionId, participantId } = socket.data;

    if (!sessionId || !participantId) {
      socket.emit('error', { message: 'Not joined to any session', code: 'NOT_IN_SESSION' });
      return;
    }

    try {
      const result = await this.submitVoteUseCase.execute({
        sessionId,
        participantId,
        voteValue: data.voteValue
      });

      // Notify all participants (without revealing the vote value)
      socket.to(sessionId).emit('vote:submitted', {
        participantId,
        participantName: result.participantName,
        hasVoted: true
      });

      // Confirm to the voter
      socket.emit('vote:submitted', {
        participantId,
        participantName: result.participantName,
        voteValue: result.voteValue,
        hasVoted: true
      });

      console.log(`Vote submitted in session ${sessionId} by ${participantId}`);
    } catch (error) {
      console.error('Error submitting vote:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to submit vote',
        code: 'SUBMIT_VOTE_ERROR'
      });
    }
  }

  private async handleVotesReveal(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>
  ): Promise<void> {
    const { sessionId, participantId } = socket.data;

    if (!sessionId || !participantId) {
      socket.emit('error', { message: 'Not joined to any session', code: 'NOT_IN_SESSION' });
      return;
    }

    try {
      const result = await this.revealVotesUseCase.execute({
        sessionId,
        initiatorId: participantId
      });

      // Notify all participants in the session
      this.io.to(sessionId).emit('votes:revealed', {
        question: result.question,
        votes: result.votes,
        statistics: result.statistics
      });

      console.log(`Votes revealed in session ${sessionId} by ${participantId}`);
    } catch (error) {
      console.error('Error revealing votes:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to reveal votes',
        code: 'REVEAL_VOTES_ERROR'
      });
    }
  }

  private handleDisconnect(socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>): void {
    const { sessionId, participantId } = socket.data;
    
    if (sessionId && participantId) {
      // Remove from tracking
      const participants = this.sessionParticipants.get(sessionId);
      if (participants) {
        participants.delete(socket.id);
        if (participants.size === 0) {
          this.sessionParticipants.delete(sessionId);
        }
      }

      // Notify other participants about disconnection
      socket.to(sessionId).emit('participant:disconnected', participantId);

      console.log(`Participant ${participantId} disconnected from session ${sessionId}`);
    }

    console.log(`Socket disconnected: ${socket.id}`);
  }

  private calculateStatistics(session: any, currentVote: any): any {
    const votes = Array.from(currentVote.getAllVotesWithParticipants().entries()).map((entry: any) => {
      const [participantId, vote] = entry;
      const participant = session.findParticipant(participantId);
      return {
        participantId,
        participantName: participant?.getName() || 'Unknown',
        voteValue: vote.getValue().getValue()
      };
    });

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

  private serializeSession(session: any): any {
    return {
      id: session.getId().getValue(),
      name: session.getName(),
      scale: {
        type: session.getScale().getType(),
        name: session.getScale().getName(),
        values: session.getScale().getValues()
      },
      creatorId: session.getCreatorId(),
      isActive: session.isActive(),
      participants: session.getParticipants().map((p: any) => ({
        id: p.getId(),
        name: p.getName(),
        role: p.getRole(),
        isConnected: p.isConnected()
      })),
      currentVote: session.getCurrentVote() ? {
        question: session.getCurrentVote().getQuestion(),
        status: session.getCurrentVote().getStatus(),
        startedAt: session.getCurrentVote().getStartedAt(),
        voteCount: session.getCurrentVote().getVoteCount(),
        // Include votes if revealed
        votes: session.getCurrentVote().getStatus() === 'revealed'
          ? Array.from(session.getCurrentVote().getAllVotesWithParticipants().entries()).map((entry: any) => {
              const [participantId, vote] = entry;
              const participant = session.findParticipant(participantId);
              return {
                participantId,
                participantName: participant?.getName() || 'Unknown',
                value: vote.getValue().getValue(),
                submittedAt: new Date().toISOString()
              };
            })
          : undefined,
        // Include statistics if revealed
        statistics: session.getCurrentVote().getStatus() === 'revealed'
          ? this.calculateStatistics(session, session.getCurrentVote())
          : undefined
      } : null,
      isVotingActive: session.isVotingActive()
    };
  }

  // Public methods for external use
  public getConnectedParticipants(sessionId: string): number {
    return this.sessionParticipants.get(sessionId)?.size || 0;
  }

  public async notifySessionUpdate(sessionId: string): Promise<void> {
    try {
      console.log(`[WebSocket] Notifying session update for session: ${sessionId}`);
      const session = await this.sessionRepository.findById(new SessionId(sessionId));
      if (session) {
        const serializedSession = this.serializeSession(session);
        console.log(`[WebSocket] Emitting session:updated event to room: ${sessionId}`);
        this.io.to(sessionId).emit('session:updated', { session: serializedSession });
        console.log(`[WebSocket] Event emitted successfully`);
      } else {
        console.warn(`[WebSocket] Session ${sessionId} not found, cannot notify`);
      }
    } catch (error) {
      console.error('Error notifying session update:', error);
    }
  }

  public close(): void {
    this.io.close();
  }
}
