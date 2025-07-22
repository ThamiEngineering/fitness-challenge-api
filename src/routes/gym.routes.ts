import { Router } from 'express';
import { GymController } from '../controllers/gym.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { generalLimiter, createLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validation.middleware';
import { body, param } from 'express-validator';

const router = Router();

const createGymValidation = [
  body('name').notEmpty().withMessage('Nom de la salle requis'),
  body('description').notEmpty().withMessage('Description requise'),
  body('address.street').notEmpty().withMessage('Adresse requise'),
  body('address.city').notEmpty().withMessage('Ville requise'),
  body('address.postalCode').notEmpty().withMessage('Code postal requis'),
  body('address.country').notEmpty().withMessage('Pays requis'),
  body('contact.phone').isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
  body('contact.email').isEmail().withMessage('Email invalide'),
  body('contact.website').optional().isURL().withMessage('URL du site web invalide'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacité invalide'),
];

const updateGymValidation = [
  body('name').optional().notEmpty().withMessage('Nom de la salle invalide'),
  body('description').optional().notEmpty().withMessage('Description invalide'),
  body('contact.phone').optional().isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
  body('contact.email').optional().isEmail().withMessage('Email invalide'),
  body('contact.website').optional().isURL().withMessage('URL du site web invalide'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacité invalide'),
];

const gymIdValidation = [
  param('id').isMongoId().withMessage('ID de salle invalide'),
];

const approveValidation = [
  body('approved').isBoolean().withMessage('Statut d\'approbation requis'),
  body('reason').optional().isString().withMessage('Raison invalide'),
];

router.use(generalLimiter);

// Public routes
router.get('/', GymController.getAllGyms);
router.get('/:id', validate(gymIdValidation), GymController.getGymById);

// Protected routes
router.post('/', authenticate, authorize('super_admin', 'gym_owner'), createLimiter, validate(createGymValidation), GymController.createGym);
router.put('/:id', authenticate, validate([...gymIdValidation, ...updateGymValidation]), GymController.updateGym);
router.delete('/:id', authenticate, validate(gymIdValidation), GymController.deleteGym);

// Subscription routes
router.post('/:id/subscribe', authenticate, validate(gymIdValidation), GymController.subscribeToGym);
router.post('/:id/unsubscribe', authenticate, validate(gymIdValidation), GymController.unsubscribeFromGym);

// User gym routes
router.get('/my-gyms', authenticate, GymController.getMyGyms);

// Admin only routes
router.get('/pending-approval', authenticate, authorize('super_admin'), GymController.getPendingGyms);
router.put('/:id/approve', authenticate, authorize('super_admin'), validate([...gymIdValidation, ...approveValidation]), GymController.approveGym);
router.get('/stats', authenticate, authorize('super_admin'), GymController.getGymStats);

export default router; 