# 🚀 Guide d'utilisation Postman - Fitness Challenge API

Ce guide vous explique comment utiliser la collection Postman pour tester votre API Fitness Challenge.

## 📥 Importation des fichiers

### 1. Importer la collection
1. Ouvrir Postman
2. Cliquer sur **"Import"** en haut à gauche
3. Sélectionner le fichier `Fitness_Challenge_API.postman_collection.json`
4. Cliquer sur **"Import"**

### 2. Importer l'environnement
1. Cliquer sur **"Import"** 
2. Sélectionner le fichier `Fitness_Challenge_API.postman_environment.json`
3. Cliquer sur **"Import"**
4. Dans le coin supérieur droit, sélectionner l'environnement **"Fitness Challenge API - Environment"**

## 🎯 Ordre de test recommandé

### Phase 1 : Authentification
1. **Register User** - Créer un compte utilisateur
2. **Login User** - Se connecter (le token sera automatiquement sauvegardé)
3. **Get Current User** - Vérifier que l'authentification fonctionne

### Phase 2 : Création de contenu
4. **Create Exercise** - Créer un exercice
5. **Create Gym** - Créer une salle de sport
6. **Create Badge** - Créer un badge
7. **Create Challenge** - Créer un défi

### Phase 3 : Interaction utilisateur
8. **Join Challenge** - Rejoindre le défi créé
9. **Update Progress** - Mettre à jour la progression
10. **Create Training** - Enregistrer une séance d'entraînement

### Phase 4 : Fonctionnalités sociales
11. **Search Users** - Rechercher des utilisateurs
12. **Add Friend** - Ajouter un ami
13. **Invite Friends** - Inviter des amis au défi
14. **Get Leaderboard** - Voir le classement

## ⚙️ Configuration automatique

### Variables d'environnement
- **baseUrl** : `http://localhost:3000/api` (modifiable si votre serveur utilise un autre port)
- **authToken** : Se remplit automatiquement après login
- **userId, challengeId, gymId, etc.** : À remplir manuellement avec les IDs retournés par les API

### Token automatique
Le script de test sur **"Login User"** sauvegarde automatiquement le token JWT dans `{{authToken}}`.

## 📋 Structure de la collection

```
🔐 Authentication
  ├── Register User
  ├── Login User (✨ Auto-save token)
  ├── Get Current User
  ├── Change Password
  ├── Forgot Password
  ├── Reset Password
  └── Logout

👤 Users
  ├── Get User Profile
  ├── Update User Profile
  ├── Get User Stats
  ├── Search Users
  ├── Add Friend
  ├── Get Friends List
  └── Get Leaderboard

🏋️ Gyms
  ├── Create Gym
  ├── Get All Gyms
  ├── Get Gym by ID
  ├── Subscribe to Gym
  └── Get My Gyms

💪 Exercises
  ├── Create Exercise
  ├── Get All Exercises
  ├── Get Exercise Categories
  ├── Calculate Calories
  └── Search Exercises

🎯 Challenges
  ├── Create Challenge
  ├── Get All Challenges
  ├── Join Challenge
  ├── Update Progress
  ├── Get My Challenges
  ├── Invite Friends
  ├── Get Challenge Leaderboard
  ├── Search Challenges
  └── Get Trending Challenges

🏆 Badges
  ├── Create Badge
  ├── Get All Badges
  ├── Award Badge to User
  ├── Check and Award Badges
  ├── Get Popular Badges
  └── Test Badge Rules

📊 Training
  ├── Create Training
  ├── Get My Trainings
  ├── Get Training Stats
  ├── Get Progress Analysis
  ├── Get Challenge Trainings
  └── Export Training Data

👑 Admin (Sections)
  ├── Admin - Users
  ├── Admin - Gyms
  └── Admin - Exercises
```

## 🎨 Exemples de données

### Utilisateur
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "testuser",
  "role": "client",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "0123456789"
  }
}
```

### Défi
```json
{
  "title": "Défi 30 jours Push-ups",
  "description": "Faire 1000 push-ups en 30 jours",
  "type": "individual",
  "difficulty": "medium",
  "category": "Musculation",
  "objectives": [
    {
      "description": "Push-ups totaux",
      "target": 1000,
      "unit": "repetitions"
    }
  ],
  "duration": {
    "value": 30,
    "unit": "days"
  }
}
```

## 🔧 Conseils de test

### 1. Variables dynamiques
- Copiez les IDs retournés par les API dans les variables d'environnement
- Utilisez `{{variableName}}` dans les URLs et corps des requêtes

### 2. Headers automatiques
- L'authentification Bearer est configurée au niveau collection
- Les Content-Type sont pré-configurés

### 3. Tests automatiques
- Le login sauvegarde automatiquement le token
- Vérifiez les réponses pour copier les IDs nécessaires

### 4. Gestion des erreurs
- Testez les cas d'erreur (token invalide, données manquantes)
- Vérifiez les codes de statut HTTP

## 🚀 Démarrage rapide

1. **Démarrer votre serveur** : `npm run dev`
2. **Importer les fichiers** dans Postman
3. **Sélectionner l'environnement**
4. **Tester "Register User"** puis **"Login User"**
5. **Créer du contenu** avec les endpoints Create
6. **Tester les interactions** utilisateur

## 📝 Notes importantes

- **MongoDB** doit être démarré avant les tests
- **Le fichier `.env`** doit être configuré
- **Les tokens JWT** expirent selon votre configuration
- **Certains endpoints** nécessitent des rôles spécifiques (super_admin)

## ❓ Dépannage

### Token expired
- Re-faites un login pour obtenir un nouveau token

### 404 Not Found
- Vérifiez que votre serveur est démarré sur le bon port
- Vérifiez l'URL de base dans l'environnement

### 403 Forbidden
- Vérifiez que vous êtes connecté
- Vérifiez que votre rôle autorise cette action

### 400 Bad Request
- Vérifiez le format des données envoyées
- Vérifiez les champs requis

---

🎉 **Bonne démonstration !** Cette collection couvre tous les cas d'usage de votre cahier des charges. 