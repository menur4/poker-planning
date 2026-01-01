import { io, Socket } from 'socket.io-client';
import type { SocketEvents } from '../types';

export class WebSocketService {
  private socket: Socket | null = null;
  private readonly url: string;
  private sessionUpdateHandler: ((data: any) => void) | null = null;
  private errorHandler: ((data: any) => void) | null = null;

  constructor() {
    this.url = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  connect(): Socket {
    // If socket exists and is connected, return it
    if (this.socket?.connected) {
      console.log('[WebSocket] Reusing existing connected socket');
      return this.socket;
    }

    // If socket exists but is disconnected, clean it up first
    if (this.socket) {
      console.log('[WebSocket] Disconnecting old socket before creating new one');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    console.log('[WebSocket] Creating new socket connection');
    this.socket = io(this.url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
    });

    // Re-register event handlers if they were previously set
    if (this.sessionUpdateHandler) {
      console.log('[WebSocket] Re-registering session:updated handler on new socket');
      this.socket.on('session:updated', this.sessionUpdateHandler);
    }
    if (this.errorHandler) {
      console.log('[WebSocket] Re-registering error handler on new socket');
      this.socket.on('error', this.errorHandler);
    }

    this.socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
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
  joinSession(sessionId: string, participantName: string, role: 'participant' | 'spectator', participantId?: string): void {
    console.log('[WebSocket] Joining session:', sessionId, 'as', participantName);

    // If socket is already connected, join immediately
    if (this.socket?.connected) {
      console.log('[WebSocket] Socket already connected, joining room immediately');
      this.socket.emit('session:join', { sessionId, participantName, role, participantId });
    } else {
      // Wait for connection before joining
      console.log('[WebSocket] Socket not connected yet, waiting for connection...');
      this.socket?.once('connect', () => {
        console.log('[WebSocket] Socket connected, now joining room');
        this.socket?.emit('session:join', { sessionId, participantName, role, participantId });
      });
    }
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

  // Event listeners - Simplified: store only one handler per event type
  onSessionUpdated(callback: (data: SocketEvents['session:updated']) => void): void {
    console.log('[WebSocket] Storing session:updated handler');
    this.sessionUpdateHandler = callback;

    // If socket already exists, register the listener immediately
    if (this.socket) {
      console.log('[WebSocket] Socket exists, registering session:updated listener immediately');
      this.socket.off('session:updated'); // Remove previous listener
      this.socket.on('session:updated', callback);
    } else {
      console.log('[WebSocket] Socket does not exist yet, handler will be registered on connect()');
    }
  }

  onError(callback: (data: SocketEvents['error']) => void): void {
    console.log('[WebSocket] Storing error handler');
    this.errorHandler = callback;

    // If socket already exists, register the listener immediately
    if (this.socket) {
      console.log('[WebSocket] Socket exists, registering error listener immediately');
      this.socket.off('error'); // Remove previous listener
      this.socket.on('error', callback);
    } else {
      console.log('[WebSocket] Socket does not exist yet, handler will be registered on connect()');
    }
  }

  // These are not used anymore but kept for compatibility
  onParticipantJoined(_callback: (data: SocketEvents['participant:joined']) => void): void {}
  onParticipantLeft(_callback: (data: SocketEvents['participant:left']) => void): void {}
  onVotingStarted(_callback: (data: SocketEvents['voting:started']) => void): void {}
  onVoteSubmitted(_callback: (data: SocketEvents['vote:submitted']) => void): void {}
  onVotesRevealed(_callback: (data: SocketEvents['votes:revealed']) => void): void {}

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
