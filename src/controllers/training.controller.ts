import { Request, Response, NextFunction } from 'express';
import { Training, ITraining } from '../models/training.model';
import { User } from '../models/user.model';
import { Challenge } from '../models/challenge.model';
import { BadgeService } from '../services/badge.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { AppError } from '../utils/AppError';

interface TrainingCreateData {
  challenge?: string;
  gym?: string;
  exercises: {
    exercise: string;
    sets: {
      reps?: number;
      weight?: number;
      duration?: number;
      distance?: number;
      restTime?: number;
    }[];
    notes?: string;
  }[];
  startTime: Date;
  endTime: Date;
  caloriesBurned: number;
  notes?: string;
  mood?: 'excellent' | 'good' | 'neutral' | 'tired' | 'exhausted';
  intensity: 'low' | 'moderate' | 'high' | 'very_high';
  heartRateAvg?: number;
  heartRateMax?: number;
  location?: {
    type: 'gym' | 'home' | 'outdoor' | 'other';
    name?: string;
  };
  weather?: {
    condition?: string;
    temperature?: number;
  };
}

export class TrainingController {
  /**
   * @desc    Créer un nouvel entraînement
   * @route   POST /api/trainings
   * @access  Private
   */
  static createTraining = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const trainingData: TrainingCreateData = {
      ...req.body,
      user: userId,
    };

    const training = await Training.create(trainingData);

    await training.populate([
      { path: 'exercises.exercise', select: 'name category caloriesPerMinute' },
      { path: 'challenge', select: 'title type difficulty' },
      { path: 'gym', select: 'name address.city' },
    ]);

    await User.findByIdAndUpdate(userId, {
      $inc: {
        'stats.totalWorkoutMinutes': training.totalDuration,
        'stats.totalCaloriesBurned': training.caloriesBurned,
      },
    });

    try {
      await BadgeService.checkAndAwardBadges(userId.toString());
    } catch (error) {
      console.error('Erreur lors de la vérification des badges:', error);
    }

