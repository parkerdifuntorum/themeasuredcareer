import { Resend } from "resend";
import {
  getEmailFromAddress,
  getSiteUrl,
  hashToken,
  normalizeEmail,
  randomToken,
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
    const { email } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !emailIsValid(normalizedEmail)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "RESEND_API_KEY missing in Vercel." });
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return res.status(500).json({
        error: "Upstash Redis environment variables are missing in Vercel.",
      });
    }

    const token = randomToken();
    const tokenHash = hashToken(token);
    const verificationUrl = `${getSiteUrl()}/api/confirm-email?token=${token}`;

    await redis.set(
      `email_verification:${tokenHash}`,
      JSON.stringify({
        email: normalizedEmail,
        createdAt: new Date().toISOString(),
      }),
      { ex: 60 * 60 * 24 }
    );

    const result = await resend.emails.send({
      from: getEmailFromAddress(),
      to: normalizedEmail,
      subject: "Verify your email for Job Search Smarter",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;">
          <h1>Verify Your Email</h1>
          <p>Please confirm your email address before sending job digests or subscribing to daily updates.</p>
          <p>
            <a href="${verificationUrl}" style="display:inline-block;background:#172033;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;">
              Verify Email
            </a>
          </p>
          <p style="font-size:12px;color:#667085;">If you did not request this email, you can safely ignore it.</p>
        </div>
      `,
      text: `Verify your email for Job Search Smarter: ${verificationUrl}`,
    });

    return res.status(200).json({
      success: true,
      message: "Verification email sent.",
      resendId: result?.data?.id || result?.id || null,
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Verification email failed.",
    });
  }
}
