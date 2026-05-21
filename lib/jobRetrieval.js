export function parseSalary(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/[$,\s]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value = "") {
  return String(value).trim();
}

function stripHtml(value = "") {
  return String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function inferIndustry(title = "", description = "") {
  const text = `${title} ${description}`.toLowerCase();

  if (/(health|clinical|patient|medical|nurse|hospital)/.test(text)) return "Healthcare";
  if (/(finance|financial|risk|investment|bank|portfolio|accounting)/.test(text)) return "Finance";
  if (/(research|scientist|laboratory|r&d|experiment)/.test(text)) return "Research";
  if (/(teacher|education|instructional|curriculum|learning)/.test(text)) return "Education";
  if (/(security|cyber|soc|incident|threat)/.test(text)) return "Cybersecurity";
  if (/(software|developer|frontend|backend|full stack|platform|cloud|react|javascript|python)/.test(text)) return "Software";
  if (/(data|analytics|business intelligence|sql|etl|machine learning|ai|ml|llm)/.test(text)) return "Data / AI";
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

function industryQueryText(preferences = {}) {
  if (!preferences.industry || preferences.industry === "Any") return "";
  return ` ${preferences.industry}`;
}

function companyQueryText(preferences = {}) {
  const companies = String(preferences.preferredCompanies || "")
    .split(/[,;\n]+/)
    .map((company) => company.trim())
    .filter(Boolean);

  if (!companies.length) return "";

  return ` ${companies.slice(0, 2).join(" OR ")}`;
}

function parseGreenhouseBoards() {
  return String(process.env.GREENHOUSE_BOARDS || "")
    .split(",")
    .map((board) => board.trim())
    .filter(Boolean);
}

function greenhouseJobAllowed(jobTitle, queryTitles) {
  const title = String(jobTitle || "").toLowerCase();
  const queryText = queryTitles.join(" ").toLowerCase();

  if (!queryText.includes("intern") && title.includes("intern")) {
    return false;
  }

  return true;
}

function safeUrlObject(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isGoogleJobsOrSearchUrl(url) {
  const parsed = safeUrlObject(url);
  if (!parsed) return true;

  const host = parsed.hostname.toLowerCase();
  const href = parsed.href.toLowerCase();

  if (host === "google.com" || host.endsWith(".google.com")) return true;
  if (host.includes("googleusercontent.com")) return true;
  if (href.includes("/search?")) return true;
  if (href.includes("google_jobs")) return true;
  if (href.includes("htidocid")) return true;
  if (href.includes("jobposting")) return true;

  return false;
}

function isJobBoardButDirect(url) {
  const parsed = safeUrlObject(url);
  if (!parsed) return false;

  const host = parsed.hostname.toLowerCase();
  const href = parsed.href.toLowerCase();

  const trustedDirectBoards = [
    "greenhouse.io",
    "lever.co",
    "workdayjobs.com",
    "myworkdayjobs.com",
    "ashbyhq.com",
    "smartrecruiters.com",
    "icims.com",
    "bamboohr.com",
    "jobvite.com",
    "successfactors.com",
    "adp.com",
    "paylocity.com",
    "ultipro.com",
    "usajobs.gov",
    "governmentjobs.com",
    "schooljobs.com",
  ];

  if (trustedDirectBoards.some((domain) => host === domain orHostEndsWith(host, domain))) {
    return true;
  }

  return /\/jobs?\/|\/careers?\/|\/positions?\/|\/openings?\/|\/apply|\/job\//i.test(href);
}

function orHostEndsWith(host, domain) {
  return host.endsWith("." + domain);
}

function validDirectApplyUrl(url) {
  if (typeof url !== "string") return false;
  if (!url.startsWith("http")) return false;
  if (url.includes("themeasuredcareer.com")) return false;
  if (isGoogleJobsOrSearchUrl(url)) return false;

  return true;
}

function cleanApplyUrl(url) {
  return validDirectApplyUrl(url) ? url : null;
}

function chooseBestApplyUrl(candidates = [], company = "") {
  const cleaned = candidates
    .filter(Boolean)
    .map((url) => String(url).trim())
    .filter(validDirectApplyUrl);

  if (!cleaned.length) return null;

  const companyWords = String(company)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  const scored = cleaned.map((url) => {
    const parsed = safeUrlObject(url);
    const host = parsed?.hostname?.toLowerCase() || "";
    const href = url.toLowerCase();

    let score = 0;

    if (companyWords.some((word) => host.includes(word))) score += 60;
    if (isJobBoardButDirect(url)) score += 35;
    if (/careers?|jobs?|apply|workday|greenhouse|lever|ashby|smartrecruiters|icims/i.test(href)) score += 25;
    if (/indeed|linkedin|ziprecruiter|glassdoor|monster|talent\.com|simplyhired/i.test(host)) score -= 20;

    return { url, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.url || null;
}

export async function retrieveJobs(preferences = {}, recommendedTitles = [], options = {}) {
  const maxCandidates = Number(options.maxCandidates || 200);
  const queryTitles = buildQueryTitles(preferences, recommendedTitles).slice(0, 10);
  const sources = [];
  const providerErrors = [];
  const jobs = [];

  if (!queryTitles.length) {
    queryTitles.push("jobs");
  }

  if (process.env.SERPAPI_API_KEY) {
    try {
      const items = await fetchSerpApiGoogleJobs(queryTitles, preferences);
      if (items.length) {
        sources.push("Google Jobs / SerpAPI");
        jobs.push(...items);
      } else {
        providerErrors.push({
          source: "Google Jobs / SerpAPI",
          message: "SerpAPI returned zero jobs.",
        });
      }
    } catch (error) {
      providerErrors.push({
        source: "Google Jobs / SerpAPI",
        message: error.message,
      });
    }
  } else {
    providerErrors.push({
      source: "Google Jobs / SerpAPI",
      message: "SERPAPI_API_KEY is not configured.",
    });
  }

  if (process.env.JSEARCH_API_KEY) {
    try {
      const items = await fetchJSearchJobs(queryTitles, preferences);
      if (items.length) {
        sources.push("JSearch");
        jobs.push(...items);
      } else {
        providerErrors.push({ source: "JSearch", message: "JSearch returned zero jobs." });
      }
    } catch (error) {
      providerErrors.push({ source: "JSearch", message: error.message });
    }
  } else {
    providerErrors.push({ source: "JSearch", message: "JSEARCH_API_KEY is not configured." });
  }

  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
    try {
      const items = await fetchAdzunaJobs(queryTitles, preferences);
      if (items.length) {
        sources.push("Adzuna");
        jobs.push(...items);
      } else {
        providerErrors.push({ source: "Adzuna", message: "Adzuna returned zero jobs." });
      }
    } catch (error) {
      providerErrors.push({ source: "Adzuna", message: error.message });
    }
  }

  if (process.env.USAJOBS_EMAIL && process.env.USAJOBS_API_KEY) {
    try {
      const items = await fetchUsaJobs(queryTitles, preferences);
      if (items.length) {
        sources.push("USAJobs");
        jobs.push(...items);
      } else {
        providerErrors.push({ source: "USAJobs", message: "USAJobs returned zero jobs." });
      }
    } catch (error) {
      providerErrors.push({ source: "USAJobs", message: error.message });
    }
  }

  if (process.env.GREENHOUSE_BOARDS) {
    try {
      const items = await fetchGreenhouseJobs(queryTitles, preferences);
      if (items.length) {
        sources.push("Greenhouse");
        jobs.push(...items);
      } else {
        providerErrors.push({ source: "Greenhouse", message: "Greenhouse returned zero matching jobs." });
      }
    } catch (error) {
      providerErrors.push({ source: "Greenhouse", message: error.message });
    }
  } else {
    providerErrors.push({ source: "Greenhouse", message: "GREENHOUSE_BOARDS is not configured." });
  }

  const deduped = dedupeJobs(jobs);

  return {
    jobs: deduped.slice(0, maxCandidates),
    sources,
    usedFallback: false,
    providerErrors,
  };
}

async function fetchSerpApiGoogleJobs(queryTitles, preferences) {
  const titleQueries = queryTitles.slice(0, 6);
  const allJobs = [];

  for (const searchTitle of titleQueries) {
    const location = locationForQuery(preferences);
    const remoteTerm = wantsRemote(preferences) ? " remote" : "";
    const query = `${searchTitle}${industryQueryText(preferences)}${companyQueryText(preferences)}${remoteTerm} jobs`.trim();

    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_jobs");
    url.searchParams.set("q", query);
    url.searchParams.set("location", location);
    url.searchParams.set("api_key", process.env.SERPAPI_API_KEY);
    url.searchParams.set("hl", "en");

    const response = await fetch(url.toString());

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`SerpAPI responded ${response.status}: ${text.slice(0, 300)}`);
    }

    const data = await response.json();
    const items = Array.isArray(data.jobs_results) ? data.jobs_results : [];

    allJobs.push(
      ...items.map((item) => {
        const title = normalizeText(item.title || "Untitled role");
        const company = normalizeText(item.company_name || "Unknown company");
        const description = normalizeText(item.description || item.snippet || "No description provided.");
        const extensions = Array.isArray(item.extensions) ? item.extensions : [];

        const salaryText =
          item.detected_extensions?.salary ||
          extensions.find((extension) => /\$|salary|year|hour/i.test(extension)) ||
          "";

        const isRemote = /remote/i.test(`${item.location || ""} ${description} ${extensions.join(" ")}`);

        const relatedLinks = Array.isArray(item.related_links)
          ? item.related_links.map((link) => link?.link).filter(Boolean)
          : [];

        const applyOptions = Array.isArray(item.apply_options)
          ? item.apply_options.map((option) => option?.link).filter(Boolean)
          : [];

        const viaApplyOptions = Array.isArray(item.via)
          ? item.via.map((option) => option?.link).filter(Boolean)
          : [];

        const directApplyUrl = chooseBestApplyUrl(
          [
            ...applyOptions,
            ...relatedLinks,
            ...viaApplyOptions,
            item.apply_link,
            item.share_link,
          ],
          company
        );

        return {
          title,
          company,
          compensation: parseSalaryFromText(salaryText),
          modality: isRemote ? "Remote" : inferModality(item.location, description),
          industry: inferIndustry(title, description),
          location: normalizeText(item.location || (isRemote ? "Remote" : "Not listed")),
          skillMatch: 80,
          source: "Google Jobs / SerpAPI",
          description: description.slice(0, 900),
          applyUrl: directApplyUrl,
          postedAt: item.detected_extensions?.posted_at || null,
        };
      })
    );
  }

  return allJobs;
}

function parseSalaryFromText(value = "") {
  const text = String(value);
  if (!text) return null;

  const numbers = text.replace(/,/g, "").match(/\$?\s*(\d{2,3}(?:000)?|\d{2,3}k)/gi);
  if (!numbers) return null;

  const parsed = numbers
    .map((item) => {
      const cleaned = item.replace(/\$/g, "").trim().toLowerCase();
      if (cleaned.endsWith("k")) return Number(cleaned.replace("k", "")) * 1000;
      const number = Number(cleaned);
      if (number < 1000 && number > 20) return number * 1000;
      return number;
    })
    .filter((number) => Number.isFinite(number) && number > 1000);

  if (!parsed.length) return null;

  return Math.round(parsed.reduce((sum, number) => sum + number, 0) / parsed.length);
}

async function fetchJSearchJobs(queryTitles, preferences) {
  const titleQueries = queryTitles.slice(0, 6);
  const allJobs = [];

  for (const searchTitle of titleQueries) {
    const location = locationForQuery(preferences);
    const remoteTerm = wantsRemote(preferences) ? " remote" : "";
    const query = `${searchTitle}${industryQueryText(preferences)}${companyQueryText(preferences)}${remoteTerm} ${location}${preferredSalaryQuery(preferences)}`.trim();

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
        const company = normalizeText(item.employer_name || "Unknown company");

        const applyUrl = chooseBestApplyUrl(
          [
            item.job_apply_link,
            ...(Array.isArray(item.apply_options)
              ? item.apply_options.map((option) => option?.apply_link || option?.link).filter(Boolean)
              : []),
            item.job_publisher_link,
            item.job_google_link,
          ],
          company
        );

        return {
          title,
          company,
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
          description: description.slice(0, 900),
          applyUrl,
          postedAt: item.job_posted_at_datetime_utc || null,
        };
      })
    );
  }

  return allJobs;
}

