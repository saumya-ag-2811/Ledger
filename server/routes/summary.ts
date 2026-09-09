import { Router, Request, Response } from "express";
import { requireAuth, requireActiveSheet } from "../middleware/auth.js";
import { getExpenses } from "../services/googleSheets.js";

export const summaryRouter = Router();

// Require user to be authenticated and have an active sheet selected
summaryRouter.use(requireAuth);
summaryRouter.use(requireActiveSheet);

/**
 * GET /summary/categories
 * Return totals grouped by category for all expenses (or within an optional date range)
 */
summaryRouter.get("/categories", async (req: Request, res: Response) => {
  try {
    const authClient = req.authClient!;
    const spreadsheetId = req.currentUser!.activeSpreadsheetId!;
    const { startDate, endDate } = req.query;

    const allExpenses = await getExpenses(authClient, spreadsheetId);

    // Filter by optional date range
    let filtered = allExpenses;
    if (startDate && typeof startDate === "string") {
      filtered = filtered.filter((e) => e.date >= startDate);
    }
    if (endDate && typeof endDate === "string") {
      filtered = filtered.filter((e) => e.date <= endDate);
    }

    const categoryMap: Record<string, { total: number; count: number }> = {};
    let grandTotal = 0;

    for (const exp of filtered) {
      const cat = exp.category || "Uncategorized";
      if (!categoryMap[cat]) {
        categoryMap[cat] = { total: 0, count: 0 };
      }
      categoryMap[cat].total += exp.amount;
      categoryMap[cat].count += 1;
      grandTotal += exp.amount;
    }

    const categories = Object.entries(categoryMap).map(([category, stats]) => {
      const total = Math.round(stats.total * 100) / 100;
      const percentage = grandTotal > 0 ? Math.round((total / grandTotal) * 10000) / 100 : 0;
      return {
        category,
        total,
        count: stats.count,
        percentage,
      };
    });

    // Sort descending by total spend
    categories.sort((a, b) => b.total - a.total);

    return res.json({
      success: true,
      totalSpend: Math.round(grandTotal * 100) / 100,
      totalTransactions: filtered.length,
      dateRange: {
        startDate: (startDate as string) || null,
        endDate: (endDate as string) || null,
      },
      categories,
    });
  } catch (err: any) {
    console.error("Error generating category summary:", err);
    return res.status(500).json({
      error: "SheetsApiError",
      message: err.message || "Failed to generate category summary from Google Sheet",
    });
  }
});

/**
 * GET /summary/monthly
 * Return total spend per month, plus current month's total and transaction count
 */
summaryRouter.get("/monthly", async (req: Request, res: Response) => {
  try {
    const authClient = req.authClient!;
    const spreadsheetId = req.currentUser!.activeSpreadsheetId!;

    const expenses = await getExpenses(authClient, spreadsheetId);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthMap: Record<string, { total: number; count: number }> = {};

    for (const exp of expenses) {
      // Extract YYYY-MM
      let monthKey = "";
      if (exp.date && exp.date.length >= 7) {
        monthKey = exp.date.substring(0, 7);
      } else {
        monthKey = "Unknown";
      }

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { total: 0, count: 0 };
      }
      monthMap[monthKey].total += exp.amount;
      monthMap[monthKey].count += 1;
    }

    const months = Object.entries(monthMap)
      .map(([month, stats]) => ({
        month,
        total: Math.round(stats.total * 100) / 100,
        count: stats.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const currentMonthStats = monthMap[currentMonthKey] || { total: 0, count: 0 };

    return res.json({
      success: true,
      currentMonth: {
        month: currentMonthKey,
        total: Math.round(currentMonthStats.total * 100) / 100,
        count: currentMonthStats.count,
      },
      months,
    });
  } catch (err: any) {
    console.error("Error generating monthly summary:", err);
    return res.status(500).json({
      error: "SheetsApiError",
      message: err.message || "Failed to generate monthly summary from Google Sheet",
    });
  }
});
