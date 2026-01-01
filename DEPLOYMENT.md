# Guide de déploiement sur VPS OVH

Ce guide vous explique comment déployer l'application Poker Planning sur un VPS OVH.

## Prérequis

### Sur votre VPS OVH
- Ubuntu 22.04 LTS (ou Debian 11+)
- Accès SSH root ou sudo
- Au minimum 2 GB RAM
- Docker et Docker Compose installés

### Nom de domaine (optionnel mais recommandé)
- Un nom de domaine pointant vers votre VPS (ex: pokerplanning.votre-domaine.com)
- Configuration DNS A record vers l'IP de votre VPS

---

## Étape 1 : Préparation du VPS

### 1.1 Connexion SSH
```bash
ssh root@VOTRE_IP_VPS
```

### 1.2 Mise à jour du système
```bash
apt update && apt upgrade -y
```

### 1.3 Installation de Docker
```bash
# Installation des dépendances
apt install -y apt-transport-https ca-certificates curl software-properties-common

# Ajout de la clé GPG Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Ajout du repository Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installation de Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io

# Vérification
docker --version
```

### 1.4 Installation de Docker Compose
```bash
# Téléchargement de Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Permissions d'exécution
chmod +x /usr/local/bin/docker-compose

# Vérification
docker-compose --version
```

### 1.5 Installation de Git
```bash
apt install -y git
```

---

## Étape 2 : Configuration du firewall

```bash
# Installation d'UFW (si pas déjà installé)
apt install -y ufw

# Configuration des ports
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS (pour plus tard)
ufw allow 3001/tcp    # API Backend

# Activation du firewall
ufw enable
ufw status
```

---

## Étape 3 : Déploiement de l'application

### 3.1 Cloner le repository
```bash
# Création du dossier pour l'application
mkdir -p /var/www
cd /var/www

# Clonage du repository
git clone https://github.com/menur4/poker-planning.git
cd poker-planning
```

### 3.2 Configuration de l'environnement
```bash
# Éditer le fichier .env.production
nano .env.production
```

Modifiez les valeurs suivantes :
```env
# Remplacez par votre domaine ou IP
ALLOWED_ORIGINS=http://VOTRE_DOMAINE_OU_IP,https://VOTRE_DOMAINE_OU_IP
VITE_API_URL=http://VOTRE_DOMAINE_OU_IP:3001
```

**Exemples :**
- Avec domaine : `VITE_API_URL=http://pokerplanning.monsite.com:3001`
- Avec IP : `VITE_API_URL=http://51.178.xx.xx:3001`

Sauvegardez avec `Ctrl+X`, puis `Y`, puis `Entrée`.

### 3.3 Lancement de l'application
```bash
# Construction et démarrage des conteneurs
docker-compose up -d --build

# Vérification des logs
docker-compose logs -f
```

Appuyez sur `Ctrl+C` pour sortir des logs.

### 3.4 Vérification du déploiement
```bash
# Vérifier que tous les conteneurs tournent
docker-compose ps

# Devrait afficher :
# poker-planning-redis     Up      6379/tcp
# poker-planning-backend   Up      0.0.0.0:3001->3001/tcp
# poker-planning-frontend  Up      0.0.0.0:80->80/tcp
```

---

## Étape 4 : Test de l'application

### 4.1 Test du backend
```bash
curl http://localhost:3001/health
# Devrait retourner : {"status":"ok"}
```

### 4.2 Test depuis votre navigateur
Ouvrez votre navigateur et allez sur :
- Frontend : `http://VOTRE_IP_VPS` ou `http://votre-domaine.com`
- Backend Health : `http://VOTRE_IP_VPS:3001/health`

---

## Étape 5 : Configuration HTTPS avec Let's Encrypt (Optionnel mais recommandé)

### 5.1 Installation de Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### 5.2 Installation de Nginx (pour gérer le HTTPS)
```bash
apt install -y nginx

# Création de la configuration
nano /etc/nginx/sites-available/poker-planning
```

Copiez cette configuration :
```nginx
server {
    listen 80;
    server_name VOTRE_DOMAINE;

    # Frontend
    location / {
        proxy_pass http://localhost;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Activez la configuration :
```bash
ln -s /etc/nginx/sites-available/poker-planning /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 5.3 Obtention du certificat SSL
```bash
certbot --nginx -d votre-domaine.com
```

---

## Commandes utiles

### Gestion des conteneurs
```bash
# Démarrer les conteneurs
docker-compose up -d

# Arrêter les conteneurs
docker-compose down

# Redémarrer les conteneurs
docker-compose restart

# Voir les logs
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f redis

# Reconstruire et redémarrer
docker-compose up -d --build
```

### Mise à jour de l'application
```bash
cd /var/www/poker-planning

# Récupérer les dernières modifications
git pull

# Reconstruire et redémarrer
docker-compose up -d --build
```

### Nettoyage
```bash
# Supprimer les conteneurs et volumes
docker-compose down -v

# Nettoyer les images inutilisées
docker system prune -a
```

---

## Sauvegarde des données

Les données Redis sont stockées dans un volume Docker. Pour sauvegarder :

```bash
# Sauvegarde
docker exec poker-planning-redis redis-cli SAVE
docker cp poker-planning-redis:/data/dump.rdb ./backup-$(date +%Y%m%d).rdb

# Restauration
docker cp backup-YYYYMMDD.rdb poker-planning-redis:/data/dump.rdb
docker-compose restart redis
```

---

## Dépannage

### Les conteneurs ne démarrent pas
```bash
# Vérifier les logs
docker-compose logs

# Vérifier l'état des conteneurs
docker-compose ps
```

### Problème de connexion au backend
```bash
# Vérifier que le port 3001 est ouvert
curl http://localhost:3001/health

# Vérifier le firewall
ufw status
```

### Problème WebSocket
Vérifiez que le CORS est bien configuré dans `.env.production` avec votre domaine/IP.

### Redémarrage après reboot du serveur
Les conteneurs avec `restart: unless-stopped` redémarreront automatiquement.

---

## Monitoring

### Vérifier la santé des services
```bash
# Health check backend
curl http://localhost:3001/health

# Health check frontend
curl http://localhost/health

# Health check Redis
docker exec poker-planning-redis redis-cli ping
```

### Surveiller les ressources
```bash
# Utilisation CPU/RAM par conteneur
docker stats
```

---

## Support

Pour toute question ou problème :
1. Vérifiez les logs : `docker-compose logs -f`
2. Vérifiez l'état des conteneurs : `docker-compose ps`
3. Consultez la documentation Docker : https://docs.docker.com

---

## Sécurité - Recommandations importantes

1. **Changez les mots de passe par défaut**
2. **Configurez un mot de passe Redis** dans `.env.production`
3. **Activez HTTPS** avec Let's Encrypt
4. **Limitez l'accès SSH** avec une clé plutôt qu'un mot de passe
5. **Mettez à jour régulièrement** le système et Docker
6. **Sauvegardez régulièrement** les données Redis

---

Bonne chance avec votre déploiement ! 🚀
