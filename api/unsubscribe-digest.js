import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const email = req.method === "GET" ? req.query.email : req.body?.email;

  if (!email) {
    return res.status(400).send("Email is required.");
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  await redis.hdel("daily_digest_subscribers", normalizedEmail);

  if (req.method === "GET") {
    return res.status(200).send("You have been unsubscribed from daily Job Search Smarter updates.");
  }

  return res.status(200).json({
    success: true,
    message: "Unsubscribed.",
  });
}
