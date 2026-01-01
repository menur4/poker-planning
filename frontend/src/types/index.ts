// Types partagés avec le backend
export interface Session {
  id: string;
  name: string;
  scale: {
    type: string;
    name: string;
    values: string[];
  };
  creatorId: string;
  isActive: boolean;
  participants: Participant[];
  currentVote: VotingRound | null;
  isVotingActive: boolean;
}

export interface Participant {
  id: string;
  name: string;
  role: 'participant' | 'spectator';
  isConnected: boolean;
}

export interface VotingRound {
  question: string;
  status: 'voting' | 'revealed' | 'finished';  // Fixed: backend uses 'voting', not 'active'
  startedAt: string;
  voteCount: number;
  votes?: Vote[];
  statistics?: VoteStatistics;
}

export interface Vote {
  participantId: string;
  participantName: string;
  value: string;
  submittedAt: string;
}

export interface VoteStatistics {
  totalVotes: number;
  average: number;
  median: number;
  mode: string[];
  distribution: Record<string, number>;
  minVote: string;
  maxVote: string;
  consensus: boolean;
}

// API Request/Response types
export interface CreateSessionRequest {
  sessionName: string;
  creatorName: string;
  scale: string;
}

export interface CreateSessionResponse {
  sessionId: {
    value: string;
  };
}

export interface JoinSessionRequest {
  participantName: string;
  role: 'participant' | 'spectator';
}

export interface JoinSessionResponse {
  participantId: string;
  sessionName: string;
  scale: {
    name: string;
    values: string[];
  };
  currentVote: VotingRound | null;
}

export interface StartVotingRequest {
  question: string;
  initiatorId: string;
}

export interface SubmitVoteRequest {
  participantId: string;
  voteValue: string;
}

export interface RevealVotesRequest {
  initiatorId: string;
}

export interface FinishVotingRequest {
  initiatorId: string;
}

// WebSocket Events
export interface SocketEvents {
  // Client to Server
  'session:join': { sessionId: string; participantName: string; role: 'participant' | 'spectator' };
  'session:leave': { sessionId: string; participantId: string };
  'voting:start': StartVotingRequest & { sessionId: string };
  'vote:submit': SubmitVoteRequest & { sessionId: string };
  'votes:reveal': RevealVotesRequest & { sessionId: string };

  // Server to Client
  'session:updated': { session: Session };
  'participant:joined': { participant: Participant };
  'participant:left': { participantId: string };
  'voting:started': { votingRound: VotingRound };
  'vote:submitted': { participantId: string; hasVoted: boolean };
  'votes:revealed': { results: VotingRound };
  'error': { message: string };
}
