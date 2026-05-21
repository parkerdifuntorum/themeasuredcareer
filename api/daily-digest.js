import { Redis } from "@upstash/redis";
import OpenAI from "openai";
import { Resend } from "resend";

const redis = Redis.fromEnv();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

const jobCatalog = [
  {
    title: "Data Analyst",
    company: "Business Intelligence Group",
    compensation: 112000,
    modality: "Remote",
    industry: "Data / AI",
    location: "Remote",
    skillMatch: 88,
    source: "Internal Catalog",
    description: "Analyze business performance data, build dashboards, write SQL queries, and translate operational data into decision-ready insights.",
    applyUrl: "https://themeasuredcareer.com/jobs/data-analyst",
  },
  {
    title: "Software Engineer",
    company: "Cloud Applications Co.",
    compensation: 155000,
    modality: "Hybrid",
    industry: "Software",
    location: "Sacramento, CA",
    skillMatch: 84,
    source: "Internal Catalog",
    description: "Develop full-stack application features, integrate APIs, improve platform reliability, and collaborate with product and design teams.",
    applyUrl: "https://themeasuredcareer.com/jobs/software-engineer",
  },
  {
    title: "Healthcare Data Analyst",
    company: "Health Systems Analytics",
    compensation: 118000,
    modality: "Remote",
    industry: "Healthcare",
    location: "Remote",
    skillMatch: 86,
    source: "Internal Catalog",
    description: "Work with clinical, claims, and operational datasets to support reporting, population health analysis, and healthcare process improvement.",
    applyUrl: "https://themeasuredcareer.com/jobs/healthcare-data-analyst",
  },
  {
    title: "Financial Analyst",
    company: "Capital Planning Partners",
    compensation: 105000,
    modality: "Hybrid",
    industry: "Finance",
    location: "Folsom, CA",
    skillMatch: 82,
    source: "Internal Catalog",
    description: "Support budgeting, forecasting, financial modeling, variance analysis, and executive reporting for strategic planning teams.",
    applyUrl: "https://themeasuredcareer.com/jobs/financial-analyst",
  },
  {
    title: "Research Engineer",
    company: "Technology Innovation Center",
    compensation: 132000,
    modality: "Hybrid",
    industry: "Research",
    location: "Davis, CA",
    skillMatch: 89,
    source: "Internal Catalog",
    description: "Design experiments, build prototypes, analyze technical results, and support applied research projects across engineering domains.",
    applyUrl: "https://themeasuredcareer.com/jobs/research-engineer",
  },
];

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatMoney(value) {
  if (!Number.isFinite(Number(value))) return "Not listed";
  return `$${Number(value).toLocaleString()}`;
}

function parseSalary(value) {
  if (!value) return null;
  const parsed = Number(String(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function dotProduct(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function magnitude(vector) {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

function cosineSimilarity(a, b) {
  const denominator = magnitude(a) * magnitude(b);
  if (!denominator) return 0;
  return dotProduct(a, b) / denominator;
}

async function embedTexts(texts) {
  const response = await openai.embeddings.create({ model: "text-embedding-3-small", input: texts });
  return response.data.map((item) => item.embedding);
}

async function rankJobs(subscription) {
  const preferences = subscription.preferences || {};
  const weights = subscription.weights || {
    compensation: 70,
    modality: 70,
    industry: 60,
    titleMatch: 75,
    location: 50,
    skillMatch: 75,
  };

  const selectedTitles = [
    ...(preferences.selectedTitles || []),
    ...(subscription.recommendedTitles || []),
    preferences.targetTitle,
  ].filter(Boolean);

  const queryText = selectedTitles.join(". ") || "general professional roles";
  const jobTexts = jobCatalog.map((job) => `${job.title}. ${job.company}. ${job.industry}. ${job.modality}. ${job.location}. ${job.description}`);
  const embeddings = await embedTexts([queryText, ...jobTexts]);
  const queryEmbedding = embeddings[0];
  const jobEmbeddings = embeddings.slice(1);

  const minSalary = parseSalary(preferences.minSalary);
  const maxSalary = parseSalary(preferences.maxSalary);
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0) || 1;

  return jobCatalog
    .map((job, index) => {
      const titleMatchScore = Math.round(Math.max(0, Math.min(1, cosineSimilarity(queryEmbedding, jobEmbeddings[index]))) * 100);

      let compensationScore = 75;
      if (minSalary && job.compensation < minSalary) {
        compensationScore = Math.max(0, Math.round((job.compensation / minSalary) * 100));
      } else if (minSalary && maxSalary && job.compensation >= minSalary && job.compensation <= maxSalary) {
        compensationScore = 100;
      } else if (maxSalary && job.compensation > maxSalary) {
        compensationScore = 95;
      }

      const modalityScore = !preferences.modalities || preferences.modalities.length === 0 || preferences.modalities.includes(job.modality) ? 100 : 40;
      const industryScore = !preferences.industry || preferences.industry === "Any" || preferences.industry === job.industry ? 100 : 45;
      const locationPreference = String(preferences.location || "").trim().toLowerCase();
      const locationScore = !locationPreference || job.location.toLowerCase().includes(locationPreference) || job.location.toLowerCase() === "remote" ? 100 : 55;

      const score =
        (compensationScore * Number(weights.compensation || 0) +
          modalityScore * Number(weights.modality || 0) +
          industryScore * Number(weights.industry || 0) +
          titleMatchScore * Number(weights.titleMatch || 0) +
          locationScore * Number(weights.location || 0) +
          job.skillMatch * Number(weights.skillMatch || 0)) /
        totalWeight;

      return { ...job, titleMatchScore, score: Math.round(score) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function renderJobRows(jobs = []) {
  return jobs
    .map((job, index) => `
      <tr>
        <td style="padding:18px;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#667085;font-weight:700;">
            Rank #${index + 1} · Match Score ${job.score ?? "N/A"}/100
          </div>
          <h2 style="margin:6px 0 4px;font-size:18px;color:#172033;">${escapeHtml(job.title)}</h2>
          <p style="margin:0 0 8px;color:#475467;font-weight:700;">${escapeHtml(job.company)}</p>
          <p style="margin:0 0 8px;color:#667085;">${formatMoney(job.compensation)} · ${escapeHtml(job.modality)} · ${escapeHtml(job.location)} · ${escapeHtml(job.industry)}</p>
          <p style="margin:0 0 12px;color:#344054;line-height:1.5;">${escapeHtml(job.description)}</p>
          <a href="${escapeHtml(job.applyUrl)}" style="display:inline-block;background:#172033;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;">Apply Now</a>
        </td>
      </tr>`)
    .join("");
}

async function sendDailyDigest(subscription) {
  const jobs = await rankJobs(subscription);
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

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return res.status(500).json({ error: "Upstash Redis environment variables are not configured." });
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
