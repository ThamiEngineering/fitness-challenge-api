# 🏋️ Fitness Challenge API

API REST complète pour la gestion de salles d'entraînement et de défis fitness développée avec Node.js, TypeScript et MongoDB.

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Technologies](#-technologies)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [API Endpoints](#-api-endpoints)
- [Architecture](#-architecture)
- [Sécurité](#-sécurité)
- [Tests](#-tests)
- [Déploiement](#-déploiement)

## 🚀 Fonctionnalités

### Super Admin
- ✅ **Gestion des Salles** : Création, modification, suppression et approbation des salles d'entraînement
- ✅ **Gestion des Exercices** : CRUD complet avec système d'approbation
- ✅ **Système de Badges** : Création de badges dynamiques avec règles personnalisables
- ✅ **Gestion des Utilisateurs** : Administration complète des comptes utilisateurs

### Propriétaire de Salle
- ✅ **Profil de Salle** : Gestion des informations, équipements, horaires
- ✅ **Défis Spécifiques** : Création de défis associés à leur salle
- ✅ **Statistiques** : Suivi des abonnements et performances

### Client
- ✅ **Création de Défis** : Défis individuels, en équipe ou sociaux
- ✅ **Exploration** : Recherche et filtrage avancé des défis
- ✅ **Suivi d'Entraînement** : Enregistrement détaillé des séances
- ✅ **Système Social** : Amis, invitations, classements
- ✅ **Récompenses** : Attribution automatique de badges et points

## 🛠️ Technologies

- **Backend** : Node.js 18+ avec TypeScript
- **Base de données** : MongoDB avec Mongoose ODM
- **Authentification** : JWT avec système de rôles
- **Sécurité** : Helmet, CORS, Rate Limiting, Validation
- **Logs** : Winston avec rotation automatique
- **Documentation** : Swagger/OpenAPI (prévu)
- **Containerisation** : Docker & Docker Compose

## 📦 Installation

### Prérequis

```bash
node --version  # >= 18.0.0
npm --version   # >= 8.0.0
mongod --version # >= 7.0.0
```

### Installation locale

```bash
# 1. Cloner le repository
git clone <votre-repo>
cd fitness-challenge-api

# 2. Installer les dépendances
npm install

# 3. Créer le fichier d'environnement
cp .env.example .env

# 4. Modifier les variables d'environnement
nano .env

# 5. Lancer MongoDB (si pas déjà fait)
mongod

# 6. Lancer l'application
npm run dev
```

### Installation avec Docker

```bash
# Lancer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f api

# Arrêter les services
docker-compose down
```

## ⚙️ Configuration

### Variables d'environnement (.env)

```env
# Serveur
PORT=3000
NODE_ENV=development

# Base de données
MONGODB_URI=mongodb://localhost:27017/fitness-challenge

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Upload
MAX_FILE_SIZE=10mb
UPLOAD_PATH=./uploads
```

### Structure des dossiers

```
fitness-challenge-api/
├── src/
│   ├── controllers/     # Contrôleurs API
│   ├── middlewares/     # Middlewares Express
│   ├── models/          # Modèles Mongoose
│   ├── routes/          # Définition des routes
│   ├── services/        # Logique métier
│   ├── types/           # Types TypeScript
│   ├── utils/           # Utilitaires
│   └── index.ts         # Point d'entrée
├── uploads/             # Fichiers uploadés
│   ├── avatars/
│   ├── gyms/
│   ├── exercises/
│   └── others/
├── logs/               # Logs de l'application
├── docker-compose.yml
└── README.md
```

## 🎯 Utilisation

### Démarrage rapide

```bash
# Développement
npm run dev

# Production
npm run build
npm start

# Tests
npm test

# Linting
npm run lint
```

### Création du premier admin

```bash
# Méthode 1 : Via API (inscription avec rôle)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@fitness.com",
    "password": "admin123",
    "username": "admin",
    "firstName": "Super",
    "lastName": "Admin",
    "role": "super_admin"
  }'

# Méthode 2 : Modifier directement en base
# Se connecter à MongoDB et changer le role d'un utilisateur
```

## 📚 API Endpoints

### Authentification (`/api/auth`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/register` | Inscription | Public |
| POST | `/login` | Connexion | Public |
| GET | `/me` | Profil actuel | Private |
| POST | `/refresh-token` | Rafraîchir token | Private |
| PUT | `/change-password` | Changer mot de passe | Private |
| POST | `/logout` | Déconnexion | Private |

### Utilisateurs (`/api/users`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/profile` | Profil utilisateur | Private |
| PUT | `/profile` | Modifier profil | Private |
| GET | `/stats` | Statistiques utilisateur | Private |
| GET | `/search` | Rechercher utilisateurs | Private |
| POST | `/:id/friend` | Ajouter ami | Private |
| DELETE | `/:id/friend` | Retirer ami | Private |
| GET | `/friends` | Liste des amis | Private |
| GET | `/leaderboard` | Classement | Public |
| GET | `/` | Tous les utilisateurs | Admin |

### Salles de Sport (`/api/gyms`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/` | Liste des salles | Public |
| POST | `/` | Créer salle | Owner/Admin |
| GET | `/:id` | Détails salle | Public |
| PUT | `/:id` | Modifier salle | Owner/Admin |
| DELETE | `/:id` | Supprimer salle | Owner/Admin |
| POST | `/:id/subscribe` | S'abonner | Private |
| POST | `/:id/unsubscribe` | Se désabonner | Private |
| PUT | `/:id/approve` | Approuver salle | Admin |

### Exercices (`/api/exercises`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/` | Liste des exercices | Public |
| POST | `/` | Créer exercice | Private |
| GET | `/:id` | Détails exercice | Public |
| PUT | `/:id` | Modifier exercice | Creator/Admin |
| DELETE | `/:id` | Supprimer exercice | Creator/Admin |
| GET | `/categories` | Catégories | Public |
| GET | `/muscle-groups` | Groupes musculaires | Public |
| POST | `/:id/calculate-calories` | Calculer calories | Public |
| PUT | `/:id/approve` | Approuver exercice | Admin |

### Défis (`/api/challenges`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/` | Liste des défis | Public |
| POST | `/` | Créer défi | Private |
| GET | `/:id` | Détails défi | Public |
| PUT | `/:id` | Modifier défi | Creator/Admin |
| DELETE | `/:id` | Supprimer défi | Creator/Admin |
| POST | `/:id/join` | Rejoindre défi | Private |
| POST | `/:id/leave` | Quitter défi | Private |
| PUT | `/:id/progress` | Mettre à jour progression | Private |
| POST | `/:id/invite` | Inviter amis | Private |
| GET | `/my-challenges` | Mes défis | Private |

### Badges (`/api/badges`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/` | Liste des badges | Public |
| POST | `/` | Créer badge | Admin |
| GET | `/:id` | Détails badge | Public |
| PUT | `/:id` | Modifier badge | Admin |
| DELETE | `/:id` | Supprimer badge | Admin |
| GET | `/user/:userId` | Badges utilisateur | Public |
| POST | `/check/:userId` | Vérifier badges | Private |
| POST | `/:badgeId/award/:userId` | Attribuer badge | Admin |
| POST | `/custom` | Créer badge personnalisé | Admin |

### Entraînements (`/api/trainings`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/` | Mes entraînements | Private |
| POST | `/` | Créer entraînement | Private |
| GET | `/:id` | Détails entraînement | Private |
| PUT | `/:id` | Modifier entraînement | Owner |
| DELETE | `/:id` | Supprimer entraînement | Owner |
| GET | `/stats` | Statistiques | Private |
| GET | `/progress` | Analyse progression | Private |
| GET | `/challenge/:id` | Entraînements par défi | Private |
| GET | `/export` | Exporter données | Private |

## 🏗️ Architecture

### Modèle MVC

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Routes       │───▶│   Controllers   │───▶│    Services     │
│                 │    │                 │    │                 │
│ • Validation    │    │ • Req/Res       │    │ • Logique       │
│ • Auth          │    │ • Validation    │    │ • Business      │
│ • Rate Limit    │    │ • Transform     │    │ • External API  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │
                                 ▼
                       ┌─────────────────┐
                       │     Models      │
                       │                 │
                       │ • Mongoose      │
                       │ • Validation    │
                       │ • Hooks         │
                       │ • Virtuals      │
                       └─────────────────┘
```

### Système de rôles

- **super_admin** : Accès complet à tous les endpoints
- **gym_owner** : Gestion de ses salles + fonctionnalités client
- **client** : Fonctionnalités utilisateur standard

### Sécurité

- **JWT** avec expiration configurable
- **Rate limiting** par endpoint et utilisateur
- **Validation** stricte avec express-validator
- **Sanitization** des données d'entrée
- **CORS** configurable
- **Helmet** pour les headers de sécurité

## 🧪 Tests

```bash
# Lancer tous les tests
npm test

# Tests avec couverture
npm run test:coverage

# Tests en mode watch
npm run test:watch

# Tests d'intégration
npm run test:integration
```

## 🚀 Déploiement

### Docker Production

```bash
# Build de l'image
docker build -t fitness-api .

# Run avec variables d'environnement
docker run -d \
  --name fitness-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://... \
  -e JWT_SECRET=... \
  fitness-api
```

### Variables d'environnement Production

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=super-secret-key-production
CORS_ORIGIN=https://votre-frontend.com
```

## 📝 Exemples d'utilisation

### Création d'un défi

```javascript
const challenge = await fetch('/api/challenges', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    title: "Défi Cardio 30 jours",
    description: "Améliorer son endurance en 30 jours",
    type: "individual",
    difficulty: "medium",
    category: "endurance",
    objectives: [{
      description: "Courir 5km sans pause",
      target: 5,
      unit: "km"
    }],
    exercises: [exerciseId],
    duration: { value: 30, unit: "days" },
    rewards: { points: 100 }
  })
});
```

### Enregistrement d'un entraînement

```javascript
const training = await fetch('/api/trainings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    exercises: [{
      exercise: exerciseId,
      sets: [
        { reps: 10, weight: 50, restTime: 60 },
        { reps: 8, weight: 55, restTime: 60 }
      ]
    }],
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T11:00:00Z",
    caloriesBurned: 300,
    intensity: "high",
    mood: "excellent"
  })
});
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

- 📧 Email : support@fitness-challenge.com
- 📱 Discord : [Rejoindre le serveur](https://discord.gg/fitness)
- 📖 Documentation : [docs.fitness-challenge.com](https://docs.fitness-challenge.com)

---

**Développé avec ❤️ pour la communauté fitness** 🏋️‍♀️💪