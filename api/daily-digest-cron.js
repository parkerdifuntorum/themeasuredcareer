import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { retrieveJobs } from "../lib/jobRetrieval.js";
import { rankJobsWithEmbeddings } from "../lib/jobRanking.js";
import { enrichApplyUrls, isDirectApplyUrl } from "../lib/applyEnrichment.js";
import { renderDigestHtml } from "../lib/digestRenderer.js";

const redis = Redis.fromEnv();
const resend = new Resend(process.env.RESEND_API_KEY);

function getEmailFrom() {
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    "Job Search Smarter <digest@themeasuredcareer.com>"
  );
}

function isAdzunaJob(job = {}) {
  return String(job.source || "").toLowerCase().includes("adzuna");
}

function directApplyPenalty(job = {}) {
  const hasDirectApply = isDirectApplyUrl(job.applyUrl);
  const confidence = Number(job.applyUrlConfidence || 0);

  if (hasDirectApply && confidence >= 60) return 0;
  if (hasDirectApply && confidence > 0) return isAdzunaJob(job) ? 18 : 8;
  if (isAdzunaJob(job)) return 45;
  return 18;
}

function applyDirectApplicationPenalty(jobs = []) {
  return jobs
    .map((job) => {
      const penalty = directApplyPenalty(job);
      const originalScore = Number(job.score || 0);

      return {
        ...job,
        originalScore,
        directApplyPenalty: penalty,
        score: Math.max(0, originalScore - penalty),
        applyUrlAvailable: isDirectApplyUrl(job.applyUrl),
      };
    })
    .sort((a, b) => b.score - a.score);
}

async function runSavedSearch(searchSubscription) {
  const { preferences = {}, weights = {}, recommendedTitles = [] } = searchSubscription || {};

  const retrieved = await retrieveJobs(preferences, recommendedTitles, {
    minimumCandidates: 50,
    maxCandidates: 200,
  });

  const ranked = await rankJobsWithEmbeddings(
    retrieved.jobs,
    preferences,
    weights,
    recommendedTitles
  );

  const enriched = await enrichApplyUrls(ranked.jobs.slice(0, 100), {
    limit: 100,
    concurrency: 4,
  });

  return applyDirectApplicationPenalty(enriched).slice(0, 50);
}

function parseMaybeJson(value) {
  if (!value) return null;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const providedSecret = req.headers["x-cron-secret"] || req.query.secret;

  if (process.env.CRON_SECRET && providedSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "RESEND_API_KEY missing in Vercel." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY missing in Vercel." });
  }

  try {
    const rawSubscriptions = await redis.hgetall("daily_digest_subscriptions");
    const subscriptions = Object.values(rawSubscriptions || {})
      .map(parseMaybeJson)
      .filter((subscription) => subscription?.status === "active");

    const results = [];

    for (const subscription of subscriptions) {
      try {
        const jobs = await runSavedSearch(subscription.searchSubscription);

        const selectedTitles = subscription.searchSubscription?.preferences?.selectedTitles || [];
        const targetTitle =
          selectedTitles.length > 0
            ? selectedTitles.join(", ")
            : subscription.searchSubscription?.preferences?.targetTitle || "your saved search";

        await resend.emails.send({
          from: getEmailFrom(),
          to: subscription.email,
          subject: "Your updated daily ranked job digest",
          html: renderDigestHtml({
            title: "Your Updated Daily Ranked Jobs",
            subtitle: "Fresh results from your saved completed search.",
            targetTitle,
            recommendedTitles: subscription.searchSubscription?.recommendedTitles || [],
            jobs: jobs.slice(0, 10),
          }),
        });

        const updated = {
          ...subscription,
          latestJobs: jobs.slice(0, 10),
          lastRunAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await redis.hset("daily_digest_subscriptions", {
          [subscription.id]: JSON.stringify(updated),
        });

        await redis.hset("daily_digest_subscribers", {
          [subscription.email]: JSON.stringify(updated),
        });

        results.push({
          id: subscription.id,
          email: subscription.email,
          sent: true,
          resultCount: jobs.length,
        });
      } catch (error) {
        results.push({
          id: subscription.id,
          email: subscription.email,
          sent: false,
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      subscriptionsProcessed: subscriptions.length,
      results,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Daily digest cron failed." });
  }
}
