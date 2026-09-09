# Ledger (Personal Expense Tracker)

> A personal expense tracking web application backed directly by your own Google Sheets.

---

## Overview

Ledger eliminates vendor lock-in and opaque third-party databases by turning your personal Google Account and Google Drive into your expense tracker's backend. Users authenticate via Google OAuth 2.0 and record daily transactions that are saved directly to an automated spreadsheet in Google Sheets. The web interface provides real-time financial tracking, category breakdowns, and monthly analytics while ensuring you retain 100% ownership and privacy over your data.

---

## Features

- **Google OAuth sign-in**: Secure authentication using Google Identity Services with offline refresh token support and AES-256-GCM encrypted session storage.
- **Create a new Google Sheet or select an existing one**: Automatically provision a formatted spreadsheet with freeze rows and column headers (`Date`, `Category`, `Description`, `Amount`), or attach an existing sheet from Google Drive.
- **Add, edit, and delete expenses**: Add expenses with date validation and decimal formatting, edit row items in place, and delete records with automatic row shifting.
- **View expenses in a table**: Interactive tabular view of all recorded entries with sorting, pagination, and direct links to open the sheet in Google Sheets.
- **Category-wise totals**: Aggregated expense totals, transaction counts, and spend percentages broken down by category (Food, Travel, Rent, Play, Work, Utilities, Shopping, Other).
- **Monthly summary**: Real-time calculations of current month totals, multi-month expenditure comparisons, and transaction metrics.

---

## Tech Stack

### Frontend
- **Framework / Runtime**: React `19.2.1` with Vite `7.1.7`
- **Language**: TypeScript `5.6.3`
- **Styling**: TailwindCSS `4.1.14` (`@tailwindcss/vite` `4.1.3`), `tw-animate-css` `1.4.0`
- **Routing**: Wouter `3.3.5`
- **UI Components & Icons**: Radix UI primitives, Lucide React `0.453.0`
- **Animation & Data Visualization**: Framer Motion `12.23.22`, Recharts `2.15.2`
- **Feedback & Forms**: Sonner `2.0.7`, React Hook Form `7.64.0`, Zod `4.1.12`

### Backend
- **Framework**: Express `4.21.2` running on Node.js with `tsx` `4.19.1` (watch & execute)
- **Language**: TypeScript `5.6.3`
- **Session & Security**: `cookie-session` `2.1.1`, `cors` `2.8.6`, `express-rate-limit` `8.7.0`
- **Encryption**: Node.js `crypto` (AES-256-GCM) for encrypting stored Google OAuth refresh tokens at rest
- **Configuration**: `dotenv` `17.4.2`

### Google APIs & SDKs
- **Google APIs Client Library**: `googleapis` `178.1.1`
- **Authentication**: `google-auth-library` `11.0.2`
- **APIs Used**:
  - **Google Sheets API v4**: Reading, writing, appending, updating, and deleting expense rows.
  - **Google Drive API v3**: Listing and discovering existing user spreadsheets.
  - **Google OAuth2 / UserInfo v2**: User profile resolution and consent verification.

---

## Architecture Flow

```text
+-------------------------------------------------------------------------------+
|                                  BROWSER                                      |
|  React 19 + Vite (Port 3000)                                                  |
|  - UI / Forms / Categories / Recharts                                         |
|  - Proxies /api, /auth, /sheets, /expenses, /summary to Backend (Port 5000)  |
+------------------------------------+------------------------------------------+
                                     |
                                     | HTTP Requests (Cookie Sessions)
                                     v
+-------------------------------------------------------------------------------+
|                              EXPRESS BACKEND                                  |
|  Node.js + TypeScript (Port 5000)                                             |
|  - Auth Middleware (Session check & AES-256-GCM token decryption)            |
|  - Rate Limiters (Write rate limits on mutation endpoints)                    |
|  - Google OAuth2 Client (Token refresh & credential management)               |
+-------------------+---------------------------------------+-------------------+
                    |                                       |
                    | OAuth 2.0 Auth & Tokens               | Sheets & Drive API v4/v3
                    v                                       v
+------------------------------------+   +--------------------------------------+
|        GOOGLE IDENTITY             |   |         GOOGLE WORKSPACE             |
|  - User Profile (OpenID/Email)     |   |  - Google Drive (List sheets)        |
|  - Scopes: drive.file, spreadsheets|   |  - Google Sheets (Expense rows)      |
+------------------------------------+   +--------------------------------------+
```

