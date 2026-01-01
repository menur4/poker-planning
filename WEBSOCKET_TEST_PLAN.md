# Plan de Tests WebSocket - Poker Planning

## Objectif
Valider que la synchronisation bidirectionnelle WebSocket fonctionne correctement pour tous les participants d'une session de vote.

## Bugs Corrigés

### 1. Ordre d'enregistrement des handlers
**Problème**: Les handlers étaient enregistrés AVANT que le socket n'existe
```typescript
// AVANT (bug)
websocketService.onSessionUpdated(handler); // socket est NULL
websocketService.connect(); // socket créé ICI

// Dans onSessionUpdated()
if (this.socket) { // FALSE - socket n'existe pas encore!
  this.socket.on('session:updated', callback);
}
```

**Solution**: Les handlers sont maintenant stockés et automatiquement enregistrés lors de `connect()`
```typescript
// APRÈS (corrigé)
onSessionUpdated(callback) {
  this.sessionUpdateHandler = callback; // Stocker le handler

  if (this.socket) {
    this.socket.on('session:updated', callback); // Enregistrer si socket existe
  }
  // Sinon, sera enregistré automatiquement dans connect()
}

connect() {
  this.socket = io(...);

  // Auto-enregistrement des handlers stockés
  if (this.sessionUpdateHandler) {
    this.socket.on('session:updated', this.sessionUpdateHandler);
  }
}
```

### 2. Listener d'erreur dupliqué
**Problème**: Deux listeners 'error' étaient enregistrés sur le même socket
- Ligne 44: `this.socket.on('error', this.errorHandler)`
- Ligne 51-53: `this.socket.on('error', (error) => { console.error(...) })`

**Solution**: Supprimé le listener générique, ne garde que celui stocké dans `errorHandler`

## Scénarios de Test

### Test 1: Participant unique rejoint une session
**Objectif**: Vérifier que la connexion WebSocket de base fonctionne

**Étapes**:
1. Ouvrir http://localhost:5174/
2. Créer une nouvelle session
3. Rejoindre en tant que "Participant 1"

**Résultat attendu**:
- Console log: `[WebSocket] Storing session:updated handler`
- Console log: `[WebSocket] Socket does not exist yet, handler will be registered on connect()`
- Console log: `[WebSocket] Creating new socket connection`
- Console log: `[WebSocket] Re-registering session:updated handler on new socket`
- Console log: `🔌 WebSocket connected`
- Console log: `[WebSocket] Joining session: [sessionId] as Participant 1`
- Participant 1 apparaît dans la liste des participants

### Test 2: Second participant rejoint - Notification bidirectionnelle
**Objectif**: Vérifier que Participant 1 reçoit la notification quand Participant 2 rejoint

**Étapes**:
1. Garder la fenêtre du Participant 1 ouverte
2. Ouvrir une NOUVELLE fenêtre/onglet incognito
3. Aller sur http://localhost:5174/
4. Cliquer sur "Rejoindre une session existante"
5. Entrer le Session ID du Participant 1
6. Rejoindre en tant que "Participant 2"

**Résultat attendu**:

**Dans la console du Participant 2**:
- Console log: `[WebSocket] Storing session:updated handler`
- Console log: `[WebSocket] Creating new socket connection`
- Console log: `🔌 WebSocket connected`
- Console log: `[WebSocket] Joining session: [sessionId] as Participant 2`
- Backend log: `Socket connected: [socketId]`
- Backend log: `Participant Participant 2 (participant-xxx) reconnecting to session [sessionId]`
- Backend log: `[WebSocket] Notified all participants in session [sessionId] about participant join`

**Dans la console du Participant 1**:
- Console log: `[handleSessionUpdated] Received: { session: {...} }`
- Console log: `Updated session data: [session avec 2 participants]`
- Console log: `Updating session state with: [session]`
- L'interface affiche maintenant 2 participants

**Dans l'interface des deux participants**:
- Liste des participants affiche: "Participant 1" et "Participant 2"
- Compteur indique "2 participants"

