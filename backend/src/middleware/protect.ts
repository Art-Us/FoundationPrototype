import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_key_change_in_production';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * @desc Middleware sprawdzający poprawność tokenu JWT oraz weryfikację konta (isVerified === true)
 */
export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  // 1. Sprawdzenie nagłówka Authorization (Bearer <token>)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Brak autoryzacji. Token nie został dostarczony.',
    });
    return;
  }

  try {
    // 2. Weryfikacja tokenu JWT
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // 3. Pobranie użytkownika z bazy danych
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Brak autoryzacji. Użytkownik powiązany z tokenem nie istnieje.',
      });
      return;
    }

    // 4. Sprawdzenie, czy konto użytkownika jest zweryfikowane
    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        message: 'Dostęp zabroniony. Twoje konto oczekuje na weryfikację przez administratora.',
      });
      return;
    }

    // Dołączenie użytkownika do obiektu żądania
    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: 'Brak autoryzacji. Nieprawidłowy lub wygasły token.',
      error: error.message,
    });
  }
};
