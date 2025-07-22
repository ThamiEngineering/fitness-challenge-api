import mongoose, { Document, Schema } from 'mongoose';

export type Subscription = {
  user: mongoose.Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
};

export interface IGym extends Document {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  owner: mongoose.Types.ObjectId;
  capacity: number;
  equipment: string[];
  facilities: string[];
  openingHours: {
    [key: string]: {
      open: string;
      close: string;
      closed?: boolean;
    };
  };
  images: string[];
  isApproved: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rating: {
    average: number;
    count: number;
  };
  challenges: mongoose.Types.ObjectId[];
  subscriptions: {
    user: mongoose.Types.ObjectId;
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
  isUserSubscribed(userId: string): boolean;
}

const gymSchema = new Schema<IGym>(
  {
    name: {
      type: String,
      required: [true, 'Nom de la salle requis'],
      trim: true,
      maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères'],
    },
    description: {
      type: String,
      required: [true, 'Description requise'],
      maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères'],
    },
    address: {
      street: { 
        type: String, 
        required: [true, 'Adresse requise'],
        trim: true,
      },
      city: { 
        type: String, 
        required: [true, 'Ville requise'],
        trim: true,
      },
      postalCode: { 
        type: String, 
        required: [true, 'Code postal requis'],
        trim: true,
      },
      country: { 
        type: String, 
        required: [true, 'Pays requis'],
        trim: true,
      },
      coordinates: {
        lat: {
          type: Number,
          min: [-90, 'Latitude invalide'],
          max: [90, 'Latitude invalide'],
        },
        lng: {
          type: Number,
          min: [-180, 'Longitude invalide'],
          max: [180, 'Longitude invalide'],
        },
      },
    },
    contact: {
      phone: { 
        type: String, 
        required: [true, 'Téléphone requis'],
        match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}$/, 'Numéro de téléphone invalide'],
      },
      email: { 
        type: String, 
        required: [true, 'Email requis'],
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
      },
      website: {
        type: String,
        match: [/^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/, 'URL invalide'],
      },
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Propriétaire requis'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacité requise'],
      min: [1, 'La capacité doit être au moins 1'],
      max: [10000, 'La capacité ne peut pas dépasser 10000'],
    },
    equipment: {
      type: [String],
      default: [],
    },
    facilities: {
      type: [String],
      default: [],
    },
    openingHours: {
      type: Map,
      of: {
        open: { type: String },
        close: { type: String },
        closed: { type: Boolean, default: false },
      },
      default: new Map(),
    },
    images: {
      type: [String],
      default: [],
      validate: [
        {
          validator: function(val: string[]) {
            return val.length <= 10;
          },
          message: 'Maximum 10 images autorisées',
        },
      ],
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rating: {
      average: { 
        type: Number, 
        default: 0, 
        min: [0, 'La note ne peut pas être négative'], 
        max: [5, 'La note ne peut pas dépasser 5'],
      },
      count: { 
        type: Number, 
        default: 0,
        min: [0, 'Le nombre de votes ne peut pas être négatif'],
      },
    },
    challenges: [{
      type: Schema.Types.ObjectId,
      ref: 'Challenge',
    }],
    subscriptions: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      startDate: {
        type: Date,
        required: true,
        default: Date.now,
      },
      endDate: Date,
      isActive: {
        type: Boolean,
        default: true,
      },
    }],
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

gymSchema.index({ owner: 1 });
gymSchema.index({ isApproved: 1 });
gymSchema.index({ 'address.city': 1 });
gymSchema.index({ 'address.coordinates': '2dsphere' });
gymSchema.index({ name: 'text', description: 'text' });

gymSchema.virtual('activeSubscribers').get(function() {
  return this.subscriptions.filter(sub => sub.isActive).length;
});

gymSchema.methods.isUserSubscribed = function(userId: string): boolean {
  return this.subscriptions.some(
    (sub: Subscription) => sub.user.toString() === userId && sub.isActive
  );
};

export const Gym = mongoose.model<IGym>('Gym', gymSchema);