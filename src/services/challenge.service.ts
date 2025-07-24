import { Challenge, IChallenge } from '../models/challenge.model';
import { User } from '../models/user.model';
import { Gym } from '../models/gym.model';
import { AppError } from '../utils/AppError';
import { BadgeService } from './badge.service';
import mongoose from 'mongoose';

interface ChallengeCreateData {
  title: string;
  description: string;
  type: 'individual' | 'team' | 'social';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  category: string;
  objectives: any[];
  exercises: any[];
  duration: { value: number; unit: string };
  gym?: string;
  rewards: { points: number; badges?: string[] };
  startDate?: Date;
  endDate?: Date;
  maxParticipants?: number;
  images?: string[];
  tags?: string[];
}

interface ChallengeFilters {
  type?: string;
  difficulty?: string;
  category?: string;
  gym?: string;
  isActive?: boolean;
  createdBy?: string;
  minDuration?: number;
  maxDuration?: number;
  durationUnit?: string;
}

export class ChallengeService {
  /**
   * Créer un nouveau défi
   */
  static async createChallenge(data: ChallengeCreateData, userId: string): Promise<IChallenge> {
    if (data.gym) {
      const gym = await Gym.findById(data.gym);
      if (!gym) {
        throw new AppError('Salle de sport non trouvée', 404);
      }

      const user = await User.findById(userId);
      if (
        user?.role !== 'super_admin' &&
        gym.owner.toString() !== userId
      ) {
        throw new AppError('Vous n\'êtes pas autorisé à créer des défis pour cette salle', 403);
      }
    }

    const challenge = await Challenge.create({
      ...data,
      createdBy: userId,
    });

    if (data.gym) {
      await Gym.findByIdAndUpdate(data.gym, {
        $push: { challenges: challenge._id },
      });
    }

    return challenge;
  }

  /**
   * Mettre à jour un défi
   */
  static async updateChallenge(
    challengeId: string,
    data: Partial<ChallengeCreateData>,
    userId: string
  ): Promise<IChallenge> {
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      throw new AppError('Défi non trouvé', 404);
    }

    const user = await User.findById(userId);
    if (
      user?.role !== 'super_admin' &&
      challenge.createdBy.toString() !== userId
    ) {
      throw new AppError('Vous n\'êtes pas autorisé à modifier ce défi', 403);
    }

    const updatedChallenge = await Challenge.findByIdAndUpdate(
      challengeId,
      { $set: data },
      { new: true, runValidators: true }
    );

