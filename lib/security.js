import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

export const redis = Redis.fromEnv();

const rateLimiters = new Map();

export function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

export function getRateLimiter(name, requests, window) {
  const key = `${name}:${requests}:${window}`;

  if (!rateLimiters.has(key)) {
    rateLimiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(requests, window),
        analytics: true,
        prefix: `rl:${name}`,
      })
    );
  }

  return rateLimiters.get(key);
}

export async function applyRateLimit(req, res, options) {
  const ip = getClientIp(req);
  const limiter = getRateLimiter(options.name, options.requests, options.window);
  const result = await limiter.limit(ip);

  if (!result.success) {
    res.status(429).json({
      error: "Too many requests. Please try again later.",
    });
    return false;
  }

  return true;
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function baseUrl(req) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host || "themeasuredcareer.com";
  return `${proto}://${host}`;
}

export async function verifyTurnstile(req, token) {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    return true;
  }

  if (!token) {
    return false;
  }

  const ip = getClientIp(req);

  const body = new URLSearchParams();
  body.append("secret", process.env.TURNSTILE_SECRET_KEY);
  body.append("response", token);
  body.append("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });

  const result = await response.json();
  return Boolean(result.success);
}
