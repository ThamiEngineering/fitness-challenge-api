import mongoose, { Document, Schema } from 'mongoose';

export interface ITraining extends Document {
  user: mongoose.Types.ObjectId;
  challenge?: mongoose.Types.ObjectId;
  gym?: mongoose.Types.ObjectId;
  exercises: {
    exercise: mongoose.Types.ObjectId;
    sets: {
      reps?: number;
      weight?: number;
      duration?: number;
      distance?: number;
      restTime?: number;
    }[];
    notes?: string;
  }[];
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  caloriesBurned: number;
  notes?: string;
  mood?: 'excellent' | 'good' | 'neutral' | 'tired' | 'exhausted';
  intensity: 'low' | 'moderate' | 'high' | 'very_high';
  heartRateAvg?: number;
  heartRateMax?: number;
  location?: {
    type: 'gym' | 'home' | 'outdoor' | 'other';
    name?: string;
  };
  weather?: {
    condition?: string;
    temperature?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const trainingSchema = new Schema<ITraining>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Utilisateur requis'],
    },
    challenge: {
      type: Schema.Types.ObjectId,
      ref: 'Challenge',
    },
    gym: {
      type: Schema.Types.ObjectId,
      ref: 'Gym',
    },
    exercises: {
      type: [{
        exercise: {
          type: Schema.Types.ObjectId,
          ref: 'Exercise',
          required: [true, 'Exercice requis'],
        },
        sets: {
          type: [{
            reps: {
              type: Number,
              min: [0, 'Les répétitions ne peuvent pas être négatives'],
              max: [9999, 'Les répétitions semblent trop élevées'],
            },
            weight: {
              type: Number,
              min: [0, 'Le poids ne peut pas être négatif'],
              max: [9999, 'Le poids semble trop élevé'],
            },
            duration: {
              type: Number,
              min: [0, 'La durée ne peut pas être négative'],
              max: [3600, 'La durée ne peut pas dépasser 1 heure par série'],
            },
            distance: {
              type: Number,
              min: [0, 'La distance ne peut pas être négative'],
              max: [999999, 'La distance semble trop élevée'],
            },
            restTime: {
              type: Number,
              min: [0, 'Le temps de repos ne peut pas être négatif'],
              max: [600, 'Le temps de repos ne peut pas dépasser 10 minutes'],
            },
          }],
          required: [true, 'Au moins une série requise'],
          validate: {
            validator: function(val: any[]) {
              return val.length > 0;
            },
            message: 'Au moins une série requise',
          },
        },
        notes: {
          type: String,
          maxlength: [200, 'Les notes ne peuvent pas dépasser 200 caractères'],
        },
      }],
      required: [true, 'Au moins un exercice requis'],
      validate: {
        validator: function(val: any[]) {
          return val.length > 0;
        },
        message: 'Au moins un exercice requis',
      },
    },
    startTime: {
      type: Date,
      required: [true, 'Heure de début requise'],
    },
    endTime: {
      type: Date,
      required: [true, 'Heure de fin requise'],
      validate: {
        validator: function(this: ITraining, val: Date) {
          return val > this.startTime;
        },
        message: 'L\'heure de fin doit être après l\'heure de début',
      },
    },
    totalDuration: {
      type: Number,
      required: [true, 'Durée totale requise'],
      min: [1, 'La durée doit être au moins 1 minute'],
      max: [1440, 'La durée ne peut pas dépasser 24 heures'],
    },
    caloriesBurned: {
      type: Number,
      required: [true, 'Calories brûlées requises'],
      min: [0, 'Les calories ne peuvent pas être négatives'],
      max: [9999, 'Les calories semblent trop élevées'],
    },
    notes: {
      type: String,
      maxlength: [500, 'Les notes ne peuvent pas dépasser 500 caractères'],
    },
    mood: {
      type: String,
      enum: {
        values: ['excellent', 'good', 'neutral', 'tired', 'exhausted'],
        message: 'Humeur invalide',
      },
    },
    intensity: {
      type: String,
      enum: {
        values: ['low', 'moderate', 'high', 'very_high'],
        message: 'Intensité invalide',
      },
      required: [true, 'Intensité requise'],
    },
    heartRateAvg: {
      type: Number,
      min: [30, 'La fréquence cardiaque semble trop basse'],
      max: [250, 'La fréquence cardiaque semble trop élevée'],
    },
    heartRateMax: {
      type: Number,
      min: [30, 'La fréquence cardiaque semble trop basse'],
      max: [250, 'La fréquence cardiaque semble trop élevée'],
      validate: {
        validator: function(this: ITraining, val: number) {
          return !this.heartRateAvg || val >= this.heartRateAvg;
        },
        message: 'La fréquence cardiaque max doit être supérieure ou égale à la moyenne',
      },
    },
    location: {
      type: {
        type: String,
        enum: ['gym', 'home', 'outdoor', 'other'],
      },
      name: String,
    },
    weather: {
      condition: String,
      temperature: {
        type: Number,
        min: [-50, 'La température semble trop basse'],
        max: [60, 'La température semble trop élevée'],
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

trainingSchema.index({ user: 1, createdAt: -1 });
trainingSchema.index({ challenge: 1 });
trainingSchema.index({ gym: 1 });
trainingSchema.index({ startTime: 1, endTime: 1 });
trainingSchema.index({ 'exercises.exercise': 1 });

trainingSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    this.totalDuration = Math.round((this.endTime.getTime() - this.startTime.getTime()) / 60000);
  }
  next();
});

trainingSchema.virtual('totalVolume').get(function() {
  let volume = 0;
  this.exercises.forEach(ex => {
    ex.sets.forEach(set => {
      if (set.weight && set.reps) {
        volume += set.weight * set.reps;
      }
    });
  });
  return volume;
});

trainingSchema.virtual('totalSets').get(function() {
  return (this.exercises || []).reduce(
    (total, ex) => total + ((ex.sets || []).length),
    0
  );
});

export const Training = mongoose.model<ITraining>('Training', trainingSchema);