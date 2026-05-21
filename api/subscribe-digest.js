import { Resend } from "resend";
import {
  getEmailFromAddress,
  isEmailVerified,
  normalizeEmail,
  redis,
} from "../lib/security.js";

const resend = new Resend(process.env.RESEND_API_KEY);

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, preferences = {}, weights = {}, recommendedTitles = [] } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !emailIsValid(normalizedEmail)) {
      return res.status(400).json({ error: "A valid email address is required." });
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

    const subscription = {
      email: normalizedEmail,
      preferences,
      weights,
      recommendedTitles,
      frequency: "daily",
      status: "active",
      confirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await redis.hset("daily_digest_subscribers", {
      [normalizedEmail]: JSON.stringify(subscription),
    });

    await resend.emails.send({
      from: getEmailFromAddress(),
      to: normalizedEmail,
      subject: "You are subscribed to Job Search Smarter daily updates",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#172033;">
          <h1>Subscription confirmed</h1>
          <p>You are now subscribed to daily ranked job updates from Job Search Smarter.</p>
          <p>You can unsubscribe anytime from the link included in each daily digest.</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Subscribed to daily ranked job updates.",
      email: normalizedEmail,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to subscribe." });
  }
}
