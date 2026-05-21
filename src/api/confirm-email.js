import { hashToken, markEmailVerified, redis } from "../lib/security.js";

function parseMaybeJson(value) {
  if (!value) return null;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const token = req.query.token;

  if (!token || typeof token !== "string") {
    return res.status(400).send("Invalid or missing confirmation token.");
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return res.status(500).send("Upstash Redis environment variables are not configured.");
  }

  const tokenHash = hashToken(token);
  const key = `email_verification:${tokenHash}`;
  const pendingRaw = await redis.get(key);
  const pending = parseMaybeJson(pendingRaw);

  if (!pending?.email) {
    return res.status(400).send("This confirmation link is expired or invalid.");
  }

  await markEmailVerified(pending.email);
  await redis.del(key);

  return res.status(200).send(`
    <html>
      <body style="font-family:Arial,sans-serif;line-height:1.5;padding:32px;color:#172033;">
        <h1>Email confirmed</h1>
        <p>Your email is now verified. You can send yourself a digest or subscribe to daily job updates.</p>
        <p><a href="https://themeasuredcareer.com">Return to Job Search Smarter</a></p>
      </body>
    </html>
  `);
}
