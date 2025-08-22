import { useState, useEffect, useCallback } from 'react';
import type { Session, Participant, VotingRound } from '../types';
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
  currentParticipant: Participant | null;
}

export function useSession(sessionId?: string): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);

  // Debug logging
  console.log('useSession hook state:', { sessionId, session, currentParticipant, loading, error });

  // Load session data
  const loadSession = useCallback(async (id: string) => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading session:', id);
      const sessionData = await ApiService.getSession(id);
      console.log('Session loaded:', sessionData);
      setSession(sessionData);
      
      // Try to restore current participant after session is loaded
      const storedParticipantId = localStorage.getItem(`participant_${id}`);
      if (storedParticipantId && sessionData.participants) {
        const participant = sessionData.participants.find(p => p.id === storedParticipantId);
        if (participant) {
          console.log('Restored participant from localStorage:', participant);
          setCurrentParticipant(participant);
        }
      }
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
    setLoading(true);
    setError(null);

    try {
      const result = await ApiService.joinSession(sessionId, { participantName, role });
      
      // Connect to WebSocket
      const socket = websocketService.connect();
      websocketService.joinSession(sessionId, participantName, role);

      // Set current participant
      setCurrentParticipant({
        id: result.participantId,
        name: participantName,
        role,
        isConnected: true
      });

      // Store participant ID in localStorage for persistence
      localStorage.setItem(`participant_${sessionId}`, result.participantId);

      // Load updated session
      console.log('Loading session after join:', sessionId);
      await loadSession(sessionId);

      return result.participantId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadSession]);

  // Start voting
  const startVoting = useCallback(async (question: string) => {
    if (!session || !currentParticipant) return;

    try {
      await ApiService.startVoting(session.id, {
        question,
        initiatorId: currentParticipant.id
      });
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal votes');
      throw err;
    }
  }, [session, currentParticipant]);

  // WebSocket event handlers
  useEffect(() => {
    if (!sessionId) return;

    const socket = websocketService.connect();

    // Session updates
    websocketService.onSessionUpdated(({ session: updatedSession }) => {
      setSession(updatedSession);
      
      // Update current participant if we have a participantId stored
      const storedParticipantId = localStorage.getItem(`participant_${sessionId}`);
      if (storedParticipantId && updatedSession?.participants) {
        const participant = updatedSession.participants.find(p => p.id === storedParticipantId);
        if (participant) {
          setCurrentParticipant(participant);
        }
      }
    });

    // Participant events
    websocketService.onParticipantJoined(({ participant }) => {
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: [...prev.participants, participant]
        };
      });
    });

    websocketService.onParticipantLeft(({ participantId }) => {
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.filter(p => p.id !== participantId)
        };
      });
    });

    // Voting events
    websocketService.onVotingStarted(({ votingRound }) => {
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          currentVote: votingRound,
          isVotingActive: true
        };
      });
    });

    websocketService.onVoteSubmitted(({ participantId, hasVoted }) => {
      setSession(prev => {
        if (!prev || !prev.currentVote) return prev;
        return {
          ...prev,
          currentVote: {
            ...prev.currentVote,
            voteCount: hasVoted ? prev.currentVote.voteCount + 1 : prev.currentVote.voteCount - 1
          }
        };
      });
    });

    websocketService.onVotesRevealed(({ results }) => {
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          currentVote: results,
          isVotingActive: false
        };
      });
    });

    websocketService.onError(({ message }) => {
      setError(message);
    });

    // Load initial session data
    console.log('Loading initial session data for:', sessionId);
    loadSession(sessionId);

    // Cleanup
    return () => {
      websocketService.off('session:updated');
      websocketService.off('participant:joined');
      websocketService.off('participant:left');
      websocketService.off('voting:started');
      websocketService.off('vote:submitted');
      websocketService.off('votes:revealed');
      websocketService.off('error');
    };
  }, [sessionId, loadSession]);

  return {
    session,
    loading,
    error,
    joinSession,
    startVoting,
    submitVote,
    revealVotes,
    currentParticipant
  };
}
