import React, { useState } from 'react';
import type { Session, Participant, VotingRound } from '../types';

interface VotingInterfaceProps {
  session: Session;
  currentParticipant: Participant;
  onStartVoting: (question: string) => Promise<void>;
  onSubmitVote: (value: string) => Promise<void>;
  onRevealVotes: () => Promise<void>;
}

export function VotingInterface({
  session,
  currentParticipant,
  onStartVoting,
  onSubmitVote,
  onRevealVotes
}: VotingInterfaceProps) {
  const [newQuestion, setNewQuestion] = useState('');
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isCreator = currentParticipant.id === session.creatorId;
  const canVote = currentParticipant.role === 'participant';
  const hasActiveVoting = session.isVotingActive && session.currentVote;
  const votingRevealed = session.currentVote?.status === 'revealed';

  // Debug logging
  console.log('VotingInterface state:', {
    isCreator,
    canVote,
    hasActiveVoting,
    votingRevealed,
    sessionIsVotingActive: session.isVotingActive,
    currentVote: session.currentVote,
    currentParticipant,
    session,
    creatorId: session.creatorId,
    participantId: currentParticipant.id,
    comparison: currentParticipant.id === session.creatorId
  });

  const handleStartVoting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    setLoading(true);
    try {
      await onStartVoting(newQuestion.trim());
      setNewQuestion('');
    } finally {
      setLoading(false);
    }
  };

  const handleVoteSubmit = async (value: string) => {
    setLoading(true);
    try {
      await onSubmitVote(value);
      setSelectedVote(value);
    } finally {
      setLoading(false);
    }
  };

  const handleRevealVotes = async () => {
    setLoading(true);
    try {
      await onRevealVotes();
    } finally {
      setLoading(false);
    }
  };

  const getVoteStatistics = () => {
    if (!session.currentVote?.statistics) return null;
    
    const stats = session.currentVote.statistics;
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Statistiques</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Moyenne:</span>
            <span className="font-medium ml-1">{stats.average.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-blue-700">Médiane:</span>
            <span className="font-medium ml-1">{stats.median}</span>
          </div>
        </div>
        <div className="mt-2">
          <span className="text-blue-700">Mode:</span>
          <span className="font-medium ml-1">{stats.mode.join(', ')}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Session Info */}
      <div className="card">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{session.name}</h2>
            <p className="text-gray-600">
              Échelle: {session.scale.name} • {session.participants.length} participant(s)
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {currentParticipant.role === 'participant' ? 'Participant' : 'Spectateur'}
            </span>
          </div>
        </div>

        {/* Participants List */}
        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-900 mb-2">Participants</h3>
          <div className="flex flex-wrap gap-2">
            {session.participants.map(participant => (
              <div
                key={participant.id}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                  participant.isConnected
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  participant.isConnected ? 'bg-green-400' : 'bg-gray-400'
                }`} />
                {participant.name}
                {participant.role === 'spectator' && (
                  <span className="ml-1 text-xs opacity-75">(spectateur)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Start Voting (Creator only) */}
      {isCreator && !hasActiveVoting && (
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="font-medium text-gray-900 mb-3">⚡ Démarrer un vote</h3>
          <p className="text-sm text-gray-600 mb-4">
            En tant que créateur, vous devez démarrer un vote pour que les participants puissent voter.
          </p>
          <form onSubmit={handleStartVoting} className="space-y-3">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="ex: Quelle est la complexité de cette fonctionnalité ?"
              className="input-field"
              disabled={loading}
              required
            />
            <button
              type="submit"
              disabled={loading || !newQuestion.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Démarrage...' : '🚀 Démarrer le vote'}
            </button>
          </form>
        </div>
      )}

      {/* Active Voting */}
      {hasActiveVoting && (
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-medium text-gray-900">Vote en cours</h3>
              <p className="text-gray-600 mt-1">{session.currentVote?.question}</p>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500">
                {session.currentVote?.voteCount || 0} vote(s)
              </span>
            </div>
          </div>

          {/* Voting Cards */}
          {canVote && !votingRevealed && (
            <div className="mb-4 bg-green-50 border-green-200 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-3">🗳️ Votre vote:</h4>
              <div className="grid grid-cols-5 gap-2">
                {session.scale.values.map(value => (
                  <button
                    key={value}
                    onClick={() => handleVoteSubmit(value)}
                    disabled={loading}
                    className={`aspect-square rounded-lg border-2 font-medium text-lg transition-all ${
                      selectedVote === value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              {selectedVote && (
                <p className="text-sm text-green-700 mt-2">
                  ✅ Vous avez voté: <strong>{selectedVote}</strong>
                </p>
              )}
            </div>
          )}

          {/* Reveal Button (Creator only) */}
          {isCreator && !votingRevealed && session.currentVote && session.currentVote.voteCount > 0 && (
            <button
              onClick={handleRevealVotes}
              disabled={loading}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Révélation...' : 'Révéler les votes'}
            </button>
          )}

          {/* Results */}
          {votingRevealed && session.currentVote?.votes && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Résultats:</h4>
              
              {/* Vote Distribution */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {session.currentVote.votes.map(vote => (
                  <div
                    key={vote.participantId}
                    className="bg-gray-50 rounded-lg p-3 text-center"
                  >
                    <div className="font-bold text-lg text-primary-600">
                      {vote.value}
                    </div>
                    <div className="text-sm text-gray-600">
                      {vote.participantName}
                    </div>
                  </div>
                ))}
              </div>

              {/* Statistics */}
              {getVoteStatistics()}
            </div>
          )}
        </div>
      )}

      {/* No Active Voting */}
      {!hasActiveVoting && !isCreator && (
        <div className="card text-center py-8">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>En attente du prochain vote...</p>
          </div>
        </div>
      )}
    </div>
  );
}
