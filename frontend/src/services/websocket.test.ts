import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketService } from './websocket';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client');

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockSocket: any;

  beforeEach(() => {
    // Create a fresh instance for each test
    service = new WebSocketService();

    // Create mock socket
    mockSocket = {
      connected: false,
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
    };

    // Mock io() to return our mock socket
    (io as any).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connect()', () => {
    it('should create a new socket connection', () => {
      const socket = service.connect();

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          transports: ['websocket', 'polling'],
          autoConnect: true,
        })
      );
      expect(socket).toBe(mockSocket);
    });

    it('should register connect and disconnect listeners', () => {
      service.connect();

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should reuse existing connected socket', () => {
      mockSocket.connected = true;
      const firstSocket = service.connect();

      // Clear mocks after first call
      vi.clearAllMocks();

      const secondSocket = service.connect();

      // Should not create a new socket
      expect(io).not.toHaveBeenCalled();
      expect(secondSocket).toBe(firstSocket);
    });

    it('should clean up disconnected socket before creating new one', () => {
      // First connection
      service.connect();
      mockSocket.connected = false;

      // Second connection (socket exists but disconnected)
      service.connect();

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should re-register stored handlers on new connection', () => {
      const handler = vi.fn();

      // Store handler before connection
      service.onSessionUpdated(handler);

      // Now connect
      service.connect();

      // Handler should be registered
      expect(mockSocket.on).toHaveBeenCalledWith('session:updated', handler);
    });
  });

  describe('onSessionUpdated()', () => {
    it('should store the handler', () => {
      const handler = vi.fn();
      service.onSessionUpdated(handler);

      // Verify by connecting and checking it's registered
      service.connect();
      expect(mockSocket.on).toHaveBeenCalledWith('session:updated', handler);
    });

    it('should register handler immediately if socket exists', () => {
      // Connect first
      service.connect();
      vi.clearAllMocks();

      // Then register handler
      const handler = vi.fn();
      service.onSessionUpdated(handler);

      // Should remove previous listener and add new one
      expect(mockSocket.off).toHaveBeenCalledWith('session:updated');
      expect(mockSocket.on).toHaveBeenCalledWith('session:updated', handler);
    });

    it('should not register immediately if socket does not exist', () => {
      const handler = vi.fn();
      service.onSessionUpdated(handler);

      // Should not call on() since socket doesn't exist yet
      expect(mockSocket.on).not.toHaveBeenCalled();
    });
  });

  describe('onError()', () => {
    it('should store the error handler', () => {
      const handler = vi.fn();
      service.onError(handler);

      // Verify by connecting and checking it's registered
      service.connect();
      expect(mockSocket.on).toHaveBeenCalledWith('error', handler);
    });

    it('should register handler immediately if socket exists', () => {
      service.connect();
      vi.clearAllMocks();

      const handler = vi.fn();
      service.onError(handler);

      expect(mockSocket.off).toHaveBeenCalledWith('error');
      expect(mockSocket.on).toHaveBeenCalledWith('error', handler);
    });
  });

  describe('joinSession()', () => {
    it('should emit session:join when socket is connected', () => {
      mockSocket.connected = true;
      service.connect();

      service.joinSession('session-123', 'Alice', 'participant', 'participant-456');

      expect(mockSocket.emit).toHaveBeenCalledWith('session:join', {
        sessionId: 'session-123',
        participantName: 'Alice',
        role: 'participant',
        participantId: 'participant-456',
      });
    });

    it('should wait for connection before joining if socket not connected', () => {
      mockSocket.connected = false;
      service.connect();

      service.joinSession('session-123', 'Alice', 'participant', 'participant-456');

      // Should register a 'once' listener for connect event
      expect(mockSocket.once).toHaveBeenCalledWith('connect', expect.any(Function));
    });
  });

  describe('Event emission methods', () => {
    beforeEach(() => {
      service.connect();
    });

    it('startVoting should emit voting:start', () => {
      service.startVoting('session-123', 'Story points?', 'participant-456');

      expect(mockSocket.emit).toHaveBeenCalledWith('voting:start', {
        sessionId: 'session-123',
        question: 'Story points?',
        initiatorId: 'participant-456',
      });
    });

    it('submitVote should emit vote:submit', () => {
      service.submitVote('session-123', 'participant-456', '5');

      expect(mockSocket.emit).toHaveBeenCalledWith('vote:submit', {
        sessionId: 'session-123',
        participantId: 'participant-456',
        voteValue: '5',
      });
    });

    it('revealVotes should emit votes:reveal', () => {
      service.revealVotes('session-123', 'participant-456');

      expect(mockSocket.emit).toHaveBeenCalledWith('votes:reveal', {
        sessionId: 'session-123',
        initiatorId: 'participant-456',
      });
    });

    it('leaveSession should emit session:leave', () => {
      service.leaveSession('session-123', 'participant-456');

      expect(mockSocket.emit).toHaveBeenCalledWith('session:leave', {
        sessionId: 'session-123',
        participantId: 'participant-456',
      });
    });
  });

  describe('disconnect()', () => {
    it('should disconnect the socket', () => {
      service.connect();
      service.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('isConnected()', () => {
    it('should return false when no socket exists', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('should return false when socket exists but not connected', () => {
      mockSocket.connected = false;
      service.connect();

      expect(service.isConnected()).toBe(false);
    });

    it('should return true when socket is connected', () => {
      mockSocket.connected = true;
      service.connect();

      expect(service.isConnected()).toBe(true);
    });
  });

  describe('Handler registration order (Critical Bug Fix)', () => {
    it('should work when handlers registered before connect()', () => {
      // This tests the bug fix: handlers registered BEFORE connect()
      const sessionHandler = vi.fn();
      const errorHandler = vi.fn();

      // Register handlers first (socket doesn't exist yet)
      service.onSessionUpdated(sessionHandler);
      service.onError(errorHandler);

      // Then connect
      service.connect();

      // Handlers should be registered on the socket
      expect(mockSocket.on).toHaveBeenCalledWith('session:updated', sessionHandler);
      expect(mockSocket.on).toHaveBeenCalledWith('error', errorHandler);
    });

    it('should work when handlers registered after connect()', () => {
      const sessionHandler = vi.fn();

      // Connect first
      service.connect();
      vi.clearAllMocks();

      // Then register handler
      service.onSessionUpdated(sessionHandler);

      // Handler should be registered immediately
      expect(mockSocket.on).toHaveBeenCalledWith('session:updated', sessionHandler);
    });
  });

  describe('Event reception (Integration)', () => {
    it('should call handler when session:updated event is received', () => {
      const handler = vi.fn();
      let registeredCallback: Function | null = null;

      // Capture the callback registered with socket.on
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'session:updated') {
          registeredCallback = callback;
        }
      });

      service.onSessionUpdated(handler);
      service.connect();

      // Simulate backend emitting session:updated
      const sessionData = { session: { id: 'session-123', participants: [] } };
      registeredCallback?.(sessionData);

      // Handler should be called with the data
      expect(handler).toHaveBeenCalledWith(sessionData);
    });
  });
});
