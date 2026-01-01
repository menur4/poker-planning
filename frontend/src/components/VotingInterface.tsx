import React, { useState } from 'react';
import type { Session, Participant } from '../types';

interface VotingInterfaceProps {
  session: Session;
  currentParticipant: Participant;
  onStartVoting: (question: string) => Promise<void>;
  onSubmitVote: (value: string) => Promise<void>;
  onRevealVotes: () => Promise<void>;
  onFinishVoting: () => Promise<void>;
}

export function VotingInterface({
  session,
  currentParticipant,
  onStartVoting,
  onSubmitVote,
  onRevealVotes,
  onFinishVoting
}: VotingInterfaceProps) {
  const [newQuestion, setNewQuestion] = useState('');
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if user is creator by comparing ID or name (fallback for legacy sessions)
  const isCreator = currentParticipant.id === session.creatorId ||
                    currentParticipant.name === session.creatorId;
  const canVote = currentParticipant.role === 'participant';
  const votingRevealed = session.currentVote?.status === 'revealed';
  // Fixed: backend uses 'voting' status, not 'active'
  const votingActive = session.currentVote?.status === 'voting';
  const hasActiveVoting = (votingActive || votingRevealed) && session.currentVote;

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

  const handleFinishVoting = async () => {
    setLoading(true);
    try {
      await onFinishVoting();
      setSelectedVote(null);
    } finally {
      setLoading(false);
    }
  };

  const getVoteStatistics = () => {
    if (!session.currentVote?.statistics) return null;

    const stats = session.currentVote.statistics;

    // Calculate max count for bar height scaling
    const maxCount = Math.max(...Object.values(stats.distribution));

    // Get the mode (most frequent value) and its percentage
    const modeValue = stats.mode[0];
    const modeCount = stats.distribution[modeValue] || 0;
    const modePercentage = ((modeCount / stats.totalVotes) * 100).toFixed(2);

    return (
      <div className="bg-gray-50 rounded-lg p-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side: Bar chart */}
          <div className="flex items-end justify-center gap-4 h-80">
            {Object.entries(stats.distribution)
              .sort(([a], [b]) => {
                // Sort by numeric value if possible, otherwise alphabetically
                const numA = parseFloat(a);
                const numB = parseFloat(b);
                if (!isNaN(numA) && !isNaN(numB)) {
                  return numA - numB;
                }
                return a.localeCompare(b);
              })
              .map(([value, count]) => {
                const heightPercent = (count / maxCount) * 100;
                return (
                  <div key={value} className="flex flex-col items-center gap-3" style={{ minWidth: '80px', maxWidth: '100px', flex: 1 }}>
                    <div className="relative w-full" style={{ height: '280px' }}>
                      <div className="absolute bottom-0 w-full flex flex-col items-center justify-end">
                        <div
                          className="w-full bg-purple-500 rounded-t-2xl transition-all duration-700 flex items-center justify-center shadow-lg"
                          style={{ height: `${heightPercent}%`, minHeight: '60px' }}
                        >
                          <span className="text-white text-5xl font-bold drop-shadow-md">{value}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Right side: Donut chart */}
          <div className="flex items-center justify-center">
            <div className="relative" style={{ width: '280px', height: '280px' }}>
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="18"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="18"
                  strokeDasharray={`${parseFloat(modePercentage) * 2.199}, 219.9`}
                  strokeLinecap="butt"
                  className="transition-all duration-1000 ease-out"
                  style={{ filter: 'drop-shadow(0 4px 6px rgba(139, 92, 246, 0.3))' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-6xl font-bold text-gray-900 mb-1">{modeValue}</div>
                <div className="text-3xl font-semibold text-purple-600">{modePercentage}%</div>
              </div>
            </div>
          </div>
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

      {/* Warning: Active voting exists - allow finishing it */}
      {isCreator && hasActiveVoting && !votingRevealed && (
        <div className="card bg-yellow-50 border-yellow-200">
          <h3 className="font-medium text-gray-900 mb-3">⚠️ Vote en cours</h3>
          <p className="text-sm text-gray-600 mb-4">
            Un vote est déjà en cours. Vous pouvez le terminer pour démarrer un nouveau vote.
          </p>
          <button
            onClick={handleFinishVoting}
            disabled={loading}
            className="btn-secondary bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Fermeture...' : '🗑️ Terminer ce vote'}
          </button>
        </div>
      )}

      {/* Active Voting */}
      {hasActiveVoting && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: Participants List */}
          <div className="lg:col-span-1">
            <div className="card sticky top-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span className={votingActive ? 'text-purple-600' : 'text-gray-700'}>
                  {votingActive ? '🗳️ Voted' : '📊 Résultats'}
                </span>
              </h3>
              <div className="space-y-2">
                {session.participants.map(participant => {
                  // Check if participant has voted
                  const hasVoted = session.currentVote?.votes?.some(v => v.participantId === participant.id);
                  const participantVote = votingRevealed
                    ? session.currentVote?.votes?.find(v => v.participantId === participant.id)
                    : null;

                  return (
                    <div
                      key={participant.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        participant.role === 'spectator'
                          ? 'bg-gray-50 border border-gray-200'
                          : hasVoted
                          ? 'bg-purple-500 border-2 border-purple-600 shadow-md'
                          : 'bg-white border-2 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          participant.role === 'spectator'
                            ? 'bg-gray-400'
                            : hasVoted
                            ? 'bg-white text-purple-600 ring-2 ring-purple-200'
                            : 'bg-gray-300'
                        }`}>
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={`font-medium truncate text-sm ${
                          participant.role === 'spectator'
                            ? 'text-gray-600'
                            : hasVoted
                            ? 'text-white'
                            : 'text-gray-900'
                        }`}>
                          {participant.name}
                          {participant.role === 'spectator' && (
                            <span className="ml-1 text-xs opacity-60">👁️</span>
                          )}
                        </span>
                      </div>
                      <div className={`flex-shrink-0 ml-2 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl ${
                        participant.role === 'spectator'
                          ? 'bg-transparent'
                          : votingRevealed && participantVote
                          ? 'bg-white text-purple-600 shadow-sm'
                          : hasVoted
                          ? 'bg-white text-purple-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {participant.role === 'spectator'
                          ? ''
                          : votingRevealed && participantVote
                          ? participantVote.value
                          : hasVoted
                          ? '✓'
                          : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main content: Voting */}
          <div className="lg:col-span-3">
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

          {/* Voting Cards - Fan Layout */}
          {canVote && !votingRevealed && (
            <div className="mb-8">
              <h4 className="font-medium text-gray-700 mb-6 text-center">🗳️ Choisissez votre estimation</h4>

              {/* Fan of Cards */}
              <div className="relative h-80 flex items-end justify-center overflow-visible" style={{ perspective: '2000px' }}>
                <div className="relative w-full h-full flex items-end justify-center">
                  {session.scale.values.map((value, index) => {
                    const totalCards = session.scale.values.length;
                    const middleIndex = (totalCards - 1) / 2;
                    const offset = index - middleIndex;

                    // Calculate rotation and position for fan effect - very subtle like the reference
                    const rotation = offset * 3; // reduced rotation for tighter fan
                    const translateY = Math.abs(offset) * 8; // minimal vertical offset
                    const translateX = offset * 90; // adjusted spacing for larger cards
                    const zIndex = selectedVote === value ? 50 : 10 - Math.abs(offset);

                    // Define color schemes for each card (cycling through colors)
                    // Using CSS gradients directly to avoid Tailwind purge issues
                    const colorSchemes = [
                      {
                        gradient: 'linear-gradient(to bottom right, #38bdf8, #0ea5e9)',
                        shadow: 'rgba(56, 189, 248, 0.5)',
                        textColor: '#ffffff'
                      },
                      {
                        gradient: 'linear-gradient(to bottom right, #22d3ee, #06b6d4)',
                        shadow: 'rgba(34, 211, 238, 0.5)',
                        textColor: '#ffffff'
                      },
                      {
                        gradient: 'linear-gradient(to bottom right, #34d399, #10b981)',
                        shadow: 'rgba(52, 211, 153, 0.5)',
                        textColor: '#ffffff'
                      },
                      {
                        gradient: 'linear-gradient(to bottom right, #a3e635, #84cc16)',
                        shadow: 'rgba(163, 230, 53, 0.5)',
                        textColor: '#1f2937'
                      },
                      {
                        gradient: 'linear-gradient(to bottom right, #fbbf24, #f59e0b)',
                        shadow: 'rgba(251, 191, 36, 0.5)',
                        textColor: '#1f2937'
                      },
                      {
                        gradient: 'linear-gradient(to bottom right, #fb923c, #f97316)',
                        shadow: 'rgba(251, 146, 60, 0.5)',
                        textColor: '#ffffff'
                      },
                      {
                        gradient: 'linear-gradient(to bottom right, #fb7185, #f43f5e)',
                        shadow: 'rgba(251, 113, 133, 0.5)',
                        textColor: '#ffffff'
                      },
                      {
                        gradient: 'linear-gradient(to bottom right, #e879f9, #d946ef)',
                        shadow: 'rgba(232, 121, 249, 0.5)',
                        textColor: '#ffffff'
                      },
                      {
                        gradient: 'linear-gradient(to bottom right, #c084fc, #a855f7)',
                        shadow: 'rgba(192, 132, 252, 0.5)',
                        textColor: '#ffffff'
                      },
                      {
                        gradient: 'linear-gradient(to bottom right, #818cf8, #6366f1)',
                        shadow: 'rgba(129, 140, 248, 0.5)',
                        textColor: '#ffffff'
                      },
                    ];

                    const colorScheme = colorSchemes[index % colorSchemes.length];

                    return (
                      <button
                        key={value}
                        onClick={() => handleVoteSubmit(value)}
                        disabled={loading}
                        style={{
                          transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`,
                          zIndex: zIndex,
                          background: colorScheme.gradient,
                          color: colorScheme.textColor,
                          boxShadow: selectedVote === value
                            ? `0 20px 40px ${colorScheme.shadow}`
                            : `0 10px 25px ${colorScheme.shadow}`,
                        }}
                        className={`
                          absolute bottom-12 w-56 h-80 rounded-2xl font-bold text-7xl
                          transition-all duration-300 ease-out cursor-pointer
                          flex items-center justify-center
                          ${selectedVote === value
                            ? 'scale-[1.15] -translate-y-16 ring-4 ring-white'
                            : ''
                          }
                          hover:-translate-y-20 hover:scale-[1.15] hover:rotate-0
                          disabled:opacity-50 disabled:cursor-not-allowed
                          active:scale-105
                        `}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedVote && (
                <div className="text-center mt-8">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800 font-medium">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Vous avez voté: <strong className="ml-1">{selectedVote}</strong>
                  </div>
                </div>
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
            <div className="space-y-6">
              <h4 className="font-semibold text-gray-900 text-lg mb-4">🎯 Résultats du vote</h4>

              {/* Cards with avatars - inspired by the reference image */}
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                {session.currentVote.votes.map((vote, index) => {
                  // Generate a consistent color for each participant based on their name
                  const colors = [
                    'from-purple-400 to-purple-600',
                    'from-blue-400 to-blue-600',
                    'from-green-400 to-green-600',
                    'from-yellow-400 to-yellow-600',
                    'from-pink-400 to-pink-600',
                    'from-indigo-400 to-indigo-600',
                    'from-red-400 to-red-600',
                    'from-teal-400 to-teal-600',
                  ];
                  const colorClass = colors[index % colors.length];

                  return (
                    <div key={vote.participantId} className="flex flex-col items-center">
                      {/* Avatar */}
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold text-xl mb-2 shadow-lg`}>
                        {vote.participantName.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-600 mb-2 max-w-[80px] text-center truncate">
                        {vote.participantName}
                      </div>
                      {/* Card with vote */}
                      <div className="w-20 h-28 bg-white border-2 border-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                        <div className="text-3xl font-bold text-indigo-600">
                          {vote.value}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Statistics */}
              {getVoteStatistics()}

              {/* Finish Voting Button (Creator only) */}
              {isCreator && (
                <div className="mt-6 pt-6 border-t">
                  <button
                    onClick={handleFinishVoting}
                    disabled={loading}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Fermeture...' : '✅ Terminer le vote et commencer un nouveau'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
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
