import { Request, Response, NextFunction } from 'express';
import { ChallengeService } from '../services/challenge.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { AppError } from '../utils/AppError';

export class ChallengeController {
  /**
   * @desc    Créer un nouveau défi
   * @route   POST /api/challenges
   * @access  Private
   */
  static createChallenge = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const challenge = await ChallengeService.createChallenge(req.body, userId.toString());

    res.status(201).json({
      success: true,
      data: {
        challenge,
      },
      message: 'Défi créé avec succès',
    });
  });

  /**
   * @desc    Obtenir tous les défis avec filtres
   * @route   GET /api/challenges?type=individual&difficulty=medium&page=1&limit=10
   * @access  Public
   */
  static getAllChallenges = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
      type,
      difficulty,
      category,
      gym,
      isActive,
      createdBy,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      ...(type && { type: type as string }),
      ...(difficulty && { difficulty: difficulty as string }),
      ...(category && { category: category as string }),
      ...(gym && { gym: gym as string }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(createdBy && { createdBy: createdBy as string }),
    };

    const result = await ChallengeService.getChallenges(
      filters,
      Number(page),
      Number(limit)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  /**
   * @desc    Obtenir un défi par ID
   * @route   GET /api/challenges/:id
   * @access  Public
   */
  static getChallengeById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const challenge = await ChallengeService.getChallengeById(req.params.id);

    res.status(200).json({
      success: true,
      data: {
        challenge,
      },
    });
  });

  /**
   * @desc    Mettre à jour un défi
   * @route   PUT /api/challenges/:id
   * @access  Private (Créateur ou Admin)
   */
  static updateChallenge = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const challenge = await ChallengeService.updateChallenge(
      req.params.id,
      req.body,
      userId.toString()
    );

    res.status(200).json({
      success: true,
      data: {
        challenge,
      },
      message: 'Défi mis à jour avec succès',
    });
  });

  /**
   * @desc    Supprimer un défi
   * @route   DELETE /api/challenges/:id
   * @access  Private (Créateur ou Admin)
   */
  static deleteChallenge = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    await ChallengeService.deleteChallenge(req.params.id, userId.toString());

    res.status(200).json({
      success: true,
      message: 'Défi supprimé avec succès',
    });
  });

  /**
   * @desc    Rejoindre un défi
   * @route   POST /api/challenges/:id/join
   * @access  Private
   */
  static joinChallenge = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const challenge = await ChallengeService.joinChallenge(req.params.id, userId.toString());

    res.status(200).json({
      success: true,
      data: {
        challenge,
      },
      message: 'Vous avez rejoint le défi avec succès',
    });
  });

  /**
   * @desc    Quitter un défi
   * @route   POST /api/challenges/:id/leave
   * @access  Private
   */
  static leaveChallenge = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    await ChallengeService.leaveChallenge(req.params.id, userId.toString());

    res.status(200).json({
      success: true,
      message: 'Vous avez quitté le défi avec succès',
    });
  });

  /**
   * @desc    Mettre à jour la progression dans un défi
   * @route   PUT /api/challenges/:id/progress
   * @access  Private
   */
  static updateProgress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { progress } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      throw new AppError('La progression doit être un nombre entre 0 et 100', 400);
    }

    const challenge = await ChallengeService.updateProgress(
      req.params.id,
      userId.toString(),
      progress
    );

    const isCompleted = progress === 100;
    const message = isCompleted 
      ? 'Félicitations ! Vous avez complété ce défi !' 
      : 'Progression mise à jour avec succès';

    res.status(200).json({
      success: true,
      data: {
        challenge,
        isCompleted,
      },
      message,
    });
  });

  /**
   * @desc    Obtenir les défis de l'utilisateur connecté
   * @route   GET /api/challenges/my-challenges?type=created
   * @access  Private
   */
  static getMyChallenges = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { type = 'participating' } = req.query;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const validTypes = ['created', 'participating', 'completed'];
    if (!validTypes.includes(type as string)) {
      throw new AppError('Type invalide. Types valides: created, participating, completed', 400);
    }

    const challenges = await ChallengeService.getUserChallenges(
      userId.toString(),
      type as 'created' | 'participating' | 'completed'
    );

    res.status(200).json({
      success: true,
      data: {
        challenges,
        count: challenges.length,
        type,
      },
    });
  });

  /**
   * @desc    Inviter des amis à un défi
   * @route   POST /api/challenges/:id/invite
   * @access  Private
   */
  static inviteFriends = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { friendIds } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    if (!Array.isArray(friendIds) || friendIds.length === 0) {
      throw new AppError('Veuillez fournir une liste d\'IDs d\'amis à inviter', 400);
    }

    await ChallengeService.inviteFriends(req.params.id, userId.toString(), friendIds);

    res.status(200).json({
      success: true,
      message: `Invitations envoyées à ${friendIds.length} ami(s)`,
    });
  });

  /**
   * @desc    Obtenir les participants d'un défi
   * @route   GET /api/challenges/:id/participants?page=1&limit=20
   * @access  Public
   */
  static getChallengeParticipants = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page = 1, limit = 20, sortBy = 'progress' } = req.query;
    
    const challenge = await ChallengeService.getChallengeById(req.params.id);
    
    if (!challenge) {
      throw new AppError('Défi non trouvé', 404);
    }

    const skip = (Number(page) - 1) * Number(limit);
    let participants = challenge.participants;

    switch (sortBy) {
      case 'progress':
        participants.sort((a, b) => b.progress - a.progress);
        break;
      case 'joinedAt':
        participants.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
        break;
      case 'completedAt':
        participants.sort((a, b) => {
          if (!a.completedAt) return 1;
          if (!b.completedAt) return -1;
          return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
        });
        break;
      default:
        participants.sort((a, b) => b.progress - a.progress);
    }

    const paginatedParticipants = participants.slice(skip, skip + Number(limit));

    res.status(200).json({
      success: true,
      data: {
        participants: paginatedParticipants,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: participants.length,
          pages: Math.ceil(participants.length / Number(limit)),
        },
        challenge: {
          _id: challenge._id,
          title: challenge.title,
          participantCount: challenge.participantCount,
          completedCount: challenge.completedCount,
        },
      },
    });
  });

  /**
   * @desc    Obtenir le classement d'un défi
   * @route   GET /api/challenges/:id/leaderboard?limit=10
   * @access  Public
   */
  static getChallengeLeaderboard = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { limit = 10 } = req.query;
    
    const challenge = await ChallengeService.getChallengeById(req.params.id);
    
    if (!challenge) {
      throw new AppError('Défi non trouvé', 404);
    }

    const leaderboard = challenge.participants
      .sort((a, b) => {
        if (a.completedAt && !b.completedAt) return -1;
        if (!a.completedAt && b.completedAt) return 1;
        
        if (b.progress !== a.progress) return b.progress - a.progress;
        
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      })
      .slice(0, Number(limit));

    res.status(200).json({
      success: true,
      data: {
        leaderboard,
        challenge: {
          _id: challenge._id,
          title: challenge.title,
          type: challenge.type,
          difficulty: challenge.difficulty,
        },
      },
    });
  });

  /**
   * @desc    Rechercher des défis
   * @route   GET /api/challenges/search?q=cardio&location=Paris
   * @access  Public
   */
  static searchChallenges = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { 
      q, 
      location, 
      minDifficulty, 
      maxDifficulty, 
      type, 
      category,
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
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { tags: { $in: [new RegExp(q, 'i')] } },
          ],
        },
        { isActive: true },
      ],
    };

    if (type) searchQuery.$and.push({ type });
    if (category) searchQuery.$and.push({ category });

    const filters = {
      ...(location && typeof location === 'string' && { gym: location }),
      isActive: true,
    };

    const result = await ChallengeService.getChallenges(
      filters,
      Number(page),
      Number(limit)
    );

    res.status(200).json({
      success: true,
      data: {
        ...result,
        searchTerm: q,
      },
    });
  });

  /**
   * @desc    Obtenir les défis populaires/tendances
   * @route   GET /api/challenges/trending?period=week&limit=10
   * @access  Public
   */
  static getTrendingChallenges = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { period = 'week', limit = 10 } = req.query;

    let dateFilter: Date;
    switch (period) {
      case 'day':
        dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const filters = {
      isActive: true,
    };

    const result = await ChallengeService.getChallenges(filters, 1, Number(limit));

    const trendingChallenges = result.challenges
      .sort((a, b) => (b as any).participantCount - (a as any).participantCount);

    res.status(200).json({
      success: true,
      data: {
        challenges: trendingChallenges,
        period,
        count: trendingChallenges.length,
      },
    });
  });

  /**
   * @desc    Obtenir les statistiques d'un défi (Admin/Créateur)
   * @route   GET /api/challenges/:id/stats
   * @access  Private (Créateur ou Admin)
   */
  static getChallengeStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const challenge = await ChallengeService.getChallengeById(req.params.id);
    const userId = req.user?._id;

    if (!challenge) {
      throw new AppError('Défi non trouvé', 404);
    }

    if (
      req.user?.role !== 'super_admin' &&
      challenge.createdBy._id.toString() !== userId?.toString()
    ) {
      throw new AppError('Vous n\'êtes pas autorisé à voir ces statistiques', 403);
    }

    const participants = challenge.participants;
    const totalParticipants = participants.length;
    const completedParticipants = participants.filter(p => p.completedAt).length;
    const averageProgress = totalParticipants > 0 
      ? Math.round(participants.reduce((sum, p) => sum + p.progress, 0) / totalParticipants)
      : 0;

    const progressRanges = {
      '0-25': participants.filter(p => p.progress >= 0 && p.progress < 25).length,
      '25-50': participants.filter(p => p.progress >= 25 && p.progress < 50).length,
      '50-75': participants.filter(p => p.progress >= 75 && p.progress < 75).length,
      '75-100': participants.filter(p => p.progress >= 75 && p.progress <= 100).length,
    };

    res.status(200).json({
      success: true,
      data: {
        challenge: {
          _id: challenge._id,
          title: challenge.title,
          type: challenge.type,
          difficulty: challenge.difficulty,
        },
        stats: {
          totalParticipants,
          completedParticipants,
          completionRate: totalParticipants > 0 ? Math.round((completedParticipants / totalParticipants) * 100) : 0,
          averageProgress,
          progressRanges,
        },
        timeline: {
          createdAt: challenge.createdAt,
          startDate: challenge.startDate,
          endDate: challenge.endDate,
          isActive: challenge.isActive,
        },
      },
    });
  });
} 