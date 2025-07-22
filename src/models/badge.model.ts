import mongoose, { Document, Schema } from 'mongoose';

export interface IBadgeRule {
  type: 'user_stat' | 'challenge_completion' | 'training_count' | 'custom';
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
  value: any;
  value2?: any;
}

export interface IBadge extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  icon: string;
  category: string;
  rules: IBadgeRule[];
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isActive: boolean;
  isAutomatic: boolean;
  createdBy: mongoose.Types.ObjectId;
  earnedCount: number;
  createdAt: Date;
  updatedAt: Date;
  checkUserEligibility(userData: any): boolean;
}

const badgeSchema = new Schema<IBadge>(
  {
    name: {
      type: String,
      required: [true, 'Nom du badge requis'],
      unique: true,
      trim: true,
      maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères'],
    },
    description: {
      type: String,
      required: [true, 'Description requise'],
      maxlength: [200, 'La description ne peut pas dépasser 200 caractères'],
    },
    icon: {
      type: String,
      required: [true, 'Icône requise'],
    },
    category: {
      type: String,
      required: [true, 'Catégorie requise'],
      enum: {
        values: ['achievement', 'milestone', 'social', 'special', 'seasonal'],
        message: 'Catégorie invalide',
      },
    },
    rules: {
      type: [{
        type: {
          type: String,
          required: [true, 'Type de règle requis'],
          enum: ['user_stat', 'challenge_completion', 'training_count', 'custom'],
        },
        field: {
          type: String,
          required: [true, 'Champ requis'],
        },
        operator: {
          type: String,
          enum: ['equals', 'greater_than', 'less_than', 'contains', 'between'],
          required: [true, 'Opérateur requis'],
        },
        value: {
          type: Schema.Types.Mixed,
          required: [true, 'Valeur requise'],
        },
        value2: Schema.Types.Mixed,
      }],
      required: [true, 'Au moins une règle requise'],
      validate: {
        validator: function(val: any[]) {
          return val.length > 0;
        },
        message: 'Au moins une règle requise',
      },
    },
    points: {
      type: Number,
      default: 0,
      min: [0, 'Les points ne peuvent pas être négatifs'],
      max: [1000, 'Les points ne peuvent pas dépasser 1000'],
    },
    rarity: {
      type: String,
      enum: {
        values: ['common', 'rare', 'epic', 'legendary'],
        message: 'Rareté invalide',
      },
      default: 'common',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isAutomatic: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Créateur requis'],
    },
    earnedCount: {
      type: Number,
      default: 0,
      min: [0, 'Le nombre ne peut pas être négatif'],
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

badgeSchema.index({ category: 1, rarity: 1 });
badgeSchema.index({ isActive: 1 });
badgeSchema.index({ createdBy: 1 });
badgeSchema.index({ name: 'text', description: 'text' });

badgeSchema.methods.checkUserEligibility = function(userData: any): boolean {
  for (const rule of this.rules) {
    const fieldValue = this.getFieldValue(userData, rule.field);
    
    if (!this.evaluateRule(fieldValue, rule)) {
      return false;
    }
  }
  
  return true;
};

badgeSchema.methods.getFieldValue = function(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  
  return value;
};

badgeSchema.methods.evaluateRule = function(fieldValue: any, rule: IBadgeRule): boolean {
  switch (rule.operator) {
    case 'equals':
      return fieldValue === rule.value;
    case 'greater_than':
      return Number(fieldValue) > Number(rule.value);
    case 'less_than':
      return Number(fieldValue) < Number(rule.value);
    case 'contains':
      return Array.isArray(fieldValue) && fieldValue.includes(rule.value);
    case 'between':
      return Number(fieldValue) >= Number(rule.value) && Number(fieldValue) <= Number(rule.value2);
    default:
      return false;
  }
};

export const Badge = mongoose.model<IBadge>('Badge', badgeSchema);