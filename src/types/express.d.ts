declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        email?: string;
      };
      rateLimit?: {
        resetTime?: Date;
        limit?: number;
        current?: number;
        remaining?: number;
      };
    }
  }
}

export { };

