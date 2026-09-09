import { google, sheets_v4, drive_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export interface Expense {
  rowId: number;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export interface ExpenseInput {
  date: string;
  category: string;
  description: string;
  amount: number;
}

const DEFAULT_HEADERS = ["Date", "Category", "Description", "Amount"];

/**
 * Helper to get sheets API instance
 */
function getSheetsClient(auth: OAuth2Client): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth });
}

/**
 * Helper to get drive API instance
 */
function getDriveClient(auth: OAuth2Client): drive_v3.Drive {
  return google.drive({ version: "v3", auth });
}

/**
 * Create a new Google Sheet with header row: Date, Category, Description, Amount
 */
export async function createSpreadsheet(auth: OAuth2Client, title?: string) {
  const sheets = getSheetsClient(auth);
  const sheetTitle = title?.trim() || `Ledger Expenses (${new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })})`;

  // 1. Create the spreadsheet
  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: sheetTitle,
      },
      sheets: [
        {
          properties: {
            title: "Sheet1",
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    },
  });

  const spreadsheetId = res.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error("Failed to create spreadsheet — no ID returned from Google Sheets API");
  }

  // 2. Set the header row values
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Sheet1!A1:D1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [DEFAULT_HEADERS],
    },
  });

  return {
    spreadsheetId,
    title: sheetTitle,
    url: res.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

/**
 * List user's Google Sheets from Google Drive
 */
export async function listSpreadsheets(auth: OAuth2Client) {
  const drive = getDriveClient(auth);

  const res = await drive.files.list({
    q: "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    fields: "files(id, name, modifiedTime, webViewLink, owners)",
    orderBy: "modifiedTime desc",
    pageSize: 50,
  });

  const files = res.data.files || [];
  return files.map((file) => ({
    id: file.id || "",
    name: file.name || "Untitled Spreadsheet",
    modifiedTime: file.modifiedTime,
    url: file.webViewLink,
  }));
}

/**
 * Read all expense rows from the sheet
 */
export async function getExpenses(auth: OAuth2Client, spreadsheetId: string): Promise<Expense[]> {
  const sheets = getSheetsClient(auth);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A:D",
  });

  const rows = res.data.values || [];
  if (rows.length <= 1) {
    // Only header row exists or sheet is empty
    return [];
  }

  const expenses: Expense[] = [];

  // Row 1 is header, data starts at row 2
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rowDate = String(row[0] || "").trim();
    const rowCategory = String(row[1] || "").trim();
    const rowDescription = String(row[2] || "").trim();
    const rawAmount = String(row[3] || "").replace(/[^0-9.-]+/g, "");
    const rowAmount = parseFloat(rawAmount);

    // Skip row if completely empty
    if (!rowDate && !rowCategory && !rowDescription && isNaN(rowAmount)) {
      continue;
    }

    expenses.push({
      rowId: i + 1, // 1-indexed row number in spreadsheet
      date: rowDate,
      category: rowCategory,
      description: rowDescription,
      amount: isNaN(rowAmount) ? 0 : rowAmount,
    });
  }

  return expenses;
}

/**
 * Append an expense row to the sheet
 */
export async function appendExpense(
  auth: OAuth2Client,
  spreadsheetId: string,
  expense: ExpenseInput
): Promise<Expense> {
  const sheets = getSheetsClient(auth);

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:D",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[expense.date, expense.category, expense.description, expense.amount]],
    },
  });

  // Extract appended row index from updatedRange (e.g. "Sheet1!A5:D5")
  let rowId = 2; // Default fallback
  const updatedRange = res.data.updates?.updatedRange;
  if (updatedRange) {
    const match = updatedRange.match(/!A(\d+)/);
    if (match && match[1]) {
      rowId = parseInt(match[1], 10);
    }
  }

  return {
    rowId,
    date: expense.date,
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
  };
}

/**
 * Update a specific row's values
 */
export async function updateExpense(
  auth: OAuth2Client,
  spreadsheetId: string,
  rowId: number,
  expense: ExpenseInput
): Promise<Expense> {
  if (rowId < 2) {
    throw new Error("Cannot update header row or non-positive row ID");
  }

  const sheets = getSheetsClient(auth);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Sheet1!A${rowId}:D${rowId}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[expense.date, expense.category, expense.description, expense.amount]],
    },
  });

  return {
    rowId,
    date: expense.date,
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
  };
}

/**
 * Delete a specific row and shift remaining rows up
 */
export async function deleteExpense(
  auth: OAuth2Client,
  spreadsheetId: string,
  rowId: number
): Promise<{ success: boolean; deletedRowId: number }> {
  if (rowId < 2) {
    throw new Error("Cannot delete header row or non-positive row ID");
  }

  const sheets = getSheetsClient(auth);

  // Get sheet metadata to find sheetId (usually 0 for Sheet1)
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });

  const sheet = meta.data.sheets?.find((s) => s.properties?.title === "Sheet1") || meta.data.sheets?.[0];
  const sheetId = sheet?.properties?.sheetId ?? 0;

  // Row dimension indices are 0-indexed with endIndex exclusive
  const startIndex = rowId - 1;
  const endIndex = rowId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex,
              endIndex,
            },
          },
        },
      ],
    },
  });

  return {
    success: true,
    deletedRowId: rowId,
  };
}
