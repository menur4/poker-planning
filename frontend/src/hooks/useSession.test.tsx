import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from './useSession';
import { websocketService } from '../services/websocket';
import * as ApiService from '../services/api';

// Mock dependencies
vi.mock('../services/api');
vi.mock('../services/websocket', () => ({
  websocketService: {
    connect: vi.fn(),
    joinSession: vi.fn(),
    onSessionUpdated: vi.fn(),
    onError: vi.fn(),
  },
}));

describe('useSession - TDD for bidirectional sync', () => {
  let sessionUpdateCallback: ((data: any) => void) | null = null;

  beforeEach(() => {
    sessionUpdateCallback = null;

    // Capture the callback registered with onSessionUpdated
    (websocketService.onSessionUpdated as any).mockImplementation((callback: (data: any) => void) => {
      sessionUpdateCallback = callback;
    });

    // Mock API responses
    (ApiService.ApiService.getSession as any).mockResolvedValue({
      id: 'session-123',
      name: 'Test Session',
      participants: [],
      currentVote: null,
    });

    (ApiService.ApiService.joinSession as any).mockResolvedValue({
      participantId: 'participant-456',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('TEST CRITIQUE: Session updates from other participants', () => {
    it('should update UI when participant 2 joins (seen by participant 1)', async () => {
      // Participant 1 joins first
      const { result } = renderHook(() => useSession('session-123'));

      await act(async () => {
        await result.current.joinSession('session-123', 'Participant 1', 'participant');
      });

      // Initial state: 0 participants (mocked empty)
      expect(result.current.session?.participants).toEqual([]);

      // Simulate Participant 2 joining - backend emits session:updated
      const updatedSessionFromBackend = {
        id: 'session-123',
        name: 'Test Session',
        participants: [
          { id: 'participant-456', name: 'Participant 1', role: 'participant', isConnected: true },
          { id: 'participant-789', name: 'Participant 2', role: 'participant', isConnected: true },
        ],
        currentVote: null,
      };

      await act(async () => {
        sessionUpdateCallback?.({ session: updatedSessionFromBackend });
      });

      // CRITICAL ASSERTION: Participant 1 should see Participant 2
      await waitFor(() => {
        expect(result.current.session?.participants).toHaveLength(2);
        expect(result.current.session?.participants[1].name).toBe('Participant 2');
      });
    });

    it('should update UI when participant 1 starts voting (seen by participant 2)', async () => {
      // Participant 2 is in the session
      const { result } = renderHook(() => useSession('session-123'));

      await act(async () => {
        await result.current.joinSession('session-123', 'Participant 2', 'participant');
      });

      // Initial state: no voting
      expect(result.current.session?.currentVote).toBeNull();

      // Simulate Participant 1 starting a vote - backend emits session:updated
      const updatedSessionFromBackend = {
        id: 'session-123',
        name: 'Test Session',
        participants: [
          { id: 'participant-456', name: 'Participant 1', role: 'participant', isConnected: true },
          { id: 'participant-789', name: 'Participant 2', role: 'participant', isConnected: true },
        ],
        currentVote: {
          question: 'Story points for US-123?',
          status: 'voting',  // Fixed: backend uses 'voting', not 'active'
          votes: [],
          startedAt: new Date().toISOString(),
        },
      };

      await act(async () => {
        sessionUpdateCallback?.({ session: updatedSessionFromBackend });
      });

      // CRITICAL ASSERTION: Participant 2 should see the voting interface
      await waitFor(() => {
        expect(result.current.session?.currentVote).not.toBeNull();
        expect(result.current.session?.currentVote?.question).toBe('Story points for US-123?');
        expect(result.current.session?.currentVote?.status).toBe('voting');
      });
    });

    it('should update UI when participant 1 votes (seen by participant 2)', async () => {
      // Participant 2 is in an active voting session
      (ApiService.ApiService.getSession as any).mockResolvedValue({
        id: 'session-123',
        name: 'Test Session',
        participants: [
          { id: 'participant-456', name: 'Participant 1', role: 'participant', isConnected: true },
          { id: 'participant-789', name: 'Participant 2', role: 'participant', isConnected: true },
        ],
        currentVote: {
          question: 'Story points?',
          status: 'voting',  // Fixed: backend uses 'voting'
          votes: [],
        },
      });

      const { result } = renderHook(() => useSession('session-123'));

      await act(async () => {
        await result.current.joinSession('session-123', 'Participant 2', 'participant');
      });

      // Initial: no votes
      expect(result.current.session?.currentVote?.votes).toHaveLength(0);

      // Simulate Participant 1 submitting a vote
      const updatedSessionFromBackend = {
        id: 'session-123',
        name: 'Test Session',
        participants: [
          { id: 'participant-456', name: 'Participant 1', role: 'participant', isConnected: true },
          { id: 'participant-789', name: 'Participant 2', role: 'participant', isConnected: true },
        ],
        currentVote: {
          question: 'Story points?',
          status: 'voting',  // Fixed: backend uses 'voting'
          votes: [
            { participantId: 'participant-456', participantName: 'Participant 1', value: '5', submittedAt: new Date().toISOString() },
          ],
        },
      };

      await act(async () => {
        sessionUpdateCallback?.({ session: updatedSessionFromBackend });
      });

      // CRITICAL ASSERTION: Participant 2 should see that Participant 1 voted
      await waitFor(() => {
        expect(result.current.session?.currentVote?.votes).toHaveLength(1);
        expect(result.current.session?.currentVote?.votes?.[0]?.participantId).toBe('participant-456');
      });
    });

    it('should update UI when votes are revealed (seen by all participants)', async () => {
      // Participant is in a session with all votes submitted
      (ApiService.ApiService.getSession as any).mockResolvedValue({
        id: 'session-123',
        name: 'Test Session',
        participants: [
          { id: 'participant-456', name: 'Participant 1', role: 'participant', isConnected: true },
          { id: 'participant-789', name: 'Participant 2', role: 'participant', isConnected: true },
        ],
        currentVote: {
          question: 'Story points?',
          status: 'voting',  // Fixed: backend uses 'voting'
          votes: [],  // No votes yet
        },
      });

      const { result } = renderHook(() => useSession('session-123'));

      await act(async () => {
        await result.current.joinSession('session-123', 'Participant 2', 'participant');
      });

      // Initial: votes hidden
      expect(result.current.session?.currentVote?.status).toBe('voting');

      // Simulate votes being revealed
      const updatedSessionFromBackend = {
        id: 'session-123',
        name: 'Test Session',
        participants: [
          { id: 'participant-456', name: 'Participant 1', role: 'participant', isConnected: true },
          { id: 'participant-789', name: 'Participant 2', role: 'participant', isConnected: true },
        ],
        currentVote: {
          question: 'Story points?',
          status: 'revealed',
          votes: [
            { participantId: 'participant-456', participantName: 'Participant 1', value: '5', submittedAt: new Date().toISOString() },
            { participantId: 'participant-789', participantName: 'Participant 2', value: '8', submittedAt: new Date().toISOString() },
          ],
        },
      };

      await act(async () => {
        sessionUpdateCallback?.({ session: updatedSessionFromBackend });
      });

      // CRITICAL ASSERTION: All participants should see revealed votes
      await waitFor(() => {
        expect(result.current.session?.currentVote?.status).toBe('revealed');
        expect(result.current.session?.currentVote?.votes?.[0]?.value).toBe('5');
        expect(result.current.session?.currentVote?.votes?.[1]?.value).toBe('8');
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid session updates without losing data', async () => {
      const { result } = renderHook(() => useSession('session-123'));

      await act(async () => {
        await result.current.joinSession('session-123', 'Test User', 'participant');
      });

      // Simulate 3 rapid updates
      const updates = [
        { session: { id: 'session-123', participants: [{ id: '1', name: 'P1' }], currentVote: null } },
        { session: { id: 'session-123', participants: [{ id: '1', name: 'P1' }, { id: '2', name: 'P2' }], currentVote: null } },
        { session: { id: 'session-123', participants: [{ id: '1', name: 'P1' }, { id: '2', name: 'P2' }], currentVote: { status: 'voting', question: 'Test?', votes: [] } } },
      ];

      for (const update of updates) {
        await act(async () => {
          sessionUpdateCallback?.(update);
        });
      }

      // Should have the latest state
      await waitFor(() => {
        expect(result.current.session?.participants).toHaveLength(2);
        expect(result.current.session?.currentVote?.status).toBe('voting');
      });
    });

    it('should ignore undefined session updates', async () => {
      const { result } = renderHook(() => useSession('session-123'));

      await act(async () => {
        await result.current.joinSession('session-123', 'Test User', 'participant');
      });

      const initialSession = result.current.session;

      // Simulate malformed update
      await act(async () => {
        sessionUpdateCallback?.({ session: undefined });
      });

      // Session should remain unchanged
      expect(result.current.session).toEqual(initialSession);
    });

    it('should create new object reference on session update (React re-render fix)', async () => {
      const { result } = renderHook(() => useSession('session-123'));

      await act(async () => {
        await result.current.joinSession('session-123', 'Test User', 'participant');
      });

      const initialSession = result.current.session;

      // Simulate session update with same data structure
      const updatedSessionData = {
        id: 'session-123',
        name: 'Test Session',
        participants: [],
        currentVote: { status: 'voting', question: 'New question?', votes: [] },
      };

      await act(async () => {
        sessionUpdateCallback?.({ session: updatedSessionData });
      });

      // CRITICAL ASSERTION: Session object reference should be different
      // This ensures React detects the change and triggers re-render
      await waitFor(() => {
        expect(result.current.session).not.toBe(initialSession);
        expect(result.current.session?.currentVote?.question).toBe('New question?');
      });
    });
  });
});
