import { retrieveJobs } from "../lib/jobRetrieval.js";
import { rankJobsWithEmbeddings } from "../lib/jobRanking.js";
import { enrichApplyUrls, isDirectApplyUrl } from "../lib/applyEnrichment.js";

async function optionalRateLimit(req, res) {
  try {
    const hasRedis =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!hasRedis) return true;

    const { applyRateLimit } = await import("../lib/security.js");

    return await applyRateLimit(req, res, {
      name: "search-jobs",
      requests: 30,
      window: "1 h",
    });
  } catch (error) {
    console.error("Rate limit skipped:", error.message);
    return true;
  }
}

function isAdzunaJob(job = {}) {
  return String(job.source || "").toLowerCase().includes("adzuna");
}

function directApplyPenalty(job = {}) {
  const hasDirectApply = isDirectApplyUrl(job.applyUrl);
  const confidence = Number(job.applyUrlConfidence || 0);

  if (hasDirectApply && confidence >= 70) return 0;
  if (hasDirectApply && confidence >= 50) return isAdzunaJob(job) ? 20 : 8;

  // Very strong markdown: Adzuna should not be recommended near the top
  // unless enrichment found a real company/ATS URL.
  if (isAdzunaJob(job)) return 65;

  return 22;
}

function directApplyBoost(job = {}) {
  const hasDirectApply = isDirectApplyUrl(job.applyUrl);
  const confidence = Number(job.applyUrlConfidence || 0);

  if (!hasDirectApply) return 0;
  if (confidence >= 90) return 10;
  if (confidence >= 70) return 6;
  return 3;
}

function applyDirectApplicationAdjustment(jobs = []) {
  return jobs
    .map((job) => {
      const penalty = directApplyPenalty(job);
      const boost = directApplyBoost(job);
      const originalScore = Number(job.score || 0);

      return {
        ...job,
        originalScore,
        directApplyPenalty: penalty,
        directApplyBoost: boost,
        score: Math.max(0, originalScore - penalty + boost),
        applyUrlAvailable: isDirectApplyUrl(job.applyUrl),
      };
    })
    .sort((a, b) => b.score - a.score);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  if (!(await optionalRateLimit(req, res))) return;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not configured. Rankings require OpenAI embeddings.",
    });
  }

  try {
    const { preferences = {}, weights = {}, recommendedTitles = [] } = req.body || {};

    const retrieved = await retrieveJobs(preferences, recommendedTitles, {
      minimumCandidates: 50,
      maxCandidates: 250,
    });

    const ranked = await rankJobsWithEmbeddings(
      retrieved.jobs,
      preferences,
      weights,
      recommendedTitles
    );

    const rankedPool = ranked.jobs.slice(0, 120);

    const enrichedJobs = await enrichApplyUrls(rankedPool, {
      limit: 120,
      concurrency: 3,
    });

    const finalRankedJobs = applyDirectApplicationAdjustment(enrichedJobs);
    const returnedJobs = finalRankedJobs.slice(0, 50);

    return res.status(200).json({
      source: "live-retrieval-openai-embedding-ranking-strong-company-ats-enrichment",
      rankingMethod:
        "OpenAI embedding ranking plus strong company/ATS direct-apply enrichment adjustment",
      enrichmentMethod:
        "Provider direct links, redirect resolution, Greenhouse API, Lever API, exact company job search, and company careers page crawl",
      jobs: returnedJobs,
      titleScores: ranked.titleScores,
      meta: {
        sources: retrieved.sources,
        usedFallback: retrieved.usedFallback,
        retrievedCount: retrieved.jobs.length,
        rankedCount: ranked.jobs.length,
        enrichedCount: enrichedJobs.length,
        returnedCount: returnedJobs.length,
        enrichedApplyLinks: enrichedJobs.filter((job) => isDirectApplyUrl(job.applyUrl)).length,
        directHighConfidenceApplyLinks: enrichedJobs.filter(
          (job) => isDirectApplyUrl(job.applyUrl) && Number(job.applyUrlConfidence || 0) >= 70
        ).length,
        adzunaWithoutDirectApplyPenalized: enrichedJobs.filter(
          (job) => isAdzunaJob(job) && !isDirectApplyUrl(job.applyUrl)
        ).length,
        minimumTargetResults: 50,
        providerErrors: retrieved.providerErrors || [],
        env: {
          hasSerpApi: Boolean(process.env.SERPAPI_API_KEY),
          hasJSearch: Boolean(process.env.JSEARCH_API_KEY),
          hasAdzuna: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
          hasUSAJobs: Boolean(process.env.USAJOBS_EMAIL && process.env.USAJOBS_API_KEY),
          hasGreenhouse: Boolean(process.env.GREENHOUSE_BOARDS),
          hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
        },
      },
    });
  } catch (error) {
    console.error("search-jobs fatal error:", error);

    return res.status(500).json({
      error: error.message || "Job search failed.",
      rankingMethod: "OpenAI embeddings",
    });
  }
}
