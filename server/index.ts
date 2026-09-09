import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieSession from "cookie-session";

import { authRouter } from "./routes/auth.js";
import { sheetsRouter } from "./routes/sheets.js";
import { expensesRouter } from "./routes/expenses.js";
import { summaryRouter } from "./routes/summary.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Trust proxy for secure cookies behind reverse proxies/Vite
  app.set("trust proxy", 1);

  // Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
      ],
      credentials: true,
    })
  );

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session middleware
  const sessionSecret = process.env.SESSION_SECRET || "ledger-session-secret-key-32chars";
  app.use(
    cookieSession({
      name: "ledger_session",
      keys: [sessionSecret],
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    })
  );

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API routers with both direct and /api prefixed routes for RESTful consistency
  app.use("/auth", authRouter);
  app.use("/api/auth", authRouter);

  app.use("/sheets", sheetsRouter);
  app.use("/api/sheets", sheetsRouter);

  app.use("/expenses", expensesRouter);
  app.use("/api/expenses", expensesRouter);

  app.use("/summary", summaryRouter);
  app.use("/api/summary", summaryRouter);

  // Production static file serving
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing fallback in production
  app.get("*", (req, res, next) => {
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/auth") ||
      req.path.startsWith("/expenses") ||
      req.path.startsWith("/sheets") ||
      req.path.startsWith("/summary")
    ) {
      return res.status(404).json({ error: "NotFound", message: "Endpoint not found" });
    }
    res.sendFile(path.join(staticPath, "index.html"), (err) => {
      if (err) next();
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

async function startServer() {
  const app = createApp();
  const server = createServer(app);
  const port = process.env.PORT || 5000;

  server.listen(port, () => {
    console.log(`[Ledger Backend] Server running on http://localhost:${port}/`);
  });
}

// Start if run directly
if (process.env.NODE_ENV !== "test") {
  startServer().catch(console.error);
}
