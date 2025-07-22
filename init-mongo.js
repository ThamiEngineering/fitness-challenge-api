db = db.getSiblingDB('fitness-challenge');

db.createUser({
  user: 'fitnessapp',
  pwd: 'fitnesspass123',
  roles: [
    {
      role: 'readWrite',
      db: 'fitness-challenge',
    },
  ],
});

db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'username', 'password', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        },
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 30,
        },
        role: {
          enum: ['super_admin', 'gym_owner', 'client'],
        },
      },
    },
  },
});

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });

db.users.insertOne({
  email: 'admin@fitness.com',
  username: 'superadmin',
  password: '$2a$10$YourHashedPasswordHere',
  role: 'super_admin',
  profile: {
    firstName: 'Super',
    lastName: 'Admin',
  },
  isActive: true,
  emailVerified: true,
  stats: {
    totalChallenges: 0,
    completedChallenges: 0,
    totalCaloriesBurned: 0,
    totalWorkoutMinutes: 0,
    score: 0,
  },
  badges: [],
  friends: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

print('Database initialized successfully!');