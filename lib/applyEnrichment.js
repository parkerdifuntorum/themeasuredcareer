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

function isAggregatorUrl(url) {
  const parsed = safeUrlObject(url);
  if (!parsed) return true;

  const host = parsed.hostname.toLowerCase();
  const href = parsed.href.toLowerCase();

  const aggregatorDomains = [
    "google.com",
    "googleusercontent.com",
    "adzuna.",
    "indeed.com",
    "linkedin.com",
    "ziprecruiter.com",
    "glassdoor.com",
    "monster.com",
    "talent.com",
    "simplyhired.com",
    "careerbuilder.com",
    "jooble.org",
  ];

  if (aggregatorDomains.some((domain) => host.includes(domain))) return true;
  if (href.includes("/search?")) return true;
  if (href.includes("google_jobs")) return true;
  if (href.includes("htidocid")) return true;

  return false;
}

export function isDirectApplyUrl(url) {
  if (typeof url !== "string") return false;
  if (!url.startsWith("http")) return false;
  if (url.includes("themeasuredcareer.com")) return false;
  if (isAggregatorUrl(url)) return false;

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
    "oraclecloud.com",
    "taleo.net",
    "brassring.com",
    "recruitee.com",
    "teamtailor.com",
    "workable.com",
    "usajobs.gov",
    "governmentjobs.com",
    "schooljobs.com",
  ];

  return trustedDomains.some((domain) => hostEndsWith(host, domain));
}

function looksLikeDirectRolePath(url) {
  const parsed = safeUrlObject(url);
  if (!parsed) return false;

  const href = parsed.href.toLowerCase();

  return /\/jobs?\/[^/]+|\/job\/[^/]+|\/positions?\/[^/]+|\/openings?\/[^/]+|\/apply/i.test(href);
}

function looksLikeCompanyCareersPage(url) {
  const parsed = safeUrlObject(url);
  if (!parsed) return false;

  const href = parsed.href.toLowerCase();

  return /\/careers?\/?$|\/jobs?\/?$|\/employment\/?$|\/work-with-us\/?$|\/join-us\/?$|\/opportunities\/?$/i.test(href) ||
    /careers?|jobs?|employment|work-with-us|join-us|opportunities/i.test(href);
}

function companyWords(company = "") {
  return normalizeLower(company)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co|the|group|systems|technologies|technology|solutions|services|international|global)\b/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

function titleWords(title = "") {
  return normalizeLower(title)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

export function classifyApplyUrl(url, job = {}) {
  if (!isDirectApplyUrl(url)) {
    return {
      type: "none",
      label: "No safe company application link found",
      note: "Aggregator links are hidden to avoid sending users to tracking-heavy job boards.",
      confidence: 0,
    };
  }

  if (isTrustedAtsUrl(url) && looksLikeDirectRolePath(url)) {
    return {
      type: "direct-role",
      label: "Apply on company ATS",
      note: "Direct application link found. This avoids aggregator redirects.",
      confidence: 95,
    };
  }

  if (isTrustedAtsUrl(url)) {
    return {
      type: "company-ats",
      label: "Open company hiring system",
      note: "Company ATS link found. The user may need to search the role title on that page.",
      confidence: 80,
    };
  }

  if (looksLikeDirectRolePath(url)) {
    return {
      type: "direct-role",
      label: "Apply on company site",
      note: "Likely direct company application page.",
      confidence: 85,
    };
  }

  if (looksLikeCompanyCareersPage(url)) {
    return {
      type: "company-careers",
      label: "Open company careers page",
      note: "Direct role link was not confirmed, so this opens the company's careers page instead of an aggregator.",
      confidence: 65,
    };
  }

  return {
    type: "company-site",
    label: "Open company website",
    note: "Company-owned link found. The user may need to search careers or the job title.",
    confidence: 50,
  };
}

export function scoreApplyUrl(url, job = {}) {
  if (!isDirectApplyUrl(url)) return -999;

  const parsed = safeUrlObject(url);
  const host = parsed?.hostname?.toLowerCase() || "";
  const href = normalizeLower(url);
  const classification = classifyApplyUrl(url, job);

  let score = classification.confidence;

  if (isTrustedAtsUrl(url)) score += 25;
  if (looksLikeDirectRolePath(url)) score += 30;
  if (looksLikeCompanyCareersPage(url)) score += 10;

  const cWords = companyWords(job.company);
  const tWords = titleWords(job.title);

  if (cWords.some((word) => host.includes(word))) score += 45;
  if (cWords.some((word) => href.includes(word))) score += 25;
  if (tWords.some((word) => href.includes(word))) score += 20;

  if (/workday|greenhouse|lever|ashby|smartrecruiters|icims|careers|jobs|apply|oraclecloud|taleo|brassring|workable|recruitee/i.test(href)) {
    score += 20;
  }

  if (isAggregatorUrl(url)) {
    score -= 300;
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
      classification: classifyApplyUrl(url, job),
    }))
    .filter((item) => item.score > -999)
    .sort((a, b) => b.score - a.score);

  return scored[0] || null;
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
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 6500);

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

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 6500);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "TheMeasuredCareerBot/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) return "";

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return "";

    return await response.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function titleMatchScore(candidateTitle = "", jobTitle = "") {
  const candidateWords = titleWords(candidateTitle);
  const jobWords = titleWords(jobTitle);

  if (!candidateWords.length || !jobWords.length) return 0;

  return candidateWords.filter((word) => jobWords.includes(word)).length;
}

