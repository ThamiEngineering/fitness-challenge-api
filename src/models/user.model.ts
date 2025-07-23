import bcrypt from 'bcryptjs';
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  username: string;
  role: 'super_admin' | 'gym_owner' | 'client';
  profile: {
    firstName: string;
    lastName: string;
    dateOfBirth?: Date;
    phoneNumber?: string;
    avatar?: string;
  };
  isActive: boolean;
  emailVerified: boolean;
  stats: {
    totalChallenges: number;
    completedChallenges: number;
    totalCaloriesBurned: number;
    totalWorkoutMinutes: number;
    score: number;
  };
  badges: mongoose.Types.ObjectId[];
  friends: mongoose.Types.ObjectId[];
  gyms?: mongoose.Types.ObjectId[];
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email requis'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
    },
    password: {
      type: String,
      required: [true, 'Mot de passe requis'],
      minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
      select: false,
    },
    username: {
      type: String,
      required: [true, 'Nom d\'utilisateur requis'],
      unique: true,
      trim: true,
      minlength: [3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'],
      maxlength: [30, 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères'],
    },
    role: {
      type: String,
      enum: ['super_admin', 'gym_owner', 'client'],
      default: 'client',
    },
    profile: {
      firstName: { 
        type: String, 
        required: [true, 'Prénom requis'],
        trim: true,
      },
      lastName: { 
        type: String, 
        required: [true, 'Nom requis'],
        trim: true,
      },
      dateOfBirth: Date,
      phoneNumber: {
        type: String,
        match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}$/, 'Numéro de téléphone invalide'],
      },
      avatar: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    stats: {
      totalChallenges: { type: Number, default: 0 },
      completedChallenges: { type: Number, default: 0 },
      totalCaloriesBurned: { type: Number, default: 0 },
      totalWorkoutMinutes: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
    },
    badges: [{ type: Schema.Types.ObjectId, ref: 'Badge' }],
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    gyms: [{ type: Schema.Types.ObjectId, ref: 'Gym' }],
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        delete (ret as any).password;
        delete (ret as any).__v;
        return ret;
      }
    }
  }
);

// email et username ont déjà des index via unique: true
userSchema.index({ role: 1 });
userSchema.index({ 'profile.firstName': 1, 'profile.lastName': 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

export const User = mongoose.model<IUser>('User', userSchema);