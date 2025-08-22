import React, { useState, useEffect } from 'react';
import { CreateSession } from './components/CreateSession';
import { JoinSession } from './components/JoinSession';
import { VotingInterface } from './components/VotingInterface';
import { useSession } from './hooks/useSession';

type AppState = 'home' | 'create' | 'join' | 'session';

function App() {
  const [appState, setAppState] = useState<AppState>('home');
  const [sessionId, setSessionId] = useState<string>('');
  const [participantId, setParticipantId] = useState<string>('');
  
  const { session, currentParticipant, startVoting, submitVote, revealVotes, error } = useSession(sessionId);

  // Handle URL parameters for direct session access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('session');
    
    if (urlSessionId) {
      setSessionId(urlSessionId);
      setAppState('join');
    }
  }, []);

  const handleSessionCreated = (newSessionId: string) => {
    setSessionId(newSessionId);
    setAppState('join');
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('session', newSessionId);
    window.history.pushState({}, '', url.toString());
  };

  const handleJoined = (newParticipantId: string) => {
    setParticipantId(newParticipantId);
    setAppState('session');
  };

  const handleBackToHome = () => {
    setAppState('home');
    setSessionId('');
    setParticipantId('');
    
    // Clear URL
    window.history.pushState({}, '', window.location.pathname);
  };

  const copySessionLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('session', sessionId);
    navigator.clipboard.writeText(url.toString());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={handleBackToHome}
                className="text-2xl font-bold text-primary-600 hover:text-primary-700"
              >
                🎯 Poker Planning
              </button>
            </div>
            
            {sessionId && appState !== 'home' && (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Session: <span className="font-mono">{sessionId.split('-')[1]}</span>
                </div>
                <button
                  onClick={copySessionLink}
                  className="btn-secondary text-sm"
                >
                  Copier le lien
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {appState === 'home' && (
          <div className="text-center">
            <div className="max-w-2xl mx-auto mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Poker Planning Collaboratif
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Estimez vos user stories en équipe avec des sessions de vote en temps réel
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="card text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-lg font-semibold mb-2">Créer une session</h3>
                <p className="text-gray-600 mb-4">
                  Lancez une nouvelle session de poker planning
                </p>
                <button
                  onClick={() => setAppState('create')}
                  className="btn-primary w-full"
                >
                  Créer une session
                </button>
              </div>

              <div className="card text-center">
                <div className="text-4xl mb-4">🚪</div>
                <h3 className="text-lg font-semibold mb-2">Rejoindre une session</h3>
                <p className="text-gray-600 mb-4">
                  Participez à une session existante
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="ID de session"
                    className="input-field"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          setSessionId(input.value.trim());
                          setAppState('join');
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="ID de session"]') as HTMLInputElement;
                      if (input?.value.trim()) {
                        setSessionId(input.value.trim());
                        setAppState('join');
                      }
                    }}
                    className="btn-secondary w-full"
                  >
                    Rejoindre
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {appState === 'create' && (
          <CreateSession onSessionCreated={handleSessionCreated} />
        )}

        {appState === 'join' && sessionId && (
          <JoinSession sessionId={sessionId} onJoined={handleJoined} />
        )}

        {appState === 'session' && session && currentParticipant && (
          <VotingInterface
            session={session}
            currentParticipant={currentParticipant}
            onStartVoting={startVoting}
            onSubmitVote={submitVote}
            onRevealVotes={revealVotes}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>Poker Planning App - Développé avec React + TypeScript</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
