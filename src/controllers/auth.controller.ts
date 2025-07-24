import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { AppError } from '../utils/AppError';

export class AuthController {
  /**
   * @desc    Inscription d'un nouvel utilisateur
   * @route   POST /api/auth/register
   * @access  Public
   */
  static register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, username, firstName, lastName, phoneNumber, dateOfBirth, role } = req.body;

    const { user, token } = await AuthService.register({
      email,
      password,
      username,
      firstName,
      lastName,
      role: role ? role : 'client',
      phoneNumber,
      dateOfBirth,
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
      message: 'Inscription réussie',
    });
  });

  /**
   * @desc    Connexion d'un utilisateur
   * @route   POST /api/auth/login
   * @access  Public
   */
  static login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Veuillez fournir un email et un mot de passe', 400);
    }

    const { user, token } = await AuthService.login({ email, password });

    res.status(200).json({
      success: true,
      data: {
        user,
        token,
      },
      message: 'Connexion réussie',
    });
  });

  /**
   * @desc    Obtenir l'utilisateur actuel
   * @route   GET /api/auth/me
   * @access  Private
   */
  static getMe = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  });

  /**
   * @desc    Rafraîchir le token
   * @route   POST /api/auth/refresh-token
   * @access  Private
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const { token } = await AuthService.refreshToken(userId.toString());

    res.status(200).json({
      success: true,
      data: {
        token,
      },
      message: 'Token rafraîchi avec succès',
    });
  });

  /**
   * @desc    Changer le mot de passe
   * @route   PUT /api/auth/change-password
   * @access  Private
   */
  static changePassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    if (!currentPassword || !newPassword) {
      throw new AppError('Veuillez fournir le mot de passe actuel et le nouveau mot de passe', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('Le nouveau mot de passe doit contenir au moins 6 caractères', 400);
    }

    await AuthService.changePassword(userId.toString(), currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Mot de passe modifié avec succès',
    });
  });

  /**
   * @desc    Demander la réinitialisation du mot de passe
   * @route   POST /api/auth/forgot-password
   * @access  Public
   */
  static forgotPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Veuillez fournir un email', 400);
    }

    const { resetToken } = await AuthService.forgotPassword(email);

    const message = process.env.NODE_ENV === 'production'
      ? 'Un email de réinitialisation a été envoyé'
      : `Token de réinitialisation: ${resetToken}`;

    res.status(200).json({
      success: true,
      message,
      ...(process.env.NODE_ENV !== 'production' && { resetToken }),
    });
  });

  /**
   * @desc    Réinitialiser le mot de passe
   * @route   POST /api/auth/reset-password/:token
   * @access  Public
   */
  static resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      throw new AppError('Veuillez fournir un nouveau mot de passe', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('Le mot de passe doit contenir au moins 6 caractères', 400);
    }

    await AuthService.resetPassword(token, newPassword);

    res.status(200).json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
    });
  });

  /**
   * @desc    Déconnexion (côté client)
   * @route   POST /api/auth/logout
   * @access  Private
   */
  static logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie',
    });
  });
}