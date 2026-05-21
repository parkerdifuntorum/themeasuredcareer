import { redis } from "../lib/security.js";
import { retrieveJobs } from "../lib/jobRetrieval.js";
import { rankJobsWithEmbeddings } from "../lib/jobRanking.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value) {
  if (!Number.isFinite(Number(value))) return "Salary not listed";
  return `$${Number(value).toLocaleString()}`;
}

function renderJobRows(jobs = []) {
  return jobs
    .map(
      (job, index) => `
      <tr>
        <td style="padding:18px;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#667085;font-weight:700;">
            Rank #${index + 1} · Match Score ${job.score ?? "N/A"}/100 · ${escapeHtml(job.source || "Job Source")}
          </div>
          <h2 style="margin:6px 0 4px;font-size:18px;color:#172033;">${escapeHtml(job.title)}</h2>
          <p style="margin:0 0 8px;color:#475467;font-weight:700;">${escapeHtml(job.company)}</p>
          <p style="margin:0 0 8px;color:#667085;">${formatMoney(job.compensation)} · ${escapeHtml(job.modality || "Not listed")} · ${escapeHtml(job.location || "Not listed")} · ${escapeHtml(job.industry || "General")}</p>
          <p style="margin:0 0 12px;color:#344054;line-height:1.5;">${escapeHtml(job.description || "No description provided.")}</p>
          <a href="${escapeHtml(job.applyUrl || "https://themeasuredcareer.com")}" style="display:inline-block;background:#172033;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;">Apply Now</a>
        </td>
      </tr>`
    )
    .join("");
}

async function buildRankedJobs(subscription) {
  const preferences = subscription.preferences || {};
  const weights = subscription.weights || {};
  const recommendedTitles = subscription.recommendedTitles || [];

  const retrieved = await retrieveJobs(preferences, recommendedTitles);
  const ranked = await rankJobsWithEmbeddings(retrieved.jobs, preferences, weights, recommendedTitles);
  return ranked.jobs.slice(0, 10);
}

async function sendDailyDigest(subscription) {
  const jobs = await buildRankedJobs(subscription);
  const unsubscribeUrl = `https://themeasuredcareer.com/api/unsubscribe-digest?email=${encodeURIComponent(subscription.email)}`;

  return resend.emails.send({
    from: "digest@themeasuredcareer.com",
    to: subscription.email,
    subject: "Your Daily Job Search Smarter Ranked Jobs",
    html: `
      <div style="background:#f5f7fb;padding:24px;font-family:Arial,sans-serif;">
        <div style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
          <div style="background:#172033;color:#ffffff;padding:28px;">
            <p style="margin:0 0 8px;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:700;">Job Search Smarter</p>
            <h1 style="margin:0;font-size:28px;">Your Daily Ranked Jobs</h1>
            <p style="margin:10px 0 0;color:#d0d5dd;">Fresh ranked opportunities based on your saved preferences.</p>
          </div>
          <div style="padding:22px;">
            <table style="width:100%;border-collapse:collapse;">${renderJobRows(jobs)}</table>
            <p style="font-size:12px;color:#667085;margin-top:22px;">
              You are receiving this because you confirmed a daily job update subscription.
              <a href="${unsubscribeUrl}">Unsubscribe</a>
            </p>
          </div>
        </div>
      </div>`,
  });
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization || "";
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  if (!process.env.OPENAI_API_KEY || !process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY and RESEND_API_KEY are required." });
  }

  try {
    const rawSubscribers = await redis.hgetall("daily_digest_subscribers");
    const subscribers = Object.values(rawSubscribers || {})
      .map((value) => (typeof value === "string" ? JSON.parse(value) : value))
      .filter((subscriber) => subscriber?.status === "active");

    const results = [];

    for (const subscriber of subscribers) {
      try {
        await sendDailyDigest(subscriber);
        results.push({ email: subscriber.email, status: "sent" });
      } catch (error) {
        results.push({ email: subscriber.email, status: "failed", error: error.message });
      }
    }

    return res.status(200).json({ success: true, count: subscribers.length, results });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Daily digest failed." });
  }
}
