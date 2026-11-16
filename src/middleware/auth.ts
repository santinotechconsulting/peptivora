import type { Request, Response, NextFunction } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateProfileWithRoles } from '../db/repository.ts';
import type { AppRole } from '../core/domain/compliance.ts';

export interface DbUserContext {
  uid: string;
  email: string;
  displayName: string | null;
  kybStatus: string;
  preferredLocale: string;
  roles: AppRole[];
  primaryRole: AppRole;
}

export interface AuthRequest extends Request {
  authToken?: DecodedIdToken;
  dbUser?: DbUserContext;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing bearer token.' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.authToken = decoded;

    req.dbUser = await getOrCreateProfileWithRoles(
      decoded.uid,
      decoded.email || '',
      decoded.name || null,
      decoded.email_verified === true
    );
    next();
  } catch (error) {
    console.error('Authentication verification failed:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.authToken = decoded;
    req.dbUser = await getOrCreateProfileWithRoles(
      decoded.uid,
      decoded.email || '',
      decoded.name || null,
      decoded.email_verified === true
    );
  } catch {
    // Proceed anonymously
  }
  next();
};

export const requireRole = (allowedRoles: AppRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized: Authentication required.' });
      return;
    }
    const authorized = req.dbUser.roles.some((r) => allowedRoles.includes(r));
    if (!authorized) {
      res.status(403).json({
        error: `Forbidden: Role '${req.dbUser.primaryRole}' lacks permission for this operation.`,
      });
      return;
    }
    next();
  };
};
