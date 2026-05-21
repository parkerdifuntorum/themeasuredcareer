import { hashToken, redis } from "../lib/security.js";

export default async function handler(req, res) {
  const token = req.query.token;

  if (!token || typeof token !== "string") {
    return res.status(400).send("Invalid or missing confirmation token.");
  }

  const tokenHash = hashToken(token);
  const pendingKey = `pending_digest:${tokenHash}`;
  const pendingRaw = await redis.get(pendingKey);

  if (!pendingRaw) {
    return res.status(400).send("This confirmation link is expired or invalid.");
  }

  const subscription = typeof pendingRaw === "string" ? JSON.parse(pendingRaw) : pendingRaw;

  subscription.status = "active";
  subscription.confirmedAt = new Date().toISOString();
  subscription.updatedAt = new Date().toISOString();
  delete subscription.tokenHash;

  await redis.hset("daily_digest_subscribers", {
    [subscription.email]: JSON.stringify(subscription),
  });

  await redis.del(pendingKey);

  return res.status(200).send(`
    <html>
      <body style="font-family:Arial,sans-serif;line-height:1.5;padding:32px;color:#172033;">
        <h1>Subscription confirmed</h1>
        <p>You are now subscribed to daily Job Search Smarter ranked job updates.</p>
        <p><a href="https://themeasuredcareer.com">Return to Job Search Smarter</a></p>
      </body>
    </html>
  `);
}
