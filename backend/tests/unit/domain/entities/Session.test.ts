import { Session } from '../../../../src/domain/entities/Session';
import { SessionId } from '../../../../src/domain/value-objects/SessionId';
import { Scale } from '../../../../src/domain/value-objects/Scale';
import { VoteValue } from '../../../../src/domain/value-objects/VoteValue';
import { Participant } from '../../../../src/domain/entities/Participant';
import { Vote } from '../../../../src/domain/entities/Vote';

describe('Session Entity', () => {
  let sessionId: SessionId;
  let scale: Scale;
  let creatorId: string;

  beforeEach(() => {
    sessionId = SessionId.generate();
    scale = Scale.fibonacci();
    creatorId = 'creator-123';
  });

  describe('creation', () => {
    it('should create a session with valid data', () => {
      // Arrange
      const name = 'Sprint Planning';

      // Act
      const session = new Session(sessionId, name, scale, creatorId);

      // Assert
      expect(session.getId()).toEqual(sessionId);
      expect(session.getName()).toBe(name);
      expect(session.getScale()).toEqual(scale);
      expect(session.getCreatorId()).toBe(creatorId);
      expect(session.isActive()).toBe(true);
      expect(session.getParticipants()).toEqual([]);
      expect(session.getCurrentVote()).toBeNull();
      expect(session.getVoteHistory()).toEqual([]);
    });

    it('should throw error for empty name', () => {
      // Arrange
      const emptyName = '';

      // Act & Assert
      expect(() => new Session(sessionId, emptyName, scale, creatorId)).toThrow('Session name cannot be empty');
    });

    it('should throw error for whitespace only name', () => {
      // Arrange
      const whitespaceName = '   ';

      // Act & Assert
      expect(() => new Session(sessionId, whitespaceName, scale, creatorId)).toThrow('Session name cannot be empty');
    });

    it('should throw error for empty creator ID', () => {
      // Arrange
      const name = 'Sprint Planning';
      const emptyCreatorId = '';

      // Act & Assert
      expect(() => new Session(sessionId, name, scale, emptyCreatorId)).toThrow('Creator ID cannot be empty');
    });

    it('should throw error for null or undefined values', () => {
      // Arrange
      const name = 'Sprint Planning';

      // Act & Assert
      expect(() => new Session(null as any, name, scale, creatorId)).toThrow('Session ID is required');
      expect(() => new Session(sessionId, null as any, scale, creatorId)).toThrow('Session name cannot be empty');
      expect(() => new Session(sessionId, name, null as any, creatorId)).toThrow('Scale is required');
      expect(() => new Session(sessionId, name, scale, null as any)).toThrow('Creator ID cannot be empty');
    });

    it('should trim whitespace from name and creator ID', () => {
      // Arrange
      const name = '  Sprint Planning  ';
      const trimmedCreatorId = '  creator-123  ';

      // Act
      const session = new Session(sessionId, name, scale, trimmedCreatorId);

      // Assert
      expect(session.getName()).toBe('Sprint Planning');
      expect(session.getCreatorId()).toBe('creator-123');
    });
  });

  describe('participant management', () => {
    let session: Session;

    beforeEach(() => {
      session = new Session(sessionId, 'Test Session', scale, creatorId);
    });

    it('should add participant to session', () => {
      // Arrange
      const participant = new Participant('participant-1', 'John Doe', 'participant');

      // Act
      session.addParticipant(participant);

      // Assert
      expect(session.getParticipants()).toContain(participant);
      expect(session.getParticipantCount()).toBe(1);
    });

    it('should not add duplicate participant', () => {
      // Arrange
      const participant = new Participant('participant-1', 'John Doe', 'participant');
      session.addParticipant(participant);

      // Act
      session.addParticipant(participant);

      // Assert
      expect(session.getParticipants()).toHaveLength(1);
      expect(session.getParticipantCount()).toBe(1);
    });

    it('should remove participant from session', () => {
      // Arrange
      const participant = new Participant('participant-1', 'John Doe', 'participant');
      session.addParticipant(participant);

      // Act
      session.removeParticipant('participant-1');

      // Assert
      expect(session.getParticipants()).not.toContain(participant);
      expect(session.getParticipantCount()).toBe(0);
    });

    it('should handle removing non-existent participant gracefully', () => {
      // Act & Assert
      expect(() => session.removeParticipant('non-existent')).not.toThrow();
      expect(session.getParticipantCount()).toBe(0);
    });

    it('should find participant by ID', () => {
      // Arrange
      const participant = new Participant('participant-1', 'John Doe', 'participant');
      session.addParticipant(participant);

      // Act
      const found = session.findParticipant('participant-1');

      // Assert
      expect(found).toEqual(participant);
    });

    it('should return null for non-existent participant', () => {
      // Act
      const found = session.findParticipant('non-existent');

      // Assert
      expect(found).toBeNull();
    });

    it('should get only voting participants', () => {
      // Arrange
      const participant1 = new Participant('p1', 'John', 'participant');
      const spectator1 = new Participant('s1', 'Jane', 'spectator');
      const participant2 = new Participant('p2', 'Bob', 'participant');
      
      session.addParticipant(participant1);
      session.addParticipant(spectator1);
      session.addParticipant(participant2);

      // Act
      const votingParticipants = session.getVotingParticipants();

      // Assert
      expect(votingParticipants).toHaveLength(2);
      expect(votingParticipants).toContain(participant1);
      expect(votingParticipants).toContain(participant2);
      expect(votingParticipants).not.toContain(spectator1);
    });
  });

  describe('voting management', () => {
    let session: Session;
    let participant1: Participant;
    let participant2: Participant;

    beforeEach(() => {
      session = new Session(sessionId, 'Test Session', scale, creatorId);
      participant1 = new Participant('p1', 'John', 'participant');
      participant2 = new Participant('p2', 'Jane', 'participant');
      session.addParticipant(participant1);
      session.addParticipant(participant2);
    });

    it('should start new voting round', () => {
      // Arrange
      const question = 'How complex is this task?';

      // Act
      session.startVoting(question);

      // Assert
      expect(session.isVotingActive()).toBe(true);
      expect(session.getCurrentVote()).not.toBeNull();
      expect(session.getCurrentVote()?.getQuestion()).toBe(question);
      expect(session.getCurrentVote()?.getStatus()).toBe('voting');
    });

    it('should throw error when starting vote without question', () => {
      // Act & Assert
      expect(() => session.startVoting('')).toThrow('Question cannot be empty');
      expect(() => session.startVoting('   ')).toThrow('Question cannot be empty');
    });

    it('should throw error when starting vote while another is active', () => {
      // Arrange
      session.startVoting('First question');

      // Act & Assert
      expect(() => session.startVoting('Second question')).toThrow('Cannot start voting while another vote is active');
    });

    it('should submit vote for participant', () => {
      // Arrange
      session.startVoting('Test question');
      const voteValue = new VoteValue('5', scale);

      // Act
      session.submitVote('p1', voteValue);

      // Assert
      const currentVote = session.getCurrentVote();
      expect(currentVote?.hasVoted('p1')).toBe(true);
      expect(currentVote?.getVote('p1')?.getValue()).toEqual(voteValue);
    });

    it('should throw error when submitting vote without active voting', () => {
      // Arrange
      const voteValue = new VoteValue('5', scale);

      // Act & Assert
      expect(() => session.submitVote('p1', voteValue)).toThrow('No active vote to submit to');
    });

    it('should throw error when non-participant tries to vote', () => {
      // Arrange
      session.startVoting('Test question');
      const voteValue = new VoteValue('5', scale);

      // Act & Assert
      expect(() => session.submitVote('non-existent', voteValue)).toThrow('Participant not found or cannot vote');
    });

    it('should reveal votes', () => {
      // Arrange
      session.startVoting('Test question');
      const voteValue1 = new VoteValue('5', scale);
      const voteValue2 = new VoteValue('8', scale);
      session.submitVote('p1', voteValue1);
      session.submitVote('p2', voteValue2);

      // Act
      session.revealVotes();

      // Assert
      const currentVote = session.getCurrentVote();
      expect(currentVote?.getStatus()).toBe('revealed');
      expect(currentVote?.areVotesRevealed()).toBe(true);
    });

    it('should throw error when revealing votes without active voting', () => {
      // Act & Assert
      expect(() => session.revealVotes()).toThrow('No active vote to reveal');
    });

    it('should finish voting and move to history', () => {
      // Arrange
      session.startVoting('Test question');
      const voteValue = new VoteValue('5', scale);
      session.submitVote('p1', voteValue);
      session.revealVotes();

      // Act
      session.finishVoting();

      // Assert
      expect(session.isVotingActive()).toBe(false);
      expect(session.getCurrentVote()).toBeNull();
      expect(session.getVoteHistory()).toHaveLength(1);
      expect(session.getVoteHistory()[0].getStatus()).toBe('finished');
    });

    it('should throw error when finishing vote without active voting', () => {
      // Act & Assert
      expect(() => session.finishVoting()).toThrow('No active vote to finish');
    });
  });

  describe('session state', () => {
    let session: Session;

    beforeEach(() => {
      session = new Session(sessionId, 'Test Session', scale, creatorId);
    });

    it('should start as active', () => {
      // Act & Assert
      expect(session.isActive()).toBe(true);
    });

    it('should deactivate session', () => {
      // Act
      session.deactivate();

      // Assert
      expect(session.isActive()).toBe(false);
    });

    it('should reactivate session', () => {
      // Arrange
      session.deactivate();

      // Act
      session.activate();

      // Assert
      expect(session.isActive()).toBe(true);
    });

    it('should update session name', () => {
      // Arrange
      const newName = 'Updated Session Name';

      // Act
      session.updateName(newName);

      // Assert
      expect(session.getName()).toBe(newName);
    });

    it('should throw error when updating to empty name', () => {
      // Act & Assert
      expect(() => session.updateName('')).toThrow('Session name cannot be empty');
      expect(() => session.updateName('   ')).toThrow('Session name cannot be empty');
    });
  });

  describe('equality', () => {
    it('should be equal when session IDs are the same', () => {
      // Arrange
      const session1 = new Session(sessionId, 'Session 1', scale, creatorId);
      const session2 = new Session(sessionId, 'Session 2', Scale.tshirt(), 'other-creator');

      // Act & Assert
      expect(session1.equals(session2)).toBe(true);
    });

    it('should not be equal when session IDs are different', () => {
      // Arrange
      const session1 = new Session(sessionId, 'Session 1', scale, creatorId);
      const session2 = new Session(SessionId.generate(), 'Session 1', scale, creatorId);

      // Act & Assert
      expect(session1.equals(session2)).toBe(false);
    });

    it('should not be equal to null or undefined', () => {
      // Arrange
      const session = new Session(sessionId, 'Test Session', scale, creatorId);

      // Act & Assert
      expect(session.equals(null as any)).toBe(false);
      expect(session.equals(undefined as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      // Arrange
      const session = new Session(sessionId, 'Test Session', scale, creatorId);

      // Act
      const result = session.toString();

      // Assert
      expect(result).toMatch(/^Session\(.+\): Test Session \[fibonacci\] - active - 0 participants$/);
    });

    it('should show inactive status', () => {
      // Arrange
      const session = new Session(sessionId, 'Test Session', scale, creatorId);
      session.deactivate();

      // Act
      const result = session.toString();

      // Assert
      expect(result).toMatch(/^Session\(.+\): Test Session \[fibonacci\] - inactive - 0 participants$/);
    });
  });
});
