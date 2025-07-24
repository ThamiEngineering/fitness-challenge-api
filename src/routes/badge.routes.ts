import { Router } from 'express';
import { BadgeController } from '../controllers/badge.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { generalLimiter, createLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validation.middleware';
import { body, param } from 'express-validator';

const router = Router();

const createBadgeValidation = [
  body('name').notEmpty().withMessage('Nom du badge requis'),
  body('description').notEmpty().withMessage('Description requise'),
  body('icon').notEmpty().withMessage('Icône requise'),
  body('category').isIn(['achievement', 'milestone', 'social', 'special', 'seasonal']).withMessage('Catégorie invalide'),
  body('rarity').isIn(['common', 'rare', 'epic', 'legendary']).withMessage('Rareté invalide'),
  body('points').isInt({ min: 0, max: 1000 }).withMessage('Points invalides (0-1000)'),
  body('rules').isArray({ min: 1 }).withMessage('Au moins une règle requise'),
];

const updateBadgeValidation = [
  body('name').optional().notEmpty().withMessage('Nom du badge invalide'),
  body('description').optional().notEmpty().withMessage('Description invalide'),
  body('category').optional().isIn(['achievement', 'milestone', 'social', 'special', 'seasonal']).withMessage('Catégorie invalide'),
  body('rarity').optional().isIn(['common', 'rare', 'epic', 'legendary']).withMessage('Rareté invalide'),
  body('points').optional().isInt({ min: 0, max: 1000 }).withMessage('Points invalides (0-1000)'),
];

const createCustomBadgeValidation = [
  ...createBadgeValidation,
  body('rules.*.type').isIn(['user_stat', 'challenge_completion', 'training_count', 'custom']).withMessage('Type de règle invalide'),
  body('rules.*.field').notEmpty().withMessage('Champ de règle requis'),
  body('rules.*.operator').isIn(['equals', 'greater_than', 'less_than', 'contains', 'between']).withMessage('Opérateur invalide'),
  body('rules.*.value').exists().withMessage('Valeur de règle requise'),
];

const badgeIdValidation = [
  param('badgeId').isMongoId().withMessage('ID de badge invalide'),
];

const userIdValidation = [
  param('userId').isMongoId().withMessage('ID utilisateur invalide'),
];

router.use(generalLimiter);

router.get('/', BadgeController.getAllBadges);
router.get('/popular', BadgeController.getPopularBadges);
router.get('/categories', BadgeController.getBadgeCategories);
router.get('/rare', BadgeController.getRareBadges);
router.get('/recent-awards', BadgeController.getRecentAwards);
router.get('/user/:userId', validate(userIdValidation), BadgeController.getUserBadges);
router.get('/:id', validate([param('id').isMongoId().withMessage('ID de badge invalide')]), BadgeController.getBadgeById);

router.post('/check/:userId', authenticate, validate(userIdValidation), BadgeController.checkAndAwardBadges);

router.post('/', authenticate, authorize('super_admin'), createLimiter, validate(createBadgeValidation), BadgeController.createBadge);
router.post('/custom', authenticate, authorize('super_admin'), createLimiter, validate(createCustomBadgeValidation), BadgeController.createCustomBadge);
router.put('/:id', authenticate, authorize('super_admin'), validate([param('id').isMongoId(), ...updateBadgeValidation]), BadgeController.updateBadge);
router.delete('/:id', authenticate, authorize('super_admin'), validate([param('id').isMongoId()]), BadgeController.deleteBadge);

router.post('/:badgeId/award/:userId', authenticate, authorize('super_admin'), validate([...badgeIdValidation, ...userIdValidation]), BadgeController.awardBadgeToUser);
router.delete('/:badgeId/remove/:userId', authenticate, authorize('super_admin'), validate([...badgeIdValidation, ...userIdValidation]), BadgeController.removeBadgeFromUser);

router.post('/:badgeId/test/:userId', authenticate, authorize('super_admin'), validate([...badgeIdValidation, ...userIdValidation]), BadgeController.testBadgeRules);

router.get('/stats', authenticate, authorize('super_admin'), BadgeController.getBadgeStats);

export default router; 