import React, { useState } from 'react';
import { ApiService } from '../services/api';
import type { CreateSessionRequest } from '../types';

interface CreateSessionProps {
  onSessionCreated: (sessionId: string) => void;
}

const SCALE_OPTIONS = [
  { value: 'fibonacci', label: 'Fibonacci (1, 2, 3, 5, 8, 13, 21...)' },
  { value: 'tshirt', label: 'T-Shirt (XS, S, M, L, XL, XXL)' },
  { value: 'power-of-2', label: 'Power of 2 (1, 2, 4, 8, 16, 32...)' },
];

export function CreateSession({ onSessionCreated }: CreateSessionProps) {
  const [formData, setFormData] = useState({
    sessionName: '',
    creatorName: '',
    scale: 'fibonacci'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sessionName.trim() || !formData.creatorName.trim()) {
      setError('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sessionId = await ApiService.createSession({
        sessionName: formData.sessionName.trim(),
        creatorName: formData.creatorName.trim(),
        scale: formData.scale
      });
      
      onSessionCreated(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la session');
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
            Créer une Session
          </h1>
          <p className="text-gray-600">
            Lancez une nouvelle session de poker planning
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="sessionName" className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la session *
            </label>
            <input
              type="text"
              id="sessionName"
              name="sessionName"
              value={formData.sessionName}
              onChange={handleInputChange}
              placeholder="ex: Sprint Planning Q4"
              className="input-field"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label htmlFor="creatorName" className="block text-sm font-medium text-gray-700 mb-1">
              Votre nom *
            </label>
            <input
              type="text"
              id="creatorName"
              name="creatorName"
              value={formData.creatorName}
              onChange={handleInputChange}
              placeholder="ex: Jean Dupont"
              className="input-field"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label htmlFor="scale" className="block text-sm font-medium text-gray-700 mb-1">
              Échelle de vote
            </label>
            <select
              id="scale"
              name="scale"
              value={formData.scale}
              onChange={handleInputChange}
              className="input-field"
              disabled={loading}
            >
              {SCALE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
                Création en cours...
              </span>
            ) : (
              'Créer la session'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
