import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session, Participant } from '../types';
import { ApiService } from '../services/api';
import { websocketService } from '../services/websocket';

export interface UseSessionReturn {
  session: Session | null;
  loading: boolean;
  error: string | null;
  joinSession: (sessionId: string, participantName: string, role: 'participant' | 'spectator') => Promise<string>;
  startVoting: (question: string) => Promise<void>;
  submitVote: (voteValue: string) => Promise<void>;
  revealVotes: () => Promise<void>;
  finishVoting: () => Promise<void>;
  currentParticipant: Participant | null;
}

export function useSession(sessionId?: string): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const wsSetupDone = useRef(false);
  const initialLoadDone = useRef(false);

  // Load session data
  const loadSession = useCallback(async (id: string) => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading session:', id);
      const sessionData = await ApiService.getSession(id);
      console.log('Session loaded:', sessionData);
      console.log('Current vote:', sessionData.currentVote);
      console.log('Vote status:', sessionData.currentVote?.status);
      console.log('Vote votes:', sessionData.currentVote?.votes);
      // Deep clone to ensure React detects changes
      setSession(JSON.parse(JSON.stringify(sessionData)));

      // Try to restore current participant after session is loaded
      // But ONLY if currentParticipant is not already set (to avoid duplicates)
      setCurrentParticipant(prev => {
        if (prev) {
          console.log('Participant already set, skipping localStorage restoration');
          return prev; // Don't restore if already set
        }

        const storedParticipantId = localStorage.getItem(`participant_${id}`);
        if (storedParticipantId && sessionData.participants) {
          const participant = sessionData.participants.find(p => p.id === storedParticipantId);
          if (participant) {
            console.log('Restored participant from localStorage:', participant);
            return participant;
          }
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to load session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, []);

  // Join session
  const joinSession = useCallback(async (
    sessionId: string,
    participantName: string,
    role: 'participant' | 'spectator'
  ): Promise<string> => {
    console.log('[JOIN SESSION CALLED]', { sessionId, participantName, role });
    setLoading(true);
    setError(null);

    try {
      // Clear any previous participant ID for this session to avoid restoration issues
      localStorage.removeItem(`participant_${sessionId}`);

      const result = await ApiService.joinSession(sessionId, { participantName, role });

      // Reset WebSocket setup flag to allow reconfiguration
      wsSetupDone.current = false;

      // Set current participant - this will trigger the useEffect to set up WebSocket
      setCurrentParticipant({
        id: result.participantId,
        name: participantName,
        role,
        isConnected: true
      });

      // Store participant ID in localStorage for persistence
      localStorage.setItem(`participant_${sessionId}`, result.participantId);

      // Load updated session but mark that we just joined to prevent restoration
      console.log('Loading session after join:', sessionId);
      initialLoadDone.current = true; // Mark as loaded to prevent duplicate load
      const sessionData = await ApiService.getSession(sessionId);
      // Deep clone to ensure React detects changes
      setSession(JSON.parse(JSON.stringify(sessionData)));

      return result.participantId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Start voting
  const startVoting = useCallback(async (question: string) => {
    if (!session || !currentParticipant) return;

    try {
      await ApiService.startVoting(session.id, {
        question,
        initiatorId: currentParticipant.id
      });
      // Don't reload - WebSocket will send session:updated event
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start voting');
      throw err;
    }
  }, [session, currentParticipant]);

  // Submit vote
  const submitVote = useCallback(async (voteValue: string) => {
    if (!session || !currentParticipant) return;

    try {
      await ApiService.submitVote(session.id, {
        participantId: currentParticipant.id,
        voteValue
      });
      // Don't reload - WebSocket will send session:updated event
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote');
      throw err;
    }
  }, [session, currentParticipant]);

  // Reveal votes
  const revealVotes = useCallback(async () => {
    if (!session || !currentParticipant) return;

    try {
      await ApiService.revealVotes(session.id, {
        initiatorId: currentParticipant.id
      });
      // Don't reload - WebSocket will send session:updated event
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal votes');
      throw err;
    }
  }, [session, currentParticipant]);

  // Finish voting
  const finishVoting = useCallback(async () => {
    if (!session || !currentParticipant) return;

    try {
      await ApiService.finishVoting(session.id, {
        initiatorId: currentParticipant.id
      });
      // Don't reload - WebSocket will send session:updated event
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finish voting');
      throw err;
    }
  }, [session, currentParticipant]);

  // Reset initialLoadDone when sessionId changes
  useEffect(() => {
    initialLoadDone.current = false;
  }, [sessionId]);

  // Load session on mount or when sessionId changes (only once per sessionId)
  useEffect(() => {
    if (sessionId && !initialLoadDone.current) {
      initialLoadDone.current = true;
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  // WebSocket event handlers
  useEffect(() => {
    console.log('[WebSocket useEffect] Called with:', { sessionId, participantId: currentParticipant?.id });

    if (!sessionId || !currentParticipant?.id) {
      console.log('[WebSocket useEffect] Skipping - missing sessionId or currentParticipant.id');
      return;
    }

    // Prevent multiple WebSocket setups
    if (wsSetupDone.current) {
      console.log('[WebSocket useEffect] Already set up, skipping...');
      return;
    }

    console.log('[WebSocket useEffect] Setting up WebSocket for session:', sessionId, 'participant:', currentParticipant);
    wsSetupDone.current = true;

    // IMPORTANT: Register all event listeners FIRST, before even connecting
    // This ensures listeners are ready to receive events immediately after join

    // Session updates - This is the ONLY event the backend emits
    // It contains the full session state including participants, votes, etc.
    const handleSessionUpdated = (data: any) => {
      console.log('[handleSessionUpdated] Received:', data);
      const updatedSession = data.session;
      console.log('Updated session data:', updatedSession);
      // Only update if session data is valid
      if (updatedSession) {
        console.log('Updating session state with:', updatedSession);
        // 🔥 CRITICAL FIX: Deep clone to force React re-render
        // JSON parse/stringify ensures ALL nested objects get new references
        // This is necessary because React compares objects by reference, not content
        setSession(JSON.parse(JSON.stringify(updatedSession)));
      } else {
        console.warn('WebSocket sent undefined session, ignoring');
      }
    };

    const handleError = ({ message }: { message: string }) => {
      console.error('WebSocket error:', message);
      setError(message);
    };

    websocketService.onSessionUpdated(handleSessionUpdated);
    websocketService.onError(handleError);

    // NOW connect and join the session - all listeners are registered and ready
    websocketService.connect();
    websocketService.joinSession(sessionId, currentParticipant.name, currentParticipant.role, currentParticipant.id);

    // Cleanup
    return () => {
      console.log('Cleaning up WebSocket...');
      // Only reset the flag, but DON'T disconnect or remove listeners
      // The singleton WebSocket stays connected and listeners stay registered
      // This is intentional to support React Strict Mode and avoid reconnections
      wsSetupDone.current = false;
    };
  }, [sessionId, currentParticipant?.id]);

  return {
    session,
    loading,
    error,
    joinSession,
    startVoting,
    submitVote,
    revealVotes,
    finishVoting,
    currentParticipant
  };
}
