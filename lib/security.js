import { Redis } from "@upstash/redis";
import crypto from "crypto";

export const redis = Redis.fromEnv();

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getEmailFromAddress() {
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    "Job Search Smarter <digest@themeasuredcareer.com>"
  );
}

export function getSiteUrl() {
  return (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://themeasuredcareer.com"
  ).replace(/\/$/, "");
}

export async function markEmailVerified(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  await redis.hset("verified_emails", {
    [normalizedEmail]: JSON.stringify({
      email: normalizedEmail,
      verifiedAt: new Date().toISOString(),
    }),
  });

  return true;
}

export async function isEmailVerified(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  const verified = await redis.hget("verified_emails", normalizedEmail);
  return Boolean(verified);
}
