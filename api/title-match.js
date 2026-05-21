import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const broadTitleBank = [
  "Data Analyst",
  "Business Analyst",
  "Operations Analyst",
  "Product Analyst",
  "Financial Analyst",
  "Research Analyst",
  "Market Research Analyst",
  "Healthcare Data Analyst",
  "Program Manager",
  "Project Manager",
  "Product Manager",
  "Operations Manager",
  "Customer Success Manager",
  "Implementation Consultant",
  "Solutions Consultant",
  "Solutions Engineer",
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Platform Engineer",
  "Site Reliability Engineer",
  "Data Engineer",
  "Analytics Engineer",
  "Machine Learning Engineer",
  "AI Engineer",
  "Systems Engineer",
  "Electrical Engineer",
  "Power Systems Engineer",
  "Controls Engineer",
  "Cybersecurity Analyst",
  "Security Engineer",
  "GRC Analyst",
  "Cloud Engineer",
  "DevOps Engineer",
  "Technical Program Manager",
  "Technical Project Manager",
  "Business Intelligence Analyst",
  "Reporting Analyst",
  "Strategy Analyst",
  "Policy Analyst",
  "Research Scientist",
  "Clinical Data Analyst",
  "Education Program Manager",
  "Instructional Designer",
  "Finance Manager",
  "Risk Analyst",
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

async function generateTitleRecommendations({
  targetTitle,
  selectedTitles = [],
  industry = "Any",
  location = "",
  preferredCompanies = "",
}) {
  const prompt = `
You are improving job-search title recommendations for a general-purpose job search app.

User target title: ${targetTitle}
Already selected titles: ${selectedTitles.join(", ") || "None"}
Industry preference: ${industry || "Any"}
Location preference: ${location || "None"}
Preferred companies: ${preferredCompanies || "None"}

Return JSON only with:
{
  "normalizedTitle": "one LinkedIn-style normalized title",
  "confidence": number from 0 to 100,
  "recommendedTitles": ["12 to 18 strong related job titles"],
  "recommendationReason": "one short sentence explaining the recommendation strategy"
}

Rules:
- Recommendations should be broadly useful across industries, not only energy or utilities.
- Include lateral title variations, seniority-neutral variants, and adjacent titles recruiters may use.
- Avoid duplicates and overly narrow titles unless the user gave a narrow title.
- Do not include "Senior" unless the target title implies seniority.
- Do not include location names.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: "Return valid JSON only. Do not include markdown.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.45,
  });

  const text = response.choices?.[0]?.message?.content || "{}";

  try {
    return JSON.parse(text);
  } catch {
    return {
      normalizedTitle: targetTitle,
      confidence: 70,
      recommendedTitles: broadTitleBank.slice(0, 14),
      recommendationReason:
        "Used broad cross-industry title variants because JSON parsing failed.",
    };
  }
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
    const {
      targetTitle = "",
      selectedTitles = [],
      industry = "Any",
      location = "",
      preferredCompanies = "",
      jobTitles = [],
    } = req.body || {};

    if (!targetTitle.trim()) {
      return res.status(400).json({
        error: "targetTitle is required.",
      });
    }

    const ai = await generateTitleRecommendations({
      targetTitle,
      selectedTitles,
      industry,
      location,
      preferredCompanies,
    });

    const candidateTitles = Array.from(
      new Set([
        ...(ai.recommendedTitles || []),
        ...broadTitleBank,
        ...jobTitles,
      ].filter(Boolean))
    ).slice(0, 80);

    const embeddings = await embedTexts([targetTitle, ...candidateTitles]);
    const queryEmbedding = embeddings[0];
    const titleEmbeddings = embeddings.slice(1);

    const scored = candidateTitles
      .map((title, index) => ({
        title,
        score: Math.round(
          Math.max(0, Math.min(1, cosineSimilarity(queryEmbedding, titleEmbeddings[index]))) *
            100
        ),
      }))
      .sort((a, b) => b.score - a.score);

    const recommendedTitles = Array.from(
      new Set([
        ai.normalizedTitle || targetTitle,
        ...(ai.recommendedTitles || []),
        ...scored.slice(0, 12).map((item) => item.title),
      ])
    )
      .filter((title) => title && title.toLowerCase() !== targetTitle.toLowerCase())
      .slice(0, 18);

    const titleScores = {};
    for (const item of scored) {
      titleScores[item.title] = item.score;
    }

    return res.status(200).json({
      source: "openai-chat-and-embeddings",
      normalizedTitle: ai.normalizedTitle || targetTitle,
      confidence: Number(ai.confidence || scored[0]?.score || 75),
      recommendedTitles,
      recommendationReason:
        ai.recommendationReason ||
        "Recommendations combine OpenAI title reasoning with embedding similarity.",
      titleScores,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "OpenAI title analysis failed.",
    });
  }
}
