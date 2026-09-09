import { rateLimit } from "express-rate-limit";

/**
 * Rate limiter for write operations (POST, PUT, DELETE) to protect Google Sheets API quotas.
 * Google Sheets API limit is 60 requests per minute per user.
 */
export const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60, // Limit each IP / user to 60 write requests per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  message: {
    error: "TooManyRequests",
    message: "Rate limit exceeded for write operations. Google Sheets API allows up to 60 writes per minute. Please try again shortly.",
  },
  keyGenerator: (req) => {
    return (req.session as any)?.googleId || (req.headers["x-google-id"] as string) || req.ip || "127.0.0.1";
  },
});
