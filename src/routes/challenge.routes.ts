import { Router } from 'express';
import { ChallengeController } from '../controllers/challenge.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { generalLimiter, createLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validation.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

const createChallengeValidation = [
  body('title').notEmpty().withMessage('Titre du défi requis'),
  body('description').notEmpty().withMessage('Description requise'),
  body('type').isIn(['individual', 'team', 'social']).withMessage('Type de défi invalide'),
  body('difficulty').isIn(['easy', 'medium', 'hard', 'extreme']).withMessage('Difficulté invalide'),
  body('category').isIn(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness', 'rehabilitation']).withMessage('Catégorie invalide'),
  body('objectives').isArray({ min: 1 }).withMessage('Au moins un objectif requis'),
  body('exercises').isArray().withMessage('Liste d\'exercices requise'),
  body('duration.value').isInt({ min: 1 }).withMessage('Durée invalide'),
  body('duration.unit').isIn(['days', 'weeks', 'months']).withMessage('Unité de durée invalide'),
  body('rewards.points').isInt({ min: 0 }).withMessage('Points de récompense invalides'),
];

const updateChallengeValidation = [
  body('title').optional().notEmpty().withMessage('Titre du défi invalide'),
  body('description').optional().notEmpty().withMessage('Description invalide'),
  body('type').optional().isIn(['individual', 'team', 'social']).withMessage('Type de défi invalide'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard', 'extreme']).withMessage('Difficulté invalide'),
  body('category').optional().isIn(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness', 'rehabilitation']).withMessage('Catégorie invalide'),
];

const challengeIdValidation = [
  param('id').isMongoId().withMessage('ID de défi invalide'),
];

const updateProgressValidation = [
  body('progress').isFloat({ min: 0, max: 100 }).withMessage('Progression invalide (0-100)'),
];

const inviteFriendsValidation = [
  body('friendIds').isArray({ min: 1 }).withMessage('Liste d\'amis requise'),
  body('friendIds.*').isMongoId().withMessage('ID d\'ami invalide'),
];

const searchValidation = [
  query('q').notEmpty().withMessage('Terme de recherche requis'),
];

router.use(generalLimiter);

// Public routes
router.get('/', ChallengeController.getAllChallenges);
router.get('/search', validate(searchValidation), ChallengeController.searchChallenges);
router.get('/trending', ChallengeController.getTrendingChallenges);
router.get('/:id', validate(challengeIdValidation), ChallengeController.getChallengeById);
router.get('/:id/participants', validate(challengeIdValidation), ChallengeController.getChallengeParticipants);
router.get('/:id/leaderboard', validate(challengeIdValidation), ChallengeController.getChallengeLeaderboard);

// Protected routes
router.post('/', authenticate, createLimiter, validate(createChallengeValidation), ChallengeController.createChallenge);
router.put('/:id', authenticate, validate([...challengeIdValidation, ...updateChallengeValidation]), ChallengeController.updateChallenge);
router.delete('/:id', authenticate, validate(challengeIdValidation), ChallengeController.deleteChallenge);

// Participation routes
router.post('/:id/join', authenticate, validate(challengeIdValidation), ChallengeController.joinChallenge);
router.post('/:id/leave', authenticate, validate(challengeIdValidation), ChallengeController.leaveChallenge);
router.put('/:id/progress', authenticate, validate([...challengeIdValidation, ...updateProgressValidation]), ChallengeController.updateProgress);

// Social features
router.post('/:id/invite', authenticate, validate([...challengeIdValidation, ...inviteFriendsValidation]), ChallengeController.inviteFriends);

// User challenge routes
router.get('/my-challenges', authenticate, ChallengeController.getMyChallenges);

// Stats routes (Creator or Admin)
router.get('/:id/stats', authenticate, validate(challengeIdValidation), ChallengeController.getChallengeStats);

export default router; 