### Test 3: Participant 1 démarre un vote - Participant 2 reçoit l'update
**Objectif**: Vérifier que le démarrage d'un vote synchronise tous les participants

**Prérequis**: Test 2 réussi (2 participants connectés)

**Étapes**:
1. Dans la fenêtre du Participant 1, entrer une question: "Story Points pour US-123?"
2. Cliquer sur "Démarrer le vote"

**Résultat attendu**:

**Backend logs**:
- `POST /api/v1/sessions/[sessionId]/voting/start`
- `[WebSocket] Notifying session update for session: [sessionId]`
- `[WebSocket] Emitting session:updated event to room: [sessionId]`
- `[WebSocket] Event emitted successfully`

**Console Participant 1**:
- Console log: `[handleSessionUpdated] Received: { session: {...} }`
- Console log: `Updated session data: [session avec currentVote]`
- Console log: `Updating session state with: [session]`

**Console Participant 2**:
- Console log: `[handleSessionUpdated] Received: { session: {...} }`
- Console log: `Updated session data: [session avec currentVote]`
- Console log: `Updating session state with: [session]`

**Interface des deux participants**:
- Affiche la question: "Story Points pour US-123?"
- Affiche les cartes de vote (1, 2, 3, 5, 8, 13, 21, ?, ☕)
- Status: "Vote en cours"

### Test 4: Participants votent - Synchronisation en temps réel
**Objectif**: Vérifier que les votes sont synchronisés sans révéler les valeurs

**Prérequis**: Test 3 réussi (vote démarré)

**Étapes**:
1. Participant 1 clique sur la carte "5"
2. Participant 2 clique sur la carte "8"

**Résultat attendu**:

**Après vote du Participant 1**:
- Backend: `POST /api/v1/sessions/[sessionId]/voting/vote`
- Backend: `[WebSocket] Emitting session:updated event to room: [sessionId]`
- Console Participant 2: `[handleSessionUpdated] Received: { session: {...} }`
- Interface Participant 1: Affiche "✓ Vous avez voté"
- Interface Participant 2: Affiche "Participant 1 a voté (1/2)"

**Après vote du Participant 2**:
- Backend: `POST /api/v1/sessions/[sessionId]/voting/vote`
- Backend: `[WebSocket] Emitting session:updated event to room: [sessionId]`
- Console Participant 1: `[handleSessionUpdated] Received: { session: {...} }`
- Interface Participant 1: Affiche "Tous les participants ont voté (2/2)"
- Interface Participant 2: Affiche "✓ Vous avez voté"

**IMPORTANT**: Les valeurs des votes NE doivent PAS être visibles

### Test 5: Révélation des votes - Synchronisation des résultats
**Objectif**: Vérifier que la révélation synchronise tous les participants

**Prérequis**: Test 4 réussi (tous les participants ont voté)

**Étapes**:
1. Dans la fenêtre du Participant 1, cliquer sur "Révéler les votes"

**Résultat attendu**:

**Backend logs**:
- `POST /api/v1/sessions/[sessionId]/voting/reveal`
- `[WebSocket] Notifying session update for session: [sessionId]`
- `[WebSocket] Emitting session:updated event to room: [sessionId]`

**Console des deux participants**:
- Console log: `[handleSessionUpdated] Received: { session: {...} }`
- Console log: `Updated session data: [session avec votes révélés]`
- Console log: `Current vote:`, `{ status: 'revealed', votes: [...] }`

**Interface des deux participants**:
- Affiche les votes révélés:
  - Avatar de Participant 1 avec valeur "5"
  - Avatar de Participant 2 avec valeur "8"
- Affiche le consensus ou l'écart
- Bouton "Nouveau vote" disponible

### Test 6: Troisième participant rejoint pendant un vote
**Objectif**: Vérifier que les nouveaux participants reçoivent l'état actuel

**Prérequis**: Test 3 réussi (vote en cours)

**Étapes**:
1. Ouvrir une TROISIÈME fenêtre/onglet
2. Rejoindre la session en tant que "Participant 3"

**Résultat attendu**:

