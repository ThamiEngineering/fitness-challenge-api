import { Router } from 'express';
import { ExerciseController } from '../controllers/exercise.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { generalLimiter, createLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validation.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

const createExerciseValidation = [
  body('name').notEmpty().withMessage('Nom de l\'exercice requis'),
  body('description').notEmpty().withMessage('Description requise'),
  body('category').isIn(['cardio', 'strength', 'flexibility', 'balance', 'sports', 'recovery']).withMessage('Catégorie invalide'),
  body('muscleGroups').isArray({ min: 1 }).withMessage('Au moins un groupe musculaire requis'),
  body('difficulty').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Difficulté invalide'),
  body('instructions').isArray({ min: 1 }).withMessage('Au moins une instruction requise'),
  body('caloriesPerMinute').isFloat({ min: 0, max: 50 }).withMessage('Calories par minute invalides'),
];

const updateExerciseValidation = [
  body('name').optional().notEmpty().withMessage('Nom de l\'exercice invalide'),
  body('description').optional().notEmpty().withMessage('Description invalide'),
  body('category').optional().isIn(['cardio', 'strength', 'flexibility', 'balance', 'sports', 'recovery']).withMessage('Catégorie invalide'),
  body('muscleGroups').optional().isArray({ min: 1 }).withMessage('Au moins un groupe musculaire requis'),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Difficulté invalide'),
  body('caloriesPerMinute').optional().isFloat({ min: 0, max: 50 }).withMessage('Calories par minute invalides'),
];

const exerciseIdValidation = [
  param('id').isMongoId().withMessage('ID d\'exercice invalide'),
];

const calculateCaloriesValidation = [
  body('duration').isFloat({ min: 1 }).withMessage('Durée invalide'),
];

const searchValidation = [
  query('q').notEmpty().withMessage('Terme de recherche requis'),
];

const approveValidation = [
  body('approved').isBoolean().withMessage('Statut d\'approbation requis'),
  body('reason').optional().isString().withMessage('Raison invalide'),
];

router.use(generalLimiter);

// Public routes
router.get('/', ExerciseController.getAllExercises);
router.get('/categories', ExerciseController.getExerciseCategories);
router.get('/muscle-groups', ExerciseController.getMuscleGroups);
router.get('/equipment', ExerciseController.getEquipment);
router.get('/search', validate(searchValidation), ExerciseController.searchExercises);
router.get('/recommended', ExerciseController.getRecommendedExercises);
router.get('/:id', validate(exerciseIdValidation), ExerciseController.getExerciseById);

// Exercise tools
router.post('/:id/calculate-calories', validate([...exerciseIdValidation, ...calculateCaloriesValidation]), ExerciseController.calculateCalories);

// Protected routes
router.post('/', authenticate, createLimiter, validate(createExerciseValidation), ExerciseController.createExercise);
router.put('/:id', authenticate, validate([...exerciseIdValidation, ...updateExerciseValidation]), ExerciseController.updateExercise);
router.delete('/:id', authenticate, validate(exerciseIdValidation), ExerciseController.deleteExercise);

// Admin only routes
router.get('/pending-approval', authenticate, authorize('super_admin'), ExerciseController.getPendingExercises);
router.put('/:id/approve', authenticate, authorize('super_admin'), validate([...exerciseIdValidation, ...approveValidation]), ExerciseController.approveExercise);
router.get('/stats', authenticate, authorize('super_admin'), ExerciseController.getExerciseStats);

export default router; 
