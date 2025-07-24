import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'general',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    res.status(400).json({
      success: false,
      error: {
        message: 'Erreurs de validation',
        details: formattedErrors,
      },
    });
  };
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeString = (str: any): string => {
    if (typeof str !== 'string') return str;
    return str.trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    } else if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    } else if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    return obj;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);

  next();
};

export const validateMongoId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `ID invalide: ${paramName}`,
        },
      });
    }
    
    next();
  };
};

export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  if (page < 1 || limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Paramètres de pagination invalides',
        details: {
          page: 'Doit être >= 1',
          limit: 'Doit être entre 1 et 100',
        },
      },
    });
  }
  
  req.query.page = page.toString();
  req.query.limit = limit.toString();
  
  next();
};