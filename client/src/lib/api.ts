export interface User {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  activeSpreadsheetId?: string | null;
  activeSpreadsheetTitle?: string | null;
}

export interface ExpenseItem {
  rowId: number;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export interface CategorySummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlySummary {
  currentMonth: {
    month: string;
    total: number;
    count: number;
  };
  months: Array<{
    month: string;
    total: number;
    count: number;
  }>;
}

export interface GoogleSheetInfo {
  id: string;
  name: string;
  modifiedTime?: string;
  url?: string;
}

const API_BASE = "";

export async function checkAuth(): Promise<{ authenticated: boolean; user: User | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
    if (!res.ok) return { authenticated: false, user: null };
    return await res.json();
  } catch {
    return { authenticated: false, user: null };
  }
}

export function loginWithGoogle() {
  window.location.href = `${API_BASE}/auth/google`;
}

export async function logoutUser(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSheets(): Promise<GoogleSheetInfo[]> {
  const res = await fetch(`${API_BASE}/api/sheets`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to list sheets");
  const data = await res.json();
  return data.sheets || [];
}

export async function createNewSheet(title?: string): Promise<{ spreadsheetId: string; title: string; url: string }> {
  const res = await fetch(`${API_BASE}/api/sheets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create sheet");
  }
  return await res.json();
}

export async function selectActiveSheet(spreadsheetId: string, title?: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/sheets/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ spreadsheetId, title }),
  });
  return res.ok;
}

export async function fetchExpenses(): Promise<ExpenseItem[]> {
  const res = await fetch(`${API_BASE}/api/expenses`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch expenses");
  const data = await res.json();
  return data.expenses || [];
}

export async function addExpense(expense: {
  date: string;
  category: string;
  description: string;
  amount: number;
}): Promise<ExpenseItem> {
  const res = await fetch(`${API_BASE}/api/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(expense),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to add expense");
  }
  const data = await res.json();
  return data.expense;
}

export async function updateExpense(
  rowId: number,
  expense: { date: string; category: string; description: string; amount: number }
): Promise<ExpenseItem> {
  const res = await fetch(`${API_BASE}/api/expenses/${rowId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(expense),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to update expense at row ${rowId}`);
  }
  const data = await res.json();
  return data.expense;
}

export async function deleteExpense(rowId: number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/expenses/${rowId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.ok;
}

export async function fetchCategorySummary(): Promise<{
  totalSpend: number;
  totalTransactions: number;
  categories: CategorySummary[];
} | null> {
  try {
    const res = await fetch(`${API_BASE}/api/summary/categories`, { credentials: "include" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchMonthlySummary(): Promise<MonthlySummary | null> {
  try {
    const res = await fetch(`${API_BASE}/api/summary/monthly`, { credentials: "include" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
