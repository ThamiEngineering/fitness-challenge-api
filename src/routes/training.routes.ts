import { Router } from 'express';
import { TrainingController } from '../controllers/training.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { generalLimiter, createLimiter, sensitiveLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validation.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

const createTrainingValidation = [
  body('exercises').isArray({ min: 1 }).withMessage('Au moins un exercice requis'),
  body('exercises.*.exercise').isMongoId().withMessage('ID d\'exercice invalide'),
  body('exercises.*.sets').isArray({ min: 1 }).withMessage('Au moins une série requise'),
  body('startTime').isISO8601().withMessage('Heure de début invalide'),
  body('endTime').isISO8601().withMessage('Heure de fin invalide'),
  body('caloriesBurned').isFloat({ min: 0 }).withMessage('Calories brûlées invalides'),
  body('intensity').isIn(['low', 'moderate', 'high', 'very_high']).withMessage('Intensité invalide'),
  body('mood').optional().isIn(['excellent', 'good', 'neutral', 'tired', 'exhausted']).withMessage('Humeur invalide'),
  body('heartRateAvg').optional().isInt({ min: 30, max: 250 }).withMessage('Fréquence cardiaque moyenne invalide'),
  body('heartRateMax').optional().isInt({ min: 30, max: 250 }).withMessage('Fréquence cardiaque max invalide'),
  body('location.type').optional().isIn(['gym', 'home', 'outdoor', 'other']).withMessage('Type de lieu invalide'),
];

const updateTrainingValidation = [
  body('exercises').optional().isArray({ min: 1 }).withMessage('Au moins un exercice requis'),
  body('exercises.*.exercise').optional().isMongoId().withMessage('ID d\'exercice invalide'),
  body('exercises.*.sets').optional().isArray({ min: 1 }).withMessage('Au moins une série requise'),
  body('startTime').optional().isISO8601().withMessage('Heure de début invalide'),
  body('endTime').optional().isISO8601().withMessage('Heure de fin invalide'),
  body('caloriesBurned').optional().isFloat({ min: 0 }).withMessage('Calories brûlées invalides'),
  body('intensity').optional().isIn(['low', 'moderate', 'high', 'very_high']).withMessage('Intensité invalide'),
  body('mood').optional().isIn(['excellent', 'good', 'neutral', 'tired', 'exhausted']).withMessage('Humeur invalide'),
  body('heartRateAvg').optional().isInt({ min: 30, max: 250 }).withMessage('Fréquence cardiaque moyenne invalide'),
  body('heartRateMax').optional().isInt({ min: 30, max: 250 }).withMessage('Fréquence cardiaque max invalide'),
  body('location.type').optional().isIn(['gym', 'home', 'outdoor', 'other']).withMessage('Type de lieu invalide'),
];

const trainingIdValidation = [
  param('id').isMongoId().withMessage('ID d\'entraînement invalide'),
];

const challengeIdValidation = [
  param('challengeId').isMongoId().withMessage('ID de défi invalide'),
];

const statsValidation = [
  query('period').optional().isIn(['month', 'quarter', 'year']).withMessage('Période invalide'),
  query('year').optional().isInt({ min: 2020, max: 2030 }).withMessage('Année invalide'),
];

const progressValidation = [
  query('exercise').optional().isMongoId().withMessage('ID d\'exercice invalide'),
  query('period').optional().isIn(['1month', '3months', '6months', '1year']).withMessage('Période invalide'),
];

const leaderboardValidation = [
  query('type').optional().isIn(['duration', 'calories', 'frequency']).withMessage('Type de classement invalide'),
  query('period').optional().isIn(['week', 'month', 'year']).withMessage('Période invalide'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite invalide'),
];

const exportValidation = [
  query('format').optional().isIn(['json', 'csv']).withMessage('Format invalide'),
  query('startDate').optional().isISO8601().withMessage('Date de début invalide'),
  query('endDate').optional().isISO8601().withMessage('Date de fin invalide'),
];

router.use(generalLimiter);

router.use(authenticate);

router.get('/stats', validate(statsValidation), TrainingController.getTrainingStats);
router.get('/progress', validate(progressValidation), TrainingController.getProgressAnalysis);
router.get('/export', sensitiveLimiter, validate(exportValidation), TrainingController.exportTrainingData);
router.get('/leaderboard', validate(leaderboardValidation), TrainingController.getTrainingLeaderboard);



router.post('/', createLimiter, validate(createTrainingValidation), TrainingController.createTraining);
router.get('/', TrainingController.getMyTrainings);
router.get('/:id', validate(trainingIdValidation), TrainingController.getTrainingById);
router.put('/:id', validate([...trainingIdValidation, ...updateTrainingValidation]), TrainingController.updateTraining);
router.delete('/:id', validate(trainingIdValidation), TrainingController.deleteTraining);

router.get('/challenge/:challengeId', validate(challengeIdValidation), TrainingController.getChallengeTrainings);



export default router; 