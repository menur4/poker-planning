import { Session } from '../entities/Session';
import { SessionId } from '../value-objects/SessionId';

export interface SessionRepository {
  save(session: Session): Promise<void>;
  findById(id: SessionId): Promise<Session | null>;
  findByCreatorId(creatorId: string): Promise<Session[]>;
  delete(id: SessionId): Promise<void>;
  exists(id: SessionId): Promise<boolean>;
}
