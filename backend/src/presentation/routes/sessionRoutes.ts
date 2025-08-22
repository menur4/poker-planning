import { Router } from 'express';
import { SessionController } from '../controllers/SessionController';

export function createSessionRoutes(sessionController: SessionController): Router {
  const router = Router();

  // Session management routes
  router.post('/sessions', (req, res) => sessionController.createSession(req, res));
  router.get('/sessions/:sessionId', (req, res) => sessionController.getSession(req, res));
  router.post('/sessions/:sessionId/join', (req, res) => sessionController.joinSession(req, res));
  router.get('/users/:creatorId/sessions', (req, res) => sessionController.getUserSessions(req, res));

  // Voting routes
  router.post('/sessions/:sessionId/voting/start', (req, res) => sessionController.startVoting(req, res));
  router.post('/sessions/:sessionId/voting/vote', (req, res) => sessionController.submitVote(req, res));
  router.post('/sessions/:sessionId/voting/reveal', (req, res) => sessionController.revealVotes(req, res));

  return router;
}
