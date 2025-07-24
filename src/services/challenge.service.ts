import { Challenge, IChallenge } from '../models/challenge.model';
import { User } from '../models/user.model';
import { Gym } from '../models/gym.model';
import { AppError } from '../utils/AppError';
import { BadgeService } from './badge.service';
import mongoose from 'mongoose';
import { Invitation, IInvitation } from '../models/invitation.model';

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
  static async getChallenges(filters: ChallengeFilters, page = 1, limit = 20, searchQuery?: any) {
    const query: any = { ...searchQuery };

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

    const inviter = await User.findById(userId);
    if (!inviter) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    if (!challenge.hasParticipant(userId)) {
      throw new AppError('Vous devez participer au défi pour inviter des amis', 403);
    }

    const validFriends = await User.find({ _id: { $in: friendIds } });
    if (validFriends.length !== friendIds.length) {
      throw new AppError('Un ou plusieurs utilisateurs à inviter n\'existent pas', 404);
    }

    for (const friend of validFriends) {
      // Check if they are actually friends
      if (!inviter.friends.includes(friend._id)) {
        throw new AppError(`${friend.username} n'est pas votre ami`, 400);
      }

      // Check if already invited or participating
      const existingInvitation = await Invitation.findOne({
        challenge: challengeId,
        recipient: friend._id,
        status: 'pending',
      });

      if (existingInvitation) {
        throw new AppError(`Une invitation est déjà en attente pour ${friend.username}`, 400);
      }

      if (challenge.hasParticipant(friend._id.toString())) {
        throw new AppError(`${friend.username} participe déjà à ce défi`, 400);
      }

      await Invitation.create({
        challenge: challengeId,
        sender: userId,
        recipient: friend._id,
        status: 'pending',
      });
    }
  }

  /**
   * Obtenir les invitations d'un utilisateur
   */
  static async getInvitations(userId: string): Promise<IInvitation[]> {
    const invitations = await Invitation.find({ recipient: userId, status: 'pending' })
      .populate('challenge', 'title description')
      .populate('sender', 'username profile.firstName profile.lastName');
    return invitations;
  }

  /**
   * Accepter une invitation
   */
  static async acceptInvitation(invitationId: string, userId: string): Promise<IChallenge> {
    const invitation = await Invitation.findOne({ _id: invitationId, recipient: userId, status: 'pending' });

    if (!invitation) {
      throw new AppError('Invitation non trouvée ou déjà traitée', 404);
    }

    const challenge = await Challenge.findById(invitation.challenge);
    if (!challenge) {
      throw new AppError('Défi associé à l\'invitation non trouvé', 404);
    }

    if (challenge.hasParticipant(userId)) {
      await invitation.deleteOne(); // Clean up invitation if user already joined
      throw new AppError('Vous participez déjà à ce défi', 400);
    }

    if (challenge.isFull()) {
      throw new AppError('Ce défi a atteint le nombre maximum de participants', 400);
    }

    if (!challenge.isActive) {
      throw new AppError('Ce défi n\'est plus actif', 400);
    }

    challenge.participants.push({
      user: userId as any,
      joinedAt: new Date(),
      progress: 0,
    });
    await challenge.save();

    invitation.status = 'accepted';
    await invitation.deleteOne(); // Remove invitation after acceptance

    await User.findByIdAndUpdate(userId, {
      $inc: { 'stats.totalChallenges': 1 },
    });

    return challenge;
  }

  /**
   * Rejeter une invitation
   */
  static async rejectInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await Invitation.findOne({ _id: invitationId, recipient: userId, status: 'pending' });

    if (!invitation) {
      throw new AppError('Invitation non trouvée ou déjà traitée', 404);
    }

    invitation.status = 'rejected';
    await invitation.deleteOne(); // Remove invitation after rejection
  }
}