---

## Prerequisites

- **Node.js**: Version `20.x` or later (tested on `v24.14.1`)
- **Package Manager**: `pnpm` (`v10.x` recommended) or `npm` (`v10.x` / `v11.x`)
- **Google Cloud Console Project**:
  - Enabled APIs:
    - **Google Sheets API**
    - **Google Drive API**
    - **Google Identity / People API** (or default OAuth profile scopes)
  - Configured OAuth 2.0 Credentials:
    - Application Type: **Web application**
    - Authorized Redirect URI: `http://localhost:5000/auth/google/callback`

---

## Setup and Installation

### 1. Clone the repository
```bash
git clone https://github.com/your-username/ledger.git
cd ledger
```

### 2. Install dependencies
Using `pnpm` (recommended):
```bash
pnpm install
```
Or using `npx pnpm`:
```bash
npx pnpm install
```
*(Alternatively, you can run `npm install`)*

### 3. Set up a Google Cloud Project & OAuth Credentials
1. Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services > Library** and enable:
   - **Google Sheets API**
   - **Google Drive API**
4. Navigate to **APIs & Services > OAuth consent screen**:
   - Choose **External** user type.
   - Fill in the required app info and add your Google account as a **Test User** (while in testing status).
   - Add scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `.../auth/spreadsheets`, and `.../auth/drive.file`.
5. Navigate to **APIs & Services > Credentials**:
   - Click **Create Credentials > OAuth client ID**.
   - Select **Web application**.
   - Under **Authorized redirect URIs**, add:
     ```text
     http://localhost:5000/auth/google/callback
     ```
   - Click **Create** and copy your **Client ID** and **Client Secret**.

### 4. Configure environment variables
Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```
Fill in the values in `.env`:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

# Security & Session Secrets
SESSION_SECRET=your-secure-random-session-secret-at-least-32-chars
ENCRYPTION_KEY=your-32-character-or-hex-encryption-key-for-tokens

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 5. Run the backend server
Start the Express API server on port 5000:
```bash
pnpm run server
```
Or with npx:
```bash
npx tsx watch server/index.ts
```
Verify the server is running by opening:
`http://localhost:5000/api/health`

### 6. Run the frontend application
In a separate terminal, launch the Vite development server:
```bash
pnpm run dev
```
Or with npx:
```bash
npx vite --host
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable Name | Description | Required / Optional |
|---|---|---|
| `PORT` | Local port for the Express backend server (default `5000`) | Optional (defaults to `5000`) |
| `NODE_ENV` | Application runtime environment (`development`, `production`, `test`) | Optional (defaults to `development`) |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Web Client ID from Google Cloud Console | **Required** |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret from Google Cloud Console | **Required** |
| `GOOGLE_REDIRECT_URI` | Authorized redirect callback URL for Google OAuth | **Required** (e.g. `http://localhost:5000/auth/google/callback`) |
| `SESSION_SECRET` | Secret key used to sign and verify session cookies | **Required** |
| `ENCRYPTION_KEY` | AES-256-GCM encryption secret used to encrypt stored user refresh tokens | **Required** |
| `FRONTEND_URL` | Base origin of the client application for CORS and OAuth redirects | Optional (defaults to `http://localhost:3000`) |

---

## API Reference

All backend endpoints are mounted under both root (`/auth`, `/sheets`, `/expenses`, `/summary`) and `/api/*` prefixes (`/api/auth`, `/api/sheets`, `/api/expenses`, `/api/summary`).

### Health Check

```http
GET /api/health
```
- **Auth Required**: No
- **Response**:
  ```json
  {
    "status": "ok",
    "uptime": 128.45,
    "timestamp": "2026-09-09T06:45:00.000Z"
  }
  ```

---

### Authentication

#### Initiate Google OAuth
```http
GET /auth/google
```
- **Auth Required**: No
- **Query Parameters**: `state` (optional)
- **Response**: `302 Found` redirect to Google OAuth consent screen.

#### OAuth Callback
```http
GET /auth/google/callback
```
- **Auth Required**: No
- **Query Parameters**: `code`, `error`
- **Response**: `302 Found` redirect to `FRONTEND_URL?auth_success=1` on success, or `?auth_error=...` on failure.

