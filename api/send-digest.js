import { Resend } from "resend";
import { Redis } from "@upstash/redis";

const resend = new Resend(process.env.RESEND_API_KEY);
const redis = Redis.fromEnv();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function isEmailVerified(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  const verified = await redis.hget("verified_emails", normalizedEmail);
  return Boolean(verified);
}

function getEmailFrom() {
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    "Job Search Smarter <digest@themeasuredcareer.com>"
  );
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value) {
  if (!Number.isFinite(Number(value))) return "Not listed";
  return `$${Number(value).toLocaleString()}`;
}

function hasRealApplyUrl(job) {
  return (
    job?.applyUrl &&
    typeof job.applyUrl === "string" &&
    job.applyUrl.startsWith("http") &&
    !job.applyUrl.includes("themeasuredcareer.com")
  );
}

function renderApplyButton(job) {
  if (!hasRealApplyUrl(job)) return "";
  return `
    <a href="${escapeHtml(job.applyUrl)}" style="display:inline-block;background:#172033;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;">
      Apply Now
    </a>
  `;
}

function renderJobRows(jobs = []) {
  if (!jobs.length) {
    return `<p style="color:#667085;">No ranked jobs were included. Run a search first, then send the digest again.</p>`;
  }

  return jobs.map((job, index) => `
    <tr>
      <td style="padding:18px;border-bottom:1px solid #e5e7eb;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#667085;font-weight:700;">
          Rank #${index + 1} · Match Score ${job.score ?? "N/A"}/100
        </div>
        <h2 style="margin:6px 0 4px;font-size:18px;color:#172033;">${escapeHtml(job.title)}</h2>
        <p style="margin:0 0 8px;color:#475467;font-weight:700;">${escapeHtml(job.company)}</p>
        <p style="margin:0 0 8px;color:#667085;">
          ${formatMoney(job.compensation)} · ${escapeHtml(job.modality || "Not listed")} · ${escapeHtml(job.location || "Not listed")} · ${escapeHtml(job.industry || "General")}
        </p>
        <p style="margin:0 0 12px;color:#344054;line-height:1.5;">${escapeHtml(job.description || "No description provided.")}</p>
            ${renderApplyButton(job)}
      </td>
    </tr>
  `).join("");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, preferences = {}, recommendedTitles = [], jobs = [] } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ error: "Recipient email is required." });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "RESEND_API_KEY missing in Vercel." });
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return res.status(500).json({ error: "Upstash Redis env vars missing in Vercel." });
    }

    const verified = await isEmailVerified(normalizedEmail);
    if (!verified) {
      return res.status(403).json({
        error: "Please verify your email before sending a digest.",
      });
    }

    const selectedTitles = preferences.selectedTitles || [];
    const targetTitle =
      selectedTitles.length > 0
        ? selectedTitles.join(", ")
        : preferences.targetTitle || "your selected job preferences";

    const response = await resend.emails.send({
      from: getEmailFrom(),
      to: normalizedEmail,
      subject: "Your Job Search Smarter Ranked Jobs Digest",
      html: `
        <div style="background:#f5f7fb;padding:24px;font-family:Arial,sans-serif;">
          <div style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:#172033;color:#ffffff;padding:28px;">
              <p style="margin:0 0 8px;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:700;">Job Search Smarter</p>
              <h1 style="margin:0;font-size:28px;">Your Ranked Jobs Digest</h1>
              <p style="margin:10px 0 0;color:#d0d5dd;">Ranked opportunities based on your selected preferences.</p>
            </div>
            <div style="padding:22px;">
              <p style="margin:0 0 8px;"><strong>Target titles:</strong> ${escapeHtml(targetTitle)}</p>
              <p style="margin:0 0 18px;"><strong>Recommended related titles:</strong> ${escapeHtml(recommendedTitles.join(", ") || "None selected")}</p>
              <p style="margin:0 0 18px;color:#667085;font-size:13px;">Apply buttons are only included when a real external application link is available.</p>
              <table style="width:100%;border-collapse:collapse;">${renderJobRows(jobs)}</table>
            </div>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true, response });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to send digest." });
  }
}
