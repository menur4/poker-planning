import { useState, useEffect } from 'react';
import { CreateSession } from './components/CreateSession';
import { JoinSession } from './components/JoinSession';
import { VotingInterface } from './components/VotingInterface';
import { Toast } from './components/Toast';
import { useSession } from './hooks/useSession';
import './App.css';

type AppState = 'home' | 'create' | 'join' | 'session';

function App() {
  const [appState, setAppState] = useState<AppState>('home');
  const [sessionId, setSessionId] = useState<string>('');
  const [creatorName, setCreatorName] = useState<string>('');
  const [showToast, setShowToast] = useState(false);

  const { session, currentParticipant, joinSession, startVoting, submitVote, revealVotes, finishVoting, error } = useSession(sessionId);

  const handleBackToHome = () => {
    setAppState('home');
    setSessionId('');
    setCreatorName('');

    // Clear URL
    window.history.pushState({}, '', window.location.pathname);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-2">Erreur</h1>
          <p className="text-gray-700">{error}</p>
          <button onClick={handleBackToHome} className="btn-primary mt-4">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Handle URL parameters for direct session access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('session');

    if (urlSessionId) {
      setSessionId(urlSessionId);
      setAppState('join');
    }
  }, []);

  // Auto-transition to session view if we have both session and currentParticipant
  // Use a more stable check to avoid re-renders during component lifecycle
  useEffect(() => {
    if (appState === 'join' && session && currentParticipant && sessionId) {
      console.log('Auto-transitioning to session view - session and participant loaded');
      // Use setTimeout to avoid state updates during render
      const timer = setTimeout(() => {
        setAppState('session');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [appState, session, currentParticipant, sessionId]);

  const handleSessionCreated = (newSessionId: string, creatorName: string, participantId: string) => {
    setSessionId(newSessionId);
    setCreatorName(creatorName);
    // Go directly to session since we auto-joined
    setAppState('session');

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('session', newSessionId);
    window.history.pushState({}, '', url.toString());
  };

  const handleJoined = (_newParticipantId: string) => {
    setAppState('session');
  };

  const copySessionLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('session', sessionId);
    navigator.clipboard.writeText(url.toString());
    setShowToast(true);
  };

  // Test simple render first
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
                  Session: <span className="font-mono">{sessionId.slice(-8)}</span>
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
                Poker Planning
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
                  Lancez une nouvelle session d'éstimation
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
          <CreateSession onSessionCreated={handleSessionCreated} onJoinSession={joinSession} />
        )}

        {appState === 'join' && sessionId && (
          <JoinSession
            sessionId={sessionId}
            onJoined={handleJoined}
            joinSession={joinSession}
            defaultName={creatorName}
          />
        )}

        {appState === 'session' && session && currentParticipant ? (
          <VotingInterface
            session={session}
            currentParticipant={currentParticipant}
            onStartVoting={startVoting}
            onSubmitVote={submitVote}
            onRevealVotes={revealVotes}
            onFinishVoting={finishVoting}
          />
        ) : appState === 'session' ? (
          <div className="max-w-2xl mx-auto">
            <div className="card text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Chargement...</h2>
              <p className="text-gray-600">
                Chargement de la session en cours...
              </p>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p className="flex items-center justify-center gap-1">
              Développé avec ❤️ &
              <img src="/claude-code.png" alt="Claude Code" className="inline-block w-5 h-5" />
              pour l'équipe CLIC
            </p>
          </div>
        </div>
      </footer>

      {/* Toast notification */}
      {showToast && (
        <Toast
          message="Lien copié dans le presse-papiers !"
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}

export default App;
