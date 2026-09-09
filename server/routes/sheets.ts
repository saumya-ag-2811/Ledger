import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { writeRateLimiter } from "../middleware/rateLimit.js";
import { createSpreadsheet, listSpreadsheets } from "../services/googleSheets.js";
import { setActiveSpreadsheet } from "../services/userStore.js";

export const sheetsRouter = Router();

// Protect all sheets routes with authentication
sheetsRouter.use(requireAuth);

/**
 * POST /sheets
 * Create a new Google Sheet with header row: Date, Category, Description, Amount
 */
sheetsRouter.post("/", writeRateLimiter, async (req: Request, res: Response) => {
  try {
    const { title } = req.body || {};
    const authClient = req.authClient!;
    const user = req.currentUser!;

    const created = await createSpreadsheet(authClient, title);

    // Automatically set as user's active sheet
    setActiveSpreadsheet(user.googleId, created.spreadsheetId, created.title);

    return res.status(201).json({
      success: true,
      spreadsheetId: created.spreadsheetId,
      title: created.title,
      url: created.url,
      message: "Google Sheet created and set as active spreadsheet.",
    });
  } catch (err: any) {
    console.error("Error creating Google Sheet:", err);
    return res.status(500).json({
      error: "SheetsApiError",
      message: err.message || "Failed to create Google Sheet",
    });
  }
});

/**
 * GET /sheets
 * List user's existing Google Sheets from Drive
 */
sheetsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const authClient = req.authClient!;
    const sheets = await listSpreadsheets(authClient);

    return res.json({
      sheets,
      activeSpreadsheetId: req.currentUser?.activeSpreadsheetId || null,
    });
  } catch (err: any) {
    console.error("Error listing Google Sheets:", err);
    return res.status(500).json({
      error: "DriveApiError",
      message: err.message || "Failed to list Google Sheets from Google Drive",
    });
  }
});

/**
 * POST /sheets/select
 * Select an existing Google Sheet to be used for expenses
 */
sheetsRouter.post("/select", async (req: Request, res: Response) => {
  const { spreadsheetId, title } = req.body || {};

  if (!spreadsheetId || typeof spreadsheetId !== "string" || !spreadsheetId.trim()) {
    return res.status(400).json({
      error: "BadRequest",
      message: "A valid spreadsheetId string is required",
    });
  }

  const user = req.currentUser!;
  const updated = setActiveSpreadsheet(user.googleId, spreadsheetId.trim(), title?.trim());

  return res.json({
    success: true,
    activeSpreadsheetId: updated?.activeSpreadsheetId,
    activeSpreadsheetTitle: updated?.activeSpreadsheetTitle,
    message: "Active Google Sheet updated successfully.",
  });
});

/**
 * GET /sheets/active
 * Get current active spreadsheet
 */
sheetsRouter.get("/active", (req: Request, res: Response) => {
  const user = req.currentUser!;
  return res.json({
    activeSpreadsheetId: user.activeSpreadsheetId || null,
    activeSpreadsheetTitle: user.activeSpreadsheetTitle || null,
  });
});