#### Current Authenticated User
```http
GET /auth/me
```
- **Auth Required**: Yes (Session Cookie or `x-google-id` header)
- **Response**:
  ```json
  {
    "authenticated": true,
    "user": {
      "googleId": "1049281...",
      "email": "user@example.com",
      "name": "Jane Doe",
      "picture": "https://lh3.googleusercontent.com/...",
      "activeSpreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      "activeSpreadsheetTitle": "Ledger Expenses (Sep 2026)"
    }
  }
  ```

#### Logout
```http
POST /auth/logout
```
- **Auth Required**: No
- **Response**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

---

### Google Sheets Management

#### Create New Spreadsheet
```http
POST /sheets
```
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "title": "My Expenses 2026"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "title": "My Expenses 2026",
    "url": "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
    "message": "Google Sheet created and set as active spreadsheet."
  }
  ```

#### List Spreadsheets in Drive
```http
GET /sheets
```
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "sheets": [
      {
        "id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
        "name": "My Expenses 2026",
        "modifiedTime": "2026-09-09T06:30:00.000Z"
      }
    ],
    "activeSpreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
  }
  ```

#### Select Active Spreadsheet
```http
POST /sheets/select
```
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "title": "My Expenses 2026"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "activeSpreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "activeSpreadsheetTitle": "My Expenses 2026",
    "message": "Active Google Sheet updated successfully."
  }
  ```

#### Get Active Spreadsheet
```http
GET /sheets/active
```
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "activeSpreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "activeSpreadsheetTitle": "My Expenses 2026"
  }
  ```

---

### Expenses

#### Get All Expenses
```http
GET /expenses
```
- **Auth Required**: Yes (and active sheet selected)
- **Response**:
  ```json
  {
    "success": true,
    "count": 2,
    "expenses": [
      {
        "rowId": 2,
        "date": "2026-09-08",
        "category": "Food",
        "description": "Weekly grocery shopping",
        "amount": 84.50
      },
      {
        "rowId": 3,
        "date": "2026-09-09",
        "category": "Travel",
        "description": "Metro transit card recharge",
        "amount": 25.00
      }
    ]
  }
  ```

#### Add New Expense
```http
POST /expenses
```
- **Auth Required**: Yes (and active sheet selected)
- **Request Body**:
  ```json
  {
    "date": "2026-09-09",
    "category": "Food",
    "description": "Lunch with team",
    "amount": 24.50
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "expense": {
      "rowId": 4,
      "date": "2026-09-09",
      "category": "Food",
      "description": "Lunch with team",
      "amount": 24.50
    },
    "message": "Expense added successfully"
  }
  ```

#### Update Expense
```http
PUT /expenses/:rowId
```
- **Auth Required**: Yes (and active sheet selected)
- **Request Body**:
  ```json
  {
    "date": "2026-09-09",
    "category": "Food",
    "description": "Lunch with team (updated)",
    "amount": 29.00
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "expense": {
      "rowId": 4,
      "date": "2026-09-09",
      "category": "Food",
      "description": "Lunch with team (updated)",
      "amount": 29.00
    },
    "message": "Expense at row 4 updated successfully"
  }
  ```

#### Delete Expense
```http
DELETE /expenses/:rowId
```
- **Auth Required**: Yes (and active sheet selected)
- **Response**:
  ```json
  {
    "success": true,
    "deletedRowId": 4,
    "message": "Expense at row 4 deleted successfully, subsequent rows shifted up"
  }
  ```

---

### Summaries and Analytics

#### Category Summary
```http
GET /summary/categories
```
- **Auth Required**: Yes (and active sheet selected)
- **Query Parameters**: `startDate` (optional `YYYY-MM-DD`), `endDate` (optional `YYYY-MM-DD`)
- **Response**:
  ```json
  {
    "success": true,
    "totalSpend": 109.50,
    "totalTransactions": 2,
    "dateRange": {
      "startDate": null,
      "endDate": null
    },
    "categories": [
      {
        "category": "Food",
        "total": 84.50,
        "count": 1,
        "percentage": 77.17
      },
      {
        "category": "Travel",
        "total": 25.00,
        "count": 1,
        "percentage": 22.83
      }
    ]
  }
  ```

#### Monthly Summary
```http
GET /summary/monthly
```
- **Auth Required**: Yes (and active sheet selected)
- **Response**:
  ```json
  {
    "success": true,
    "currentMonth": {
      "month": "2026-09",
      "total": 109.50,
      "count": 2
    },
    "months": [
      {
        "month": "2026-09",
        "total": 109.50,
        "count": 2
      }
    ]
  }
  ```

