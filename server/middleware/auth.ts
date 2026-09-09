import { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import { getUser, UserRecord } from "../services/userStore.js";
import { getAuthenticatedClientForUser } from "../services/googleAuth.js";

// Extend Express Request type to include auth context
declare global {
  namespace Express {
    interface Request {
      currentUser?: UserRecord;
      authClient?: OAuth2Client;
    }
  }
}

/**
 * Authentication middleware ensuring request has an active authenticated session
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const googleId = (req.session as any)?.googleId || (req.headers["x-google-id"] as string);

  if (!googleId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required. Please sign in with Google.",
    });
  }

  const user = getUser(googleId);
  if (!user) {
    if (req.session) {
      (req.session as any).googleId = null;
    }
    return res.status(401).json({
      error: "Unauthorized",
      message: "User session expired or invalid. Please sign in again.",
    });
  }

  try {
    const authClient = await getAuthenticatedClientForUser(googleId);
    req.currentUser = user;
    req.authClient = authClient;
    next();
  } catch (err: any) {
    console.error("Authentication error for user", googleId, err);
    return res.status(401).json({
      error: "Unauthorized",
      message: "Google authentication failed or tokens expired. Please re-authenticate.",
    });
  }
}

/**
 * Middleware ensuring the authenticated user has selected or created a Google Sheet
 */
export function requireActiveSheet(req: Request, res: Response, next: NextFunction) {
  const user = req.currentUser;
  if (!user?.activeSpreadsheetId) {
    return res.status(400).json({
      error: "NoActiveSheet",
      message: "No active Google Sheet selected. Please create or select a sheet first.",
    });
  }
  next();
}
