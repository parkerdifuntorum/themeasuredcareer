import crypto from "crypto";

function cleanEnv(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getRedisUrl() {
  return cleanEnv(process.env.UPSTASH_REDIS_REST_URL).replace(/\/$/, "");
}

function getRedisToken() {
  return cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN);
}

function parseMaybeJson(value) {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value;
}

async function upstashGet(key) {
  const response = await fetch(`${getRedisUrl()}/get/${encodeURIComponent(key)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getRedisToken()}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Upstash GET failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data.result;
}

async function upstashHset(hash, field, value) {
  const response = await fetch(`${getRedisUrl()}/hset/${encodeURIComponent(hash)}/${encodeURIComponent(field)}/${encodeURIComponent(value)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRedisToken()}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Upstash HSET failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function upstashDel(key) {
  const response = await fetch(`${getRedisUrl()}/del/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRedisToken()}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Upstash DEL failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

export default async function handler(req, res) {
  try {
    const token = req.query.token;

    if (!token || typeof token !== "string") {
      return res.status(400).send("Invalid or missing confirmation token.");
    }

    if (!getRedisUrl() || !getRedisToken()) {
      return res.status(500).send("Upstash Redis environment variables are missing.");
    }

    const tokenHash = hashToken(token);
    const key = `email_verification:${tokenHash}`;
    const pending = parseMaybeJson(await upstashGet(key));

    if (!pending?.email) {
      return res.status(400).send("This confirmation link is expired or invalid. Please request a new verification email.");
    }

    const email = normalizeEmail(pending.email);

    await upstashHset(
      "verified_emails",
      email,
      JSON.stringify({
        email,
        verifiedAt: new Date().toISOString(),
      })
    );

    await upstashDel(key);

    return res.status(200).send(`
      <html>
        <body style="font-family:Arial,sans-serif;line-height:1.5;padding:32px;color:#172033;">
          <h1>Email confirmed</h1>
          <p>Your email is now verified. You can send yourself a digest or subscribe to daily job updates.</p>
          <p><a href="https://themeasuredcareer.com">Return to Job Search Smarter</a></p>
        </body>
      </html>
    `);
  } catch (error) {
    return res.status(500).send(`Email confirmation failed: ${error.message}`);
  }
}
