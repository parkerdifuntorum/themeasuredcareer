import { Resend } from "resend";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const redis = Redis.fromEnv();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getSiteUrl() {
  return (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://themeasuredcareer.com"
  ).replace(/\/$/, "");
}

function getEmailFrom() {
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    "Job Search Smarter <digest@themeasuredcareer.com>"
  );
}

function envStatus() {
  return {
    hasResendKey: Boolean(process.env.RESEND_API_KEY),
    hasRedisUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    hasRedisToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    hasSiteUrl: Boolean(process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL),
    siteUrl: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || null,
    emailFrom: getEmailFrom(),
  };
}

function messageFromError(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error.message) return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      env: envStatus(),
    });
  }

  try {
    const { email } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !emailIsValid(normalizedEmail)) {
      return res.status(400).json({
        error: "A valid email address is required.",
        receivedEmail: email || null,
        env: envStatus(),
      });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        error: "RESEND_API_KEY missing in Vercel.",
        env: envStatus(),
      });
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return res.status(500).json({
        error: "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing in Vercel.",
        env: envStatus(),
      });
    }

    const token = randomToken();
    const tokenHash = hashToken(token);
    const verificationUrl = `${getSiteUrl()}/api/confirm-email?token=${token}`;

    try {
      await redis.set(
        `email_verification:${tokenHash}`,
        JSON.stringify({
          email: normalizedEmail,
          createdAt: new Date().toISOString(),
        }),
        { ex: 60 * 60 * 24 }
      );
    } catch (error) {
      return res.status(500).json({
        error: `Redis write failed: ${messageFromError(error)}`,
        env: envStatus(),
      });
    }

    try {
      const result = await resend.emails.send({
        from: getEmailFrom(),
        to: normalizedEmail,
        subject: "Verify your email for Job Search Smarter",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;">
            <h1>Verify Your Email</h1>
            <p>Please confirm your email address before sending job digests or subscribing to daily updates.</p>
            <p>
              <a href="${verificationUrl}" style="display:inline-block;background:#172033;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;">
                Verify Email
              </a>
            </p>
            <p style="font-size:12px;color:#667085;">If you did not request this email, you can safely ignore it.</p>
          </div>
        `,
        text: `Verify your email for Job Search Smarter: ${verificationUrl}`,
      });

      return res.status(200).json({
        success: true,
        message: "Verification email sent.",
        resendId: result?.data?.id || result?.id || null,
        env: envStatus(),
      });
    } catch (error) {
      return res.status(500).json({
        error: `Resend send failed: ${messageFromError(error)}`,
        hint: "Check Resend domain verification and EMAIL_FROM. EMAIL_FROM should be: Job Search Smarter <digest@themeasuredcareer.com>",
        env: envStatus(),
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: `Unexpected verification failure: ${messageFromError(error)}`,
      env: envStatus(),
    });
  }
}
