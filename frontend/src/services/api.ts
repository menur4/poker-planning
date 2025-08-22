import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  JoinSessionRequest,
  JoinSessionResponse,
  StartVotingRequest,
  SubmitVoteRequest,
  RevealVotesRequest,
  Session
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export class ApiService {
  static async createSession(request: CreateSessionRequest): Promise<string> {
    const response: AxiosResponse<ApiResponse<CreateSessionResponse>> = await api.post(
      '/sessions',
      request
    );
    return response.data.data.sessionId.value;
  }

  static async getSession(sessionId: string): Promise<Session> {
    console.log('API: Getting session:', sessionId);
    try {
      const response: AxiosResponse<ApiResponse<Session>> = await api.get(
        `/sessions/${sessionId}`
      );
      console.log('API: Session response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('API: Failed to get session:', error);
      throw error;
    }
  }

  static async joinSession(
    sessionId: string,
    request: JoinSessionRequest
  ): Promise<JoinSessionResponse> {
    const response: AxiosResponse<ApiResponse<JoinSessionResponse>> = await api.post(
      `/sessions/${sessionId}/join`,
      request
    );
    return response.data.data;
  }

  static async startVoting(
    sessionId: string,
    request: StartVotingRequest
  ): Promise<void> {
    await api.post(`/sessions/${sessionId}/voting/start`, request);
  }

  static async submitVote(
    sessionId: string,
    request: SubmitVoteRequest
  ): Promise<void> {
    await api.post(`/sessions/${sessionId}/voting/vote`, request);
  }

  static async revealVotes(
    sessionId: string,
    request: RevealVotesRequest
  ): Promise<void> {
    await api.post(`/sessions/${sessionId}/voting/reveal`, request);
  }

  static async getUserSessions(creatorId: string): Promise<Session[]> {
    const response: AxiosResponse<ApiResponse<Session[]>> = await api.get(
      `/users/${creatorId}/sessions`
    );
    return response.data.data;
  }

  static async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  }
}
