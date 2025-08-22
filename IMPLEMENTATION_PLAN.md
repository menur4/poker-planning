# Plan d'Implémentation - Poker Planning

## 🏗️ Architecture Technique Détaillée

### Structure du Projet (Clean Architecture)

```
poker-planning/
├── frontend/                    # Application React
│   ├── src/
│   │   ├── domain/             # Entités métier
│   │   │   ├── entities/       # Session, Participant, Vote
│   │   │   ├── value-objects/  # SessionId, VoteValue, Scale
│   │   │   └── repositories/   # Interfaces des repositories
│   │   ├── application/        # Cas d'usage
│   │   │   ├── use-cases/      # CreateSession, JoinSession, Vote
│   │   │   ├── services/       # Services applicatifs
│   │   │   └── ports/          # Interfaces externes
│   │   ├── infrastructure/     # Implémentation technique
│   │   │   ├── api/           # Client HTTP/WebSocket
│   │   │   ├── repositories/  # Implémentation repositories
│   │   │   └── adapters/      # Adaptateurs externes
│   │   ├── presentation/       # Interface utilisateur
│   │   │   ├── components/    # Composants React
│   │   │   ├── pages/         # Pages de l'application
│   │   │   ├── hooks/         # Custom hooks
│   │   │   └── stores/        # État global (Zustand)
│   │   └── shared/            # Utilitaires partagés
│   │       ├── types/         # Types TypeScript
│   │       ├── constants/     # Constantes
│   │       └── utils/         # Fonctions utilitaires
│   ├── tests/
│   │   ├── unit/              # Tests unitaires
│   │   ├── integration/       # Tests d'intégration
│   │   └── e2e/              # Tests end-to-end
│   └── public/
├── backend/                     # API Node.js
│   ├── src/
│   │   ├── domain/             # Même structure que frontend
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   └── repositories/
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   ├── services/
│   │   │   └── ports/
│   │   ├── infrastructure/
│   │   │   ├── database/      # Redis client
│   │   │   ├── websocket/     # Socket.io
│   │   │   ├── repositories/  # Implémentation Redis
│   │   │   └── adapters/
│   │   ├── presentation/
│   │   │   ├── controllers/   # Contrôleurs REST
│   │   │   ├── middleware/    # Middlewares Express
│   │   │   ├── routes/        # Routes API
│   │   │   └── websocket/     # Handlers WebSocket
│   │   └── shared/
│   └── tests/
└── shared/                      # Code partagé frontend/backend
    ├── types/                   # Types TypeScript communs
    ├── constants/               # Constantes partagées
    └── validation/              # Schémas de validation
```

## 🧪 Stratégie TDD Détaillée

### 1. Red-Green-Refactor Cycle

```typescript
// Exemple : Test d'entité Session
describe('Session Entity', () => {
  it('should create a session with valid data', () => {
    // RED: Écrire le test qui échoue
    const sessionData = {
      name: 'Sprint Planning',
      scale: Scale.FIBONACCI,
      creatorId: 'user-123'
    };
    
    const session = Session.create(sessionData);
    
    expect(session.getName()).toBe('Sprint Planning');
    expect(session.getScale()).toBe(Scale.FIBONACCI);
    expect(session.isActive()).toBe(true);
  });
});
```

### 2. Ordre de Développement TDD

#### Phase 1: Entités Métier
1. **Value Objects** (SessionId, VoteValue, Scale)
2. **Entités** (Session, Participant, Vote)
3. **Agrégats** (SessionAggregate)
4. **Services Domaine** (VotingService, ConsensusService)

#### Phase 2: Cas d'Usage
1. **CreateSession** Use Case
2. **JoinSession** Use Case
3. **StartVoting** Use Case
4. **SubmitVote** Use Case
5. **RevealVotes** Use Case

#### Phase 3: Infrastructure
1. **Repositories** (SessionRepository, ParticipantRepository)
2. **WebSocket** Gateway
3. **API Controllers**

## 🎯 Principes Clean Code Appliqués

### 1. Nommage Explicite

```typescript
// ❌ Mauvais
class S {
  private p: P[];
  vote(v: number) { /* */ }
}

// ✅ Bon
class Session {
  private participants: Participant[];
  
  submitVote(voteValue: VoteValue): void {
    // Implémentation claire
  }
}
```

### 2. Fonctions Pures et Petites

```typescript
// ✅ Fonction pure, une responsabilité
function calculateConsensus(votes: Vote[]): ConsensusResult {
  if (votes.length === 0) {
    return ConsensusResult.noVotes();
  }
  
  const uniqueValues = new Set(votes.map(vote => vote.getValue()));
  return uniqueValues.size === 1 
    ? ConsensusResult.consensus(votes[0].getValue())
    : ConsensusResult.noConsensus();
}
```

### 3. Inversion de Dépendance

```typescript
// Interface (Port)
interface SessionRepository {
  save(session: Session): Promise<void>;
  findById(id: SessionId): Promise<Session | null>;
}

// Use Case dépend de l'abstraction
class CreateSessionUseCase {
  constructor(
    private sessionRepository: SessionRepository,
    private idGenerator: IdGenerator
  ) {}
  
  async execute(command: CreateSessionCommand): Promise<SessionId> {
    const sessionId = this.idGenerator.generate();
    const session = Session.create({
      id: sessionId,
      name: command.name,
      scale: command.scale
    });
    
    await this.sessionRepository.save(session);
    return sessionId;
  }
}
```

## 🔧 Configuration Technique

