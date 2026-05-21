import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({
      error: "RESEND_API_KEY is not configured.",
    });
  }

  try {
    const { email, preferences = {}, recommendedTitles = [] } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Recipient email is required.",
      });
    }

    const title = preferences.targetTitle || "your selected job preferences";

    const response = await resend.emails.send({
      from: "digest@themeasuredcareer.com",
      to: email,
      subject: "Your Job Search Smarter Digest",
      html: `
        <h1>Your Job Search Smarter Digest</h1>
        <p>Your latest ranked jobs are ready.</p>
        <p><strong>Target title:</strong> ${title}</p>
        <p><strong>Related titles:</strong> ${recommendedTitles.join(", ")}</p>
      `,
    });

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to send digest.",
    });
  }
}
