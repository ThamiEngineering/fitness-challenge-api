import { Request, Response, NextFunction } from 'express';
import { Exercise, IExercise } from '../models/exercise.model';
import { User } from '../models/user.model';
import { asyncHandler } from '../middlewares/error.middleware';
import { AppError } from '../utils/AppError';

interface ExerciseCreateData {
  name: string;
  description: string;
  category: 'cardio' | 'strength' | 'flexibility' | 'balance' | 'sports' | 'recovery';
  muscleGroups: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  instructions: string[];
  benefits: string[];
  images?: string[];
  videos?: string[];
  caloriesPerMinute: number;
}

export class ExerciseController {
  /**
   * @desc    Créer un nouvel exercice
   * @route   POST /api/exercises
   * @access  Private
   */
  static createExercise = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
      name,
      description,
      category,
      muscleGroups,
      difficulty,
      equipment,
      instructions,
      benefits,
      images,
      videos,
      caloriesPerMinute
    }: ExerciseCreateData = req.body;

    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const existingExercise = await Exercise.findOne({ name: name.trim() });
    if (existingExercise) {
      throw new AppError('Un exercice avec ce nom existe déjà', 400);
    }

    const exercise = await Exercise.create({
      name: name.trim(),
      description,
      category,
      muscleGroups,
      difficulty,
      equipment: equipment || [],
      instructions,
      benefits: benefits || [],
      images: images || [],
      videos: videos || [],
      caloriesPerMinute,
      createdBy: userId,
      isApproved: req.user?.role === 'super_admin',
    });

    res.status(201).json({
      success: true,
      data: {
        exercise,
      },
      message: req.user?.role === 'super_admin' 
        ? 'Exercice créé et approuvé avec succès'
        : 'Exercice créé avec succès. En attente d\'approbation.',
    });
  });

  /**
   * @desc    Obtenir tous les exercices avec filtres
   * @route   GET /api/exercises?category=cardio&difficulty=beginner&muscleGroups=legs&page=1&limit=20
   * @access  Public
   */
  static getAllExercises = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
      category,
      difficulty,
      muscleGroups,
      equipment,
      isApproved,
      search,
      page = 1,
      limit = 20,
      sortBy = 'name'
    } = req.query;

    const query: any = {};

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (muscleGroups) {
      const muscleArray = Array.isArray(muscleGroups) ? muscleGroups : [muscleGroups];
      query.muscleGroups = { $in: muscleArray };
    }
    if (equipment) {
      const equipmentArray = Array.isArray(equipment) ? equipment : [equipment];
      query.equipment = { $in: equipmentArray };
    }
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { muscleGroups: { $in: [new RegExp(search as string, 'i')] } },
      ];
    }

    if (!req.user || req.user.role === 'client') {
      query.isApproved = true;
    }

    const skip = (Number(page) - 1) * Number(limit);

    let sort: any = {};
    switch (sortBy) {
      case 'name':
        sort = { name: 1 };
        break;
      case 'difficulty':
        sort = { difficulty: 1 };
        break;
      case 'category':
        sort = { category: 1 };
        break;
      case 'calories':
        sort = { caloriesPerMinute: -1 };
        break;
      case 'recent':
        sort = { createdAt: -1 };
        break;
      default:
        sort = { name: 1 };
    }

    const [exercises, total] = await Promise.all([
      Exercise.find(query)
        .populate('createdBy', 'username profile.firstName profile.lastName')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Exercise.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        exercises,
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
   * @desc    Obtenir un exercice par ID
   * @route   GET /api/exercises/:id
   * @access  Public
   */
  static getExerciseById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const exercise = await Exercise.findById(req.params.id)
      .populate('createdBy', 'username profile.firstName profile.lastName');

    if (!exercise) {
      throw new AppError('Exercice non trouvé', 404);
    }

    if (!exercise.isApproved) {
      if (!req.user || (
        req.user.role !== 'super_admin' && 
        exercise.createdBy._id.toString() !== req.user._id.toString()
      )) {
        throw new AppError('Exercice non trouvé', 404);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        exercise,
      },
    });
  });

  /**
   * @desc    Mettre à jour un exercice
   * @route   PUT /api/exercises/:id
   * @access  Private (Créateur ou Admin)
   */
  static updateExercise = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const exercise = await Exercise.findById(req.params.id);

    if (!exercise) {
      throw new AppError('Exercice non trouvé', 404);
    }

    if (
      req.user?.role !== 'super_admin' &&
      exercise.createdBy.toString() !== req.user?._id.toString()
    ) {
      throw new AppError('Vous n\'êtes pas autorisé à modifier cet exercice', 403);
    }

    const importantFields = ['name', 'category', 'muscleGroups', 'instructions'];
    const isImportantChange = importantFields.some(field => req.body[field]);

    const updateData = { ...req.body };

    if (isImportantChange && exercise.isApproved && req.user?.role !== 'super_admin') {
      updateData.isApproved = false;
    }

    const updatedExercise = await Exercise.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username profile.firstName profile.lastName');

    res.status(200).json({
      success: true,
      data: {
        exercise: updatedExercise,
      },
      message: isImportantChange && exercise.isApproved && req.user?.role !== 'super_admin'
        ? 'Exercice mis à jour. En attente d\'approbation à nouveau.'
        : 'Exercice mis à jour avec succès',
    });
  });

  /**
   * @desc    Supprimer un exercice
   * @route   DELETE /api/exercises/:id
   * @access  Private (Créateur ou Admin)
   */
  static deleteExercise = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const exercise = await Exercise.findById(req.params.id);

    if (!exercise) {
      throw new AppError('Exercice non trouvé', 404);
    }

    if (
      req.user?.role !== 'super_admin' &&
      exercise.createdBy.toString() !== req.user?._id.toString()
    ) {
      throw new AppError('Vous n\'êtes pas autorisé à supprimer cet exercice', 403);
    }

    await exercise.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Exercice supprimé avec succès',
    });
  });

  /**
   * @desc    Calculer les calories brûlées pour un exercice
   * @route   POST /api/exercises/:id/calculate-calories
   * @access  Public
   */
  static calculateCalories = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { duration } = req.body;

    if (!duration || typeof duration !== 'number' || duration <= 0) {
      throw new AppError('Durée valide requise (en minutes)', 400);
    }

    const exercise = await Exercise.findById(req.params.id);

    if (!exercise) {
      throw new AppError('Exercice non trouvé', 404);
    }

    if (!exercise.isApproved) {
      throw new AppError('Cet exercice n\'est pas encore approuvé', 400);
    }

    const calories = (exercise as any).calculateCalories(duration);

    res.status(200).json({
      success: true,
      data: {
        exercise: {
          _id: exercise._id,
          name: exercise.name,
          caloriesPerMinute: exercise.caloriesPerMinute,
        },
        duration,
        caloriesBurned: calories,
      },
    });
  });

  /**
   * @desc    Obtenir les exercices par catégorie
   * @route   GET /api/exercises/categories
   * @access  Public
   */
  static getExerciseCategories = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const categories = await Exercise.aggregate([
      { $match: { isApproved: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averageCalories: { $avg: '$caloriesPerMinute' },
          exercises: {
            $push: {
              _id: '$_id',
              name: '$name',
              difficulty: '$difficulty',
              caloriesPerMinute: '$caloriesPerMinute',
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        categories,
        totalCategories: categories.length,
      },
    });
  });

  /**
   * @desc    Obtenir les groupes musculaires disponibles
   * @route   GET /api/exercises/muscle-groups
   * @access  Public
   */
  static getMuscleGroups = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const muscleGroups = await Exercise.aggregate([
      { $match: { isApproved: true } },
      { $unwind: '$muscleGroups' },
      {
        $group: {
          _id: '$muscleGroups',
          exerciseCount: { $sum: 1 },
          exercises: {
            $push: {
              _id: '$_id',
              name: '$name',
              category: '$category',
              difficulty: '$difficulty',
            }
          }
        }
      },
      { $sort: { exerciseCount: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        muscleGroups,
        totalMuscleGroups: muscleGroups.length,
      },
    });
  });

  /**
   * @desc    Obtenir les équipements requis
   * @route   GET /api/exercises/equipment
   * @access  Public
   */
  static getEquipment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const equipment = await Exercise.aggregate([
      { $match: { isApproved: true } },
      { $unwind: '$equipment' },
      {
        $group: {
          _id: '$equipment',
          exerciseCount: { $sum: 1 },
        }
      },
      { $sort: { exerciseCount: -1 } }
    ]);

    const noEquipmentCount = await Exercise.countDocuments({
      isApproved: true,
      equipment: { $size: 0 }
    });

    if (noEquipmentCount > 0) {
      equipment.unshift({
        _id: 'Aucun équipement',
        exerciseCount: noEquipmentCount,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        equipment,
        totalEquipmentTypes: equipment.length,
      },
    });
  });

  /**
   * @desc    Rechercher des exercices
   * @route   GET /api/exercises/search?q=cardio&muscleGroups=legs&equipment=none
   * @access  Public
   */
  static searchExercises = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { 
      q, 
      muscleGroups, 
      equipment, 
      category, 
      difficulty,
      minCalories,
      maxCalories,
      page = 1, 
      limit = 20 
    } = req.query;

    if (!q || typeof q !== 'string') {
      throw new AppError('Terme de recherche requis', 400);
    }

    const searchQuery: any = {
      $and: [
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { muscleGroups: { $in: [new RegExp(q, 'i')] } },
            { benefits: { $in: [new RegExp(q, 'i')] } },
          ],
        },
        { isApproved: true },
      ],
    };

    if (category) searchQuery.$and.push({ category });
    if (difficulty) searchQuery.$and.push({ difficulty });
    if (muscleGroups) {
      const muscleArray = Array.isArray(muscleGroups) ? muscleGroups : [muscleGroups];
      searchQuery.$and.push({ muscleGroups: { $in: muscleArray } });
    }
    if (equipment) {
      if (equipment === 'none') {
        searchQuery.$and.push({ equipment: { $size: 0 } });
      } else {
        const equipmentArray = Array.isArray(equipment) ? equipment : [equipment];
        searchQuery.$and.push({ equipment: { $in: equipmentArray } });
      }
    }
    if (minCalories) searchQuery.$and.push({ caloriesPerMinute: { $gte: Number(minCalories) } });
    if (maxCalories) searchQuery.$and.push({ caloriesPerMinute: { $lte: Number(maxCalories) } });

    const skip = (Number(page) - 1) * Number(limit);

    const [exercises, total] = await Promise.all([
      Exercise.find(searchQuery)
        .populate('createdBy', 'username')
        .sort({ name: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Exercise.countDocuments(searchQuery),
    ]);

    res.status(200).json({
      success: true,
      data: {
        exercises,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
        searchTerm: q,
        filters: {
          category,
          difficulty,
          muscleGroups,
          equipment,
          minCalories,
          maxCalories,
        },
      },
    });
  });

  /**
   * @desc    Obtenir les exercices recommandés
   * @route   GET /api/exercises/recommended?difficulty=beginner&category=cardio
   * @access  Public
   */
  static getRecommendedExercises = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { difficulty = 'beginner', category, limit = 10 } = req.query;

    const query: any = { isApproved: true };
    if (difficulty) query.difficulty = difficulty;
    if (category) query.category = category;

    const exercises = await Exercise.find(query)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: {
        exercises,
        count: exercises.length,
        recommendationCriteria: {
          difficulty,
          category,
        },
      },
    });
  });


  /**
   * @desc    Approuver/Rejeter un exercice (Admin)
   * @route   PUT /api/exercises/:id/approve
   * @access  Private/Super Admin
   */
  static approveExercise = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { approved, reason } = req.body;
    const exerciseId = req.params.id;

    const exercise = await Exercise.findById(exerciseId).populate('createdBy', 'username email');

    if (!exercise) {
      throw new AppError('Exercice non trouvé', 404);
    }

    exercise.isApproved = approved;
    await exercise.save();

    res.status(200).json({
      success: true,
      data: {
        exercise: {
          _id: exercise._id,
          name: exercise.name,
          isApproved: exercise.isApproved,
        },
      },
      message: approved 
        ? 'Exercice approuvé avec succès' 
        : 'Exercice rejeté avec succès',
    });
  });

  /**
   * @desc    Obtenir les exercices en attente d'approbation (Admin)
   * @route   GET /api/exercises/pending
   * @access  Private/Super Admin
   */
  static getPendingExercises = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [exercises, total] = await Promise.all([
      Exercise.find({ isApproved: false })
        .populate('createdBy', 'username profile.firstName profile.lastName email')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Exercise.countDocuments({ isApproved: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        exercises,
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
   * @desc    Obtenir les statistiques des exercices (Admin)
   * @route   GET /api/exercises/stats
   * @access  Private/Super Admin
   */
  static getExerciseStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const [
      totalExercises,
      approvedExercises,
      pendingExercises,
      exercisesByCategory,
      exercisesByDifficulty,
      averageCalories
    ] = await Promise.all([
      Exercise.countDocuments(),
      Exercise.countDocuments({ isApproved: true }),
      Exercise.countDocuments({ isApproved: false }),
      Exercise.aggregate([
        { $match: { isApproved: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Exercise.aggregate([
        { $match: { isApproved: true } },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Exercise.aggregate([
        { $match: { isApproved: true } },
        { $group: { _id: null, avgCalories: { $avg: '$caloriesPerMinute' } } }
      ])
    ]);

    const avgCaloriesPerMinute = averageCalories[0]?.avgCalories || 0;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalExercises,
          approvedExercises,
          pendingExercises,
          approvalRate: totalExercises > 0 ? Math.round((approvedExercises / totalExercises) * 100) : 0,
          averageCaloriesPerMinute: Math.round(avgCaloriesPerMinute * 100) / 100,
        },
        exercisesByCategory,
        exercisesByDifficulty,
      },
    });
  });
} 