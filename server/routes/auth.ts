import { Router, Request, Response } from "express";
import { getAuthorizationUrl, exchangeCodeForTokens } from "../services/googleAuth.js";
import { saveUserWithTokens, getUser } from "../services/userStore.js";

export const authRouter = Router();

/**
 * GET /auth/google
 * Initiates the Google OAuth 2.0 flow
 */
authRouter.get("/google", (req: Request, res: Response) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      error: "MisconfiguredCredentials",
      message: "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not configured in .env. Please configure them to use Google OAuth.",
    });
  }

  const state = (req.query.state as string) || undefined;
  const authUrl = getAuthorizationUrl(state);
  return res.redirect(authUrl);
});

/**
 * GET /auth/google/callback
 * Handles OAuth callback from Google
 */
authRouter.get("/google/callback", async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const error = req.query.error as string;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  if (error) {
    console.error("Google OAuth error in callback:", error);
    return res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.status(400).json({
      error: "BadRequest",
      message: "Missing authorization code from Google OAuth callback",
    });
  }

  try {
    const { tokens, profile } = await exchangeCodeForTokens(code);
    const user = saveUserWithTokens(profile.googleId, profile, tokens);

    // Save session
    if (req.session) {
      (req.session as any).googleId = user.googleId;
    }

    return res.redirect(`${frontendUrl}?auth_success=1`);
  } catch (err: any) {
    console.error("Error exchanging code for tokens:", err);
    return res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(err.message || "Failed to authenticate with Google")}`);
  }
});

/**
 * GET /auth/me
 * Retrieves current authenticated user profile
 */
authRouter.get("/me", (req: Request, res: Response) => {
  const googleId = (req.session as any)?.googleId || (req.headers["x-google-id"] as string);

  if (!googleId) {
    return res.status(401).json({
      authenticated: false,
      user: null,
    });
  }

  const user = getUser(googleId);
  if (!user) {
    if (req.session) (req.session as any).googleId = null;
    return res.status(401).json({
      authenticated: false,
      user: null,
    });
  }

  return res.json({
    authenticated: true,
    user: {
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture,
      activeSpreadsheetId: user.activeSpreadsheetId || null,
      activeSpreadsheetTitle: user.activeSpreadsheetTitle || null,
    },
  });
});

/**
 * POST /auth/logout
 * Destroys session
 */
authRouter.post("/logout", (req: Request, res: Response) => {
  if (req.session) {
    (req.session as any).googleId = null;
    req.session = null;
  }
  return res.json({
    success: true,
    message: "Logged out successfully",
  });
});
