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
      error: "OPENAI_API_KEY is not configured.",
      hint: "Add OPENAI_API_KEY in Vercel Environment Variables and redeploy.",
    });
  }

  try {
    const { preferences = {}, weights = {}, recommendedTitles = [] } = req.body;

    const retrieved = await retrieveJobs(preferences, recommendedTitles);
    const ranked = await rankJobsWithEmbeddings(
      retrieved.jobs,
      preferences,
      weights,
      recommendedTitles
    );

    return res.status(200).json({
      source: "live-retrieval-openai-ranking",
      jobs: ranked.jobs.slice(0, 30),
      titleScores: ranked.titleScores,
      meta: {
        sources: retrieved.sources,
        usedFallback: retrieved.usedFallback,
        retrievedCount: retrieved.jobs.length,
        returnedCount: Math.min(ranked.jobs.length, 30),
        providerErrors: retrieved.providerErrors || [],
        env: {
          hasJSearch: Boolean(process.env.JSEARCH_API_KEY),
          hasAdzuna: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
          hasUSAJobs: Boolean(process.env.USAJOBS_EMAIL && process.env.USAJOBS_API_KEY),
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
      stack:
        process.env.NODE_ENV === "development"
          ? error.stack
          : "Stack hidden in production.",
    });
  }
}
