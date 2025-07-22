import { Request, Response, NextFunction } from 'express';
import { BadgeService } from '../services/badge.service';
import { Badge } from '../models/badge.model';
import { asyncHandler } from '../middlewares/error.middleware';
import { AppError } from '../utils/AppError';

export class BadgeController {
  /**
   * @desc    Créer un nouveau badge
   * @route   POST /api/badges
   * @access  Private/Admin
   */
  static createBadge = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const badge = await BadgeService.createBadge(req.body, userId.toString());

    res.status(201).json({
      success: true,
      data: {
        badge,
      },
      message: 'Badge créé avec succès',
    });
  });

  /**
   * @desc    Obtenir tous les badges avec filtres
   * @route   GET /api/badges?category=achievement&rarity=rare&page=1&limit=20
   * @access  Public
   */
  static getAllBadges = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
      category,
      rarity,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'name'
    } = req.query;

    const filters = {
      ...(category && { category }),
      ...(rarity && { rarity }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
    };

    const result = await BadgeService.getAllBadges(
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
   * @desc    Obtenir un badge par ID
   * @route   GET /api/badges/:id
   * @access  Public
   */
  static getBadgeById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const badge = await Badge.findById(req.params.id)
      .populate('createdBy', 'username profile.firstName profile.lastName');

    if (!badge) {
      throw new AppError('Badge non trouvé', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        badge,
      },
    });
  });

  /**
   * @desc    Mettre à jour un badge
   * @route   PUT /api/badges/:id
   * @access  Private/Admin
   */
  static updateBadge = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const badge = await BadgeService.updateBadge(req.params.id, req.body);

    res.status(200).json({
      success: true,
      data: {
        badge,
      },
      message: 'Badge mis à jour avec succès',
    });
  });

  /**
   * @desc    Supprimer un badge
   * @route   DELETE /api/badges/:id
   * @access  Private/Admin
   */
  static deleteBadge = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    await BadgeService.deleteBadge(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Badge supprimé avec succès',
    });
  });

  /**
   * @desc    Vérifier et attribuer automatiquement les badges à un utilisateur
   * @route   POST /api/badges/check/:userId
   * @access  Private/Admin ou Self
   */
  static checkAndAwardBadges = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;
    const currentUserId = req.user?._id;

    if (
      req.user?.role !== 'super_admin' && 
      userId !== currentUserId?.toString()
    ) {
      throw new AppError('Vous ne pouvez vérifier que vos propres badges', 403);
    }

    const earnedBadges = await BadgeService.checkAndAwardBadges(userId);

    res.status(200).json({
      success: true,
      data: {
        earnedBadges,
        count: earnedBadges.length,
      },
      message: earnedBadges.length > 0 
        ? `Félicitations ! Vous avez gagné ${earnedBadges.length} nouveau(x) badge(s) !`
        : 'Aucun nouveau badge gagné pour le moment',
    });
  });

  /**
   * @desc    Attribuer manuellement un badge à un utilisateur
   * @route   POST /api/badges/:badgeId/award/:userId
   * @access  Private/Admin
   */
  static awardBadgeToUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { badgeId, userId } = req.params;

    await BadgeService.awardBadgeToUser(badgeId, userId);

    res.status(200).json({
      success: true,
      message: 'Badge attribué avec succès',
    });
  });

  /**
   * @desc    Retirer un badge d'un utilisateur
   * @route   DELETE /api/badges/:badgeId/remove/:userId
   * @access  Private/Admin
   */
  static removeBadgeFromUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { badgeId, userId } = req.params;

    await BadgeService.removeBadgeFromUser(badgeId, userId);

    res.status(200).json({
      success: true,
      message: 'Badge retiré avec succès',
    });
  });

  /**
   * @desc    Obtenir les badges d'un utilisateur
   * @route   GET /api/badges/user/:userId
   * @access  Public
   */
  static getUserBadges = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;
    const { category, rarity } = req.query;

    let badges = await BadgeService.getUserBadges(userId);

    if (category) {
      badges = (badges as any[]).filter(badge => badge.category === category);
    }

    if (rarity) {
      badges = (badges as any[]).filter(badge => badge.rarity === rarity);
    }

    const badgesByCategory = (badges as any[]).reduce((acc, badge) => {
      const cat = badge.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(badge);
      return acc;
    }, {});

    const stats = {
      totalBadges: (badges as any[]).length,
      byRarity: {
        common: (badges as any[]).filter(b => b.rarity === 'common').length,
        rare: (badges as any[]).filter(b => b.rarity === 'rare').length,
        epic: (badges as any[]).filter(b => b.rarity === 'epic').length,
        legendary: (badges as any[]).filter(b => b.rarity === 'legendary').length,
      },
      totalPoints: (badges as any[]).reduce((sum, badge) => sum + badge.points, 0),
    };

    res.status(200).json({
      success: true,
      data: {
        badges,
        badgesByCategory,
        stats,
        userId,
      },
    });
  });

  /**
   * @desc    Obtenir les badges les plus populaires
   * @route   GET /api/badges/popular?limit=10
   * @access  Public
   */
  static getPopularBadges = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { limit = 10 } = req.query;

    const badges = await Badge.find({ isActive: true })
      .populate('createdBy', 'username')
      .sort('-earnedCount')
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: {
        badges,
        count: badges.length,
      },
    });
  });

  /**
   * @desc    Obtenir les badges par catégorie
   * @route   GET /api/badges/categories
   * @access  Public
   */
  static getBadgeCategories = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const categories = await Badge.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalEarned: { $sum: '$earnedCount' },
          badges: {
            $push: {
              _id: '$_id',
              name: '$name',
              icon: '$icon',
              rarity: '$rarity',
              points: '$points',
              earnedCount: '$earnedCount',
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
   * @desc    Obtenir les badges rares/épiques/légendaires
   * @route   GET /api/badges/rare?rarity=legendary
   * @access  Public
   */
  static getRareBadges = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { rarity = 'legendary' } = req.query;

    if (!['rare', 'epic', 'legendary'].includes(rarity as string)) {
      throw new AppError('Rareté invalide. Valeurs acceptées: rare, epic, legendary', 400);
    }

    const badges = await Badge.find({ 
      isActive: true, 
      rarity: rarity as string 
    })
      .populate('createdBy', 'username')
      .sort('-points');

    res.status(200).json({
      success: true,
      data: {
        badges,
        rarity,
        count: badges.length,
      },
    });
  });

  /**
   * @desc    Tester les règles d'un badge sur un utilisateur
   * @route   POST /api/badges/:badgeId/test/:userId
   * @access  Private/Admin
   */
  static testBadgeRules = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { badgeId, userId } = req.params;

    const badge = await Badge.findById(badgeId);
    if (!badge) {
      throw new AppError('Badge non trouvé', 404);
    }

    const userData = await (BadgeService as any).prepareUserData({ _id: userId });
    
    const isEligible = badge.checkUserEligibility(userData);

    res.status(200).json({
      success: true,
      data: {
        badge: {
          _id: badge._id,
          name: badge.name,
          rules: badge.rules,
        },
        user: {
          _id: userId,
          stats: userData.stats,
        },
        isEligible,
        message: isEligible 
          ? 'L\'utilisateur remplit toutes les conditions pour ce badge'
          : 'L\'utilisateur ne remplit pas encore toutes les conditions',
      },
    });
  });

  /**
   * @desc    Créer un badge avec des règles personnalisées
   * @route   POST /api/badges/custom
   * @access  Private/Admin
   */
  static createCustomBadge = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
      name,
      description,
      icon,
      category,
      rarity,
      points,
      isAutomatic = true,
      rules
    } = req.body;

    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    if (!Array.isArray(rules) || rules.length === 0) {
      throw new AppError('Au moins une règle est requise', 400);
    }

    for (const rule of rules) {
      if (!rule.type || !rule.field || !rule.operator || rule.value === undefined) {
        throw new AppError('Chaque règle doit avoir un type, field, operator et value', 400);
      }

      const validTypes = ['user_stat', 'challenge_completion', 'training_count', 'custom'];
      const validOperators = ['equals', 'greater_than', 'less_than', 'contains', 'between'];

      if (!validTypes.includes(rule.type)) {
        throw new AppError(`Type de règle invalide: ${rule.type}`, 400);
      }

      if (!validOperators.includes(rule.operator)) {
        throw new AppError(`Opérateur invalide: ${rule.operator}`, 400);
      }

      if (rule.operator === 'between' && rule.value2 === undefined) {
        throw new AppError('L\'opérateur "between" nécessite value2', 400);
      }
    }

    const badgeData = {
      name,
      description,
      icon,
      category,
      rarity,
      points,
      isAutomatic,
      rules,
    };

    const badge = await BadgeService.createBadge(badgeData, userId.toString());

    res.status(201).json({
      success: true,
      data: {
        badge,
      },
      message: 'Badge personnalisé créé avec succès',
    });
  });

  /**
   * @desc    Obtenir les statistiques des badges (Admin)
   * @route   GET /api/badges/stats
   * @access  Private/Admin
   */
  static getBadgeStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const [
      totalBadges,
      activeBadges,
      automaticBadges,
      totalAwarded,
      statsByCategory,
      statsByRarity
    ] = await Promise.all([
      Badge.countDocuments(),
      Badge.countDocuments({ isActive: true }),
      Badge.countDocuments({ isAutomatic: true }),
      Badge.aggregate([
        { $group: { _id: null, total: { $sum: '$earnedCount' } } }
      ]),
      Badge.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalAwarded: { $sum: '$earnedCount' },
            averagePoints: { $avg: '$points' }
          }
        },
        { $sort: { count: -1 } }
      ]),
      Badge.aggregate([
        {
          $group: {
            _id: '$rarity',
            count: { $sum: 1 },
            totalAwarded: { $sum: '$earnedCount' },
            averagePoints: { $avg: '$points' }
          }
        }
      ])
    ]);

    const totalAwardedCount = totalAwarded[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalBadges,
          activeBadges,
          automaticBadges,
          totalAwarded: totalAwardedCount,
          averageAwardedPerBadge: totalBadges > 0 ? Math.round(totalAwardedCount / totalBadges) : 0,
        },
        statsByCategory,
        statsByRarity,
      },
    });
  });

  /**
   * @desc    Obtenir les derniers badges gagnés (Feed)
   * @route   GET /api/badges/recent-awards?limit=20
   * @access  Public
   */
  static getRecentAwards = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { limit = 20 } = req.query;

    const recentBadges = await Badge.find({ isActive: true })
      .populate('createdBy', 'username profile.firstName profile.lastName')
      .sort('-createdAt')
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: {
        badges: recentBadges,
        count: recentBadges.length,
      },
      message: 'Nouveaux badges disponibles dans la communauté',
    });
  });
} 