async function tryGreenhouse(job) {
  const slugs = companySlugCandidates(job.company).slice(0, 5);
  const jobTitle = job.title || "";

  for (const slug of slugs) {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=false`;
    const data = await fetchJson(url);

    if (!Array.isArray(data?.jobs)) continue;

    const matches = data.jobs
      .map((item) => ({
        item,
        score: titleMatchScore(item.title, jobTitle),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    const best = matches[0]?.item;

    if (best?.absolute_url && isDirectApplyUrl(best.absolute_url)) {
      return {
        applyUrl: best.absolute_url,
        method: "greenhouse-board",
        fallback: false,
      };
    }
  }

  return null;
}

async function tryLever(job) {
  const slugs = companySlugCandidates(job.company).slice(0, 5);
  const jobTitle = job.title || "";

  for (const slug of slugs) {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
    const data = await fetchJson(url);

    if (!Array.isArray(data)) continue;

    const matches = data
      .map((item) => ({
        item,
        score: titleMatchScore(item.text, jobTitle),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    const best = matches[0]?.item;

    if (best?.hostedUrl && isDirectApplyUrl(best.hostedUrl)) {
      return {
        applyUrl: best.hostedUrl,
        method: "lever-postings-api",
        fallback: false,
      };
    }

    if (best?.applyUrl && isDirectApplyUrl(best.applyUrl)) {
      return {
        applyUrl: best.applyUrl,
        method: "lever-postings-api",
        fallback: false,
      };
    }
  }

  return null;
}

function extractLinksFromHtml(html, baseUrl) {
  if (!html) return [];

  const links = [];
  const regex = /href=["']([^"']+)["']/gi;
  let match;

  while ((match = regex.exec(html))) {
    const href = match[1];

    try {
      const absolute = new URL(href, baseUrl).href;
      links.push(absolute);
    } catch {
      // ignore bad href
    }
  }

  return Array.from(new Set(links));
}

function isLikelyCompanyOwnedUrl(url, job = {}) {
  if (!isDirectApplyUrl(url)) return false;

  const parsed = safeUrlObject(url);
  if (!parsed) return false;

  const host = parsed.hostname.toLowerCase();
  const href = parsed.href.toLowerCase();
  const words = companyWords(job.company);

  if (words.some((word) => host.includes(word))) return true;
  if (isTrustedAtsUrl(url)) return true;
  if (/career|jobs|employment|work-with-us|join-us|opportunit|apply/i.test(href)) return true;

  return false;
}

async function trySerpExactJobSearch(job) {
  if (!process.env.SERPAPI_API_KEY) return null;

  const queries = [
    `"${job.company}" "${job.title}" apply`,
    `"${job.company}" "${job.title}" careers`,
    `${job.company} ${job.title} company careers apply`,
    `${job.company} ${job.title} site:greenhouse.io OR site:lever.co OR site:myworkdayjobs.com OR site:ashbyhq.com`,
  ];

  const candidates = [];

  for (const query of queries) {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", query);
    url.searchParams.set("api_key", process.env.SERPAPI_API_KEY);
    url.searchParams.set("num", "10");

    const data = await fetchJson(url.toString(), { timeoutMs: 7000 });
    const organic = Array.isArray(data?.organic_results) ? data.organic_results : [];

    candidates.push(...organic.map((result) => result.link).filter(Boolean));
  }

  const companyOwned = candidates.filter((url) => isLikelyCompanyOwnedUrl(url, job));
  const best = chooseBestApplyUrl(companyOwned, job);

  if (!best) return null;

  return {
    applyUrl: best.url,
    method: "serpapi-exact-company-job-search",
    fallback: best.classification.type !== "direct-role",
  };
}

async function tryCompanyCareerHomePages(job) {
  if (!process.env.SERPAPI_API_KEY) return null;

  const queries = [
    `${job.company} careers`,
    `${job.company} jobs`,
    `${job.company} employment`,
    `${job.company} ${job.title} careers`,
  ];

  const careerHomeCandidates = [];

  for (const query of queries) {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", query);
    url.searchParams.set("api_key", process.env.SERPAPI_API_KEY);
    url.searchParams.set("num", "8");

    const data = await fetchJson(url.toString(), { timeoutMs: 7000 });
    const organic = Array.isArray(data?.organic_results) ? data.organic_results : [];

    careerHomeCandidates.push(
      ...organic
        .map((result) => result.link)
        .filter(Boolean)
        .filter((link) => isLikelyCompanyOwnedUrl(link, job))
        .filter((link) => /career|job|work-with-us|join-us|opportunit|employment|apply/i.test(link))
    );
  }

  const discoveredLinks = [];

  for (const home of Array.from(new Set(careerHomeCandidates)).slice(0, 4)) {
    const html = await fetchText(home, { timeoutMs: 7000 });
    const links = extractLinksFromHtml(html, home);

    discoveredLinks.push(
      ...links.filter((link) =>
        isLikelyCompanyOwnedUrl(link, job) &&
        (/job|career|position|opening|apply|workday|greenhouse|lever|ashby|icims|smartrecruiters|oraclecloud|taleo|workable/i.test(link))
      )
    );
  }

  const best = chooseBestApplyUrl([...discoveredLinks, ...careerHomeCandidates], job);

  if (!best) return null;

  return {
    applyUrl: best.url,
    method: best.classification.type === "direct-role"
      ? "company-careers-page-crawl"
      : "company-careers-page-fallback",
    fallback: best.classification.type !== "direct-role",
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

function withApplyMetadata(job, applyUrl, source, fallback = false) {
  const classification = classifyApplyUrl(applyUrl, job);
  const confidence = scoreApplyUrl(applyUrl, job);

  return {
    ...job,
    applyUrl,
    applyUrlSource: source,
    applyUrlConfidence: confidence,
    applyLinkType: classification.type,
    applyLinkLabel: classification.label,
    applyLinkNote: fallback
      ? "Direct role link was not confirmed. This button opens the company's careers page instead of an aggregator to avoid spam/tracking-heavy job boards."
      : classification.note,
    applyLinkIsFallbackCareerPage: Boolean(fallback || classification.type === "company-careers" || classification.type === "company-site"),
  };
}

export async function enrichSingleJobApplyUrl(job) {
  const existingCandidates = [
    job.applyUrl,
    job.job_apply_link,
    job.job_google_link,
    job.absolute_url,
  ].filter(Boolean);

  const bestExisting = chooseBestApplyUrl(existingCandidates, job);

  if (bestExisting && bestExisting.score >= 90) {
    return withApplyMetadata(job, bestExisting.url, job.applyUrlSource || "provider-direct", false);
  }

  const resolved = bestExisting ? await resolveRedirect(bestExisting.url) : null;

  if (resolved && scoreApplyUrl(resolved, job) >= 90) {
    return withApplyMetadata(job, resolved, "redirect-resolution", false);
  }

  const greenhouse = await tryGreenhouse(job);
  if (greenhouse?.applyUrl) {
    return withApplyMetadata(job, greenhouse.applyUrl, greenhouse.method, greenhouse.fallback);
  }

  const lever = await tryLever(job);
  if (lever?.applyUrl) {
    return withApplyMetadata(job, lever.applyUrl, lever.method, lever.fallback);
  }

  const exactSearch = await trySerpExactJobSearch(job);
  if (exactSearch?.applyUrl) {
    return withApplyMetadata(job, exactSearch.applyUrl, exactSearch.method, exactSearch.fallback);
  }

  const careerCrawl = await tryCompanyCareerHomePages(job);
  if (careerCrawl?.applyUrl) {
    return withApplyMetadata(job, careerCrawl.applyUrl, careerCrawl.method, careerCrawl.fallback);
  }

  return {
    ...job,
    applyUrl: null,
    applyUrlSource: "company-careers-url-not-found",
    applyUrlConfidence: 0,
    applyLinkType: "none",
    applyLinkLabel: "No company application link found",
    applyLinkNote: "Aggregator links are hidden to avoid sending users to tracking-heavy job boards.",
    applyLinkIsFallbackCareerPage: false,
  };
}

export async function enrichApplyUrls(jobs = [], options = {}) {
  const limit = Number(options.limit || 120);
  const concurrency = Number(options.concurrency || 3);
  const input = jobs.slice(0, limit);
  const output = [];

  for (let index = 0; index < input.length; index += concurrency) {
    const batch = input.slice(index, index + concurrency);
    const enriched = await Promise.all(batch.map((job) => enrichSingleJobApplyUrl(job)));
    output.push(...enriched);
  }

  return [...output, ...jobs.slice(limit)];
}