async function fetchAdzunaJobs(queryTitles, preferences) {
  const titleQueries = queryTitles.slice(0, 5);
  const allJobs = [];

  for (const searchTitle of titleQueries) {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    const country = process.env.ADZUNA_COUNTRY || "us";

    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    url.searchParams.set("results_per_page", "50");
    url.searchParams.set("what", `${searchTitle}${industryQueryText(preferences)}${companyQueryText(preferences)}`.trim());

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

    allJobs.push(
      ...items.map((item) => {
        const title = normalizeText(item.title || "Untitled role");
        const company = normalizeText(item.company?.display_name || "Unknown company");
        const description = normalizeText(item.description || "No description provided.");

        return {
          title,
          company,
          compensation: normalizeCompensation(item.salary_min, item.salary_max),
          modality: inferModality(title, description),
          industry: inferIndustry(title, description),
          location: normalizeText(item.location?.display_name || "Not listed"),
          skillMatch: 80,
          source: "Adzuna",
          description: description.replace(/<[^>]+>/g, "").slice(0, 900),
          applyUrl: cleanApplyUrl(item.redirect_url),
          postedAt: item.created || null,
        };
      })
    );
  }

  return allJobs;
}

async function fetchUsaJobs(queryTitles, preferences) {
  const searchTitle = queryTitles[0] || "analyst";
  const url = new URL("https://data.usajobs.gov/api/search");
  url.searchParams.set("Keyword", `${searchTitle}${industryQueryText(preferences)}`.trim());
  url.searchParams.set("ResultsPerPage", "50");

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
    const company = normalizeText(item.OrganizationName || "Federal agency");
    const description = normalizeText(item.UserArea?.Details?.JobSummary || "No description provided.");
    const locations = (item.PositionLocation || [])
      .map((loc) => loc.LocationName)
      .filter(Boolean)
      .join(", ");

    return {
      title,
      company,
      compensation: normalizeCompensation(
        item.PositionRemuneration?.[0]?.MinimumRange,
        item.PositionRemuneration?.[0]?.MaximumRange
      ),
      modality: inferModality(title, description),
      industry: "Government",
      location: normalizeText(locations || "United States"),
      skillMatch: 80,
      source: "USAJobs",
      description: description.slice(0, 900),
      applyUrl: cleanApplyUrl(item.PositionURI),
      postedAt: item.PublicationStartDate || null,
    };
  });
}

