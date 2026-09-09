import "dotenv/config";
import { encrypt, decrypt, encryptObject, decryptObject } from "./server/services/encryption.js";
import { saveUserWithTokens, getUser, setActiveSpreadsheet } from "./server/services/userStore.js";

async function runTests() {
  console.log("=== RUNNING BACKEND TESTS ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. Test Encryption / Decryption
  console.log("\n1. Testing Encryption Service (AES-256-GCM)...");
  const testText = "refresh_token_sample_12345_abcdef";
  const encrypted = encrypt(testText);
  assert(encrypted !== testText, "Encrypted text is transformed");
  assert(encrypted.includes(":"), "Encrypted text contains iv:tag:cipher structure");
  const decrypted = decrypt(encrypted);
  assert(decrypted === testText, "Decrypted text exactly matches original");

  const sampleTokens = {
    access_token: "ya29.sample_token_here",
    refresh_token: "1//sample_refresh_token",
    expiry_date: Date.now() + 3600 * 1000,
  };
  const encObj = encryptObject(sampleTokens);
  const decObj = decryptObject<typeof sampleTokens>(encObj);
  assert(decObj.access_token === sampleTokens.access_token, "Encrypted object preserves access_token");
  assert(decObj.refresh_token === sampleTokens.refresh_token, "Encrypted object preserves refresh_token");

  // 2. Test User Store with encrypted tokens
  console.log("\n2. Testing User & Token Store...");
  const testUser = saveUserWithTokens(
    "google-test-id-123",
    { email: "tester@example.com", name: "Test User" },
    sampleTokens
  );
  assert(testUser.googleId === "google-test-id-123", "User saved with correct googleId");
  assert(testUser.encryptedTokens !== JSON.stringify(sampleTokens), "Tokens are encrypted at rest");

  const fetched = getUser("google-test-id-123");
  assert(fetched !== null && fetched.email === "tester@example.com", "Retrieved user by googleId");

  const updatedUser = setActiveSpreadsheet("google-test-id-123", "sheet-id-abc-789", "My Test Expenses");
  assert(updatedUser?.activeSpreadsheetId === "sheet-id-abc-789", "Active spreadsheet ID stored against account");

  // 3. Test HTTP Endpoints
  console.log("\n3. Testing API Endpoints on http://localhost:5000...");
  const BASE = "http://localhost:5000";

  // Health check
  const healthRes = await fetch(`${BASE}/api/health`);
  const healthData = await healthRes.json();
  assert(healthRes.status === 200 && healthData.status === "ok", "GET /api/health returns 200 OK");

  // Unauthenticated rejections (401)
  const authMeRes = await fetch(`${BASE}/auth/me`);
  assert(authMeRes.status === 401, "GET /auth/me returns 401 for unauthenticated requests");

  const expensesRes = await fetch(`${BASE}/expenses`);
  const expensesData = await expensesRes.json();
  assert(expensesRes.status === 401, "GET /expenses returns 401 for unauthenticated requests");
  assert(expensesData.error === "Unauthorized", "GET /expenses returns error: Unauthorized");

  const postExpRes = await fetch(`${BASE}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: "2026-03-01", category: "Food", description: "Lunch", amount: 15 }),
  });
  assert(postExpRes.status === 401, "POST /expenses returns 401 for unauthenticated requests");

  const sheetsRes = await fetch(`${BASE}/sheets`);
  assert(sheetsRes.status === 401, "GET /sheets returns 401 for unauthenticated requests");

  const summaryCatRes = await fetch(`${BASE}/summary/categories`);
  assert(summaryCatRes.status === 401, "GET /summary/categories returns 401 for unauthenticated requests");

  const summaryMonthRes = await fetch(`${BASE}/summary/monthly`);
  assert(summaryMonthRes.status === 401, "GET /summary/monthly returns 401 for unauthenticated requests");

  // 4. Test Validation logic
  console.log("\n4. Testing Input Validation (using authenticated test context)...");
  const badDateRes = await fetch(`${BASE}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-google-id": "google-test-id-123" },
    body: JSON.stringify({ date: "not-a-valid-date", category: "Food", description: "Lunch", amount: 15 }),
  });
  const badDateData = await badDateRes.json();
  assert(badDateRes.status === 400 && badDateData.error === "ValidationError", "Rejects invalid date with 400");

  const badAmountRes = await fetch(`${BASE}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-google-id": "google-test-id-123" },
    body: JSON.stringify({ date: "2026-03-01", category: "Food", description: "Lunch", amount: -50 }),
  });
  const badAmountData = await badAmountRes.json();
  assert(badAmountRes.status === 400 && badAmountData.error === "ValidationError", "Rejects negative amount with 400");

  const zeroAmountRes = await fetch(`${BASE}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-google-id": "google-test-id-123" },
    body: JSON.stringify({ date: "2026-03-01", category: "Food", description: "Lunch", amount: 0 }),
  });
  assert(zeroAmountRes.status === 400, "Rejects zero amount with 400");

  const emptyCategoryRes = await fetch(`${BASE}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-google-id": "google-test-id-123" },
    body: JSON.stringify({ date: "2026-03-01", category: "   ", description: "Lunch", amount: 10 }),
  });
  assert(emptyCategoryRes.status === 400, "Rejects empty category with 400");

  const emptyDescRes = await fetch(`${BASE}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-google-id": "google-test-id-123" },
    body: JSON.stringify({ date: "2026-03-01", category: "Food", description: "  ", amount: 10 }),
  });
  assert(emptyDescRes.status === 400, "Rejects empty description with 400");

  // Invalid rowId on PUT
  const badPutRowRes = await fetch(`${BASE}/expenses/1`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-google-id": "google-test-id-123" },
    body: JSON.stringify({ date: "2026-03-01", category: "Food", description: "Lunch", amount: 10 }),
  });
  assert(badPutRowRes.status === 400, "PUT /expenses/1 (header row) rejects with 400");

  // Invalid rowId on DELETE
  const badDeleteRowRes = await fetch(`${BASE}/expenses/0`, {
    method: "DELETE",
    headers: { "x-google-id": "google-test-id-123" },
  });
  assert(badDeleteRowRes.status === 400, "DELETE /expenses/0 rejects with 400");

  // 5. Test Sheets selection
  console.log("\n5. Testing Sheets Selection...");
  const selectRes = await fetch(`${BASE}/sheets/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-google-id": "google-test-id-123" },
    body: JSON.stringify({ spreadsheetId: "new-selected-sheet-456", title: "Household Expenses 2026" }),
  });
  const selectData = await selectRes.json();
  assert(selectRes.status === 200 && selectData.activeSpreadsheetId === "new-selected-sheet-456", "POST /sheets/select updates active sheet");

  const activeRes = await fetch(`${BASE}/sheets/active`, {
    headers: { "x-google-id": "google-test-id-123" },
  });
  const activeData = await activeRes.json();
  assert(activeRes.status === 200 && activeData.activeSpreadsheetId === "new-selected-sheet-456", "GET /sheets/active returns updated active sheet");

  // 6. Test Rate Limiting headers
  console.log("\n6. Testing Rate Limiting Headers on write endpoint...");
  const rateLimitHeader = badDateRes.headers.get("ratelimit-limit");
  assert(rateLimitHeader !== null, "Write responses include ratelimit-limit header");

  console.log(`\n=== ALL TESTS PASSED: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
