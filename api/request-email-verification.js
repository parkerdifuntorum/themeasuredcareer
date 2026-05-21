import { Resend } from "resend";
import {
  applyRateLimit,
  baseUrl,
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  if (!(await applyRateLimit(req, res, { name: "request-email-verification", requests: 5, window: "1 h" }))) {
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({
      error: "RESEND_API_KEY is not configured.",
    });
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return res.status(500).json({
      error: "Upstash Redis environment variables are not configured.",
    });
  }

  try {
    const { email, turnstileToken } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const turnstileOk = await verifyTurnstile(req, turnstileToken);
    if (!turnstileOk) {
      return res.status(403).json({
        error: "Bot verification failed. Please refresh and try again.",
      });
    }

    if (!normalizedEmail || !emailIsValid(normalizedEmail)) {
      return res.status(400).json({
        error: "A valid email address is required.",
      });
    }

    const token = randomToken();
    const tokenHash = hashToken(token);
    const confirmationUrl = `${baseUrl(req)}/api/confirm-email?token=${token}`;

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

    await resend.emails.send({
      from: "digest@themeasuredcareer.com",
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
    });

    return res.status(200).json({
      success: true,
      message: "Verification email sent.",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to send verification email.",
    });
  }
}
