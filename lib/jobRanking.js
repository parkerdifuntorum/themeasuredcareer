import OpenAI from "openai";
import { parseSalary } from "./jobRetrieval.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });

  return response.data.map((item) => item.embedding);
}

function normalize(value = "") {
  return String(value).toLowerCase();
}

function calculateCompensationScore(job, preferences) {
  const minSalary = parseSalary(preferences.minSalary);
  const maxSalary = parseSalary(preferences.maxSalary);

  if (!job.compensation) return 55;

  if (minSalary && job.compensation < minSalary) {
    return Math.max(0, Math.round((job.compensation / minSalary) * 100));
  }

  if (minSalary && maxSalary && job.compensation >= minSalary && job.compensation <= maxSalary) {
    return 100;
  }

  if (maxSalary && job.compensation > maxSalary) {
    return 95;
  }

  return 75;
}

function calculateModalityScore(job, preferences) {
  if (!preferences.modalities || preferences.modalities.length === 0) return 100;
  if (preferences.modalities.includes(job.modality)) return 100;
  if (preferences.modalities.includes("Remote") && normalize(job.location).includes("remote")) return 100;
  return 40;
}

function calculateIndustryScore(job, preferences) {
  if (!preferences.industry || preferences.industry === "Any") return 100;
  if (preferences.industry === job.industry) return 100;

  const text = normalize(`${job.title} ${job.description}`);
  if (normalize(preferences.industry).split(/\s+|\/+/).some((part) => part.length > 3 && text.includes(part))) {
    return 75;
  }

  return 45;
}

function calculateLocationScore(job, preferences) {
  const locationPreference = normalize(preferences.location).trim();
  if (!locationPreference) return 100;

  const jobLocation = normalize(job.location);
  if (jobLocation.includes(locationPreference)) return 100;
  if (jobLocation === "remote" || jobLocation.includes("remote")) return 100;

  const preferenceWords = locationPreference.split(/[,\s]+/).filter((word) => word.length > 2);
  if (preferenceWords.some((word) => jobLocation.includes(word))) return 80;

  return 55;
}

export async function rankJobsWithEmbeddings(jobs, preferences = {}, weights = {}, recommendedTitles = []) {
  if (!jobs.length) {
    return {
      jobs: [],
      titleScores: {},
    };
  }

  const selectedTitles = [
    ...(preferences.selectedTitles || []),
    preferences.targetTitle,
    ...(recommendedTitles || []),
  ].filter(Boolean);

  const queryText = selectedTitles.join(". ") || "general professional roles";
  const jobTexts = jobs.map(
    (job) => `${job.title}. ${job.company}. ${job.industry}. ${job.modality}. ${job.location}. ${job.description || ""}`
  );

  const embeddings = await embedTexts([queryText, ...jobTexts]);
  const queryEmbedding = embeddings[0];
  const jobEmbeddings = embeddings.slice(1);

  const normalizedWeights = {
    compensation: Number(weights.compensation ?? 70),
    modality: Number(weights.modality ?? 70),
    industry: Number(weights.industry ?? 60),
    titleMatch: Number(weights.titleMatch ?? 75),
    location: Number(weights.location ?? 50),
    skillMatch: Number(weights.skillMatch ?? 75),
  };

  const totalWeight =
    Object.values(normalizedWeights).reduce((sum, value) => sum + Number(value || 0), 0) || 1;

  const titleScores = {};

  const rankedJobs = jobs
    .map((job, index) => {
      const titleMatchScore = Math.round(
        Math.max(0, Math.min(1, cosineSimilarity(queryEmbedding, jobEmbeddings[index]))) * 100
      );

      titleScores[job.title] = titleMatchScore;

      const compensationScore = calculateCompensationScore(job, preferences);
      const modalityScore = calculateModalityScore(job, preferences);
      const industryScore = calculateIndustryScore(job, preferences);
      const locationScore = calculateLocationScore(job, preferences);
      const skillMatch = Number(job.skillMatch || 75);

      const score =
        (compensationScore * normalizedWeights.compensation +
          modalityScore * normalizedWeights.modality +
          industryScore * normalizedWeights.industry +
          titleMatchScore * normalizedWeights.titleMatch +
          locationScore * normalizedWeights.location +
          skillMatch * normalizedWeights.skillMatch) /
        totalWeight;

      return {
        ...job,
        compensationScore,
        modalityScore,
        industryScore,
        locationScore,
        titleMatchScore,
        score: Math.round(score),
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    jobs: rankedJobs,
    titleScores,
  };
}
