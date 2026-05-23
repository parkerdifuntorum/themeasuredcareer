import { Resend } from "resend";
import { Redis } from "@upstash/redis";
import { renderDigestHtml } from "../lib/digestRenderer.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const redis = Redis.fromEnv();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function isEmailVerified(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  const verified = await redis.hget("verified_emails", normalizedEmail);
  return Boolean(verified);
}

function getEmailFrom() {
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    "Job Search Smarter <digest@themeasuredcareer.com>"
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, preferences = {}, recommendedTitles = [], jobs = [] } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ error: "Recipient email is required." });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "RESEND_API_KEY missing in Vercel." });
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return res.status(500).json({ error: "Upstash Redis env vars missing in Vercel." });
    }

    const verified = await isEmailVerified(normalizedEmail);
    if (!verified) {
      return res.status(403).json({
        error: "Please verify your email before sending a digest.",
      });
    }

    const selectedTitles = preferences.selectedTitles || [];
    const targetTitle =
      selectedTitles.length > 0
        ? selectedTitles.join(", ")
        : preferences.targetTitle || "your selected job preferences";

    const response = await resend.emails.send({
      from: getEmailFrom(),
      to: normalizedEmail,
      subject: "Your Job Search Smarter Ranked Jobs Digest",
      html: renderDigestHtml({
        targetTitle,
        recommendedTitles,
        jobs,
      }),
    });

    return res.status(200).json({ success: true, response });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to send digest." });
  }
}
