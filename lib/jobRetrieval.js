const fallbackJobs = [
  {
    title: "Data Analyst",
    company: "Business Intelligence Group",
    compensation: 112000,
    modality: "Remote",
    industry: "Data / AI",
    location: "Remote",
    skillMatch: 88,
    source: "Fallback Catalog",
    description:
      "Analyze business performance data, build dashboards, write SQL queries, and translate operational data into decision-ready insights.",
    applyUrl: "https://themeasuredcareer.com",
  },
  {
    title: "Software Engineer",
    company: "Cloud Applications Co.",
    compensation: 155000,
    modality: "Hybrid",
    industry: "Software",
    location: "Sacramento, CA",
    skillMatch: 84,
    source: "Fallback Catalog",
    description:
      "Develop full-stack application features, integrate APIs, improve platform reliability, and collaborate with product and design teams.",
    applyUrl: "https://themeasuredcareer.com",
  },
  {
    title: "Healthcare Data Analyst",
    company: "Health Systems Analytics",
    compensation: 118000,
    modality: "Remote",
    industry: "Healthcare",
    location: "Remote",
    skillMatch: 86,
    source: "Fallback Catalog",
    description:
      "Work with clinical, claims, and operational datasets to support reporting, population health analysis, and healthcare process improvement.",
    applyUrl: "https://themeasuredcareer.com",
  },
  {
    title: "Financial Analyst",
    company: "Capital Planning Partners",
    compensation: 105000,
    modality: "Hybrid",
    industry: "Finance",
    location: "Folsom, CA",
    skillMatch: 82,
    source: "Fallback Catalog",
    description:
      "Support budgeting, forecasting, financial modeling, variance analysis, and executive reporting for strategic planning teams.",
    applyUrl: "https://themeasuredcareer.com",
  },
  {
    title: "Project Manager",
    company: "Enterprise Delivery Partners",
    compensation: 122000,
    modality: "Hybrid",
    industry: "Consulting",
    location: "Sacramento, CA",
    skillMatch: 81,
    source: "Fallback Catalog",
    description:
      "Coordinate project schedules, budgets, risks, stakeholder communication, and delivery milestones for cross-functional teams.",
    applyUrl: "https://themeasuredcareer.com",
  },
  {
    title: "Cybersecurity Analyst",
    company: "Security Operations Center",
    compensation: 128000,
    modality: "Remote",
    industry: "Cybersecurity",
    location: "Remote",
    skillMatch: 86,
    source: "Fallback Catalog",
    description:
      "Monitor security alerts, investigate threats, support incident response, document findings, and improve detection workflows.",
    applyUrl: "https://themeasuredcareer.com",
  },
];

export function parseSalary(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/[$,\s]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value = "") {
  return String(value).trim();
}

function inferIndustry(title = "", description = "") {
  const text = `${title} ${description}`.toLowerCase();

  if (/(health|clinical|patient|medical|nurse|hospital)/.test(text)) return "Healthcare";
  if (/(finance|financial|risk|investment|bank|portfolio|accounting)/.test(text)) return "Finance";
  if (/(research|scientist|laboratory|r&d|experiment)/.test(text)) return "Research";
  if (/(teacher|education|instructional|curriculum|learning)/.test(text)) return "Education";
  if (/(security|cyber|soc|incident|threat)/.test(text)) return "Cybersecurity";
  if (/(software|developer|frontend|backend|full stack|platform|cloud)/.test(text)) return "Software";
  if (/(data|analytics|business intelligence|sql|etl|machine learning|ai)/.test(text)) return "Data / AI";
  if (/(engineer|engineering|electrical|mechanical|civil)/.test(text)) return "Engineering";
  if (/(utility|power|energy|grid|transmission|distribution)/.test(text)) return "Utilities / Energy";

  return "Other";
}

function inferModality(value = "", description = "") {
  const text = `${value} ${description}`.toLowerCase();

  if (/remote/.test(text)) return "Remote";
  if (/hybrid/.test(text)) return "Hybrid";
  if (/on-site|onsite|in office|in-office/.test(text)) return "On-site";

  return "Not listed";
}

function normalizeCompensation(min, max) {
  const numbers = [Number(min), Number(max)].filter(
    (value) => Number.isFinite(value) && value > 0
  );

  if (!numbers.length) return null;

  return Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
}

