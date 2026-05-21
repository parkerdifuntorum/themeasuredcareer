import { Resend } from "resend";
import {
  applyRateLimit,
  baseUrl,
  hashToken,
  randomToken,
  redis,
  verifyTurnstile,
} from "../lib/security.js";

const resend = new Resend(process.env.RESEND_API_KEY);

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!(await applyRateLimit(req, res, { name: "subscribe-digest", requests: 5, window: "1 h" }))) {
    return;
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return res.status(500).json({ error: "Upstash Redis environment variables are not configured." });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "RESEND_API_KEY is not configured." });
  }

  try {
    const { email, preferences = {}, weights = {}, recommendedTitles = [], turnstileToken } = req.body;

    const turnstileOk = await verifyTurnstile(req, turnstileToken);
    if (!turnstileOk) {
      return res.status(403).json({ error: "Bot verification failed. Please refresh and try again." });
    }

    if (!email || !emailIsValid(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const token = randomToken();
    const tokenHash = hashToken(token);
    const confirmationUrl = `${baseUrl(req)}/api/confirm-digest?token=${token}`;

    const pendingSubscription = {
      email: normalizedEmail,
      preferences,
      weights,
      recommendedTitles,
      frequency: "daily",
      status: "pending",
      tokenHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await redis.set(`pending_digest:${tokenHash}`, JSON.stringify(pendingSubscription), {
      ex: 60 * 60 * 24,
    });

    await resend.emails.send({
      from: "digest@themeasuredcareer.com",
      to: normalizedEmail,
      subject: "Confirm your Job Search Smarter daily digest",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#172033;">
          <h1>Confirm your daily digest</h1>
          <p>Please confirm that you want to receive daily ranked job updates from Job Search Smarter.</p>
          <p>
            <a href="${confirmationUrl}" style="display:inline-block;background:#172033;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;">
              Confirm Subscription
            </a>
          </p>
          <p style="font-size:12px;color:#667085;">If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Confirmation email sent.",
      email: normalizedEmail,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to start subscription." });
  }
}
