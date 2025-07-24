import { Router } from 'express';
import authRoutes from './auth.routes';
import badgeRoutes from './badge.routes';
import challengeRoutes from './challenge.routes';
import exerciseRoutes from './exercise.routes';
import gymRoutes from './gym.routes';
import trainingRoutes from './training.routes';
import userRoutes from './user.routes';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/gyms', gymRoutes);
router.use('/exercises', exerciseRoutes);
router.use('/challenges', challengeRoutes);
router.use('/badges', badgeRoutes);
router.use('/trainings', trainingRoutes);

router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route non trouvée',
      path: req.originalUrl,
    },
  });
});

export default router; 