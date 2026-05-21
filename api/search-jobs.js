import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const jobCatalog = [
  {
    title: "Senior Power Systems Data Engineer",
    company: "Grid Analytics Co.",
    compensation: 165000,
    modality: "Remote",
    industry: "Utilities / Energy",
    location: "Sacramento, CA",
    skillMatch: 94,
    source: "Internal Catalog",
  },
  {
    title: "Distribution Planning Engineer",
    company: "Regional Utility",
    compensation: 142000,
    modality: "Hybrid",
    industry: "Engineering",
    location: "South Lake Tahoe, CA",
    skillMatch: 88,
    source: "Internal Catalog",
  },
  {
    title: "Market Risk Data Analyst",
    company: "Energy Market Operator",
    compensation: 155000,
    modality: "Hybrid",
    industry: "Finance",
    location: "Folsom, CA",
    skillMatch: 84,
    source: "Internal Catalog",
  },
  {
    title: "OT Cybersecurity Engineer",
    company: "Critical Infrastructure Security Lab",
    compensation: 172000,
    modality: "Remote",
    industry: "Cybersecurity",
    location: "Remote",
    skillMatch: 90,
    source: "Internal Catalog",
  },
  {
    title: "EMS Applications Engineer",
    company: "Transmission Operations Platform",
    compensation: 158000,
    modality: "Hybrid",
    industry: "Utilities / Energy",
    location: "Rocklin, CA",
    skillMatch: 96,
    source: "Internal Catalog",
  },
  {
    title: "Grid Applications Engineer",
    company: "Energy Systems Software Group",
    compensation: 168000,
    modality: "Remote",
    industry: "Software",
    location: "Remote",
    skillMatch: 92,
    source: "Internal Catalog",
  },
  {
    title: "Substation Automation Engineer",
    company: "Protection and Control Services",
    compensation: 151000,
    modality: "Hybrid",
    industry: "Engineering",
    location: "Sacramento, CA",
    skillMatch: 89,
    source: "Internal Catalog",
  },
  {
    title: "Forward Deployed AI Engineer",
    company: "Applied AI Systems",
    compensation: 190000,
    modality: "Hybrid",
    industry: "Data / AI",
    location: "San Francisco, CA",
    skillMatch: 86,
    source: "Internal Catalog",
  },
  {
    title: "Power Market Data Engineer",
    company: "ISO Analytics Platform",
    compensation: 176000,
    modality: "Remote",
    industry: "Data / AI",
    location: "Remote",
    skillMatch: 91,
    source: "Internal Catalog",
  },
  {
    title: "ICS Security Analyst",
    company: "Critical Infrastructure Defense",
    compensation: 149000,
    modality: "Remote",
    industry: "Cybersecurity",
    location: "Remote",
    skillMatch: 87,
    source: "Internal Catalog",
  },
];

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not configured.",
    });
  }

  try {
    const { preferences = {}, recommendedTitles = [] } = req.body;

    const selectedTitles = [
      ...(preferences.selectedTitles || []),
      ...(recommendedTitles || []),
    ].filter(Boolean);

    if (selectedTitles.length === 0) {
      return res.status(400).json({
        error: "At least one selected title is required.",
      });
    }

    const queryText = selectedTitles.join(". ");
    const jobTexts = jobCatalog.map(
      (job) =>
        `${job.title}. ${job.company}. ${job.industry}. ${job.modality}. ${job.location}.`
    );

    const embeddings = await embedTexts([queryText, ...jobTexts]);

    const queryEmbedding = embeddings[0];
    const jobEmbeddings = embeddings.slice(1);

    const titleScores = {};

    const matchedJobs = jobCatalog
      .map((job, index) => {
        const similarity = cosineSimilarity(queryEmbedding, jobEmbeddings[index]);
        const titleScore = Math.round(similarity * 100);

        titleScores[job.title] = titleScore;

        return {
          ...job,
          semanticSearchScore: titleScore,
        };
      })
      .filter((job) => {
        const industryOk =
          !preferences.industry ||
          preferences.industry === "Any" ||
          preferences.industry === job.industry;

        const modalityOk =
          !preferences.modalities ||
          preferences.modalities.length === 0 ||
          preferences.modalities.includes(job.modality);

        return industryOk && modalityOk;
      })
      .sort((a, b) => b.semanticSearchScore - a.semanticSearchScore)
      .slice(0, 10);

    return res.status(200).json({
      source: "openai-embedding-search",
      jobs: matchedJobs,
      titleScores,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Job search failed.",
    });
  }
}
