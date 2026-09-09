import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { type Credentials } from "google-auth-library";
import { decryptObject, encryptObject } from "./encryption.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..", "data");
const USERS_FILE = path.resolve(DATA_DIR, "users.json");

export interface UserRecord {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  encryptedTokens: string;
  activeSpreadsheetId?: string;
  activeSpreadsheetTitle?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory cache
let usersCache: Map<string, UserRecord> = new Map();
let isInitialized = false;

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadUsers(): void {
  ensureDataDirectory();
  if (fs.existsSync(USERS_FILE)) {
    try {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      const list: UserRecord[] = JSON.parse(data);
      usersCache = new Map(list.map((u) => [u.googleId, u]));
    } catch (e) {
      console.error("Error loading users store:", e);
      usersCache = new Map();
    }
  } else {
    usersCache = new Map();
    persistUsers();
  }
  isInitialized = true;
}

function persistUsers(): void {
  ensureDataDirectory();
  const list = Array.from(usersCache.values());
  fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), "utf-8");
}

function initIfNeeded() {
  if (!isInitialized) {
    loadUsers();
  }
}

export function getUser(googleId: string): UserRecord | null {
  initIfNeeded();
  return usersCache.get(googleId) || null;
}

export function saveUser(record: Omit<UserRecord, "createdAt" | "updatedAt"> & { createdAt?: string }): UserRecord {
  initIfNeeded();
  const now = new Date().toISOString();
  const existing = usersCache.get(record.googleId);

  const updated: UserRecord = {
    ...record,
    createdAt: existing?.createdAt || record.createdAt || now,
    updatedAt: now,
  };

  usersCache.set(record.googleId, updated);
  persistUsers();
  return updated;
}

export function saveUserWithTokens(
  googleId: string,
  profile: { email: string; name: string; picture?: string },
  tokens: Credentials
): UserRecord {
  initIfNeeded();
  const existing = usersCache.get(googleId);

  // If new tokens don't include refresh_token, retain existing refresh_token
  let tokensToSave = { ...tokens };
  if (!tokensToSave.refresh_token && existing?.encryptedTokens) {
    try {
      const oldTokens = decryptObject<Credentials>(existing.encryptedTokens);
      if (oldTokens.refresh_token) {
        tokensToSave.refresh_token = oldTokens.refresh_token;
      }
    } catch {
      // ignore decryption error on old tokens
    }
  }

  const encryptedTokens = encryptObject(tokensToSave);

  return saveUser({
    googleId,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    encryptedTokens,
    activeSpreadsheetId: existing?.activeSpreadsheetId,
    activeSpreadsheetTitle: existing?.activeSpreadsheetTitle,
  });
}

export function updateTokens(googleId: string, newTokens: Credentials): void {
  initIfNeeded();
  const user = usersCache.get(googleId);
  if (!user) return;

  let existingTokens: Credentials = {};
  try {
    existingTokens = decryptObject<Credentials>(user.encryptedTokens);
  } catch {
    // fallback
  }

  const mergedTokens: Credentials = {
    ...existingTokens,
    ...newTokens,
    // ensure refresh_token isn't wiped if newTokens didn't provide one
    refresh_token: newTokens.refresh_token || existingTokens.refresh_token,
  };

  user.encryptedTokens = encryptObject(mergedTokens);
  user.updatedAt = new Date().toISOString();
  persistUsers();
}

export function getDecryptedTokens(googleId: string): Credentials | null {
  initIfNeeded();
  const user = usersCache.get(googleId);
  if (!user || !user.encryptedTokens) return null;

  try {
    return decryptObject<Credentials>(user.encryptedTokens);
  } catch (err) {
    console.error(`Failed to decrypt tokens for user ${googleId}:`, err);
    return null;
  }
}

export function setActiveSpreadsheet(googleId: string, spreadsheetId: string, title?: string): UserRecord | null {
  initIfNeeded();
  const user = usersCache.get(googleId);
  if (!user) return null;

  user.activeSpreadsheetId = spreadsheetId;
  if (title) user.activeSpreadsheetTitle = title;
  user.updatedAt = new Date().toISOString();
  persistUsers();
  return user;
}
