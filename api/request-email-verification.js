import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { email } = req.body || {};

    if (!email || !emailIsValid(email)) {
      return res.status(400).json({
        error: "A valid email address is required.",
      });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        error: "RESEND_API_KEY missing in Vercel.",
      });
    }

    const emailFrom =
      process.env.EMAIL_FROM ||
      "Job Search Smarter <digest@themeasuredcareer.com>";

    const siteUrl =
      process.env.SITE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://themeasuredcareer.com";

    const verificationUrl = `${siteUrl}/?verified=true&email=${encodeURIComponent(
      email
    )}`;

    const result = await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: "Verify your email for Job Search Smarter",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;">
          <h1>Verify Your Email</h1>

          <p>
            Please confirm your email address before sending job digests or
            subscribing to daily updates.
          </p>

          <p>
            <a
              href="${verificationUrl}"
              style="
                display:inline-block;
                background:#172033;
                color:white;
                padding:12px 18px;
                border-radius:10px;
                text-decoration:none;
                font-weight:700;
              "
            >
              Verify Email
            </a>
          </p>

          <p style="font-size:12px;color:#667085;">
            If you did not request this email, you can safely ignore it.
          </p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      resendResponse: result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error:
        error?.message ||
        JSON.stringify(error) ||
        "Verification email failed.",
    });
  }
}