import { Resend } from "resend";
import {
  applyRateLimit,
  baseUrl,
  getEmailFromAddress,
  hashToken,
  normalizeEmail,
  randomToken,
  redis,
  verifyTurnstile,
} from "../lib/security.js";

const resend = new Resend(process.env.RESEND_API_KEY);

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function publicEnvStatus() {
  return {
    hasResendKey: Boolean(process.env.RESEND_API_KEY),
    hasRedisUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    hasRedisToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    hasSiteUrl: Boolean(process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL),
    emailFrom: getEmailFromAddress(),
  };
}

function errorMessage(error) {
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
    });
  }

  if (!(await applyRateLimit(req, res, { name: "request-email-verification", requests: 10, window: "1 h" }))) {
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({
      error: "RESEND_API_KEY is not configured in Vercel.",
      env: publicEnvStatus(),
    });
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return res.status(500).json({
      error: "Upstash Redis environment variables are not configured in Vercel.",
      required: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
      env: publicEnvStatus(),
    });
  }

  try {
    const { email, turnstileToken } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    const turnstileOk = await verifyTurnstile(req, turnstileToken);
    if (!turnstileOk) {
      return res.status(403).json({
        error: "Bot verification failed. Please refresh and try again.",
        env: publicEnvStatus(),
      });
    }

    if (!normalizedEmail || !emailIsValid(normalizedEmail)) {
      return res.status(400).json({
        error: "A valid email address is required.",
        receivedEmail: email || null,
      });
    }

    const token = randomToken();
    const tokenHash = hashToken(token);
    const confirmationUrl = `${baseUrl(req)}/api/confirm-email?token=${token}`;

    try {
      await redis.set(
        `email_verification:${tokenHash}`,
        JSON.stringify({
          email: normalizedEmail,
          tokenHash,
          createdAt: new Date().toISOString(),
        }),
        {
          ex: 60 * 60 * 24,
        }
      );
    } catch (error) {
      return res.status(500).json({
        error: `Could not write verification token to Upstash Redis: ${errorMessage(error)}`,
        env: publicEnvStatus(),
      });
    }

    try {
      const result = await resend.emails.send({
        from: getEmailFromAddress(),
        to: normalizedEmail,
        subject: "Confirm your email for Job Search Smarter",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#172033;">
            <h1>Confirm your email</h1>
            <p>Please confirm your email before sending job digests or subscribing to daily updates.</p>
            <p>
              <a href="${confirmationUrl}" style="display:inline-block;background:#172033;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;">
                Confirm Email
              </a>
            </p>
            <p style="font-size:12px;color:#667085;">If you did not request this, you can ignore this email.</p>
          </div>
        `,
        text: `Confirm your email for Job Search Smarter: ${confirmationUrl}`,
      });

      return res.status(200).json({
        success: true,
        message: "Verification email sent.",
        resendId: result?.data?.id || result?.id || null,
        env: publicEnvStatus(),
      });
    } catch (error) {
      return res.status(500).json({
        error: `Resend could not send verification email: ${errorMessage(error)}`,
        hint:
          "Check RESEND_API_KEY, verified sending domain, and EMAIL_FROM. EMAIL_FROM should be like: Job Search Smarter <digest@themeasuredcareer.com>",
        env: publicEnvStatus(),
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: `Unexpected verification error: ${errorMessage(error)}`,
      env: publicEnvStatus(),
    });
  }
}
