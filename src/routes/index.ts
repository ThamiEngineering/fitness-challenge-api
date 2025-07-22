import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import gymRoutes from './gym.routes';
import exerciseRoutes from './exercise.routes';
import challengeRoutes from './challenge.routes';
import badgeRoutes from './badge.routes';
import trainingRoutes from './training.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/gyms', gymRoutes);
router.use('/exercises', exerciseRoutes);
router.use('/challenges', challengeRoutes);
router.use('/badges', badgeRoutes);
router.use('/trainings', trainingRoutes);

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route non trouvée',
      path: req.originalUrl,
    },
  });
});

export default router; 