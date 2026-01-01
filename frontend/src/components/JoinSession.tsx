import React, { useState } from 'react';

interface JoinSessionProps {
  sessionId: string;
  onJoined: (participantId: string) => void;
  joinSession: (sessionId: string, participantName: string, role: 'participant' | 'spectator') => Promise<string>;
  defaultName?: string;
}

export function JoinSession({ sessionId, onJoined, joinSession, defaultName }: JoinSessionProps) {
  const [formData, setFormData] = useState({
    participantName: defaultName || '',
    role: 'participant' as 'participant' | 'spectator'
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.participantName.trim()) {
      setError('Veuillez entrer votre nom');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const participantId = await joinSession(
        sessionId,
        formData.participantName.trim(),
        formData.role
      );
      onJoined(participantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Rejoindre la Session
          </h1>
          <p className="text-gray-600">
            Session ID: <span className="font-mono text-sm">{sessionId}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="participantName" className="block text-sm font-medium text-gray-700 mb-1">
              Votre nom *
            </label>
            <input
              type="text"
              id="participantName"
              name="participantName"
              value={formData.participantName}
              onChange={handleInputChange}
              placeholder="ex: Alice Martin"
              className="input-field"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rôle
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="participant"
                  checked={formData.role === 'participant'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  disabled={loading}
                />
                <span className="ml-2 text-sm text-gray-700">
                  <strong>Participant</strong> - Je peux voter
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="spectator"
                  checked={formData.role === 'spectator'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  disabled={loading}
                />
                <span className="ml-2 text-sm text-gray-700">
                  <strong>Spectateur</strong> - Je regarde seulement
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connexion...
              </span>
            ) : (
              'Rejoindre la session'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
