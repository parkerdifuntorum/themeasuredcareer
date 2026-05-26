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

function directApplyAdjustment(job = {}) {
  const hasSafeLink = isDirectApplyUrl(job.applyUrl);
  const isFallbackCareerPage = Boolean(job.applyLinkIsFallbackCareerPage);
  const confidence = Number(job.applyUrlConfidence || 0);

  if (!hasSafeLink) {
    return isAdzunaJob(job) ? -50 : -22;
  }

  if (isFallbackCareerPage) {
    // This is acceptable because it avoids Adzuna/aggregators, but it is weaker than the exact role URL.
    return isAdzunaJob(job) ? -5 : 0;
  }

  if (confidence >= 110) return 12;
  if (confidence >= 90) return 8;
  if (confidence >= 70) return 4;

  return 0;
}

function applyDirectApplicationAdjustment(jobs = []) {
  return jobs
    .map((job) => {
      const adjustment = directApplyAdjustment(job);
      const originalScore = Number(job.score || 0);

      return {
        ...job,
        originalScore,
        directApplyAdjustment: adjustment,
        score: Math.max(0, originalScore + adjustment),
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
      source: "live-retrieval-openai-embedding-ranking-company-careers-fallback",
      rankingMethod:
        "OpenAI embedding ranking plus company/ATS/careers-page link enrichment",
      enrichmentMethod:
        "Provider direct links, redirect resolution, Greenhouse API, Lever API, exact company job search, company careers page search, and company careers page fallback",
      jobs: returnedJobs,
      titleScores: ranked.titleScores,
      meta: {
        sources: retrieved.sources,
        usedFallback: retrieved.usedFallback,
        retrievedCount: retrieved.jobs.length,
        rankedCount: ranked.jobs.length,
        enrichedCount: enrichedJobs.length,
        returnedCount: returnedJobs.length,
        directRoleApplyLinks: enrichedJobs.filter(
          (job) => isDirectApplyUrl(job.applyUrl) && job.applyLinkType === "direct-role"
        ).length,
        companyCareerFallbackLinks: enrichedJobs.filter(
          (job) => isDirectApplyUrl(job.applyUrl) && job.applyLinkIsFallbackCareerPage
        ).length,
        aggregatorLinksSuppressed: enrichedJobs.filter((job) => !isDirectApplyUrl(job.applyUrl)).length,
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
