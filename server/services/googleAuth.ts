import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getDecryptedTokens, updateTokens } from "./userStore.js";

export const GOOGLE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

export function getOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/auth/google/callback";

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate Google OAuth consent URL with offline access to receive a refresh token.
 */
export function getAuthorizationUrl(state?: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true,
    state: state || undefined,
  });
}

/**
 * Exchange authorization code for tokens and retrieve profile info.
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Retrieve user profile
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();

  return {
    tokens,
    profile: {
      googleId: userInfo.data.id || "",
      email: userInfo.data.email || "",
      name: userInfo.data.name || userInfo.data.email || "User",
      picture: userInfo.data.picture || undefined,
    },
  };
}

/**
 * Return an OAuth2 client configured with user's credentials,
 * and attach an automatic token refresh listener that persists new tokens.
 */
export async function getAuthenticatedClientForUser(googleId: string): Promise<OAuth2Client> {
  const tokens = getDecryptedTokens(googleId);
  if (!tokens) {
    throw new Error("No tokens found for user");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  // When googleapis automatically refreshes the access token, save it to the encrypted store
  oauth2Client.on("tokens", (newTokens: any) => {
    try {
      updateTokens(googleId, newTokens);
    } catch (err) {
      console.error(`Error updating refreshed tokens for user ${googleId}:`, err);
    }
  });

  // Verify / force refresh if expired and credentials are configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    if (tokens.expiry_date && tokens.expiry_date <= Date.now() + 60000) {
      if (tokens.refresh_token) {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          updateTokens(googleId, credentials);
        } catch (err) {
          console.error("Failed to refresh token proactively:", err);
        }
      }
    }
  }

  return oauth2Client;
}
