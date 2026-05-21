import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return res.status(500).json({
      error: "Upstash Redis environment variables are not configured.",
    });
  }

  try {
    const {
      email,
      preferences = {},
      weights = {},
      recommendedTitles = [],
    } = req.body;

    if (!email || !emailIsValid(email)) {
      return res.status(400).json({
        error: "A valid email address is required.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const subscription = {
      email: normalizedEmail,
      preferences,
      weights,
      recommendedTitles,
      frequency: "daily",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await redis.hset("daily_digest_subscribers", {
      [normalizedEmail]: JSON.stringify(subscription),
    });

    return res.status(200).json({
      success: true,
      message: "Subscribed to daily ranked job updates.",
      email: normalizedEmail,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to subscribe.",
    });
  }
}
