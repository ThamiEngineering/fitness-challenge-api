import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/user.model';
import { AppError } from '../utils/AppError';

interface JwtPayload {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Vous n\'êtes pas connecté. Veuillez vous connecter pour accéder à cette ressource', 401);
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload;

    const currentUser = await User.findById(decoded.id).select('+password');

    if (!currentUser) {
      throw new AppError('L\'utilisateur appartenant à ce token n\'existe plus', 401);
    }

    if (!currentUser.isActive) {
      throw new AppError('Votre compte a été désactivé. Veuillez contacter l\'administrateur', 403);
    }

    req.user = currentUser;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Token invalide. Veuillez vous reconnecter', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Votre token a expiré. Veuillez vous reconnecter', 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Vous devez être connecté pour accéder à cette ressource', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Vous n\'avez pas la permission d\'effectuer cette action', 403)
      );
    }

    next();
  };
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload;

    const currentUser = await User.findById(decoded.id);

    if (currentUser && currentUser.isActive) {
      req.user = currentUser;
    }

    next();
  } catch (error) {
    next();
  }
};