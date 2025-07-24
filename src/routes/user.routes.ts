import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { generalLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validation.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

const updateProfileValidation = [
  body('username').optional().isLength({ min: 3, max: 30 }).withMessage('Le nom d\'utilisateur doit contenir entre 3 et 30 caractères'),
  body('profile.firstName').optional().notEmpty().withMessage('Prénom invalide'),
  body('profile.lastName').optional().notEmpty().withMessage('Nom invalide'),
  body('profile.phoneNumber').optional().isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
  body('profile.dateOfBirth').optional().isISO8601().withMessage('Date de naissance invalide'),
];

const userIdValidation = [
  param('id').isMongoId().withMessage('ID utilisateur invalide'),
];

const searchValidation = [
  query('q').notEmpty().withMessage('Terme de recherche requis'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide'),
];

router.use(generalLimiter);

// Protected routes - User profile
router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, validate(updateProfileValidation), UserController.updateProfile);
router.get('/stats', authenticate, UserController.getStats);

// Protected routes - Social features
router.get('/search', authenticate, validate(searchValidation), UserController.searchUsers);
router.post('/:id/friend', authenticate, validate(userIdValidation), UserController.addFriend);
router.delete('/:id/friend', authenticate, validate(userIdValidation), UserController.removeFriend);
router.get('/friends', authenticate, UserController.getFriends);

// Public routes
router.get('/leaderboard', UserController.getLeaderboard);

// Admin only routes
router.get('/', authenticate, authorize('super_admin'), UserController.getAllUsers);
router.get('/:id', authenticate, authorize('super_admin'), validate(userIdValidation), UserController.getUserById);
router.patch('/:id/toggle-active', authenticate, authorize('super_admin'), validate(userIdValidation), UserController.toggleUserActive);
router.delete('/:id', authenticate, authorize('super_admin'), validate(userIdValidation), UserController.deleteUser);

// Badge management routes (Admin)
router.post('/:id/badges/:badgeId', authenticate, authorize('super_admin'), UserController.awardBadge);
router.delete('/:id/badges/:badgeId', authenticate, authorize('super_admin'), UserController.removeBadge);

export default router; 