# Brief Design - Application de Poker Planning

## Vue d'ensemble du projet

### Objectif
Développer une web application de poker planning permettant aux équipes d'estimer la complexité des tâches de manière collaborative et intuitive.

### Vision
Une solution simple et moderne qui permet de démarrer une session d'estimation en quelques clics, accessible via un simple lien partageable.

## Fonctionnalités principales

### 1. Accès et participation
- **Accès simplifié** : Rejoindre une session via un lien unique
- **Identification minimale** : Saisie du nom uniquement
- **Rôles** : Choix entre "Participant" (vote) et "Spectateur" (observation)
- **Participation flexible** : Les participants peuvent choisir de ne pas voter

### 2. Gestion des sessions
- **Création de session** : Interface pour l'organisateur
- **Démarrage des votes** : Bouton pour lancer un nouveau vote
- **Contrôle du vote** : Bouton pour terminer et révéler les résultats
- **Gestion des échelles** : Sélection du type d'estimation

### 3. Types d'échelles supportées
- **Fibonacci** : 1, 2, 3, 5, 8, 13, 21, 34, 55, 89
- **Tailles de t-shirts** : XS, S, M, L, XL, XXL
- **Multiples de 2** : 1, 2, 4, 8, 16, 32, 64
- **Personnalisable** : Possibilité d'ajouter d'autres échelles

### 4. Fonctionnalités avancées
- **Timer optionnel** : Compteur pour limiter la durée des votes
- **Synthèse des résultats** : Visualisation de la répartition des votes
- **Personnalisation** : Choix d'illustrations pour les cartes
- **Historique** : Conservation des votes précédents dans la session

## Spécifications techniques

### Architecture recommandée
- **Frontend** : React.js ou Vue.js avec TypeScript
- **Backend** : Node.js avec Express ou Fastify
- **Base de données** : Redis pour les sessions temporaires
- **Communication temps réel** : WebSockets (Socket.io)
- **Hosting** : Vercel/Netlify + Railway/Render

### Structure des données

#### Session
```json
{
  "id": "unique_session_id",
  "name": "Nom de la session",
  "createdAt": "timestamp",
  "scale": "fibonacci|tshirt|power2|custom",
  "customScale": ["valeur1", "valeur2"],
  "timer": 300, // secondes, optionnel
  "currentVote": {
    "id": "vote_id",
    "question": "Tâche à estimer",
    "status": "voting|revealed|finished",
    "startedAt": "timestamp",
    "votes": {}
  },
  "participants": [],
  "voteHistory": []
}
```

#### Participant
```json
{
  "id": "user_id",
  "name": "Nom utilisateur",
  "role": "participant|spectator",
  "connected": true
}
```

## Design et expérience utilisateur

### Principes de design
- **Moderne et sobre** : Interface épurée, couleurs neutres
- **Mobile-first** : Responsive design optimisé mobile
- **Accessibilité** : Contraste élevé, navigation clavier
- **Intuitivité** : Actions principales visibles, workflow simple

### Parcours utilisateur principal

1. **Accès à la session**
   - Saisie du lien de session
   - Page d'accueil avec nom de la session
   - Formulaire : nom + rôle (participant/spectateur)

2. **Salle d'attente**
   - Liste des participants connectés
   - Statut de chacun (prêt/non prêt)
   - Bouton "Démarrer le vote" (organisateur uniquement)

3. **Phase de vote**
   - Question/tâche à estimer
   - Cartes cliquables avec valeurs de l'échelle
   - Indicateurs : qui a voté, timer (si activé)
   - Bouton "Révéler les votes" (organisateur)

4. **Résultats**
   - Votes révélés pour chaque participant
   - Graphique de répartition
   - Statistiques (moyenne, médiane, consensus)
   - Bouton "Nouveau vote"

### Éléments d'interface

#### Composants principaux
- **Header** : Nom de session, participants connectés
- **Zone de vote** : Cartes/boutons d'estimation
- **Panel latéral** : Liste participants, historique
- **Modales** : Configuration session, résultats détaillés

#### États des cartes
- **Non sélectionnée** : Gris clair, bordure fine
- **Sélectionnée** : Couleur primaire, bordure épaisse
- **Révélée** : Couleur selon consensus (vert=accord, orange=écart, rouge=très dispersé)

### Personnalisation des cartes

#### Thèmes d'illustration proposés
- **Classique** : Cartes simples avec chiffres/lettres
- **Animaux** : Illustrations d'animaux par taille/complexité
- **Objets** : Objets du quotidien représentant la complexité
- **Géométrique** : Formes abstraites modernes
- **Personnalisé** : Upload d'images par l'utilisateur

## Spécifications fonctionnelles détaillées

### Gestion des sessions
- **Création** : Génération d'ID unique, configuration initiale
- **Partage** : Lien copyable, QR code optionnel
- **Persistance** : Session active pendant 24h max
- **Sécurité** : Pas d'authentification, mais ID difficile à deviner

### Timer et notifications
- **Configuration** : 1-30 minutes, par défaut désactivé
- **Affichage** : Compte à rebours visible, changement de couleur
- **Notifications** : Alerte sonore et visuelle à 30s de la fin
- **Expiration** : Révélation automatique des votes

### Synthèse des résultats
- **Graphique en barres** : Répartition des votes
- **Statistiques** :
  - Nombre de votants
  - Consensus (si tous identiques)
  - Écart-type (pour détecter la dispersion)
  - Suggestion de re-vote si très dispersé

### Responsive design
- **Mobile** : Interface verticale, cartes en grille 2x3
- **Tablet** : Interface mixte, panel latéral collapsible
- **Desktop** : Vue complète, tous les éléments visibles

## Contraintes et considérations

### Performance
- **Temps réel** : Latence <200ms pour les mises à jour
- **Scalabilité** : Support de 50 participants par session
- **Optimisation** : Lazy loading des thèmes d'illustrations

### Compatibilité
- **Navigateurs** : Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
- **Appareils** : Smartphones, tablettes, ordinateurs
- **Réseau** : Fonctionnement sur connexions lentes (3G)

### Sécurité et confidentialité
- **Données** : Pas de stockage permanent des votes
- **Sessions** : Auto-destruction après inactivité
- **Anonymat** : Possibilité de votes anonymes (option)

## Plan de développement recommandé

### Phase 1 - MVP (2-3 semaines)
- Interface basique avec échelle Fibonacci
- Création/rejoindre session
- Vote et révélation des résultats
- Responsive design basique

### Phase 2 - Fonctionnalités (1-2 semaines)
- Autres échelles d'estimation
- Timer optionnel
- Amélioration UX/UI

### Phase 3 - Personnalisation (1-2 semaines)
- Thèmes d'illustrations
- Statistiques avancées
- Optimisations performance

### Phase 4 - Améliorations (ongoing)
- Analytics d'usage
- Nouvelles fonctionnalités basées sur feedback
- Intégrations externes (Jira, Trello, etc.)

## Critères de succès

### Métriques d'usage
- Temps moyen pour créer une session : <2 minutes
- Temps moyen pour rejoindre une session : <30 secondes
- Taux d'achèvement des votes : >90%
- Satisfaction utilisateur : >4/5

### Critères techniques
- Temps de chargement initial : <3 secondes
- Disponibilité : >99%
- Compatibilité multi-appareils validée

---

*Ce brief constitue la base pour le développement de l'application. Il pourra être affiné en cours de projet selon les retours utilisateurs et les contraintes techniques découvertes.*