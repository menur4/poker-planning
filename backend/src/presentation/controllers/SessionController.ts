import { Request, Response } from 'express';
import { CreateSessionUseCase } from '../../application/use-cases/CreateSession';
import { JoinSessionUseCase } from '../../application/use-cases/JoinSession';
import { StartVotingUseCase } from '../../application/use-cases/StartVoting';
import { SubmitVoteUseCase } from '../../application/use-cases/SubmitVote';
import { RevealVotesUseCase } from '../../application/use-cases/RevealVotes';
import { SessionRepository } from '../../domain/repositories/SessionRepository';
import { SessionId } from '../../domain/value-objects/SessionId';

export class SessionController {
  constructor(
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly joinSessionUseCase: JoinSessionUseCase,
    private readonly startVotingUseCase: StartVotingUseCase,
    private readonly submitVoteUseCase: SubmitVoteUseCase,
    private readonly revealVotesUseCase: RevealVotesUseCase,
    private readonly sessionRepository: SessionRepository
  ) {}

  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionName, scale, creatorName } = req.body;

      if (!sessionName || !scale || !creatorName) {
        res.status(400).json({
          error: 'Missing required fields: sessionName, scale, creatorName'
        });
        return;
      }

      const command = { name: sessionName, scale, creatorId: creatorName };
      const result = await this.createSessionUseCase.execute(command);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async joinSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { participantName, role } = req.body;

      if (!participantName || !role) {
        res.status(400).json({
          error: 'Missing required fields: participantName, role'
        });
        return;
      }

      if (role !== 'participant' && role !== 'spectator') {
        res.status(400).json({
          error: 'Role must be either "participant" or "spectator"'
        });
        return;
      }

      const command = { sessionId, participantName, role };
      const result = await this.joinSessionUseCase.execute(command);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error joining session:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          error: 'Session ID is required'
        });
        return;
      }

      const sessionIdObj = new SessionId(sessionId);
      const session = await this.sessionRepository.findById(sessionIdObj);

      if (!session) {
        res.status(404).json({
          error: 'Session not found'
        });
        return;
      }

      const sessionData = {
        id: session.getId().getValue(),
        name: session.getName(),
        scale: {
          type: session.getScale().getType(),
          name: session.getScale().getName(),
          values: session.getScale().getValues()
        },
        creatorId: session.getCreatorId(),
        isActive: session.isActive(),
        participants: session.getParticipants().map(p => ({
          id: p.getId(),
          name: p.getName(),
          role: p.getRole(),
          isConnected: p.isConnected()
        })),
        currentVote: session.getCurrentVote() ? {
          question: session.getCurrentVote()!.getQuestion(),
          status: session.getCurrentVote()!.getStatus(),
          startedAt: session.getCurrentVote()!.getStartedAt(),
          voteCount: session.getCurrentVote()!.getVoteCount()
        } : null,
        isVotingActive: session.isVotingActive()
      };

      res.status(200).json({
        success: true,
        data: sessionData
      });
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async startVoting(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { question, initiatorId } = req.body;

      if (!question || !initiatorId) {
        res.status(400).json({
          error: 'Missing required fields: question, initiatorId'
        });
        return;
      }

      const command = { sessionId, question, initiatorId };
      const result = await this.startVotingUseCase.execute(command);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error starting voting:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async submitVote(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { participantId, voteValue } = req.body;

      if (!participantId || !voteValue) {
        res.status(400).json({
          error: 'Missing required fields: participantId, voteValue'
        });
        return;
      }

      const command = { sessionId, participantId, voteValue };
      const result = await this.submitVoteUseCase.execute(command);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error submitting vote:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async revealVotes(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { initiatorId } = req.body;

      if (!initiatorId) {
        res.status(400).json({
          error: 'Missing required field: initiatorId'
        });
        return;
      }

      const command = { sessionId, initiatorId };
      const result = await this.revealVotesUseCase.execute(command);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error revealing votes:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const { creatorId } = req.params;

      if (!creatorId) {
        res.status(400).json({
          error: 'Creator ID is required'
        });
        return;
      }

      const sessions = await this.sessionRepository.findByCreatorId(creatorId);

      const sessionsData = sessions.map(session => ({
        id: session.getId().getValue(),
        name: session.getName(),
        creatorId: session.getCreatorId(),
        isActive: session.isActive(),
        participantCount: session.getParticipants().length,
        isVotingActive: session.isVotingActive(),
        scale: {
          type: session.getScale().getType(),
          name: session.getScale().getName()
        }
      }));

      res.status(200).json({
        success: true,
        data: sessionsData
      });
    } catch (error) {
      console.error('Error getting user sessions:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}
