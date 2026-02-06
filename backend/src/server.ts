import express from "express";
import type { Request, Response, NextFunction } from "express";
import { config } from "dotenv";
import { loadConfig } from "./config.js";
import { createOpenfortClient } from "./openfort.js";
import { handleHealth, handleShieldSession, handleVaultDeposit, handleVaultWithdraw, handleVaultBorrow, handleVaultRepay, handleLoanInfo, handleFeeInfo, handleVaultCommitments, handleYieldIndex, handleVaultStats, handleFaucetClaim } from "./routes.js";

// Load .env.local
config({ path: ".env.local" });

const env = loadConfig();
const openfortClient = createOpenfortClient(env.openfort.secretKey);

const app = express();

// ------- Rate Limiting (in-memory, per-IP) -------
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const entry = rateLimitStore.get(key);
    if (!entry || entry.resetAt <= now) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      res.status(429).json({ error: "Too many requests, try again later" });
      return;
    }

    entry.count++;
    next();
  };
}

// ------- Middleware -------
app.use(express.json({ limit: "1mb" }));

// CORS middleware — check request Origin against allowed list
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = env.allowedOrigins.length > 0
    ? env.allowedOrigins
    : ["http://localhost:5173"];

  const requestOrigin = req.headers.origin;
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// ------- Routes -------
app.get("/api/health", handleHealth);
app.post("/api/protected-create-encryption-session", rateLimit(10, 60_000), (req, res) => handleShieldSession(req, res, openfortClient, env.openfort.shield));
app.post("/api/vault/deposit", rateLimit(5, 60_000), (req, res) => handleVaultDeposit(req, res, env.vault));
app.post("/api/vault/withdraw", rateLimit(5, 60_000), (req, res) => handleVaultWithdraw(req, res, env.vault));
app.post("/api/vault/borrow", rateLimit(5, 60_000), (req, res) => handleVaultBorrow(req, res, env.vault));
app.post("/api/vault/repay", rateLimit(5, 60_000), (req, res) => handleVaultRepay(req, res, env.vault));
app.get("/api/vault/loan", rateLimit(30, 60_000), (_req, res) => handleLoanInfo(_req, res, env.vault));
app.get("/api/vault/fee", rateLimit(30, 60_000), (_req, res) => handleFeeInfo(_req, res, env.vault));
app.get("/api/vault/commitments", rateLimit(20, 60_000), (_req, res) => handleVaultCommitments(_req, res, env.vault));
app.get("/api/vault/yield-index", rateLimit(30, 60_000), (_req, res) => handleYieldIndex(_req, res, env.vault));
app.get("/api/vault/stats", rateLimit(30, 60_000), (_req, res) => handleVaultStats(_req, res, env.vault));
app.post("/api/vault/claim-faucet", rateLimit(2, 60_000), (req, res) => handleFaucetClaim(req, res, env.vault));

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

console.log(`
  Privacy Vaults Server
  Running on: http://localhost:${env.port}
`);

app.listen(env.port, () => {
  console.log(`Server is listening on port ${env.port}`);
});