### 1. Frontend (React + TypeScript)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "typescript": "^5.0.0",
    "zustand": "^4.4.0",
    "socket.io-client": "^4.7.0",
    "react-router-dom": "^6.15.0",
    "tailwindcss": "^3.3.0"
  },
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jest": "^29.6.0",
    "playwright": "^1.37.0",
    "vite": "^4.4.0"
  }
}
```

### 2. Backend (Node.js + Express)

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.7.0",
    "redis": "^4.6.0",
    "typescript": "^5.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "jest": "^29.6.0",
    "supertest": "^6.3.0",
    "@types/express": "^4.17.0",
    "ts-node": "^10.9.0"
  }
}
```

### 3. Configuration Jest

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/tests/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}'
  ]
};
```

## 🚀 Workflow de Développement

### 1. Git Flow Simplifié

```bash
# Branches principales
main          # Production
develop       # Intégration

# Branches de fonctionnalités
feature/session-creation
feature/voting-system
feature/real-time-updates

# Convention de commits
feat: add session creation use case
test: add unit tests for Vote entity
refactor: extract consensus calculation logic
fix: resolve WebSocket connection issue
```

### 2. Pipeline CI/CD

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run lint
      - run: npm run build

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run test:e2e

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: [test, e2e]
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy
```

## 📋 Checklist de Qualité

### Pour chaque Feature
- [ ] Tests unitaires écrits en premier (TDD)
- [ ] Couverture de code > 90%
- [ ] Respect des principes SOLID
- [ ] Nommage explicite et métier
- [ ] **Documentation fonctionnelle mise à jour**
- [ ] **Documentation technique mise à jour**
- [ ] Tests d'intégration
- [ ] Validation des types TypeScript
- [ ] Code review approuvé

### Pour chaque Release
- [ ] Tests E2E passants
- [ ] Performance validée
- [ ] Accessibilité vérifiée
- [ ] Compatibilité navigateurs
- [ ] **Documentation complète synchronisée**
- [ ] **README.md actualisé**
- [ ] **CHANGELOG.md mis à jour**
- [ ] Métriques de monitoring

## 🎨 Standards UI/UX

### Design System
- **Couleurs** : Palette neutre avec accent bleu
- **Typography** : Inter font, hiérarchie claire
- **Spacing** : Système 8px (4, 8, 16, 24, 32, 48, 64)
- **Components** : Atomic Design (Atoms, Molecules, Organisms)

### Responsive Breakpoints
```css
/* Mobile First */
.container {
  /* Mobile: 320px+ */
  padding: 1rem;
}

@media (min-width: 768px) {
  /* Tablet */
  .container {
    padding: 2rem;
  }
}

@media (min-width: 1024px) {
  /* Desktop */
  .container {
    padding: 3rem;
  }
}
```

## 🔍 Monitoring et Analytics

### Métriques Techniques
- **Performance** : Core Web Vitals
- **Erreurs** : Error tracking (Sentry)
- **Uptime** : Monitoring serveur
- **Logs** : Structured logging

### Métriques Métier
- **Sessions créées** : Nombre par jour
- **Participants** : Moyenne par session
- **Votes complétés** : Taux de completion
- **Temps de session** : Durée moyenne

## 📝 Consignes de Documentation

### Règle Fondamentale
**OBLIGATOIRE** : Mettre à jour la documentation avant chaque commit

### Documentation à Maintenir

#### 1. Documentation Fonctionnelle
- **README.md** : Vue d'ensemble, fonctionnalités, installation
- **poker_planning_brief.md** : Spécifications métier
- **USER_GUIDE.md** : Guide utilisateur (à créer)
- **CHANGELOG.md** : Historique des versions (à créer)

#### 2. Documentation Technique
- **IMPLEMENTATION_PLAN.md** : Architecture et plan technique
- **API_DOCUMENTATION.md** : Documentation API (à créer)
- **DEPLOYMENT.md** : Guide de déploiement (à créer)
- **Commentaires code** : JSDoc pour fonctions complexes

#### 3. Documentation de Suivi
- **PROJECT_TRACKING.md** : Avancement et métriques
- **DECISIONS.md** : Décisions architecturales (à créer)
- **TROUBLESHOOTING.md** : Guide de résolution (à créer)

### Workflow Documentation

#### Avant chaque Commit
1. **Vérifier** que les changements sont documentés
2. **Mettre à jour** les fichiers concernés :
   - README.md si nouvelles fonctionnalités
   - IMPLEMENTATION_PLAN.md si changements architecture
   - PROJECT_TRACKING.md si milestone atteint
   - API_DOCUMENTATION.md si nouveaux endpoints
3. **Valider** la cohérence entre code et documentation
4. **Tester** les exemples de documentation

#### Standards de Documentation
- **Clarté** : Langage simple et précis
- **Exemples** : Code samples fonctionnels
- **Structure** : Markdown avec hiérarchie claire
- **Liens** : Navigation entre documents
- **Mise à jour** : Date de dernière modification

### Checklist Documentation
- [ ] README.md reflète les nouvelles fonctionnalités
- [ ] Code complexe commenté avec JSDoc
- [ ] API endpoints documentés avec exemples
- [ ] Changements architecturaux expliqués
- [ ] Guide utilisateur actualisé
- [ ] Métriques de suivi mises à jour
- [ ] Liens internes fonctionnels

---

Ce plan d'implémentation garantit un développement structuré, testable et maintenable selon les principes TDD et Clean Code demandés.
