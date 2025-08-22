export type ParticipantRole = 'participant' | 'spectator';

export class Participant {
  private readonly id: string;
  private name: string;
  private readonly role: ParticipantRole;
  private connected: boolean;

  constructor(id: string, name: string, role: ParticipantRole) {
    this.validateId(id);
    this.validateName(name);
    this.validateRole(role);

    this.id = id.trim();
    this.name = name.trim();
    this.role = role;
    this.connected = true;
  }

  private validateId(id: string): void {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Participant ID cannot be empty');
    }
  }

  private validateName(name: string): void {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Participant name cannot be empty');
    }
  }

  private validateRole(role: ParticipantRole): void {
    if (!role || (role !== 'participant' && role !== 'spectator')) {
      throw new Error('Role must be either "participant" or "spectator"');
    }
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getRole(): ParticipantRole {
    return this.role;
  }

  isConnected(): boolean {
    return this.connected;
  }

  isParticipant(): boolean {
    return this.role === 'participant';
  }

  isSpectator(): boolean {
    return this.role === 'spectator';
  }

  canVote(): boolean {
    return this.isParticipant();
  }

  connect(): void {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  updateName(newName: string): void {
    this.validateName(newName);
    this.name = newName.trim();
  }

  equals(other: Participant): boolean {
    if (!other || !(other instanceof Participant)) {
      return false;
    }
    return this.id === other.id;
  }

  toString(): string {
    const status = this.connected ? 'connected' : 'disconnected';
    return `Participant(${this.id}): ${this.name} [${this.role}] - ${status}`;
  }
}
