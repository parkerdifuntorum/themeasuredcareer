import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import crypto from "crypto";

const redis = Redis.fromEnv();
const resend = new Resend(process.env.RESEND_API_KEY);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function isEmailVerified(email) {
  const verified = await redis.hget("verified_emails", normalizeEmail(email));
  return Boolean(verified);
}

function getEmailFrom() {
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    "Job Search Smarter <digest@themeasuredcareer.com>"
  );
}

function subscriptionId(email, searchSubscription) {
  return crypto
    .createHash("sha256")
    .update(`${normalizeEmail(email)}:${JSON.stringify(searchSubscription)}`)
    .digest("hex")
    .slice(0, 32);
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

  try {
    const { email, searchSubscription, latestJobs = [] } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!emailIsValid(normalizedEmail)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    if (!searchSubscription?.preferences || !searchSubscription?.weights) {
      return res.status(400).json({
        error: "Run a search first. Subscriptions must be tied to a completed search.",
      });
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return res.status(500).json({ error: "Upstash Redis env vars missing in Vercel." });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "RESEND_API_KEY missing in Vercel." });
    }

    const verified = await isEmailVerified(normalizedEmail);

    if (!verified) {
      return res.status(403).json({
        error: "Please verify your email before subscribing.",
      });
    }

    const id = subscriptionId(normalizedEmail, searchSubscription);

    const subscription = {
      id,
      email: normalizedEmail,
      status: "active",
      frequency: "daily",
      searchSubscription,
      latestJobs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRunAt: null,
    };

    await redis.hset("daily_digest_subscribers", {
      [normalizedEmail]: JSON.stringify(subscription),
    });

    await redis.hset("daily_digest_subscriptions", {
      [id]: JSON.stringify(subscription),
    });

    const titles =
      searchSubscription.preferences.selectedTitles?.join(", ") ||
      searchSubscription.preferences.targetTitle ||
      "your completed search";

    await resend.emails.send({
      from: getEmailFrom(),
      to: normalizedEmail,
      subject: "Subscribed to daily ranked job updates",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#172033;">
          <h1>Subscription confirmed</h1>
          <p>You are now subscribed to daily updated ranked job results for:</p>
          <p><strong>${escapeHtml(titles)}</strong></p>
          <p>Each daily digest will re-run this saved search and send updated results.</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Subscribed to this completed search.",
      subscriptionId: id,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to subscribe." });
  }
}
