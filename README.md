# 🃏 Poker Planning Application

Application web collaborative pour l'estimation de la complexité des tâches en équipe.

## 🎯 Objectif

Permettre aux équipes agiles d'estimer la complexité des user stories de manière collaborative et intuitive via une interface web moderne et temps réel.

## ✨ Fonctionnalités Principales

- **Accès simplifié** : Rejoindre une session via un lien unique
- **Rôles flexibles** : Participant (vote) ou Spectateur (observation)
- **Échelles multiples** : Fibonacci, T-shirts, Multiples de 2, Personnalisable
- **Temps réel** : Synchronisation instantanée via WebSockets
- **Timer optionnel** : Limitation de durée des votes
- **Statistiques** : Consensus, répartition, historique des votes
- **Responsive** : Interface optimisée mobile, tablette et desktop

## 🏗️ Architecture

### Stack Technique
- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS
- **Backend** : Node.js + Express + TypeScript
- **Base de données** : Redis (sessions temporaires)
- **Communication** : Socket.io (WebSockets)
- **Tests** : Jest + React Testing Library + Playwright

### Principes Architecturaux
- **Clean Architecture** : Séparation des couches Domain/Application/Infrastructure
- **TDD** : Test-Driven Development avec couverture >90%
- **SOLID** : Respect des principes de conception objet
- **Clean Code** : Nommage explicite, fonctions pures, responsabilité unique

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- Redis 7+
- Git

### Installation
```bash
# Cloner le repository
git clone https://github.com/menur4/pokerplanning.git
cd pokerplanning

# Installation des dépendances
npm run install:all

# Démarrage en développement
npm run dev
```

### Scripts Disponibles
```bash
npm run dev              # Démarrage développement (frontend + backend)
npm run test             # Tests unitaires
npm run test:integration # Tests d'intégration
npm run test:e2e         # Tests end-to-end
npm run build            # Build production
npm run lint             # Vérification code
npm run format           # Formatage code
```

## 📋 Roadmap

### Phase 1 - MVP (Semaines 1-3) 📋
- [ ] Architecture de base avec Clean Architecture
- [ ] Modèles de domaine (Session, Participant, Vote)
- [ ] API REST et WebSocket
- [ ] Interface utilisateur responsive
- [ ] Système de vote avec échelle Fibonacci

### Phase 2 - Fonctionnalités (Semaines 4-5) 📋
- [ ] Échelles multiples (T-shirt, Power of 2, Custom)
- [ ] Timer optionnel
- [ ] Statistiques avancées
- [ ] Historique des votes

### Phase 3 - Personnalisation (Semaines 6-7) 📋
- [ ] Thèmes d'illustrations
- [ ] Mode anonyme
- [ ] Export des résultats
- [ ] QR Code de partage

### Phase 4 - Production (Semaine 8) 📋
- [ ] CI/CD avec GitHub Actions
- [ ] Déploiement Vercel + Railway
- [ ] Monitoring et analytics

## 🧪 Tests et Qualité

### Stratégie de Tests
- **Tests Unitaires** (70%) : Entités, Value Objects, Services
- **Tests d'Intégration** (20%) : API, WebSocket, Repositories
- **Tests E2E** (10%) : Parcours utilisateur complets

### Métriques de Qualité
- Code Coverage : >90%
- Build Time : <2min
- Bundle Size : <500KB
- Lighthouse Score : >90
- API Response Time : <200ms

## 📁 Structure du Projet

```
poker-planning/
├── frontend/                 # Application React
│   ├── src/
│   │   ├── domain/          # Entités métier
│   │   ├── application/     # Cas d'usage
│   │   ├── infrastructure/  # Implémentation technique
│   │   ├── presentation/    # Interface utilisateur
│   │   └── shared/         # Utilitaires partagés
│   └── tests/
├── backend/                 # API Node.js
│   ├── src/
│   │   ├── domain/         # Même structure que frontend
│   │   ├── application/
│   │   ├── infrastructure/
│   │   ├── presentation/
│   │   └── shared/
│   └── tests/
└── shared/                  # Code partagé frontend/backend
```

## 🤝 Contribution

### Workflow Git
1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit avec convention (`git commit -m 'feat: add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

### Standards de Code
- **Commits** : Convention Conventional Commits
- **Code** : ESLint + Prettier
- **Tests** : TDD obligatoire pour nouvelles fonctionnalités
- **Documentation** : Mise à jour obligatoire avant chaque commit
- **Review** : Approbation requise avant merge

## 📊 Monitoring

### Métriques Techniques
- Performance : Core Web Vitals
- Erreurs : Error tracking
- Uptime : Monitoring serveur
- Logs : Structured logging

### Métriques Métier
- Sessions créées par jour
- Participants moyens par session
- Taux de completion des votes
- Durée moyenne des sessions

## 📄 Documentation

- [Plan d'Implémentation](./IMPLEMENTATION_PLAN.md)
- [Suivi de Projet](./PROJECT_TRACKING.md)
- [Brief Fonctionnel](./poker_planning_brief.md)
- [API Documentation](./docs/api.md) (à venir)
- [Guide Utilisateur](./docs/user-guide.md) (à venir)

## 📞 Support

Pour toute question ou problème :
- Ouvrir une [issue GitHub](https://github.com/menur4/pokerplanning/issues)
- Consulter la [documentation](./docs/)
- Contacter l'équipe de développement

## 📜 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](./LICENSE) pour plus de détails.

---

**Développé avec ❤️ en suivant les principes TDD et Clean Code**