function dedupeJobs(jobs) {
  const seen = new Set();
  const deduped = [];

  for (const job of jobs) {
    const key =
      `${job.title}`.toLowerCase() +
      "|" +
      `${job.company}`.toLowerCase() +
      "|" +
      `${job.location}`.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(job);
    }
  }

  return deduped;
}

function buildQueryTitles(preferences = {}, recommendedTitles = []) {
  return [
    ...(preferences.selectedTitles || []),
    preferences.targetTitle,
    ...(recommendedTitles || []),
  ]
    .filter(Boolean)
    .map((title) => String(title).trim())
    .filter(Boolean);
}

function locationForQuery(preferences = {}) {
  const location = normalizeText(preferences.location);

  if (location) return location;

  if ((preferences.modalities || []).includes("Remote")) {
    return "remote";
  }

  return "United States";
}

function wantsRemote(preferences = {}) {
  return (preferences.modalities || []).includes("Remote");
}

function preferredSalaryQuery(preferences = {}) {
  const minSalary = parseSalary(preferences.minSalary);

  if (!minSalary) return "";

  return ` ${minSalary}`;
}

export async function retrieveJobs(preferences = {}, recommendedTitles = []) {
  const queryTitles = buildQueryTitles(preferences, recommendedTitles).slice(0, 8);
  const sources = [];
  const providerErrors = [];
  const jobs = [];

  if (!queryTitles.length) {
    queryTitles.push("jobs");
  }

  if (process.env.JSEARCH_API_KEY) {
    try {
      const items = await fetchJSearchJobs(queryTitles, preferences, recommendedTitles);
      if (items.length) {
        sources.push("JSearch");
        jobs.push(...items);
      } else {
        providerErrors.push({
          source: "JSearch",
          message: "JSearch returned zero jobs.",
        });
      }
    } catch (error) {
      providerErrors.push({
        source: "JSearch",
        message: error.message,
      });
    }
  } else {
    providerErrors.push({
      source: "JSearch",
      message: "JSEARCH_API_KEY is not configured.",
    });
  }

  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
    try {
      const items = await fetchAdzunaJobs(queryTitles, preferences);
      if (items.length) {
        sources.push("Adzuna");
        jobs.push(...items);
      } else {
        providerErrors.push({
          source: "Adzuna",
          message: "Adzuna returned zero jobs.",
        });
      }
    } catch (error) {
      providerErrors.push({
        source: "Adzuna",
        message: error.message,
      });
    }
  }

  if (process.env.USAJOBS_EMAIL && process.env.USAJOBS_API_KEY) {
    try {
      const items = await fetchUsaJobs(queryTitles, preferences);
      if (items.length) {
        sources.push("USAJobs");
        jobs.push(...items);
      } else {
        providerErrors.push({
          source: "USAJobs",
          message: "USAJobs returned zero jobs.",
        });
      }
    } catch (error) {
      providerErrors.push({
        source: "USAJobs",
        message: error.message,
      });
    }
  }

  if (!jobs.length) {
    return {
      jobs: fallbackJobs,
      sources: ["Fallback Catalog"],
      usedFallback: true,
      providerErrors,
    };
  }

  return {
    jobs: dedupeJobs(jobs).slice(0, 80),
    sources,
    usedFallback: false,
    providerErrors,
  };
}

