import express from 'express';
import { Server } from 'http';
import { corsMiddleware } from './presentation/middleware/cors';
import { errorHandler, notFoundHandler } from './presentation/middleware/errorHandler';
import { createSessionRoutes } from './presentation/routes/sessionRoutes';
import { SessionController } from './presentation/controllers/SessionController';
import { CreateSessionUseCase } from './application/use-cases/CreateSession';
import { JoinSessionUseCase } from './application/use-cases/JoinSession';
import { StartVotingUseCase } from './application/use-cases/StartVoting';
import { SubmitVoteUseCase } from './application/use-cases/SubmitVote';
import { RevealVotesUseCase } from './application/use-cases/RevealVotes';
import { FinishVotingUseCase } from './application/use-cases/FinishVoting';
import { RedisSessionRepository } from './infrastructure/repositories/RedisSessionRepository';
import { SocketManager } from './infrastructure/websocket/SocketManager';

export interface AppConfig {
  port: number;
  redis: {
    host: string;
    port: number;
    db?: number;
    password?: string;
  };
}

export class App {
  private app: express.Application;
  private server: Server | null = null;
  private sessionRepository: RedisSessionRepository;
  private socketManager: SocketManager | null = null;
  private sessionController: SessionController | null = null;

  constructor(private config: AppConfig) {
    this.app = express();
    this.sessionRepository = new RedisSessionRepository(config.redis);
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(corsMiddleware);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging in development
    if (process.env.NODE_ENV !== 'production') {
      this.app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
      });
    }

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });
  }

  private setupRoutes(): void {
    // Create use cases
    const createSessionUseCase = new CreateSessionUseCase(this.sessionRepository);
    const joinSessionUseCase = new JoinSessionUseCase(this.sessionRepository);
    const startVotingUseCase = new StartVotingUseCase(this.sessionRepository);
    const submitVoteUseCase = new SubmitVoteUseCase(this.sessionRepository);
    const revealVotesUseCase = new RevealVotesUseCase(this.sessionRepository);
    const finishVotingUseCase = new FinishVotingUseCase(this.sessionRepository);

    // Create controller and store reference
    this.sessionController = new SessionController(
      createSessionUseCase,
      joinSessionUseCase,
      startVotingUseCase,
      submitVoteUseCase,
      revealVotesUseCase,
      finishVotingUseCase,
      this.sessionRepository
    );

    // Setup routes
    this.app.use('/api/v1', createSessionRoutes(this.sessionController));

    // API documentation endpoint
    this.app.get('/api/v1/docs', (req, res) => {
      res.json({
        name: 'Poker Planning API',
        version: '1.0.0',
        endpoints: {
          sessions: {
            'POST /api/v1/sessions': 'Create a new session',
            'GET /api/v1/sessions/:sessionId': 'Get session details',
            'POST /api/v1/sessions/:sessionId/join': 'Join a session',
            'GET /api/v1/users/:creatorId/sessions': 'Get user sessions'
          },
          voting: {
            'POST /api/v1/sessions/:sessionId/voting/start': 'Start voting round',
            'POST /api/v1/sessions/:sessionId/voting/vote': 'Submit a vote',
            'POST /api/v1/sessions/:sessionId/voting/reveal': 'Reveal votes'
          },
          health: {
            'GET /health': 'Health check endpoint'
          }
        }
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        // Initialize WebSocket after HTTP server is created
        this.setupWebSocket();
        
        console.log(`🚀 Poker Planning API server running on port ${this.config.port}`);
        console.log(`📚 API Documentation: http://localhost:${this.config.port}/api/v1/docs`);
        console.log(`❤️  Health Check: http://localhost:${this.config.port}/health`);
        console.log(`🔌 WebSocket server ready for real-time communication`);
        resolve();
      });
    });
  }

  private setupWebSocket(): void {
    if (!this.server) return;

    // Create use cases for WebSocket
    const joinSessionUseCase = new JoinSessionUseCase(this.sessionRepository);
    const startVotingUseCase = new StartVotingUseCase(this.sessionRepository);
    const submitVoteUseCase = new SubmitVoteUseCase(this.sessionRepository);
    const revealVotesUseCase = new RevealVotesUseCase(this.sessionRepository);

    // Initialize Socket Manager
    this.socketManager = new SocketManager(
      this.server,
      this.sessionRepository,
      joinSessionUseCase,
      startVotingUseCase,
      submitVoteUseCase,
      revealVotesUseCase
    );

    // Inject SocketManager into SessionController
    if (this.sessionController) {
      this.sessionController.setSocketManager(this.socketManager);
    }
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close(async (error) => {
          if (error) {
            reject(error);
          } else {
            // Close WebSocket connections
            if (this.socketManager) {
              this.socketManager.close();
            }
            
            await this.sessionRepository.disconnect();
            console.log('🛑 Server stopped gracefully');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  getExpressApp(): express.Application {
    return this.app;
  }
}