---

## Usage Walkthrough

1. **Sign In with Google**:
   - Click **Sign In with Google** in the top navigation or hero section.
   - Complete Google's consent prompt to authorize Google Drive and Google Sheets permissions.
2. **Connect or Create a Sheet**:
   - Once signed in, open the expense modal.
   - If no sheet is selected, click **Create new Google Sheet** to provision a new formatted spreadsheet with headers, or choose an existing one from Drive.
3. **Log an Expense**:
   - Open the modal and enter the amount, select or type a category (Food, Travel, Rent, etc.), provide a short description, and pick the transaction date.
   - Click **Log Expense** to append the row directly into your Google Sheet.
4. **View Totals and Analytics**:
   - Scroll down to review real-time category spending breakdowns, progress rings, monthly totals, and recent transaction history.
   - Click **View Sheet** in the header at any time to inspect your raw data directly inside the Google Sheets interface.

---

## Folder Structure

```text
Ledger/
├── client/                     # Frontend Vite + React project
│   ├── index.html              # HTML entrypoint
│   ├── public/                 # Public assets and icons
│   └── src/
│       ├── App.tsx             # Main client router (Wouter)
│       ├── main.tsx            # React application bootstrap
│       ├── index.css           # TailwindCSS and custom styling
│       ├── const.ts            # Client-side constants
│       ├── components/         # Reusable UI widgets and dialogs
│       ├── contexts/           # React context providers
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # Utility helpers
│       └── pages/              # Primary route views
│           ├── Home.tsx        # Dashboard, expense modal, and summary views
│           └── NotFound.tsx    # 404 error page
├── server/                     # Backend Express server
│   ├── index.ts                # Server entry point, middleware, & router mounts
│   ├── data/                   # Local encrypted user & token store
│   │   └── users.json          # Cached user metadata and encrypted credentials
│   ├── middleware/             # Express middlewares
│   │   ├── auth.ts             # Authentication & active sheet check middlewares
│   │   ├── errorHandler.ts     # Centralized HTTP error handler
│   │   └── rateLimit.ts        # Express rate limiter for write endpoints
│   ├── routes/                 # Express API routes
│   │   ├── auth.ts             # Google OAuth login, callback, /me, and logout
│   │   ├── sheets.ts           # Create, list, and select Google Sheets
│   │   ├── expenses.ts         # CRUD operations on Google Sheet rows
│   │   └── summary.ts          # Category and monthly spend aggregation
│   └── services/               # Core business logic and integrations
│       ├── encryption.ts       # AES-256-GCM encryption for stored tokens
│       ├── googleAuth.ts       # Google OAuth2 client and token exchange
│       ├── googleSheets.ts     # Google Sheets API v4 & Drive API v3 operations
│       └── userStore.ts        # User record storage and token retrieval
├── shared/                     # Shared models and cross-stack constants
│   └── const.ts
├── .env.example                # Example environment variable templates
├── components.json             # Shadcn / component config
├── package.json                # Project dependencies and npm scripts
├── pnpm-lock.yaml              # Pnpm lockfile
├── tsconfig.json               # TypeScript compiler configuration (client & server)
├── tsconfig.node.json          # Node/Vite specific TypeScript config
└── vite.config.ts              # Vite dev server configuration and API proxies
```

---

## Known Limitations and Roadmap

### Known Limitations
- **Google Sheets API Quotas**: Google Sheets imposes standard read/write rate limits (typically 300 requests per minute per project, and 60 requests per minute per user). Batching or caching may be required for high-frequency automated writes.
- **Single Active Sheet Selection**: The UI currently associates one active Google Sheet at a time per user session for expense logging.
- **Header Structure Dependency**: Connected existing sheets must follow the standard 4-column layout (`Date`, `Category`, `Description`, `Amount`).

### Roadmap
- [ ] **Multi-Sheet Management**: Switch between distinct sheets for personal vs. business budgets.
- [ ] **CSV / Receipt Import**: Parse bank CSV exports or receipt image uploads directly into the spreadsheet.
- [ ] **Budget Limits & Alerts**: Configurable monthly category thresholds with warning indicators.
- [ ] **Offline Sync**: Queue expense submissions locally using IndexedDB when offline and sync upon reconnecting.
- [ ] **Automated Recurring Expenses**: Scheduled cron runner for subscriptions and regular rent payments.

---

## License

This project is licensed under the [MIT License](LICENSE) as specified in `package.json`.
