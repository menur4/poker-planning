import { SessionRepository } from '../../domain/repositories/SessionRepository';
import { Session } from '../../domain/entities/Session';
import { SessionId } from '../../domain/value-objects/SessionId';
import { Scale } from '../../domain/value-objects/Scale';

export interface CreateSessionCommand {
  name: string;
  scale: 'fibonacci' | 'tshirt' | 'power-of-2' | 'custom';
  customScaleName?: string;
  customScaleValues?: string[];
  creatorId: string;
}

export interface CreateSessionResult {
  sessionId: SessionId;
}

export class CreateSessionUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(command: CreateSessionCommand): Promise<CreateSessionResult> {
    this.validateCommand(command);

    const sessionId = SessionId.generate();
    const scale = this.createScale(command);
    
    const session = new Session(
      sessionId,
      command.name,
      scale,
      command.creatorId
    );

    await this.sessionRepository.save(session);

    return { sessionId };
  }

  private validateCommand(command: CreateSessionCommand): void {
    if (!command) {
      throw new Error('Command is required');
    }

    if (!command.name || typeof command.name !== 'string' || command.name.trim().length === 0) {
      throw new Error('Session name cannot be empty');
    }

    if (!command.creatorId || typeof command.creatorId !== 'string' || command.creatorId.trim().length === 0) {
      throw new Error('Creator ID cannot be empty');
    }

    if (!['fibonacci', 'tshirt', 'power-of-2', 'custom'].includes(command.scale)) {
      throw new Error('Invalid scale type');
    }

    if (command.scale === 'custom') {
      if (!command.customScaleName || command.customScaleName.trim().length === 0) {
        throw new Error('Custom scale name is required');
      }

      if (!command.customScaleValues || !Array.isArray(command.customScaleValues)) {
        throw new Error('Custom scale values are required');
      }
    }
  }

  private createScale(command: CreateSessionCommand): Scale {
    switch (command.scale) {
      case 'fibonacci':
        return Scale.fibonacci();
      case 'tshirt':
        return Scale.tshirt();
      case 'power-of-2':
        return Scale.powerOfTwo();
      case 'custom':
        return Scale.custom(command.customScaleName!, command.customScaleValues!);
      default:
        throw new Error('Invalid scale type');
    }
  }
}
