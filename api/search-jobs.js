import { retrieveJobs } from "../lib/jobRetrieval.js";
import { rankJobsWithEmbeddings } from "../lib/jobRanking.js";
import { applyRateLimit } from "../lib/security.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  if (!(await applyRateLimit(req, res, { name: "search-jobs", requests: 30, window: "1 h" }))) {
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not configured.",
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
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Job search failed.",
    });
  }
}
