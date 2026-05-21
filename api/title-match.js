import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const titleProfiles = [
  {
    canonical: "Power Systems Engineer",
    related: [
      "Transmission Planning Engineer",
      "Distribution Planning Engineer",
      "Power System Studies Engineer",
      "Grid Operations Engineer",
      "Protection Engineer",
    ],
    description:
      "Electrical power systems, grid planning, transmission, distribution, substations, protection, load flow, contingency analysis, and utility engineering.",
  },
  {
    canonical: "SCADA Engineer",
    related: [
      "EMS Engineer",
      "OT Systems Engineer",
      "Substation Automation Engineer",
      "SCADA Analyst",
      "Grid Applications Engineer",
    ],
    description:
      "SCADA, EMS, telemetry, ICCP, DNP3, Modbus, grid control center systems, substation automation, OT systems, and real-time operations.",
  },
  {
    canonical: "Data Engineer",
    related: [
      "Analytics Engineer",
      "Data Platform Engineer",
      "ETL Developer",
      "Business Intelligence Engineer",
      "Machine Learning Data Engineer",
    ],
    description:
      "Data pipelines, SQL, ETL, Python, data platforms, analytics engineering, databases, cloud data systems, reporting, and warehousing.",
  },
  {
    canonical: "AI Engineer",
    related: [
      "Machine Learning Engineer",
      "Applied AI Engineer",
      "AI Solutions Engineer",
      "LLM Application Engineer",
      "Forward Deployed AI Engineer",
    ],
    description:
      "Artificial intelligence, machine learning, LLM applications, model integration, AI deployment, inference, automation, and applied AI systems.",
  },
  {
    canonical: "Cybersecurity Engineer",
    related: [
      "OT Cybersecurity Engineer",
      "ICS Security Analyst",
      "Grid Cybersecurity Investigator",
      "Security Operations Engineer",
      "Threat Detection Engineer",
    ],
    description:
      "Cybersecurity, OT security, ICS security, threat detection, incident response, network security, forensics, risk, and critical infrastructure defense.",
  },
  {
    canonical: "Energy Market Analyst",
    related: [
      "Market Risk Analyst",
      "Power Market Analyst",
      "Energy Trading Analyst",
      "Market Validation Analyst",
      "Electricity Market Data Analyst",
    ],
    description:
      "Energy markets, electricity markets, LMP, CAISO, ISO/RTO operations, settlements, trading, market validation, risk analytics, and market data.",
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
    const { targetTitle, jobTitles = [] } = req.body;

    if (!targetTitle || !String(targetTitle).trim()) {
      return res.status(400).json({
        error: "targetTitle is required.",
      });
    }

    const profileTexts = titleProfiles.map(
      (profile) => `${profile.canonical}. ${profile.description}`
    );

    const allTexts = [
      String(targetTitle),
      ...profileTexts,
      ...jobTitles.map(String),
    ];

    const embeddings = await embedTexts(allTexts);

    const targetEmbedding = embeddings[0];
    const profileEmbeddings = embeddings.slice(1, 1 + profileTexts.length);
    const jobEmbeddings = embeddings.slice(1 + profileTexts.length);

    const profileMatches = titleProfiles
      .map((profile, index) => ({
        ...profile,
        similarity: cosineSimilarity(targetEmbedding, profileEmbeddings[index]),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    const bestProfile = profileMatches[0];

    const recommendedTitles = Array.from(
      new Set([
        bestProfile.canonical,
        ...bestProfile.related,
        ...profileMatches.slice(1, 3).map((profile) => profile.canonical),
      ])
    ).slice(0, 8);

    const titleScores = {};
    jobTitles.forEach((title, index) => {
      titleScores[title] = Math.round(
        Math.max(0, Math.min(1, cosineSimilarity(targetEmbedding, jobEmbeddings[index]))) *
          100
      );
    });

    return res.status(200).json({
      source: "openai-embeddings",
      model: "text-embedding-3-small",
      normalizedTitle: bestProfile.canonical,
      confidence: Math.round(bestProfile.similarity * 100),
      recommendedTitles,
      titleScores,
      profileMatches: profileMatches.map((profile) => ({
        canonical: profile.canonical,
        score: Math.round(profile.similarity * 100),
      })),
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Title embedding analysis failed.",
    });
  }
}
