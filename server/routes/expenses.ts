import { Router, Request, Response } from "express";
import { requireAuth, requireActiveSheet } from "../middleware/auth.js";
import { writeRateLimiter } from "../middleware/rateLimit.js";
import {
  getExpenses,
  appendExpense,
  updateExpense,
  deleteExpense,
  ExpenseInput,
} from "../services/googleSheets.js";

export const expensesRouter = Router();

// Require user to be authenticated and have an active sheet selected
expensesRouter.use(requireAuth);
expensesRouter.use(requireActiveSheet);

/**
 * Helper to validate expense input fields
 */
function validateExpenseInput(body: any): { valid: boolean; error?: string; data?: ExpenseInput } {
  const { date, category, description, amount } = body || {};

  // 1. Validate Category
  if (!category || typeof category !== "string" || !category.trim()) {
    return { valid: false, error: "Category must be a non-empty string" };
  }

  // 2. Validate Description
  if (!description || typeof description !== "string" || !description.trim()) {
    return { valid: false, error: "Description must be a non-empty string" };
  }

  // 3. Validate Amount
  const numAmount = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
    return { valid: false, error: "Amount must be a positive number greater than 0" };
  }

  // 4. Validate Date
  if (!date || typeof date !== "string") {
    return { valid: false, error: "Date must be a valid date string" };
  }
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return { valid: false, error: "Invalid date format provided" };
  }

  // Format date consistently to YYYY-MM-DD if ISO, or keep standard representation
  const formattedDate = parsedDate.toISOString().split("T")[0];

  return {
    valid: true,
    data: {
      date: formattedDate,
      category: category.trim(),
      description: description.trim(),
      amount: Math.round(numAmount * 100) / 100, // Round to 2 decimal places
    },
  };
}

/**
 * GET /expenses
 * Read all rows from the sheet and return them as JSON
 */
expensesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const authClient = req.authClient!;
    const spreadsheetId = req.currentUser!.activeSpreadsheetId!;

    const expenses = await getExpenses(authClient, spreadsheetId);

    return res.json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (err: any) {
    console.error("Error fetching expenses from Google Sheets:", err);
    return res.status(500).json({
      error: "SheetsApiError",
      message: err.message || "Failed to fetch expenses from Google Sheets",
    });
  }
});

/**
 * POST /expenses
 * Append a new row (date, category, description, amount) to the sheet
 */
expensesRouter.post("/", writeRateLimiter, async (req: Request, res: Response) => {
  const validation = validateExpenseInput(req.body);
  if (!validation.valid || !validation.data) {
    return res.status(400).json({
      error: "ValidationError",
      message: validation.error,
    });
  }

  try {
    const authClient = req.authClient!;
    const spreadsheetId = req.currentUser!.activeSpreadsheetId!;

    const newExpense = await appendExpense(authClient, spreadsheetId, validation.data);

    return res.status(201).json({
      success: true,
      expense: newExpense,
      message: "Expense added successfully",
    });
  } catch (err: any) {
    console.error("Error appending expense:", err);
    return res.status(500).json({
      error: "SheetsApiError",
      message: err.message || "Failed to append expense to Google Sheets",
    });
  }
});

/**
 * PUT /expenses/:rowId
 * Update a specific row's values
 */
expensesRouter.put("/:rowId", writeRateLimiter, async (req: Request, res: Response) => {
  const rowId = parseInt(req.params.rowId, 10);
  if (isNaN(rowId) || rowId < 2) {
    return res.status(400).json({
      error: "BadRequest",
      message: "rowId must be a valid integer greater than or equal to 2",
    });
  }

  const validation = validateExpenseInput(req.body);
  if (!validation.valid || !validation.data) {
    return res.status(400).json({
      error: "ValidationError",
      message: validation.error,
    });
  }

  try {
    const authClient = req.authClient!;
    const spreadsheetId = req.currentUser!.activeSpreadsheetId!;

    // Check if row exists
    const currentExpenses = await getExpenses(authClient, spreadsheetId);
    const existing = currentExpenses.find((e) => e.rowId === rowId);

    if (!existing) {
      return res.status(404).json({
        error: "NotFound",
        message: `Expense with rowId ${rowId} was not found in active sheet`,
      });
    }

    const updatedExpense = await updateExpense(authClient, spreadsheetId, rowId, validation.data);

    return res.json({
      success: true,
      expense: updatedExpense,
      message: `Expense at row ${rowId} updated successfully`,
    });
  } catch (err: any) {
    console.error("Error updating expense:", err);
    return res.status(500).json({
      error: "SheetsApiError",
      message: err.message || `Failed to update expense at row ${rowId}`,
    });
  }
});

/**
 * DELETE /expenses/:rowId
 * Delete a specific row and shift remaining rows up
 */
expensesRouter.delete("/:rowId", writeRateLimiter, async (req: Request, res: Response) => {
  const rowId = parseInt(req.params.rowId, 10);
  if (isNaN(rowId) || rowId < 2) {
    return res.status(400).json({
      error: "BadRequest",
      message: "rowId must be a valid integer greater than or equal to 2",
    });
  }

  try {
    const authClient = req.authClient!;
    const spreadsheetId = req.currentUser!.activeSpreadsheetId!;

    // Check if row exists
    const currentExpenses = await getExpenses(authClient, spreadsheetId);
    const existing = currentExpenses.find((e) => e.rowId === rowId);

    if (!existing) {
      return res.status(404).json({
        error: "NotFound",
        message: `Expense with rowId ${rowId} was not found in active sheet`,
      });
    }

    const result = await deleteExpense(authClient, spreadsheetId, rowId);

    return res.json({
      success: true,
      deletedRowId: result.deletedRowId,
      message: `Expense at row ${rowId} deleted successfully, subsequent rows shifted up`,
    });
  } catch (err: any) {
    console.error("Error deleting expense:", err);
    return res.status(500).json({
      error: "SheetsApiError",
      message: err.message || `Failed to delete expense at row ${rowId}`,
    });
  }
});