**Console Participant 3**:
- Console log: `[handleSessionUpdated] Received: { session: {...} }`
- Console log: `Updated session data: [session avec currentVote]`

**Interface Participant 3**:
- Affiche immédiatement la question du vote en cours
- Affiche les cartes de vote
- Affiche qui a déjà voté

**Console Participants 1 et 2**:
- Console log: `[handleSessionUpdated] Received: { session: {...} }`
- Interface mise à jour avec "Participant 3" dans la liste

### Test 7: React Strict Mode - Pas de duplications
**Objectif**: Vérifier que React Strict Mode ne crée pas de listeners dupliqués

**Étapes**:
1. Vérifier que le mode développement est actif (React Strict Mode activé par défaut)
2. Créer une session et rejoindre en tant que "Test User"
3. Observer les logs de la console

**Résultat attendu**:
- `[WebSocket useEffect] Called with:` apparaît 2 fois (Strict Mode)
- `[WebSocket useEffect] Already set up, skipping...` apparaît la 2ème fois
- `wsSetupDone.current` empêche la double configuration
- UN SEUL socket connecté (pas de duplication)
- UN SEUL listener `session:updated` enregistré

**À ne PAS voir**:
- Pas de multiples `[WebSocket] Creating new socket connection`
- Pas de multiples `🔌 WebSocket connected`
- Pas de messages reçus en double

### Test 8: Déconnexion et reconnexion
**Objectif**: Vérifier la gestion de la perte de connexion

**Étapes**:
1. Créer une session avec 2 participants
2. Dans le DevTools du Participant 1, aller dans l'onglet Network
3. Activer "Offline" pour simuler une perte de connexion
4. Attendre 2-3 secondes
5. Désactiver "Offline"

**Résultat attendu**:
- Console log: `🔌 WebSocket disconnected`
- Console log: `🔌 WebSocket connected` (reconnexion automatique)
- Le participant rejoint automatiquement la session
- L'état de la session est restauré (participants, vote en cours, etc.)

## Validation des Logs Backend

Pour chaque action, vérifier dans le terminal backend:

### Quand un participant rejoint:
```
Socket connected: [socketId]
Participant [name] ([participantId]) reconnecting to session [sessionId]
[WebSocket] Notified all participants in session [sessionId] about participant join
```

### Quand un vote démarre:
```
POST /api/v1/sessions/[sessionId]/voting/start
[WebSocket] Notifying session update for session: [sessionId]
[WebSocket] Emitting session:updated event to room: [sessionId]
[WebSocket] Event emitted successfully
```

### Quand un participant vote:
```
POST /api/v1/sessions/[sessionId]/voting/vote
[WebSocket] Notifying session update for session: [sessionId]
[WebSocket] Emitting session:updated event to room: [sessionId]
[WebSocket] Event emitted successfully
```

### Quand les votes sont révélés:
```
POST /api/v1/sessions/[sessionId]/voting/reveal
[WebSocket] Notifying session update for session: [sessionId]
[WebSocket] Emitting session:updated event to room: [sessionId]
[WebSocket] Event emitted successfully
```

## Critères de Réussite

✅ Tous les scénarios passent sans erreur
✅ Tous les participants reçoivent les mises à jour en temps réel
✅ Pas de listeners dupliqués (vérifiable dans les logs)
✅ Pas de reconnexions inutiles
✅ La révélation des votes affiche correctement toutes les valeurs
✅ Les nouveaux participants reçoivent l'état actuel de la session

## Commandes pour Lancer les Tests

### Terminal 1 - Backend:
```bash
cd /Users/frhamon/Code/Poker_Planning/backend
npm start
```

### Terminal 2 - Frontend:
```bash
cd /Users/frhamon/Code/Poker_Planning/frontend
npm run dev
```

### Navigateur:
- Fenêtre 1 (normale): http://localhost:5174/
- Fenêtre 2 (incognito): http://localhost:5174/
- Fenêtre 3 (incognito #2): http://localhost:5174/

### DevTools:
- Ouvrir la console (F12) dans chaque fenêtre
- Filtrer par "WebSocket" pour voir uniquement les logs pertinents