    return updatedChallenge!;
  }

  /**
   * Supprimer un défi
   */
  static async deleteChallenge(challengeId: string, userId: string): Promise<void> {
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      throw new AppError('Défi non trouvé', 404);
    }

    const user = await User.findById(userId);
    if (
      user?.role !== 'super_admin' &&
      challenge.createdBy.toString() !== userId
    ) {
      throw new AppError('Vous n\'êtes pas autorisé à supprimer ce défi', 403);
    }

    if (challenge.gym) {
      await Gym.findByIdAndUpdate(challenge.gym, {
        $pull: { challenges: challengeId },
      });
    }

    await challenge.deleteOne();
  }

  /**
   * Rejoindre un défi
   */
  static async joinChallenge(challengeId: string, userId: string): Promise<IChallenge> {
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      throw new AppError('Défi non trouvé', 404);
    }

    if (!challenge.isActive) {
      throw new AppError('Ce défi n\'est plus actif', 400);
    }

    if (challenge.hasParticipant(userId)) {
      throw new AppError('Vous participez déjà à ce défi', 400);
    }

    if (challenge.isFull()) {
      throw new AppError('Ce défi a atteint le nombre maximum de participants', 400);
    }

    if (challenge.startDate && new Date() < challenge.startDate) {
      throw new AppError('Ce défi n\'a pas encore commencé', 400);
    }

    if (challenge.endDate && new Date() > challenge.endDate) {
      throw new AppError('Ce défi est terminé', 400);
    }

    challenge.participants.push({
      user: userId as any,
      joinedAt: new Date(),
      progress: 0,
    });

    await challenge.save();

    await User.findByIdAndUpdate(userId, {
      $inc: { 'stats.totalChallenges': 1 },
    });

    return challenge;
  }

  /**
   * Quitter un défi
   */
  static async leaveChallenge(challengeId: string, userId: string): Promise<void> {
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      throw new AppError('Défi non trouvé', 404);
    }

    const participantIndex = challenge.participants.findIndex(
      p => p.user.toString() === userId
    );

    if (participantIndex === -1) {
      throw new AppError('Vous ne participez pas à ce défi', 400);
    }

    if (challenge.participants[participantIndex].completedAt) {
      throw new AppError('Vous avez déjà complété ce défi', 400);
    }

    challenge.participants.splice(participantIndex, 1);
    await challenge.save();

    await User.findByIdAndUpdate(userId, {
      $inc: { 'stats.totalChallenges': -1 },
    });
  }

  /**
   * Mettre à jour la progression d'un participant
   */
  static async updateProgress(
    challengeId: string,
    userId: string,
    progress: number
  ): Promise<IChallenge> {
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      throw new AppError('Défi non trouvé', 404);
    }

    const participant = challenge.participants.find(
      p => p.user.toString() === userId
    );

    if (!participant) {
      throw new AppError('Vous ne participez pas à ce défi', 400);
    }

    const oldProgress = participant.progress;
    participant.progress = Math.min(100, Math.max(0, progress));

    if (participant.progress === 100 && !participant.completedAt) {
      participant.completedAt = new Date();

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            'stats.completedChallenges': 1,
            'stats.score': challenge.rewards.points,
          },
        },
        { new: true }
      );

      if (user) {
        await BadgeService.checkAndAwardBadges(userId);
      }
    }

    await challenge.save();
    return challenge;
  }

  /**
   * Obtenir les défis avec filtres
   */
  static async getChallenges(filters: ChallengeFilters, page = 1, limit = 20) {
    const query: any = {};

    if (filters.type) query.type = filters.type;
    if (filters.difficulty) query.difficulty = filters.difficulty;
    if (filters.category) query.category = filters.category;
    if (filters.gym) query.gym = filters.gym;
    if (filters.createdBy) query.createdBy = filters.createdBy;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    if (filters.minDuration || filters.maxDuration) {
      query['duration.value'] = {};
      if (filters.minDuration) query['duration.value'].$gte = filters.minDuration;
      if (filters.maxDuration) query['duration.value'].$lte = filters.maxDuration;
    }
    if (filters.durationUnit) query['duration.unit'] = filters.durationUnit;

    const skip = (page - 1) * limit;

    const [challenges, total] = await Promise.all([
      Challenge.find(query)
        .populate('createdBy', 'username profile.firstName profile.lastName')
        .populate('gym', 'name')
        .populate('exercises.exercise', 'name category')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Challenge.countDocuments(query),
    ]);

    return {
      challenges,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtenir un défi par ID
   */
  static async getChallengeById(challengeId: string): Promise<IChallenge> {
    const challenge = await Challenge.findById(challengeId)
      .populate('createdBy', 'username profile.firstName profile.lastName')
      .populate('gym', 'name address')
      .populate('exercises.exercise')
      .populate('participants.user', 'username profile.firstName profile.lastName');

    if (!challenge) {
      throw new AppError('Défi non trouvé', 404);
    }

    return challenge;
  }

  /**
   * Obtenir les défis d'un utilisateur
   */
  static async getUserChallenges(userId: string, type: 'created' | 'participating' | 'completed') {
    let query: any = {};

    switch (type) {
      case 'created':
        query = { createdBy: userId };
        break;
      case 'participating':
        query = {
          'participants.user': userId,
          'participants.completedAt': { $exists: false },
        };
        break;
      case 'completed':
        query = {
          'participants.user': userId,
          'participants.completedAt': { $exists: true },
        };
        break;
    }

    const challenges = await Challenge.find(query)
      .populate('gym', 'name')
      .populate('exercises.exercise', 'name')
      .sort('-createdAt');

    return challenges;
  }

  /**
   * Inviter des amis à un défi
   */
  static async inviteFriends(
    challengeId: string,
    userId: string,
    friendIds: string[]
  ): Promise<void> {
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      throw new AppError('Défi non trouvé', 404);
    }

    if (!challenge.hasParticipant(userId)) {
      throw new AppError('Vous devez participer au défi pour inviter des amis', 403);
    }

    const friends = await User.find({ _id: { $in: friendIds } });
    
    if (friends.length !== friendIds.length) {
      throw new AppError('Un ou plusieurs utilisateurs n\'existent pas', 404);
    }
  }
}