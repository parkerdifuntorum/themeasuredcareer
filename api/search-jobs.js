import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const jobCatalog = [
  {
    title: "Data Analyst",
    company: "Business Intelligence Group",
    compensation: 112000,
    modality: "Remote",
    industry: "Data / AI",
    location: "Remote",
    skillMatch: 88,
    source: "Internal Catalog",
    description:
      "Analyze business performance data, build dashboards, write SQL queries, and translate operational data into decision-ready insights.",
    applyUrl: "https://themeasuredcareer.com/jobs/data-analyst",
  },
  {
    title: "Business Intelligence Analyst",
    company: "Reporting Strategy Co.",
    compensation: 108000,
    modality: "Hybrid",
    industry: "Data / AI",
    location: "Sacramento, CA",
    skillMatch: 86,
    source: "Internal Catalog",
    description:
      "Develop recurring reports, define KPIs, maintain BI dashboards, and work with stakeholders to improve data-driven decisions.",
    applyUrl: "https://themeasuredcareer.com/jobs/business-intelligence-analyst",
  },
  {
    title: "Software Engineer",
    company: "Cloud Applications Co.",
    compensation: 155000,
    modality: "Hybrid",
    industry: "Software",
    location: "Sacramento, CA",
    skillMatch: 84,
    source: "Internal Catalog",
    description:
      "Develop full-stack application features, integrate APIs, improve platform reliability, and collaborate with product and design teams.",
    applyUrl: "https://themeasuredcareer.com/jobs/software-engineer",
  },
  {
    title: "Full Stack Engineer",
    company: "Product Platform Labs",
    compensation: 162000,
    modality: "Remote",
    industry: "Software",
    location: "Remote",
    skillMatch: 83,
    source: "Internal Catalog",
    description:
      "Build customer-facing web applications, backend services, database models, and deployment pipelines for a modern SaaS platform.",
    applyUrl: "https://themeasuredcareer.com/jobs/full-stack-engineer",
  },
  {
    title: "Healthcare Data Analyst",
    company: "Health Systems Analytics",
    compensation: 118000,
    modality: "Remote",
    industry: "Healthcare",
    location: "Remote",
    skillMatch: 86,
    source: "Internal Catalog",
    description:
      "Work with clinical, claims, and operational datasets to support reporting, population health analysis, and healthcare process improvement.",
    applyUrl: "https://themeasuredcareer.com/jobs/healthcare-data-analyst",
  },
  {
    title: "Clinical Data Analyst",
    company: "Regional Medical Center",
    compensation: 106000,
    modality: "Hybrid",
    industry: "Healthcare",
    location: "Sacramento, CA",
    skillMatch: 82,
    source: "Internal Catalog",
    description:
      "Analyze clinical workflows, quality metrics, and patient outcome data to support healthcare operations and compliance initiatives.",
    applyUrl: "https://themeasuredcareer.com/jobs/clinical-data-analyst",
  },
  {
    title: "Financial Analyst",
    company: "Capital Planning Partners",
    compensation: 105000,
    modality: "Hybrid",
    industry: "Finance",
    location: "Folsom, CA",
    skillMatch: 82,
    source: "Internal Catalog",
    description:
      "Support budgeting, forecasting, financial modeling, variance analysis, and executive reporting for strategic planning teams.",
    applyUrl: "https://themeasuredcareer.com/jobs/financial-analyst",
  },
  {
    title: "Risk Analyst",
    company: "Portfolio Risk Group",
    compensation: 125000,
    modality: "Remote",
    industry: "Finance",
    location: "Remote",
    skillMatch: 84,
    source: "Internal Catalog",
    description:
      "Evaluate portfolio risk, monitor exposure, build reporting tools, and support scenario analysis for financial decision-making.",
    applyUrl: "https://themeasuredcareer.com/jobs/risk-analyst",
  },
  {
    title: "Research Scientist",
    company: "Applied Research Lab",
    compensation: 138000,
    modality: "Hybrid",
    industry: "Research",
    location: "Davis, CA",
    skillMatch: 89,
    source: "Internal Catalog",
    description:
      "Design experiments, analyze research data, publish findings, and develop technical prototypes for applied science programs.",
    applyUrl: "https://themeasuredcareer.com/jobs/research-scientist",
  },
  {
    title: "Research Engineer",
    company: "Technology Innovation Center",
    compensation: 132000,
    modality: "Hybrid",
    industry: "Research",
    location: "Davis, CA",
    skillMatch: 89,
    source: "Internal Catalog",
    description:
      "Design experiments, build prototypes, analyze technical results, and support applied research projects across engineering domains.",
    applyUrl: "https://themeasuredcareer.com/jobs/research-engineer",
  },
  {
    title: "Project Manager",
    company: "Enterprise Delivery Partners",
    compensation: 122000,
    modality: "Hybrid",
    industry: "Consulting",
    location: "Sacramento, CA",
    skillMatch: 81,
    source: "Internal Catalog",
    description:
      "Coordinate project schedules, budgets, risks, stakeholder communication, and delivery milestones for cross-functional teams.",
    applyUrl: "https://themeasuredcareer.com/jobs/project-manager",
  },
  {
    title: "Technical Project Manager",
    company: "Implementation Services Group",
    compensation: 145000,
    modality: "Remote",
    industry: "Software",
    location: "Remote",
    skillMatch: 85,
    source: "Internal Catalog",
    description:
      "Lead technical implementation projects, manage engineering timelines, translate requirements, and coordinate product delivery.",
    applyUrl: "https://themeasuredcareer.com/jobs/technical-project-manager",
  },
  {
    title: "Product Manager",
    company: "SaaS Product Studio",
    compensation: 158000,
    modality: "Remote",
    industry: "Software",
    location: "Remote",
    skillMatch: 82,
    source: "Internal Catalog",
    description:
      "Own product roadmap, prioritize customer needs, define requirements, analyze product metrics, and coordinate releases.",
    applyUrl: "https://themeasuredcareer.com/jobs/product-manager",
  },
  {
    title: "Business Analyst",
    company: "Process Improvement Group",
    compensation: 98000,
    modality: "Hybrid",
    industry: "Consulting",
    location: "Sacramento, CA",
    skillMatch: 84,
    source: "Internal Catalog",
    description:
      "Gather business requirements, document workflows, improve processes, and bridge communication between technical and business teams.",
    applyUrl: "https://themeasuredcareer.com/jobs/business-analyst",
  },
  {
    title: "Instructional Designer",
    company: "Learning Systems Institute",
    compensation: 96000,
    modality: "Remote",
    industry: "Education",
    location: "Remote",
    skillMatch: 78,
    source: "Internal Catalog",
    description:
      "Design digital learning experiences, build curriculum, create training materials, and evaluate learning outcomes.",
    applyUrl: "https://themeasuredcareer.com/jobs/instructional-designer",
  },
  {
    title: "Education Program Manager",
    company: "Workforce Learning Organization",
    compensation: 102000,
    modality: "Hybrid",
    industry: "Education",
    location: "Sacramento, CA",
    skillMatch: 79,
    source: "Internal Catalog",
    description:
      "Manage education programs, coordinate instructors and learners, track outcomes, and support curriculum improvement.",
    applyUrl: "https://themeasuredcareer.com/jobs/education-program-manager",
  },
  {
    title: "Operations Manager",
    company: "Regional Operations Group",
    compensation: 115000,
    modality: "On-site",
    industry: "Manufacturing",
    location: "Elk Grove, CA",
    skillMatch: 80,
    source: "Internal Catalog",
    description:
      "Oversee daily operations, improve workflows, monitor performance metrics, and coordinate staffing and logistics.",
    applyUrl: "https://themeasuredcareer.com/jobs/operations-manager",
  },
  {
    title: "Cybersecurity Analyst",
    company: "Security Operations Center",
    compensation: 128000,
    modality: "Remote",
    industry: "Cybersecurity",
    location: "Remote",
    skillMatch: 86,
    source: "Internal Catalog",
    description:
      "Monitor security alerts, investigate threats, support incident response, document findings, and improve detection workflows.",
    applyUrl: "https://themeasuredcareer.com/jobs/cybersecurity-analyst",
  },
  {
    title: "Sales Engineer",
    company: "Technical Solutions Vendor",
    compensation: 150000,
    modality: "Remote",
    industry: "Software",
    location: "Remote",
    skillMatch: 81,
    source: "Internal Catalog",
    description:
      "Support technical sales conversations, deliver product demos, design customer solutions, and assist with implementation planning.",
    applyUrl: "https://themeasuredcareer.com/jobs/sales-engineer",
  },
  {
    title: "Power Systems Engineer",
    company: "Grid Engineering Services",
    compensation: 145000,
    modality: "Hybrid",
    industry: "Utilities / Energy",
    location: "Sacramento, CA",
    skillMatch: 88,
    source: "Internal Catalog",
    description:
      "Perform grid studies, analyze electrical system performance, support planning work, and coordinate utility engineering deliverables.",
    applyUrl: "https://themeasuredcareer.com/jobs/power-systems-engineer",
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

function parseSalary(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/[$,\s]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
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
        `${job.title}. ${job.company}. ${job.industry}. ${job.modality}. ${job.location}. ${job.description}`
    );

    const embeddings = await embedTexts([queryText, ...jobTexts]);

    const queryEmbedding = embeddings[0];
    const jobEmbeddings = embeddings.slice(1);

    const minSalary = parseSalary(preferences.minSalary);
    const maxSalary = parseSalary(preferences.maxSalary);

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

        const salaryOk =
          (!minSalary || job.compensation >= minSalary * 0.75) &&
          (!maxSalary || job.compensation <= maxSalary * 1.35);

        return industryOk && modalityOk && salaryOk;
      })
      .sort((a, b) => b.semanticSearchScore - a.semanticSearchScore)
      .slice(0, 12);

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
