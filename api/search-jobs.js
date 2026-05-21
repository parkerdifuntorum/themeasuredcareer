import { retrieveJobs } from "../lib/jobRetrieval.js";
import { rankJobsWithEmbeddings } from "../lib/jobRanking.js";

async function optionalRateLimit(req, res) {
  try {
    const hasRedis =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!hasRedis) {
      return true;
    }

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  if (!(await optionalRateLimit(req, res))) {
    return;
  }

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

    const returnedJobs = ranked.jobs.slice(0, 50);

    return res.status(200).json({
      source: "live-retrieval-openai-embedding-ranking",
      rankingMethod: "OpenAI text-embedding-3-small cosine similarity plus preference weighting",
      jobs: returnedJobs,
      titleScores: ranked.titleScores,
      meta: {
        sources: retrieved.sources,
        usedFallback: retrieved.usedFallback,
        retrievedCount: retrieved.jobs.length,
        rankedCount: ranked.jobs.length,
        returnedCount: returnedJobs.length,
        minimumTargetResults: 50,
        providerErrors: retrieved.providerErrors || [],
        env: {
          hasSerpApi: Boolean(process.env.SERPAPI_API_KEY),
          hasJSearch: Boolean(process.env.JSEARCH_API_KEY),
          hasAdzuna: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
          hasUSAJobs: Boolean(process.env.USAJOBS_EMAIL && process.env.USAJOBS_API_KEY),
          hasGreenhouse: Boolean(process.env.GREENHOUSE_BOARDS),
          hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
          hasUpstash: Boolean(
            process.env.UPSTASH_REDIS_REST_URL &&
              process.env.UPSTASH_REDIS_REST_TOKEN
          ),
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