    res.status(201).json({
      success: true,
      data: {
        training,
      },
      message: 'Entraînement enregistré avec succès',
    });
  });

  /**
   * @desc    Obtenir tous les entraînements de l'utilisateur connecté
   * @route   GET /api/trainings?challenge=id&gym=id&page=1&limit=20&sortBy=recent
   * @access  Private
   */
  static getMyTrainings = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
      challenge,
      gym,
      intensity,
      mood,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'recent'
    } = req.query;

    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const query: any = { user: userId };

    if (challenge) query.challenge = challenge;
    if (gym) query.gym = gym;
    if (intensity) query.intensity = intensity;
    if (mood) query.mood = mood;
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate as string);
      if (endDate) query.startTime.$lte = new Date(endDate as string);
    }



    const [trainings, total] = await Promise.all([
      Training.find(query)
        .populate('exercises.exercise', 'name category caloriesPerMinute')
        .populate('challenge', 'title type difficulty')
        .populate('gym', 'name address.city')
        .limit(Number(limit)),
      Training.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        trainings,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  });

  /**
   * @desc    Obtenir un entraînement par ID
   * @route   GET /api/trainings/:id
   * @access  Private
   */
  static getTrainingById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const training = await Training.findById(req.params.id)
      .populate('user', 'username profile.firstName profile.lastName')
      .populate('exercises.exercise', 'name category muscleGroups caloriesPerMinute')
      .populate('challenge', 'title type difficulty')
      .populate('gym', 'name address');

    if (!training) {
      throw new AppError('Entraînement non trouvé', 404);
    }

    if (
      req.user?.role !== 'super_admin' &&
      training.user._id.toString() !== req.user?._id.toString()
    ) {
      throw new AppError('Vous n\'êtes pas autorisé à voir cet entraînement', 403);
    }

    res.status(200).json({
      success: true,
      data: {
        training,
      },
    });
  });

  /**
   * @desc    Mettre à jour un entraînement
   * @route   PUT /api/trainings/:id
   * @access  Private (Propriétaire uniquement)
   */
  static updateTraining = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const training = await Training.findById(req.params.id);

    if (!training) {
      throw new AppError('Entraînement non trouvé', 404);
    }

    if (training.user.toString() !== req.user?._id.toString()) {
      throw new AppError('Vous ne pouvez modifier que vos propres entraînements', 403);
    }

    const oldCalories = training.caloriesBurned;
    const oldDuration = training.totalDuration;

    const updatedTraining = await Training.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate([
      { path: 'exercises.exercise', select: 'name category caloriesPerMinute' },
      { path: 'challenge', select: 'title type difficulty' },
      { path: 'gym', select: 'name address.city' },
    ]);

    const calorieDiff = updatedTraining!.caloriesBurned - oldCalories;
    const durationDiff = updatedTraining!.totalDuration - oldDuration;

    if (calorieDiff !== 0 || durationDiff !== 0) {
      await User.findByIdAndUpdate(req.user?._id, {
        $inc: {
          'stats.totalWorkoutMinutes': durationDiff,
          'stats.totalCaloriesBurned': calorieDiff,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        training: updatedTraining,
      },
      message: 'Entraînement mis à jour avec succès',
    });
  });

  /**
   * @desc    Supprimer un entraînement
   * @route   DELETE /api/trainings/:id
   * @access  Private (Propriétaire uniquement)
   */
  static deleteTraining = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const training = await Training.findById(req.params.id);

    if (!training) {
      throw new AppError('Entraînement non trouvé', 404);
    }

    if (training.user.toString() !== req.user?._id.toString()) {
      throw new AppError('Vous ne pouvez supprimer que vos propres entraînements', 403);
    }

    await User.findByIdAndUpdate(req.user?._id, {
      $inc: {
        'stats.totalWorkoutMinutes': -training.totalDuration,
        'stats.totalCaloriesBurned': -training.caloriesBurned,
      },
    });

    await training.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Entraînement supprimé avec succès',
    });
  });

  /**
   * @desc    Obtenir les statistiques d'entraînement de l'utilisateur
   * @route   GET /api/trainings/stats?period=month&year=2024
   * @access  Private
   */
  static getTrainingStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { period = 'month', year = new Date().getFullYear() } = req.query;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const startDate = new Date(Number(year), 0, 1);
    const endDate = new Date(Number(year) + 1, 0, 1);

    const [
      totalStats,
      monthlyStats,
      exerciseStats,
      intensityStats,
      moodStats
    ] = await Promise.all([
      Training.aggregate([
        { $match: { user: userId, createdAt: { $gte: startDate, $lt: endDate } } },
        {
          $group: {
            _id: null,
            totalTrainings: { $sum: 1 },
            totalDuration: { $sum: '$totalDuration' },
            totalCalories: { $sum: '$caloriesBurned' },
            avgDuration: { $avg: '$totalDuration' },
            avgCalories: { $avg: '$caloriesBurned' },
            avgHeartRate: { $avg: '$heartRateAvg' },
          }
        }
      ]),
      Training.aggregate([
        { $match: { user: userId, createdAt: { $gte: startDate, $lt: endDate } } },
        {
          $group: {
            _id: { $month: '$createdAt' },
            count: { $sum: 1 },
            totalDuration: { $sum: '$totalDuration' },
            totalCalories: { $sum: '$caloriesBurned' },
            avgIntensity: { $avg: { $cond: [
              { $eq: ['$intensity', 'low'] }, 1,
              { $cond: [
                { $eq: ['$intensity', 'moderate'] }, 2,
                { $cond: [
                  { $eq: ['$intensity', 'high'] }, 3, 4
                ]}
              ]}
            ]}},
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Training.aggregate([
        { $match: { user: userId, createdAt: { $gte: startDate, $lt: endDate } } },
        { $unwind: '$exercises' },
        {
          $group: {
            _id: '$exercises.exercise',
            count: { $sum: 1 },
            totalSets: { $sum: { $size: '$exercises.sets' } },
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'exercises',
            localField: '_id',
            foreignField: '_id',
            as: 'exercise'
          }
        },
        { $unwind: '$exercise' }
      ]),
      Training.aggregate([
        { $match: { user: userId, createdAt: { $gte: startDate, $lt: endDate } } },
        {
          $group: {
            _id: '$intensity',
            count: { $sum: 1 },
            avgDuration: { $avg: '$totalDuration' },
            avgCalories: { $avg: '$caloriesBurned' },
          }
        }
      ]),
      Training.aggregate([
        { $match: { user: userId, mood: { $exists: true }, createdAt: { $gte: startDate, $lt: endDate } } },
        {
          $group: {
            _id: '$mood',
            count: { $sum: 1 },
          }
        }
      ])
    ]);

    const stats = totalStats[0] || {
      totalTrainings: 0,
      totalDuration: 0,
      totalCalories: 0,
      avgDuration: 0,
      avgCalories: 0,
      avgHeartRate: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        overview: {
          ...stats,
          avgDuration: Math.round(stats.avgDuration),
          avgCalories: Math.round(stats.avgCalories),
          avgHeartRate: Math.round(stats.avgHeartRate),
        },
        monthlyStats,
        exerciseStats,
        intensityStats,
        moodStats,
        period: {
          year: Number(year),
          type: period,
        },
      },
    });
  });

  /**
   * @desc    Obtenir l'historique des entraînements pour un défi
   * @route   GET /api/trainings/challenge/:challengeId
   * @access  Private
   */
  static getChallengeTrainings = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { challengeId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      throw new AppError('Défi non trouvé', 404);
    }

    const isParticipant = challenge.participants.some(
      p => p.user.toString() === userId.toString()
    );

    if (!isParticipant && req.user?.role !== 'super_admin') {
      throw new AppError('Vous devez participer à ce défi pour voir les entraînements', 403);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [trainings, total] = await Promise.all([
      Training.find({ user: userId, challenge: challengeId })
        .populate('exercises.exercise', 'name category')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Training.countDocuments({ user: userId, challenge: challengeId }),
    ]);

    const challengeStats = await Training.aggregate([
      { $match: { user: userId, challenge: challenge._id } },
      {
        $group: {
          _id: null,
          totalTrainings: { $sum: 1 },
          totalDuration: { $sum: '$totalDuration' },
          totalCalories: { $sum: '$caloriesBurned' },
        }
      }
    ]);

    const stats = challengeStats[0] || {
      totalTrainings: 0,
      totalDuration: 0,
      totalCalories: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        trainings,
        challenge: {
          _id: challenge._id,
          title: challenge.title,
          type: challenge.type,
          difficulty: challenge.difficulty,
        },
        stats,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  });

  /**
   * @desc    Obtenir l'analyse de progression
   * @route   GET /api/trainings/progress?exercise=id&period=3months
   * @access  Private
   */
  static getProgressAnalysis = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { exercise, period = '3months' } = req.query;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    let startDate: Date;
    switch (period) {
      case '1month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6months':
        startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    }

    const matchStage: any = { 
      user: userId, 
      createdAt: { $gte: startDate } 
    };

    if (exercise) {
      matchStage['exercises.exercise'] = exercise;
    }

    const progressData = await Training.aggregate([
      { $match: matchStage },
      { $unwind: '$exercises' },
      ...(exercise ? [{ $match: { 'exercises.exercise': exercise } }] : []),
      { $unwind: '$exercises.sets' },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            exercise: '$exercises.exercise'
          },
          maxWeight: { $max: '$exercises.sets.weight' },
          totalReps: { $sum: '$exercises.sets.reps' },
          maxDuration: { $max: '$exercises.sets.duration' },
          totalDistance: { $sum: '$exercises.sets.distance' },
          totalSets: { $sum: 1 },
        }
      },
      { $sort: { '_id.date': 1 } },
      {
        $lookup: {
          from: 'exercises',
          localField: '_id.exercise',
          foreignField: '_id',
          as: 'exerciseInfo'
        }
      },
      { $unwind: '$exerciseInfo' }
    ]);

    res.status(200).json({
      success: true,
      data: {
        progressData,
        period,
        exercise,
        analysis: {
          totalSessions: progressData.length,
          dateRange: {
            start: startDate,
            end: new Date(),
          },
        },
      },
    });
  });

  /**
   * @desc    Obtenir le classement des entraînements
   * @route   GET /api/trainings/leaderboard?type=duration&period=month&limit=10
   * @access  Public
   */
  static getTrainingLeaderboard = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { type = 'duration', period = 'month', limit = 10 } = req.query;

    let startDate: Date;
    switch (period) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    let groupStage: any;
    let sortStage: any;

    switch (type) {
      case 'duration':
        groupStage = {
          _id: '$user',
          totalDuration: { $sum: '$totalDuration' },
          totalTrainings: { $sum: 1 },
        };
        sortStage = { totalDuration: -1 };
        break;
      case 'calories':
        groupStage = {
          _id: '$user',
          totalCalories: { $sum: '$caloriesBurned' },
          totalTrainings: { $sum: 1 },
        };
        sortStage = { totalCalories: -1 };
        break;
      case 'frequency':
        groupStage = {
          _id: '$user',
          totalTrainings: { $sum: 1 },
          totalDuration: { $sum: '$totalDuration' },
        };
        sortStage = { totalTrainings: -1 };
        break;
      default:
        groupStage = {
          _id: '$user',
          totalDuration: { $sum: '$totalDuration' },
          totalTrainings: { $sum: 1 },
        };
        sortStage = { totalDuration: -1 };
    }

    const leaderboard = await Training.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: groupStage },
      { $sort: sortStage },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            { $project: { username: 1, 'profile.firstName': 1, 'profile.lastName': 1, 'profile.avatar': 1 } }
          ]
        }
      },
      { $unwind: '$user' }
    ]);

    res.status(200).json({
      success: true,
      data: {
        leaderboard,
        type,
        period,
        dateRange: {
          start: startDate,
          end: new Date(),
        },
      },
    });
  });

  /**
   * @desc    Exporter les données d'entraînement
   * @route   GET /api/trainings/export?format=json&startDate=2024-01-01&endDate=2024-12-31
   * @access  Private
   */
  static exportTrainingData = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { format = 'json', startDate, endDate } = req.query;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const query: any = { user: userId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const trainings = await Training.find(query)
      .populate('exercises.exercise', 'name category muscleGroups')
      .populate('challenge', 'title type')
      .populate('gym', 'name address.city')
      .sort('-createdAt');

    if (format === 'csv') {
      throw new AppError('Format CSV non encore implémenté', 501);
    }

    res.status(200).json({
      success: true,
      data: {
        trainings,
        count: trainings.length,
        exportDate: new Date(),
        format,
      },
    });
  });
} 