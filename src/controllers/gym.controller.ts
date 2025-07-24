import { Request, Response, NextFunction } from 'express';
import { Gym, IGym } from '../models/gym.model';
import { User } from '../models/user.model';
import { asyncHandler } from '../middlewares/error.middleware';
import { AppError } from '../utils/AppError';

interface GymCreateData {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  capacity: number;
  equipment: string[];
  facilities: string[];
  openingHours: any;
  images?: string[];
}

export class GymController {
  /**
   * @desc    Créer une nouvelle salle de sport
   * @route   POST /api/gyms
   * @access  Private (gym_owner ou super_admin)
   */
  static createGym = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
      name,
      description,
      address,
      contact,
      capacity,
      equipment,
      facilities,
      openingHours,
      images
    }: GymCreateData = req.body;

    const userId = req.user?._id;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    if (req.user?.role !== 'super_admin' && req.user?.role !== 'gym_owner') {
      throw new AppError('Seuls les propriétaires de salle et les administrateurs peuvent créer des salles', 403);
    }

    const existingGym = await Gym.findOne({ name: name.trim() });
    if (existingGym) {
      throw new AppError('Une salle avec ce nom existe déjà', 400);
    }

    const gym = await Gym.create({
      name: name.trim(),
      description,
      address,
      contact,
      capacity,
      equipment: equipment || [],
      facilities: facilities || [],
      openingHours: openingHours || {},
      images: images || [],
      owner: userId,
      isApproved: req.user?.role === 'super_admin',
      ...(req.user?.role === 'super_admin' && {
        approvedBy: userId,
        approvedAt: new Date(),
      }),
    });

    await User.findByIdAndUpdate(userId, {
      $push: { gyms: gym._id },
    });

    res.status(201).json({
      success: true,
      data: {
        gym,
      },
      message: req.user?.role === 'super_admin' 
        ? 'Salle créée et approuvée avec succès'
        : 'Salle créée avec succès. En attente d\'approbation.',
    });
  });

  /**
   * @desc    Obtenir toutes les salles (avec filtres)
   * @route   GET /api/gyms?city=Paris&isApproved=true&page=1&limit=10
   * @access  Public
   */
  static getAllGyms = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
      city,
      isApproved,
      search,
      equipment,
      facilities,
      page = 1,
      limit = 20,
      sortBy = 'name'
    } = req.query;

    const query: any = {};

    if (city) query['address.city'] = { $regex: city, $options: 'i' };
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
      ];
    }
    if (equipment) {
      const equipmentArray = Array.isArray(equipment) ? equipment : [equipment];
      query.equipment = { $in: equipmentArray };
    }
    if (facilities) {
      const facilitiesArray = Array.isArray(facilities) ? facilities : [facilities];
      query.facilities = { $in: facilitiesArray };
    }

    if (!req.user || req.user.role === 'client') {
      query.isApproved = true;
    }

    const [gyms, total] = await Promise.all([
      Gym.find(query)
        .populate('owner', 'username profile.firstName profile.lastName')
        .populate('approvedBy', 'username')
        .select('-subscriptions')
        .limit(Number(limit)),
      Gym.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        gyms,
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
   * @desc    Obtenir une salle par ID
   * @route   GET /api/gyms/:id
   * @access  Public
   */
  static getGymById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const gym = await Gym.findById(req.params.id)
      .populate('owner', 'username profile.firstName profile.lastName contact')
      .populate('challenges', 'title description difficulty type')
      .populate('approvedBy', 'username');

    if (!gym) {
      throw new AppError('Salle non trouvée', 404);
    }

    // if (!gym.isApproved) {
    //   if (!req.user || (
    //     req.user.role !== 'super_admin' &&
    //     gym.owner._id.toString() !== req.user._id.toString()
    //   )) {
    //     throw new AppError('Salle non trouvée', 404);
    //   }
    // }

    res.status(200).json({
      success: true,
      data: {
        gym,
      },
    });
  });

  /**
   * @desc    Mettre à jour une salle
   * @route   PUT /api/gyms/:id
   * @access  Private (Propriétaire ou Admin)
   */
  static updateGym = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const gym = await Gym.findById(req.params.id);

    if (!gym) {
      throw new AppError('Salle non trouvée', 404);
    }

    if (
      req.user?.role !== 'super_admin' &&
      gym.owner.toString() !== req.user?._id.toString()
    ) {
      throw new AppError('Vous n\'êtes pas autorisé à modifier cette salle', 403);
    }

    const importantFields = ['name', 'address', 'capacity', 'contact'];
    const isImportantChange = importantFields.some(field => req.body[field]);

    const updateData = { ...req.body };

    if (isImportantChange && gym.isApproved && req.user?.role !== 'super_admin') {
      updateData.isApproved = false;
      updateData.approvedBy = undefined;
      updateData.approvedAt = undefined;
    }

    const updatedGym = await Gym.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('owner', 'username profile.firstName profile.lastName');

    res.status(200).json({
      success: true,
      data: {
        gym: updatedGym,
      },
      message: isImportantChange && gym.isApproved && req.user?.role !== 'super_admin'
        ? 'Salle mise à jour. En attente d\'approbation à nouveau.'
        : 'Salle mise à jour avec succès',
    });
  });

  /**
   * @desc    Supprimer une salle
   * @route   DELETE /api/gyms/:id
   * @access  Private (Propriétaire ou Admin)
   */
  static deleteGym = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const gym = await Gym.findById(req.params.id);

    if (!gym) {
      throw new AppError('Salle non trouvée', 404);
    }

    if (
      req.user?.role !== 'super_admin' &&
      gym.owner.toString() !== req.user?._id.toString()
    ) {
      throw new AppError('Vous n\'êtes pas autorisé à supprimer cette salle', 403);
    }

    await User.findByIdAndUpdate(gym.owner, {
      $pull: { gyms: gym._id },
    });

    await gym.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Salle supprimée avec succès',
    });
  });

  /**
   * @desc    S'abonner à une salle
   * @route   POST /api/gyms/:id/subscribe
   * @access  Private (Client)
   */
  static subscribeToGym = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const gymId = req.params.id;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const gym = await Gym.findById(gymId);

    if (!gym) {
      throw new AppError('Salle non trouvée', 404);
    }

    if (!gym.isApproved) {
      throw new AppError('Cette salle n\'est pas encore approuvée', 400);
    }

    if (gym.isUserSubscribed(userId.toString())) {
      throw new AppError('Vous êtes déjà abonné à cette salle', 400);
    }

    gym.subscriptions.push({
      user: userId,
      startDate: new Date(),
      isActive: true,
    });

    await gym.save();

    res.status(200).json({
      success: true,
      message: 'Abonnement créé avec succès',
    });
  });

  /**
   * @desc    Se désabonner d'une salle
   * @route   POST /api/gyms/:id/unsubscribe
   * @access  Private (Client)
   */
  static unsubscribeFromGym = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const gymId = req.params.id;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const gym = await Gym.findById(gymId);

    if (!gym) {
      throw new AppError('Salle non trouvée', 404);
    }

    const subscription = gym.subscriptions.find(
      sub => sub.user.toString() === userId.toString() && sub.isActive
    );

    if (!subscription) {
      throw new AppError('Vous n\'êtes pas abonné à cette salle', 400);
    }

    subscription.isActive = false;
    subscription.endDate = new Date();

    await gym.save();

    res.status(200).json({
      success: true,
      message: 'Désabonnement effectué avec succès',
    });
  });

  /**
   * @desc    Obtenir les salles de l'utilisateur connecté
   * @route   GET /api/gyms/my-gyms
   * @access  Private
   */
  static getMyGyms = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    let gyms;

    if (req.user?.role === 'gym_owner' || req.user?.role === 'super_admin') {
      gyms = await Gym.find({ owner: userId })
        .populate('approvedBy', 'username')
        .sort('-createdAt');
    } else {
      gyms = await Gym.find({
        'subscriptions.user': userId,
        'subscriptions.isActive': true,
      })
        .populate('owner', 'username profile.firstName profile.lastName')
        .sort('-subscriptions.startDate');
    }

    res.status(200).json({
      success: true,
      data: {
        gyms,
        count: gyms.length,
      },
    });
  });

  // === ADMIN ONLY METHODS ===

  /**
   * @desc    Approuver/Rejeter une salle (Admin)
   * @route   PUT /api/gyms/:id/approve
   * @access  Private/Super Admin
   */
  static approveGym = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { approved, reason } = req.body;
    const gymId = req.params.id;
    const adminId = req.user?._id;

    const gym = await Gym.findById(gymId).populate('owner', 'username email');

    console.log(gym)

    if (!gym) {
      throw new AppError('Salle non trouvée', 404);
    }

    if (approved) {
      gym.isApproved = true;
      gym.approvedBy = adminId;
      gym.approvedAt = new Date();
    } else {
      gym.isApproved = false;
      gym.approvedBy = undefined;
      gym.approvedAt = undefined;
    }

    await gym.save();

    res.status(200).json({
      success: true,
      data: {
        gym: {
          _id: gym._id,
          name: gym.name,
          isApproved: gym.isApproved,
          approvedAt: gym.approvedAt,
        },
      },
      message: approved 
        ? 'Salle approuvée avec succès' 
        : 'Salle rejetée avec succès',
    });
  });

  /**
   * @desc    Obtenir les salles en attente d'approbation (Admin)
   * @route   GET /api/gyms/pending
   * @access  Private/Super Admin
   */
  static getPendingGyms = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [gyms, total] = await Promise.all([
      Gym.find({ isApproved: false })
        .populate('owner', 'username profile.firstName profile.lastName email')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Gym.countDocuments({ isApproved: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        gyms,
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
   * @desc    Obtenir les statistiques des salles (Admin)
   * @route   GET /api/gyms/stats
   * @access  Private/Super Admin
   */
  static getGymStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const [
      totalGyms,
      approvedGyms,
      pendingGyms,
      totalSubscriptions,
      gymsByCity
    ] = await Promise.all([
      Gym.countDocuments(),
      Gym.countDocuments({ isApproved: true }),
      Gym.countDocuments({ isApproved: false }),
      Gym.aggregate([
        { $unwind: '$subscriptions' },
        { $match: { 'subscriptions.isActive': true } },
        { $count: 'total' }
      ]),
      Gym.aggregate([
        { $group: { _id: '$address.city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    const subscriptionCount = totalSubscriptions[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalGyms,
          approvedGyms,
          pendingGyms,
          totalSubscriptions: subscriptionCount,
          approvalRate: totalGyms > 0 ? Math.round((approvedGyms / totalGyms) * 100) : 0,
        },
        gymsByCity,
      },
    });
  });
} 