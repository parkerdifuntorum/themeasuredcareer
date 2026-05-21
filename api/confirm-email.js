import { hashToken, markEmailVerified, redis } from "../lib/security.js";

export default async function handler(req, res) {
  const token = req.query.token;

  if (!token || typeof token !== "string") {
    return res.status(400).send("Invalid or missing confirmation token.");
  }

  const tokenHash = hashToken(token);
  const key = `email_verification:${tokenHash}`;
  const pendingRaw = await redis.get(key);

  if (!pendingRaw) {
    return res.status(400).send("This confirmation link is expired or invalid.");
  }

  const pending = typeof pendingRaw === "string" ? JSON.parse(pendingRaw) : pendingRaw;

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
