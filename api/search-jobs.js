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

  if (hasDirectApply && confidence >= 60) return 0;
  if (hasDirectApply && confidence > 0) return isAdzunaJob(job) ? 18 : 8;

  // Strong markdown: Adzuna should not be near the top unless enrichment found a direct company/ATS link.
  if (isAdzunaJob(job)) return 45;

  // Smaller markdown for other sources without a direct apply link.
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
      maxCandidates: 200,
    });

    const ranked = await rankJobsWithEmbeddings(
      retrieved.jobs,
      preferences,
      weights,
      recommendedTitles
    );

    // Enrich more than 50 before final re-sort so direct-link jobs can rise.
    const rankedPool = ranked.jobs.slice(0, 100);

    const enrichedJobs = await enrichApplyUrls(rankedPool, {
      limit: 100,
      concurrency: 4,
    });

    const finalRankedJobs = applyDirectApplicationPenalty(enrichedJobs);
    const returnedJobs = finalRankedJobs.slice(0, 50);

    return res.status(200).json({
      source: "live-retrieval-openai-embedding-ranking-direct-apply-adjusted",
      rankingMethod:
        "OpenAI text-embedding-3-small cosine similarity plus preference weighting, then direct application link confidence adjustment",
      enrichmentMethod:
        "Provider direct links, redirect resolution, Greenhouse API, Lever API, and SerpAPI company careers search",
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
          (job) => isDirectApplyUrl(job.applyUrl) && Number(job.applyUrlConfidence || 0) >= 60
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
