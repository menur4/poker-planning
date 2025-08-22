import { io, Socket } from 'socket.io-client';
import type { SocketEvents } from '../types';

export class WebSocketService {
  private socket: Socket | null = null;
  private readonly url: string;

  constructor() {
    this.url = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(this.url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('🔌 WebSocket error:', error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Session events
  joinSession(sessionId: string, participantId: string): void {
    this.socket?.emit('session:join', { sessionId, participantId });
  }

  leaveSession(sessionId: string, participantId: string): void {
    this.socket?.emit('session:leave', { sessionId, participantId });
  }

  // Voting events
  startVoting(sessionId: string, question: string, initiatorId: string): void {
    this.socket?.emit('voting:start', { sessionId, question, initiatorId });
  }

  submitVote(sessionId: string, participantId: string, voteValue: string): void {
    this.socket?.emit('vote:submit', { sessionId, participantId, voteValue });
  }

  revealVotes(sessionId: string, initiatorId: string): void {
    this.socket?.emit('votes:reveal', { sessionId, initiatorId });
  }

  // Event listeners
  onSessionUpdated(callback: (data: SocketEvents['session:updated']) => void): void {
    this.socket?.on('session:updated', callback);
  }

  onParticipantJoined(callback: (data: SocketEvents['participant:joined']) => void): void {
    this.socket?.on('participant:joined', callback);
  }

  onParticipantLeft(callback: (data: SocketEvents['participant:left']) => void): void {
    this.socket?.on('participant:left', callback);
  }

  onVotingStarted(callback: (data: SocketEvents['voting:started']) => void): void {
    this.socket?.on('voting:started', callback);
  }

  onVoteSubmitted(callback: (data: SocketEvents['vote:submitted']) => void): void {
    this.socket?.on('vote:submitted', callback);
  }

  onVotesRevealed(callback: (data: SocketEvents['votes:revealed']) => void): void {
    this.socket?.on('votes:revealed', callback);
  }

  onError(callback: (data: SocketEvents['error']) => void): void {
    this.socket?.on('error', callback);
  }

  // Remove listeners
  off(event: keyof SocketEvents, callback?: Function): void {
    if (callback) {
      this.socket?.off(event as string, callback as any);
    } else {
      this.socket?.off(event as string);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
