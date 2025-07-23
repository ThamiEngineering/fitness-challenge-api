import mongoose, { Document, Schema } from 'mongoose';

export interface IExercise extends Document {
  name: string;
  description: string;
  category: 'cardio' | 'strength' | 'flexibility' | 'balance' | 'sports' | 'recovery';
  muscleGroups: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  instructions: string[];
  benefits: string[];
  images: string[];
  videos: string[];
  caloriesPerMinute: number;
  createdBy: mongoose.Types.ObjectId;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const exerciseSchema = new Schema<IExercise>(
  {
    name: {
      type: String,
      required: [true, 'Nom de l\'exercice requis'],
      unique: true,
      trim: true,
      maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères'],
    },
    description: {
      type: String,
      required: [true, 'Description requise'],
      maxlength: [500, 'La description ne peut pas dépasser 500 caractères'],
    },
    category: {
      type: String,
      required: [true, 'Catégorie requise'],
      enum: {
        values: ['cardio', 'strength', 'flexibility', 'balance', 'sports', 'recovery'],
        message: 'Catégorie invalide',
      },
    },
    muscleGroups: {
      type: [String],
      required: [true, 'Au moins un groupe musculaire requis'],
      validate: {
        validator: function(val: string[]) {
          return val.length > 0 && val.length <= 10;
        },
        message: 'Entre 1 et 10 groupes musculaires requis',
      },
    },
    difficulty: {
      type: String,
      enum: {
        values: ['beginner', 'intermediate', 'advanced'],
        message: 'Difficulté invalide',
      },
      required: [true, 'Difficulté requise'],
    },
    equipment: {
      type: [String],
      default: [],
    },
    instructions: {
      type: [String],
      required: [true, 'Au moins une instruction requise'],
      validate: {
        validator: function(val: string[]) {
          return val.length > 0;
        },
        message: 'Au moins une instruction requise',
      },
    },
    benefits: {
      type: [String],
      default: [],
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
    videos: {
      type: [String],
      default: [],
      validate: {
        validator: function(val: string[]) {
          return val.length <= 3;
        },
        message: 'Maximum 3 vidéos autorisées',
      },
    },
    caloriesPerMinute: {
      type: Number,
      required: [true, 'Calories par minute requises'],
      min: [0, 'Les calories ne peuvent pas être négatives'],
      max: [50, 'Les calories par minute semblent trop élevées'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Créateur requis'],
    },
    isApproved: {
      type: Boolean,
      default: false,
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

exerciseSchema.index({ category: 1, difficulty: 1 });
exerciseSchema.index({ muscleGroups: 1 });
exerciseSchema.index({ createdBy: 1 });
exerciseSchema.index({ isApproved: 1 });
exerciseSchema.index({ name: 'text', description: 'text' });

exerciseSchema.methods.calculateCalories = function(durationMinutes: number): number {
  return Math.round(this.caloriesPerMinute * durationMinutes);
};

export const Exercise = mongoose.model<IExercise>('Exercise', exerciseSchema);