import mongoose, { Document, Schema } from 'mongoose';

export type Participant = {
  user: mongoose.Types.ObjectId;
  joinedAt: Date;
  progress: number;
  completedAt?: Date;
};

export interface IChallenge extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: 'individual' | 'team' | 'social';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  category: string;
  objectives: {
    description: string;
    target: number;
    unit: string;
  }[];
  exercises: {
    exercise: mongoose.Types.ObjectId;
    sets?: number;
    reps?: number;
    duration?: number;
    restTime?: number;
  }[];
  duration: {
    value: number;
    unit: 'days' | 'weeks' | 'months';
  };
  gym?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  participants: {
    user: mongoose.Types.ObjectId;
    joinedAt: Date;
    progress: number;
    completedAt?: Date;
  }[];
  rewards: {
    points: number;
    badges: mongoose.Types.ObjectId[];
  };
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  maxParticipants?: number;
  images: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  participantCount: number;
  completedCount: number;
  isFull(): boolean;
  hasParticipant(userId: string): boolean;
}

const challengeSchema = new Schema<IChallenge>(
  {
    title: {
      type: String,
      required: [true, 'Titre du défi requis'],
      trim: true,
      maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères'],
    },
    description: {
      type: String,
      required: [true, 'Description requise'],
      maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères'],
    },
    type: {
      type: String,
      enum: {
        values: ['individual', 'team', 'social'],
        message: 'Type de défi invalide',
      },
      required: [true, 'Type de défi requis'],
    },
    difficulty: {
      type: String,
      enum: {
        values: ['easy', 'medium', 'hard', 'extreme'],
        message: 'Difficulté invalide',
      },
      required: [true, 'Difficulté requise'],
    },
    category: {
      type: String,
      required: [true, 'Catégorie requise'],
      enum: {
        values: ['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness', 'rehabilitation'],
        message: 'Catégorie invalide',
      },
    },
    objectives: {
      type: [{
        description: {
          type: String,
          required: [true, 'Description de l\'objectif requise'],
        },
        target: {
          type: Number,
          required: [true, 'Cible requise'],
          min: [0, 'La cible ne peut pas être négative'],
        },
        unit: {
          type: String,
          required: [true, 'Unité requise'],
        },
      }],
      required: [true, 'Au moins un objectif requis'],
      validate: {
        validator: function(val: any[]) {
          return val.length > 0 && val.length <= 10;
        },
        message: 'Entre 1 et 10 objectifs requis',
      },
    },
    exercises: [{
      exercise: {
        type: Schema.Types.ObjectId,
        ref: 'Exercise',
        required: [true, 'Exercice requis'],
      },
      sets: {
        type: Number,
        min: [1, 'Au moins 1 série requise'],
        max: [100, 'Maximum 100 séries'],
      },
      reps: {
        type: Number,
        min: [1, 'Au moins 1 répétition requise'],
        max: [1000, 'Maximum 1000 répétitions'],
      },
      duration: {
        type: Number,
        min: [1, 'La durée doit être au moins 1 seconde'],
        max: [3600, 'La durée ne peut pas dépasser 1 heure'],
      },
      restTime: {
        type: Number,
        min: [0, 'Le temps de repos ne peut pas être négatif'],
        max: [600, 'Le temps de repos ne peut pas dépasser 10 minutes'],
      },
    }],
    duration: {
      value: {
        type: Number,
        required: [true, 'Durée requise'],
        min: [1, 'La durée doit être au moins 1'],
        max: [365, 'La durée ne peut pas dépasser 365'],
      },
      unit: {
        type: String,
        enum: ['days', 'weeks', 'months'],
        required: [true, 'Unité de durée requise'],
      },
    },
    gym: {
      type: Schema.Types.ObjectId,
      ref: 'Gym',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Créateur requis'],
    },
    participants: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      progress: {
        type: Number,
        default: 0,
        min: [0, 'Le progrès ne peut pas être négatif'],
        max: [100, 'Le progrès ne peut pas dépasser 100%'],
      },
      completedAt: Date,
    }],
    rewards: {
      points: {
        type: Number,
        default: 0,
        min: [0, 'Les points ne peuvent pas être négatifs'],
        max: [10000, 'Les points ne peuvent pas dépasser 10000'],
      },
      badges: [{
        type: Schema.Types.ObjectId,
        ref: 'Badge',
      }],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: Date,
    endDate: Date,
    maxParticipants: {
      type: Number,
      min: [1, 'Au moins 1 participant requis'],
      max: [10000, 'Maximum 10000 participants'],
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function(val: string[]) {
          return val.length <= 5;
        },
        message: 'Maximum 5 images autorisées',
      },
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function(val: string[]) {
          return val.length <= 10;
        },
        message: 'Maximum 10 tags autorisés',
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        delete (ret as any).__v;
        return ret;
      }
    }
  }
);

challengeSchema.index({ type: 1, difficulty: 1, category: 1 });
challengeSchema.index({ createdBy: 1 });
challengeSchema.index({ gym: 1 });
challengeSchema.index({ isActive: 1 });
challengeSchema.index({ 'participants.user': 1 });
challengeSchema.index({ title: 'text', description: 'text' });

challengeSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

challengeSchema.virtual('completedCount').get(function() {
  return this.participants.filter(p => p.completedAt).length;
});

challengeSchema.methods.isFull = function(): boolean {
  return this.maxParticipants ? this.participants.length >= this.maxParticipants : false;
};

challengeSchema.methods.hasParticipant = function(userId: string): boolean {
  return this.participants.some((p: Participant) => p.user.toString() === userId);
};

export const Challenge = mongoose.model<IChallenge>('Challenge', challengeSchema);