async function fetchGreenhouseJobs(queryTitles, preferences) {
  const boards = parseGreenhouseBoards();
  const allJobs = [];

  for (const board of boards) {
    const url = new URL(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`);
    url.searchParams.set("content", "true");

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Greenhouse board "${board}" responded ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    const items = Array.isArray(data.jobs) ? data.jobs : [];
    const companyName = normalizeText(data.name || board);

    const normalizedJobs = items
      .filter((item) => greenhouseJobAllowed(item.title || "", queryTitles))
      .map((item) => {
        const title = normalizeText(item.title || "Untitled role");
        const rawDescription = item.content || item.description || "No description provided.";
        const description = stripHtml(rawDescription);

        const offices = Array.isArray(item.offices) ? item.offices : [];
        const locations = offices
          .map((office) => office.location || office.name)
          .filter(Boolean)
          .join(", ");

        const location = normalizeText(item.location?.name || locations || "Not listed");

        return {
          title,
          company: companyName,
          compensation: null,
          modality: inferModality(location, description),
          industry: inferIndustry(title, description),
          location,
          skillMatch: 80,
          source: `Greenhouse:${board}`,
          description: description.slice(0, 900),
          applyUrl: cleanApplyUrl(item.absolute_url),
          postedAt: item.updated_at || null,
        };
      });

    allJobs.push(...normalizedJobs);
  }

  return allJobs;
}
