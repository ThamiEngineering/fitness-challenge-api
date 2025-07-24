import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/user.model';
import { asyncHandler } from '../middlewares/error.middleware';
import { AppError } from '../utils/AppError';
import { BadgeService } from '../services/badge.service';

export class UserController {
  /**
   * @desc    Obtenir le profil de l'utilisateur connecté
   * @route   GET /api/users/profile
   * @access  Private
   */
  static getProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user?._id)
      .populate('badges', 'name description icon rarity points')
      .populate('friends', 'username profile.firstName profile.lastName profile.avatar')
      .populate('gyms', 'name address.city');

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  });

  /**
   * @desc    Mettre à jour le profil utilisateur
   * @route   PUT /api/users/profile
   * @access  Private
   */
  static updateProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { profile, username } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    if (username && username !== req.user?.username) {
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        throw new AppError('Ce nom d\'utilisateur est déjà pris', 400);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...(username && { username: username.toLowerCase() }),
        ...(profile && { 
          'profile.firstName': profile.firstName,
          'profile.lastName': profile.lastName,
          'profile.phoneNumber': profile.phoneNumber,
          'profile.dateOfBirth': profile.dateOfBirth,
          'profile.avatar': profile.avatar,
        }),
      },
      { new: true, runValidators: true }
    ).populate('badges', 'name description icon rarity points');

    if (!updatedUser) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        user: updatedUser,
      },
      message: 'Profil mis à jour avec succès',
    });
  });

  /**
   * @desc    Obtenir les statistiques de l'utilisateur
   * @route   GET /api/users/stats
   * @access  Private
   */
  static getStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user?._id).select('stats badges');

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    const badgeCount = user.badges.length;
    const completionRate = user.stats.totalChallenges > 0 
      ? Math.round((user.stats.completedChallenges / user.stats.totalChallenges) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        stats: {
          ...user.stats,
          badgeCount,
          completionRate,
        },
      },
    });
  });

  /**
   * @desc    Rechercher des utilisateurs
   * @route   GET /api/users/search?q=query&page=1&limit=10
   * @access  Private
   */
  static searchUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { q, page = 1, limit = 10 } = req.query;
    
    if (!q || typeof q !== 'string') {
      throw new AppError('Terme de recherche requis', 400);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const searchQuery = {
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { 'profile.firstName': { $regex: q, $options: 'i' } },
        { 'profile.lastName': { $regex: q, $options: 'i' } },
      ],
      isActive: true,
      _id: { $ne: req.user?._id },
    };

    const [users, total] = await Promise.all([
      User.find(searchQuery)
        .select('username profile.firstName profile.lastName profile.avatar stats.score')
        .sort('-stats.score')
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(searchQuery),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
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
   * @desc    Ajouter un ami
   * @route   POST /api/users/:id/friend
   * @access  Private
   */
  static addFriend = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id: friendId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    if (friendId === userId.toString()) {
      throw new AppError('Vous ne pouvez pas vous ajouter vous-même comme ami', 400);
    }

    const [user, friend] = await Promise.all([
      User.findById(userId),
      User.findById(friendId),
    ]);

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    if (!friend) {
      throw new AppError('Utilisateur à ajouter non trouvé', 404);
    }

    if (user.friends.some(f => f.toString() === friendId)) {
      throw new AppError('Cet utilisateur est déjà votre ami', 400);
    }

    user.friends.push(friend._id);
    friend.friends.push(user._id);

    await Promise.all([user.save(), friend.save()]);

    res.status(200).json({
      success: true,
      message: 'Ami ajouté avec succès',
    });
  });

  /**
   * @desc    Retirer un ami
   * @route   DELETE /api/users/:id/friend
   * @access  Private
   */
  static removeFriend = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id: friendId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const [user, friend] = await Promise.all([
      User.findById(userId),
      User.findById(friendId),
    ]);

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    if (!friend) {
      throw new AppError('Ami non trouvé', 404);
    }

    user.friends = user.friends.filter(f => f.toString() !== friendId);
    friend.friends = friend.friends.filter(f => f.toString() !== userId.toString());

    await Promise.all([user.save(), friend.save()]);

    res.status(200).json({
      success: true,
      message: 'Ami retiré avec succès',
    });
  });

  /**
   * @desc    Obtenir la liste des amis
   * @route   GET /api/users/friends
   * @access  Private
   */
  static getFriends = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user?._id)
      .populate('friends', 'username profile.firstName profile.lastName profile.avatar stats.score isActive')
      .select('friends');

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    const activeFriends = (user.friends as any[]).filter(friend => friend.isActive);

    res.status(200).json({
      success: true,
      data: {
        friends: activeFriends,
        count: activeFriends.length,
      },
    });
  });

  /**
   * @desc    Obtenir le classement des utilisateurs
   * @route   GET /api/users/leaderboard?type=score&limit=10
   * @access  Private
   */
  static getLeaderboard = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { type = 'score', limit = 10 } = req.query;
    
    let sortField: string;
    switch (type) {
      case 'score':
        sortField = '-stats.score';
        break;
      case 'challenges':
        sortField = '-stats.completedChallenges';
        break;
      case 'workouts':
        sortField = '-stats.totalWorkoutMinutes';
        break;
      default:
        sortField = '-stats.score';
    }

    const users = await User.find({ isActive: true })
      .select('username profile.firstName profile.lastName profile.avatar stats')
      .sort(sortField)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: {
        leaderboard: users,
        type,
      },
    });
  });


  /**
   * @desc    Obtenir tous les utilisateurs (Admin)
   * @route   GET /api/users?role=client&isActive=true&page=1&limit=20
   * @access  Private/Admin
   */
  static getAllUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { role, isActive, page = 1, limit = 20, search } = req.query;

    const query: any = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .populate('badges', 'name')
        .populate('gyms', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
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
   * @desc    Obtenir un utilisateur par ID (Admin)
   * @route   GET /api/users/:id
   * @access  Private/Admin
   */
  static getUserById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('badges', 'name description icon rarity points')
      .populate('friends', 'username profile.firstName profile.lastName')
      .populate('gyms', 'name address.city');

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  });

  /**
   * @desc    Activer/Désactiver un utilisateur (Admin)
   * @route   PUT /api/users/:id/toggle-active
   * @access  Private/Admin
   */
  static toggleUserActive = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    if (user.role === 'super_admin' && req.user?.role !== 'super_admin') {
      throw new AppError('Vous ne pouvez pas modifier un super administrateur', 403);
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          isActive: user.isActive,
        },
      },
      message: `Utilisateur ${user.isActive ? 'activé' : 'désactivé'} avec succès`,
    });
  });

  /**
   * @desc    Supprimer un utilisateur (Admin)
   * @route   DELETE /api/users/:id
   * @access  Private/Admin
   */
  static deleteUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    if (user.role === 'super_admin') {
      throw new AppError('Vous ne pouvez pas supprimer un super administrateur', 403);
    }

    await User.updateMany(
      { friends: user._id },
      { $pull: { friends: user._id } }
    );

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Utilisateur supprimé avec succès',
    });
  });

  /**
   * @desc    Attribuer manuellement un badge à un utilisateur (Admin)
   * @route   POST /api/users/:id/badges/:badgeId
   * @access  Private/Admin
   */
  static awardBadge = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id: userId, badgeId } = req.params;

    await BadgeService.awardBadgeToUser(badgeId, userId);

    res.status(200).json({
      success: true,
      message: 'Badge attribué avec succès',
    });
  });

  /**
   * @desc    Retirer un badge d'un utilisateur (Admin)
   * @route   DELETE /api/users/:id/badges/:badgeId
   * @access  Private/Admin
   */
  static removeBadge = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id: userId, badgeId } = req.params;

    await BadgeService.removeBadgeFromUser(badgeId, userId);

    res.status(200).json({
      success: true,
      message: 'Badge retiré avec succès',
    });
  });
} 