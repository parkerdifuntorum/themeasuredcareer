function normalize(value = "") {
  return String(value || "").trim();
}

function normalizeLower(value = "") {
  return normalize(value).toLowerCase();
}

function safeUrlObject(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function hostEndsWith(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
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

  return false;
}

function isAdzunaUrl(url) {
  const parsed = safeUrlObject(url);
  if (!parsed) return false;
  return parsed.hostname.toLowerCase().includes("adzuna.");
}

export function isDirectApplyUrl(url) {
  if (typeof url !== "string") return false;
  if (!url.startsWith("http")) return false;
  if (url.includes("themeasuredcareer.com")) return false;
  if (isGoogleJobsOrSearchUrl(url)) return false;
  if (isAdzunaUrl(url)) return false;
  return true;
}

function isTrustedAtsUrl(url) {
  const parsed = safeUrlObject(url);
  if (!parsed) return false;

  const host = parsed.hostname.toLowerCase();
  const trustedDomains = [
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

  return trustedDomains.some((domain) => hostEndsWith(host, domain));
}

function looksLikeApplicationPath(url) {
  const parsed = safeUrlObject(url);
  if (!parsed) return false;
  const href = parsed.href.toLowerCase();
  return /\/jobs?\/|\/careers?\/|\/positions?\/|\/openings?\/|\/apply|\/job\//i.test(href);
}

function companyWords(company = "") {
  return normalizeLower(company)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co|the|group|systems|technologies|technology)\b/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

function titleWords(title = "") {
  return normalizeLower(title)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

export function scoreApplyUrl(url, job = {}) {
  if (!isDirectApplyUrl(url)) return -999;

  const parsed = safeUrlObject(url);
  const host = parsed?.hostname?.toLowerCase() || "";
  const href = normalizeLower(url);

  let score = 0;

  if (isTrustedAtsUrl(url)) score += 55;
  if (looksLikeApplicationPath(url)) score += 35;

  const cWords = companyWords(job.company);
  const tWords = titleWords(job.title);

  if (cWords.some((word) => host.includes(word) || href.includes(word))) score += 35;
  if (tWords.some((word) => href.includes(word))) score += 20;

  if (/workday|greenhouse|lever|ashby|smartrecruiters|icims|careers|jobs|apply/i.test(href)) {
    score += 20;
  }

  if (/adzuna|indeed|linkedin|ziprecruiter|glassdoor|monster|talent\.com|simplyhired/i.test(host)) {
    score -= 100;
  }

  return score;
}

export function chooseBestApplyUrl(candidates = [], job = {}) {
  const scored = candidates
    .filter(Boolean)
    .map((url) => String(url).trim())
    .filter(isDirectApplyUrl)
    .map((url) => ({
      url,
      score: scoreApplyUrl(url, job),
    }))
    .filter((item) => item.score > -999)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.url || null;
}

function companySlugCandidates(company = "") {
  const cleaned = normalizeLower(company)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co|the)\b/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  const compact = cleaned.replace(/\s+/g, "");
  const dashed = cleaned.replace(/\s+/g, "-");

  return Array.from(new Set([cleaned, compact, dashed].filter(Boolean)));
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 6000);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "TheMeasuredCareerBot/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryGreenhouse(job) {
  const slugs = companySlugCandidates(job.company).slice(0, 4);
  const tWords = titleWords(job.title);

  for (const slug of slugs) {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=false`;
    const data = await fetchJson(url);

    if (!Array.isArray(data?.jobs)) continue;

    const matches = data.jobs
      .map((item) => ({
        item,
        score: titleWords(item.title).filter((word) => tWords.includes(word)).length,
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    const best = matches[0]?.item;

    if (best?.absolute_url && isDirectApplyUrl(best.absolute_url)) {
      return {
        applyUrl: best.absolute_url,
        method: "greenhouse-board",
        confidence: 90,
      };
    }
  }

  return null;
}

async function tryLever(job) {
  const slugs = companySlugCandidates(job.company).slice(0, 4);
  const tWords = titleWords(job.title);

  for (const slug of slugs) {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
    const data = await fetchJson(url);

    if (!Array.isArray(data)) continue;

    const matches = data
      .map((item) => ({
        item,
        score: titleWords(item.text).filter((word) => tWords.includes(word)).length,
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    const best = matches[0]?.item;

    if (best?.hostedUrl && isDirectApplyUrl(best.hostedUrl)) {
      return {
        applyUrl: best.hostedUrl,
        method: "lever-postings-api",
        confidence: 90,
      };
    }

    if (best?.applyUrl && isDirectApplyUrl(best.applyUrl)) {
      return {
        applyUrl: best.applyUrl,
        method: "lever-postings-api",
        confidence: 90,
      };
    }
  }

  return null;
}

async function trySerpCompanyCareersSearch(job) {
  if (!process.env.SERPAPI_API_KEY) return null;

  const query = `${job.company} ${job.title} careers apply`;
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", process.env.SERPAPI_API_KEY);
  url.searchParams.set("num", "10");

  const data = await fetchJson(url.toString(), { timeoutMs: 7000 });
  const organic = Array.isArray(data?.organic_results) ? data.organic_results : [];

  const candidates = organic.map((result) => result.link).filter(Boolean);
  const best = chooseBestApplyUrl(candidates, job);

  if (!best) return null;

  return {
    applyUrl: best,
    method: "serpapi-company-careers-search",
    confidence: scoreApplyUrl(best, job),
  };
}

async function resolveRedirect(url) {
  if (!isDirectApplyUrl(url)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });

    const finalUrl = response.url;

    if (isDirectApplyUrl(finalUrl)) return finalUrl;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }

  return null;
}

export async function enrichSingleJobApplyUrl(job) {
  // Do not include Adzuna redirects or aggregator fallback URLs.
  // Adzuna only gets an apply URL if enrichment finds a company/ATS URL.
  const existingCandidates = [
    job.applyUrl,
    job.job_apply_link,
    job.job_google_link,
    job.absolute_url,
  ].filter(Boolean);

  const bestExisting = chooseBestApplyUrl(existingCandidates, job);

  if (bestExisting && scoreApplyUrl(bestExisting, job) >= 60) {
    return {
      ...job,
      applyUrl: bestExisting,
      applyUrlSource: job.applyUrlSource || "provider-direct",
      applyUrlConfidence: scoreApplyUrl(bestExisting, job),
    };
  }

  const resolved = bestExisting ? await resolveRedirect(bestExisting) : null;

  if (resolved && scoreApplyUrl(resolved, job) >= 60) {
    return {
      ...job,
      applyUrl: resolved,
      applyUrlSource: "redirect-resolution",
      applyUrlConfidence: scoreApplyUrl(resolved, job),
    };
  }

  const greenhouse = await tryGreenhouse(job);
  if (greenhouse?.applyUrl) {
    return {
      ...job,
      applyUrl: greenhouse.applyUrl,
      applyUrlSource: greenhouse.method,
      applyUrlConfidence: greenhouse.confidence,
    };
  }

  const lever = await tryLever(job);
  if (lever?.applyUrl) {
    return {
      ...job,
      applyUrl: lever.applyUrl,
      applyUrlSource: lever.method,
      applyUrlConfidence: lever.confidence,
    };
  }

  const serp = await trySerpCompanyCareersSearch(job);
  if (serp?.applyUrl) {
    return {
      ...job,
      applyUrl: serp.applyUrl,
      applyUrlSource: serp.method,
      applyUrlConfidence: serp.confidence,
    };
  }

  return {
    ...job,
    applyUrl: null,
    applyUrlSource: "not-found",
    applyUrlConfidence: 0,
  };
}

export async function enrichApplyUrls(jobs = [], options = {}) {
  const limit = Number(options.limit || 100);
  const concurrency = Number(options.concurrency || 4);
  const input = jobs.slice(0, limit);
  const output = [];

  for (let index = 0; index < input.length; index += concurrency) {
    const batch = input.slice(index, index + concurrency);
    const enriched = await Promise.all(batch.map((job) => enrichSingleJobApplyUrl(job)));
    output.push(...enriched);
  }

  return [...output, ...jobs.slice(limit)];
}
