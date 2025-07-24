import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validation.middleware';
import { body } from 'express-validator';

const router = Router();

const registerValidation = [
  body('email').isEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('username').isLength({ min: 3, max: 30 }).withMessage('Le nom d\'utilisateur doit contenir entre 3 et 30 caractères'),
  body('firstName').notEmpty().withMessage('Prénom requis'),
  body('lastName').notEmpty().withMessage('Nom requis'),
  body('role').optional().isIn(['super_admin', 'gym_owner', 'client']).withMessage('Rôle invalide'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
  body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
];

const resetPasswordValidation = [
  body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
];

router.post('/register', authLimiter, validate(registerValidation), AuthController.register);
router.post('/login', authLimiter, validate(loginValidation), AuthController.login);
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);
router.post('/reset-password/:token', authLimiter, validate(resetPasswordValidation), AuthController.resetPassword); 
router.get('/me', authenticate, AuthController.getMe);
router.post('/refresh-token', authenticate, AuthController.refreshToken);
router.put('/change-password', authenticate, validate(changePasswordValidation), AuthController.changePassword);
router.post('/logout', authenticate, AuthController.logout);

export default router; 