async function fetchJSearchJobs(queryTitles, preferences, recommendedTitles) {
  const titleQueries = queryTitles.slice(0, 3);
  const allJobs = [];

  for (const searchTitle of titleQueries) {
    const location = locationForQuery(preferences);
    const remoteTerm = wantsRemote(preferences) ? " remote" : "";
    const query = `${searchTitle}${remoteTerm} ${location}${preferredSalaryQuery(preferences)}`.trim();

    const url = new URL("https://jsearch.p.rapidapi.com/search");
    url.searchParams.set("query", query);
    url.searchParams.set("page", "1");
    url.searchParams.set("num_pages", "1");
    url.searchParams.set("date_posted", "month");

    const response = await fetch(url.toString(), {
      headers: {
        "x-rapidapi-key": process.env.JSEARCH_API_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`JSearch responded ${response.status}: ${text.slice(0, 300)}`);
    }

    const data = await response.json();
    const items = Array.isArray(data.data) ? data.data : [];

    allJobs.push(
      ...items.map((item) => {
        const description = normalizeText(
          item.job_description ||
            item.job_highlights?.Responsibilities?.join(" ") ||
            "No description provided."
        );

        const title = normalizeText(item.job_title || "Untitled role");

        return {
          title,
          company: normalizeText(item.employer_name || "Unknown company"),
          compensation: normalizeCompensation(item.job_min_salary, item.job_max_salary),
          modality: item.job_is_remote
            ? "Remote"
            : inferModality(item.job_employment_type, description),
          industry: inferIndustry(title, description),
          location: normalizeText(
            item.job_city && item.job_state
              ? `${item.job_city}, ${item.job_state}`
              : item.job_country || (item.job_is_remote ? "Remote" : "Not listed")
          ),
          skillMatch: 80,
          source: "JSearch",
          description: description.slice(0, 500),
          applyUrl: item.job_apply_link || item.job_google_link || "https://themeasuredcareer.com",
          postedAt: item.job_posted_at_datetime_utc || null,
        };
      })
    );
  }

  return allJobs;
}

async function fetchAdzunaJobs(queryTitles, preferences) {
  const searchTitle = queryTitles[0] || "jobs";
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const country = process.env.ADZUNA_COUNTRY || "us";

  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", "30");
  url.searchParams.set("what", searchTitle);

  const location = normalizeText(preferences.location);
  if (location && location.toLowerCase() !== "remote") {
    url.searchParams.set("where", location);
  }

  const minSalary = parseSalary(preferences.minSalary);
  if (minSalary) {
    url.searchParams.set("salary_min", String(minSalary));
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Adzuna responded ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  const items = Array.isArray(data.results) ? data.results : [];

  return items.map((item) => {
    const title = normalizeText(item.title || "Untitled role");
    const description = normalizeText(item.description || "No description provided.");

    return {
      title,
      company: normalizeText(item.company?.display_name || "Unknown company"),
      compensation: normalizeCompensation(item.salary_min, item.salary_max),
      modality: inferModality(title, description),
      industry: inferIndustry(title, description),
      location: normalizeText(item.location?.display_name || "Not listed"),
      skillMatch: 80,
      source: "Adzuna",
      description: description.replace(/<[^>]+>/g, "").slice(0, 500),
      applyUrl: item.redirect_url || "https://themeasuredcareer.com",
      postedAt: item.created || null,
    };
  });
}

async function fetchUsaJobs(queryTitles, preferences) {
  const searchTitle = queryTitles[0] || "analyst";
  const url = new URL("https://data.usajobs.gov/api/search");
  url.searchParams.set("Keyword", searchTitle);
  url.searchParams.set("ResultsPerPage", "30");

  const location = normalizeText(preferences.location);
  if (location && location.toLowerCase() !== "remote") {
    url.searchParams.set("LocationName", location);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Host: "data.usajobs.gov",
      "User-Agent": process.env.USAJOBS_EMAIL,
      "Authorization-Key": process.env.USAJOBS_API_KEY,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`USAJobs responded ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  const items = data.SearchResult?.SearchResultItems || [];

  return items.map((wrapper) => {
    const item = wrapper.MatchedObjectDescriptor || {};
    const title = normalizeText(item.PositionTitle || "Untitled federal role");
    const description = normalizeText(item.UserArea?.Details?.JobSummary || "No description provided.");
    const locations = (item.PositionLocation || [])
      .map((loc) => loc.LocationName)
      .filter(Boolean)
      .join(", ");

    return {
      title,
      company: normalizeText(item.OrganizationName || "Federal agency"),
      compensation: normalizeCompensation(
        item.PositionRemuneration?.[0]?.MinimumRange,
        item.PositionRemuneration?.[0]?.MaximumRange
      ),
      modality: inferModality(title, description),
      industry: "Government",
      location: normalizeText(locations || "United States"),
      skillMatch: 80,
      source: "USAJobs",
      description: description.slice(0, 500),
      applyUrl: item.PositionURI || "https://www.usajobs.gov",
      postedAt: item.PublicationStartDate || null,
    };
  });
}
