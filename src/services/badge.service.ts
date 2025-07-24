import { Badge, IBadge } from '../models/badge.model';
import { Challenge } from '../models/challenge.model';
import { Training } from '../models/training.model';
import { IUser, User } from '../models/user.model';
import { AppError } from '../utils/AppError';

interface BadgeCreateData {
  name: string;
  description: string;
  icon: string;
  category: string;
  rules: any[];
  points: number;
  rarity: string;
  isAutomatic?: boolean;
}

export class BadgeService {
  /**
   * Créer un nouveau badge
   */
  static async createBadge(data: BadgeCreateData, creatorId: string): Promise<IBadge> {
    const existingBadge = await Badge.findOne({ name: data.name });
    if (existingBadge) {
      throw new AppError('Un badge avec ce nom existe déjà', 400);
    }

    const badge = await Badge.create({
      ...data,
      createdBy: creatorId,
    });

    return badge;
  }

  /**
   * Mettre à jour un badge
   */
  static async updateBadge(badgeId: string, data: Partial<BadgeCreateData>): Promise<IBadge> {
    const badge = await Badge.findByIdAndUpdate(
      badgeId,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!badge) {
      throw new AppError('Badge non trouvé', 404);
    }

    return badge;
  }

  /**
   * Supprimer un badge
   */
  static async deleteBadge(badgeId: string): Promise<void> {
    const badge = await Badge.findById(badgeId);
    
    if (!badge) {
      throw new AppError('Badge non trouvé', 404);
    }

    await User.updateMany(
      { badges: badgeId },
      { $pull: { badges: badgeId } }
    );

    await badge.deleteOne();
  }

  /**
   * Obtenir tous les badges
   */
  static async getAllBadges(filters: any = {}, page = 1, limit = 20) {
    const query: any = {};
    
    if (filters.category) query.category = filters.category;
    if (filters.rarity) query.rarity = filters.rarity;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const skip = (page - 1) * limit;

    const [badges, total] = await Promise.all([
      Badge.find(query)
        .populate('createdBy', 'username profile.firstName profile.lastName')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Badge.countDocuments(query),
    ]);

    return {
      badges,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Vérifier et attribuer automatiquement les badges à un utilisateur
   */
  static async checkAndAwardBadges(userId: string): Promise<IBadge[]> {
    const user = await User.findById(userId).populate('badges');
    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    const automaticBadges = await Badge.find({ isActive: true, isAutomatic: true });
    const earnedBadges: IBadge[] = [];
    const userBadgeIds = user.badges.map((b: any) => b._id.toString());

    const userData = await this.prepareUserData(user);

    for (const badge of automaticBadges) {
      if (userBadgeIds.includes(badge._id.toString())) {
        continue;
      }

      if (badge.checkUserEligibility(userData)) {
        earnedBadges.push(badge);
        user.badges.push(badge._id);
        user.stats.score += badge.points;
        badge.earnedCount += 1;
        await badge.save();
      }
    }

    if (earnedBadges.length > 0) {
      await user.save();
    }

    return earnedBadges;
  }

  /**
   * Préparer les données utilisateur pour l'évaluation des badges
   */
  private static async prepareUserData(user: IUser): Promise<any> {
    const trainingCount = await Training.countDocuments({ user: user._id });
    
    const completedChallenges = await Challenge.countDocuments({
      'participants.user': user._id,
      'participants.completedAt': { $exists: true },
    });

    const trainings = await Training.find({ user: user._id });
    const totalTrainingMinutes = trainings.reduce((sum, t) => sum + t.totalDuration, 0);

    let userObj: any = user;
    if (user && typeof (user as any).toObject === 'function') {
      userObj = user.toObject();
    }

    return {
      ...userObj,
      stats: {
        ...userObj.stats,
        trainingCount,
        completedChallenges,
        totalTrainingMinutes,
      },
    };
  }

  /**
   * Attribuer manuellement un badge à un utilisateur
   */
  static async awardBadgeToUser(badgeId: string, userId: string): Promise<void> {
    const [badge, user] = await Promise.all([
      Badge.findById(badgeId),
      User.findById(userId),
    ]);

    if (!badge) {
      throw new AppError('Badge non trouvé', 404);
    }

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    if (user.badges.some(b => b.toString() === badgeId)) {
      throw new AppError('L\'utilisateur possède déjà ce badge', 400);
    }

    user.badges.push(badge._id);
    user.stats.score += badge.points;
    badge.earnedCount += 1;

    await Promise.all([user.save(), badge.save()]);
  }

  /**
   * Retirer un badge d'un utilisateur
   */
  static async removeBadgeFromUser(badgeId: string, userId: string): Promise<void> {
    const [badge, user] = await Promise.all([
      Badge.findById(badgeId),
      User.findById(userId),
    ]);

    if (!badge) {
      throw new AppError('Badge non trouvé', 404);
    }

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    const badgeIndex = user.badges.findIndex(b => b.toString() === badgeId);
    if (badgeIndex === -1) {
      throw new AppError('L\'utilisateur ne possède pas ce badge', 400);
    }

    user.badges.splice(badgeIndex, 1);
    user.stats.score -= badge.points;
    badge.earnedCount = Math.max(0, badge.earnedCount - 1);

    await Promise.all([user.save(), badge.save()]);
  }

  /**
   * Obtenir les badges d'un utilisateur
   */
  static async getUserBadges(userId: string) {
    const user = await User.findById(userId).populate({
      path: 'badges',
      populate: {
        path: 'createdBy',
        select: 'username profile.firstName profile.lastName',
      },
    });

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    return user.badges;
  }
}