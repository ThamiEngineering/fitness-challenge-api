import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { StringValue } from 'ms';
import { User, IUser } from '../models/user.model';
import { AppError } from '../utils/AppError';

interface RegisterData {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  role?: 'super_admin' | 'gym_owner' | 'client';
  phoneNumber?: string;
  dateOfBirth?: Date;
}

interface LoginData {
  email: string;
  password: string;
}

interface TokenPayload {
  id: string;
  role: string;
}

export class AuthService {
  /**
   * Génère un JWT token
   */
  static generateToken(user: IUser): string {
    const payload: TokenPayload = {
      id: user._id.toString(),
      role: user.role,
    };

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const expiresIn = (process.env.JWT_EXPIRE || '7d') as StringValue;
    const options: SignOptions = {
      expiresIn,
    };
    
    return jwt.sign(payload, secret, options);
  }

  /**
   * Génère un refresh token
   */
  static generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  static async register(data: RegisterData): Promise<{ user: IUser; token: string }> {
    const { email, password, username, firstName, lastName, role = 'client', phoneNumber, dateOfBirth } = data;

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new AppError('Cet email est déjà utilisé', 400);
      }
      throw new AppError('Ce nom d\'utilisateur est déjà pris', 400);
    }

    if (role === 'super_admin') {
      throw new AppError('Seuls les super administrateurs peuvent créer d\'autres super administrateurs', 403);
    }

    const user = await User.create({
      email: email.toLowerCase(),
      password,
      username: username.toLowerCase(),
      role,
      profile: {
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth,
      },
    });

    const token = this.generateToken(user);

    user.password = undefined as any;

    return { user, token };
  }

  /**
   * Connexion d'un utilisateur
   */
  static async login(data: LoginData): Promise<{ user: IUser; token: string }> {
    const { email, password } = data;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      throw new AppError('Email ou mot de passe incorrect', 401);
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      throw new AppError('Email ou mot de passe incorrect', 401);
    }

    if (!user.isActive) {
      throw new AppError('Votre compte a été désactivé. Veuillez contacter l\'administrateur', 403);
    }

    const token = this.generateToken(user);

    user.password = undefined as any;

    return { user, token };
  }

  /**
   * Rafraîchir le token
   */
  static async refreshToken(userId: string): Promise<{ token: string }> {
    const user = await User.findById(userId);

    if (!user || !user.isActive) {
      throw new AppError('Utilisateur non trouvé ou inactif', 404);
    }

    const token = this.generateToken(user);

    return { token };
  }

  /**
   * Changer le mot de passe
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    const isPasswordCorrect = await user.comparePassword(currentPassword);

    if (!isPasswordCorrect) {
      throw new AppError('Mot de passe actuel incorrect', 401);
    }

    user.password = newPassword;
    await user.save();
  }

  /**
   * Demander la réinitialisation du mot de passe
   */
  static async forgotPassword(email: string): Promise<{ resetToken: string }> {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new AppError('Aucun utilisateur trouvé avec cet email', 404);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    return { resetToken };
  }

  /**
   * Réinitialiser le mot de passe
   */
  static async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError('Token invalide ou expiré', 400);
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
  }
}