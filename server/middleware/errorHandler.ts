import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.status || err.statusCode || 500;
  const errorType = err.name || "ServerError";
  const message = err.message || "An unexpected internal server error occurred";

  // Check for Google API error codes
  if (err.code === 401 || err.code === 403) {
    return res.status(401).json({
      error: "GoogleAuthError",
      message: "Google API authentication failed or permission denied. Please re-authenticate.",
    });
  }

  if (err.code === 404) {
    return res.status(404).json({
      error: "NotFound",
      message: err.message || "Requested resource not found",
    });
  }

  return res.status(statusCode).json({
    error: errorType,
    message,
  });
}
