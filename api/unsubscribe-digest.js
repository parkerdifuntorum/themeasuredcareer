import { applyRateLimit, redis } from "../lib/security.js";

export default async function handler(req, res) {
  if (!(await applyRateLimit(req, res, { name: "unsubscribe-digest", requests: 20, window: "1 h" }))) {
    return;
  }

  const email = req.method === "GET" ? req.query.email : req.body?.email;

  if (!email) {
    return res.status(400).send("Email is required.");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  await redis.hdel("daily_digest_subscribers", normalizedEmail);

  if (req.method === "GET") {
    return res.status(200).send(`
      <html>
        <body style="font-family:Arial,sans-serif;line-height:1.5;padding:32px;color:#172033;">
          <h1>Unsubscribed</h1>
          <p>You have been unsubscribed from daily Job Search Smarter updates.</p>
          <p><a href="https://themeasuredcareer.com">Return to Job Search Smarter</a></p>
        </body>
      </html>
    `);
  }

  return res.status(200).json({ success: true, message: "Unsubscribed." });
}
