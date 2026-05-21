import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { email } = req.body;

    const response = await resend.emails.send({
      from: "digest@themeasuredcareer.com",
      to: email,
      subject: "Your Job Search Smarter Digest",
      html: `
        <h1>Your Ranked Jobs Digest</h1>
        <p>Your latest ranked jobs are ready.</p>
      `,
    });

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}
