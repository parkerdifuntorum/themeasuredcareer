import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Mail,
  SlidersHorizontal,
  MapPin,
  BriefcaseBusiness,
  DollarSign,
  Sparkles,
  Wand2,
  X,
  Search,
  ExternalLink,
  Bell,
  ShieldCheck,
  Plane,
  Building2,
  RefreshCcw,
} from "lucide-react";

import "./styles.css";

const industries = [
  "Utilities / Energy",
  "Power Systems",
  "Engineering",
  "Software",
  "Data / AI",
  "Cybersecurity",
  "Healthcare",
  "Biotechnology",
  "Research",
  "Finance",
  "Education",
  "Government",
  "Aerospace / Defense",
  "Manufacturing",
  "Telecommunications",
  "Consulting",
  "Construction",
  "Transportation",
  "Retail",
  "Nonprofit",
  "Other",
];

const modalities = ["Remote", "Hybrid", "On-site"];

const fallbackRecommendedTitles = [
  "Data Analyst",
  "Business Analyst",
  "Operations Analyst",
  "Product Analyst",
  "Research Analyst",
  "Project Manager",
  "Program Manager",
  "Customer Success Manager",
  "Software Engineer",
  "Systems Engineer",
  "Cybersecurity Analyst",
  "Financial Analyst",
];

const starterJobs = [];

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.error) return data.error;
  if (data.message) return data.message;
  return JSON.stringify(data);
}

function hasRealApplyUrl(job) {
  return (
    job?.applyUrl &&
    typeof job.applyUrl === "string" &&
    job.applyUrl.startsWith("http") &&
    !job.applyUrl.includes("themeasuredcareer.com") &&
    !job.applyUrl.includes("google.com/search") &&
    !job.applyUrl.includes("htidocid")
  );
}

function normalizeTitle(value = "") {
  return String(value).trim().toLowerCase();
}

function App() {
  const [digestEmail, setDigestEmail] = useState("");
  const [emailVerifyStatus, setEmailVerifyStatus] = useState("");
  const [digestStatus, setDigestStatus] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState("");
  const [titleStatus, setTitleStatus] = useState("");
  const [searchStatus, setSearchStatus] = useState(
    "Run a search to retrieve and rank live job results."
  );

  const [jobs, setJobs] = useState(starterJobs);
  const [lastSearchMeta, setLastSearchMeta] = useState(null);
  const [lastSearchedTitleSignature, setLastSearchedTitleSignature] = useState("");

  const [preferences, setPreferences] = useState({
    targetTitle: "",
    selectedTitles: [],
    preferredCompanies: "",
    minSalary: "$90,000",
    maxSalary: "$170,000",
    modalities: [],
    industry: "Any",
    location: "",
    minimizeTravel: true,
    maxTravelPercent: 10,
  });

  const [weights, setWeights] = useState({
    compensation: 70,
    modality: 70,
    industry: 60,
    titleMatch: 75,
    location: 50,
    skillMatch: 75,
    travel: 70,
    company: 60,
  });

  const [titleIntelligence, setTitleIntelligence] = useState({
    normalizedTitle: "",
    confidence: 0,
    recommendedTitles: fallbackRecommendedTitles,
    titleScores: {},
    recommendationReason: "",
    source: "default",
    sourceTargetTitle: "",
  });

  function resetTitleIntelligence() {
    setTitleIntelligence({
      normalizedTitle: "",
      confidence: 0,
      recommendedTitles: fallbackRecommendedTitles,
      titleScores: {},
      recommendationReason: "",
      source: "default",
      sourceTargetTitle: "",
    });
  }

  function handleTargetTitleChange(value) {
    setPreferences((current) => {
      const oldTitle = normalizeTitle(current.targetTitle);
      const newTitle = normalizeTitle(value);

      const shouldResetSelectedTitles =
        oldTitle &&
        newTitle &&
        oldTitle !== newTitle &&
        !newTitle.includes(oldTitle) &&
        !oldTitle.includes(newTitle);

      return {
        ...current,
        targetTitle: value,
        selectedTitles: shouldResetSelectedTitles ? [] : current.selectedTitles,
      };
    });

    resetTitleIntelligence();
    setJobs([]);
    setLastSearchMeta(null);
    setLastSearchedTitleSignature("");
    setSearchStatus("Target title changed. Run a new search to retrieve fresh results.");
  }

  function startNewSearch() {
    setPreferences((current) => ({
      ...current,
      targetTitle: "",
      selectedTitles: [],
      preferredCompanies: "",
    }));

    resetTitleIntelligence();
    setJobs([]);
    setLastSearchMeta(null);
    setLastSearchedTitleSignature("");
    setTitleStatus("");
    setSearchStatus("New search started. Enter a target title and run search.");
  }

  function toggleModality(modality) {
    setPreferences((current) => {
      const selected = current.modalities.includes(modality);

      return {
        ...current,
        modalities: selected
          ? current.modalities.filter((item) => item !== modality)
          : [...current.modalities, modality],
      };
    });
  }

  function addSelectedTitle(title) {
    const cleanTitle = String(title || "").trim();

    if (!cleanTitle) return;

    setPreferences((current) => {
      if (current.selectedTitles.includes(cleanTitle)) return current;

      return {
        ...current,
        selectedTitles: [...current.selectedTitles, cleanTitle],
      };
    });
  }

  function removeSelectedTitle(title) {
    setPreferences((current) => ({
      ...current,
      selectedTitles: current.selectedTitles.filter((item) => item !== title),
    }));
  }

  function addTypedTitle() {
    const typedTitle = preferences.targetTitle.trim();

    if (!typedTitle) {
      setTitleStatus("Enter a title before adding it.");
      return;
    }

    addSelectedTitle(typedTitle);
    setTitleStatus(`Added "${typedTitle}" to selected target titles.`);
  }

  async function requestEmailVerification() {
    if (!emailIsValid(digestEmail)) {
      setEmailVerifyStatus("Please enter a valid email address first.");
      return;
    }

    setEmailVerifyStatus("Sending verification email...");

    try {
      const response = await fetch("/api/request-email-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: digestEmail,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Could not send verification email."));
      }

      setEmailVerifyStatus(
        "Verification email sent. Check your inbox and click the confirmation link."
      );
    } catch (error) {
      setEmailVerifyStatus(`Verification failed: ${error.message}`);
    }
  }

  async function analyzeTitleWithOpenAI() {
    const targetTitle = preferences.targetTitle.trim();

    if (!targetTitle) {
      setTitleStatus("Enter a target job title first.");
      return;
    }

    setTitleStatus("Generating stronger title recommendations with OpenAI...");

    try {
      const response = await fetch("/api/title-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetTitle,
          selectedTitles: preferences.selectedTitles,
          industry: preferences.industry,
          location: preferences.location,
          preferredCompanies: preferences.preferredCompanies,
          jobTitles: jobs.map((job) => job.title),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "OpenAI title analysis failed."));
      }

      setTitleIntelligence({
        normalizedTitle: data.normalizedTitle,
        confidence: data.confidence,
        recommendedTitles: data.recommendedTitles || fallbackRecommendedTitles,
        titleScores: data.titleScores || {},
        recommendationReason: data.recommendationReason || "",
        source: data.source || "openai",
        sourceTargetTitle: targetTitle,
      });

      setPreferences((current) => {
        const nextTitles = [...current.selectedTitles];

        if (data.normalizedTitle && !nextTitles.includes(data.normalizedTitle)) {
          nextTitles.push(data.normalizedTitle);
        }

        return {
          ...current,
          selectedTitles: nextTitles,
        };
      });

      setTitleStatus(
        "OpenAI title recommendations updated. Normalized title added to selected titles."
      );
    } catch (error) {
      setTitleStatus(`OpenAI title analysis failed: ${error.message}`);
    }
  }

  function getCurrentRecommendedTitles() {
    const currentTarget = normalizeTitle(preferences.targetTitle);
    const recommendationTarget = normalizeTitle(titleIntelligence.sourceTargetTitle);

    if (!currentTarget || currentTarget !== recommendationTarget) {
      return [];
    }

    return titleIntelligence.recommendedTitles || [];
  }

  function buildSearchTitleSet() {
    const currentTargetTitle = preferences.targetTitle.trim();

    return Array.from(
      new Set([
        currentTargetTitle,
        ...preferences.selectedTitles,
      ].filter(Boolean))
    );
  }

  function buildTitleSignature(titles) {
    return titles
      .map((title) => normalizeTitle(title))
      .sort()
      .join("|");
  }

  async function runSearch() {
    const titlesToSearch = buildSearchTitleSet();

    if (titlesToSearch.length === 0) {
      setSearchStatus("Add at least one target title before running search.");
      return;
    }

    const titleSignature = buildTitleSignature(titlesToSearch);
    const recommendedTitles = getCurrentRecommendedTitles();

    if (titleSignature !== lastSearchedTitleSignature) {
      setJobs([]);
      setLastSearchMeta(null);
    }

    setSearchStatus("Searching live job sources and ranking fresh results with embeddings...");

    try {
      const response = await fetch("/api/search-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({
          searchNonce: `${Date.now()}-${Math.random()}`,
          preferences: {
            ...preferences,
            selectedTitles: titlesToSearch,
          },
          weights,
          recommendedTitles,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Job search failed."));
      }

      setJobs(data.jobs || []);
      setLastSearchMeta(data.meta || null);
      setLastSearchedTitleSignature(titleSignature);
      setTitleIntelligence((current) => ({
        ...current,
        titleScores: data.titleScores || current.titleScores,
      }));

      const sourceText = data.meta?.sources?.length
        ? ` from ${data.meta.sources.join(", ")}`
        : "";

      setSearchStatus(
        `Fresh search complete. Ranked ${data.jobs?.length || 0} jobs from ${
          data.meta?.retrievedCount || 0
        } candidates${sourceText}.`
      );
    } catch (error) {
      setSearchStatus(`Search failed: ${error.message}`);
    }
  }

  const rankedJobs = useMemo(() => jobs, [jobs]);

  async function sendDigest() {
    if (!emailIsValid(digestEmail)) {
      setDigestStatus("Please enter a valid email address.");
      return;
    }

    try {
      const response = await fetch("/api/send-digest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: digestEmail,
          preferences,
          recommendedTitles: getCurrentRecommendedTitles(),
          jobs: rankedJobs.slice(0, 10),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Failed to send digest."));
      }

      setDigestStatus("Digest sent successfully with ranked jobs.");
    } catch (error) {
      setDigestStatus(`Failed to send digest: ${error.message}`);
    }
  }

  async function subscribeDailyDigest() {
    if (!emailIsValid(digestEmail)) {
      setSubscribeStatus("Please enter a valid email address before subscribing.");
      return;
    }

    try {
      const response = await fetch("/api/subscribe-digest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: digestEmail,
          preferences,
          weights,
          recommendedTitles: getCurrentRecommendedTitles(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Subscription failed."));
      }

      setSubscribeStatus(
        "Subscribed. Daily ranked job updates will be sent to this confirmed email."
      );
    } catch (error) {
      setSubscribeStatus(`Subscription failed: ${error.message}`);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Intelligent opportunity ranking</p>
        <h1>Job Search Smarter</h1>
        <p>
          Search live job sources, rank opportunities by your preferences, and
          use OpenAI embeddings to compare titles beyond keyword matching.
        </p>
      </section>

      <section className="grid">
        <div className="card">
          <div className="section-title">
            <Mail size={20} />
            <h2>Email Digest</h2>
          </div>

          <label htmlFor="digest-email">Recipient Email</label>

          <input
            id="digest-email"
            type="email"
            placeholder="Enter recipient email"
            value={digestEmail}
            onChange={(event) => setDigestEmail(event.target.value)}
          />

          <button
            className="secondary-button"
            type="button"
            onClick={requestEmailVerification}
          >
            <ShieldCheck size={16} />
            Verify Email First
          </button>

          <button className="primary-button" onClick={sendDigest}>
            Send Digest Now
          </button>

          <button
            className="secondary-button"
            type="button"
            onClick={subscribeDailyDigest}
          >
            <Bell size={16} />
            Subscribe to Daily Updates
          </button>

          {emailVerifyStatus && <p className="status">{emailVerifyStatus}</p>}
          {digestStatus && <p className="status">{digestStatus}</p>}
          {subscribeStatus && <p className="status">{subscribeStatus}</p>}

          <p className="helper">
            Users must verify their email before sending a digest or subscribing.
          </p>
        </div>

        <div className="card">
          <div className="section-title">
            <Sparkles size={20} />
            <h2>Target Job Titles</h2>
          </div>

          <label htmlFor="target-title">Enter a Job Title to Analyze</label>

          <input
            id="target-title"
            type="text"
            placeholder="Example: Data Analyst, Project Manager, Nurse, Research Scientist"
            value={preferences.targetTitle}
            onChange={(event) => handleTargetTitleChange(event.target.value)}
          />

          <div className="button-row">
            <button className="primary-button" onClick={analyzeTitleWithOpenAI}>
              <Wand2 size={16} />
              Analyze Title with OpenAI
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={addTypedTitle}
            >
              Add Entered Title
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={startNewSearch}
            >
              <RefreshCcw size={16} />
              Start New Search
            </button>
          </div>

          {titleStatus && <p className="status">{titleStatus}</p>}

          <div className="status">
            {titleIntelligence.normalizedTitle ? (
              <>
                LinkedIn-style normalized title:{" "}
                <strong>{titleIntelligence.normalizedTitle}</strong>{" "}
                <span>({titleIntelligence.confidence}% confidence)</span>
              </>
            ) : (
              "Enter a title and run analysis to generate related titles and embedding similarity scores."
            )}
          </div>

          {titleIntelligence.recommendationReason && (
            <p className="helper">{titleIntelligence.recommendationReason}</p>
          )}

          <label>Selected Target Titles</label>

          <div className="button-row">
            {preferences.selectedTitles.length === 0 ? (
              <p className="helper">No selected titles yet.</p>
            ) : (
              preferences.selectedTitles.map((title) => (
                <button
                  type="button"
                  key={title}
                  className="chip selected removable-chip"
                  onClick={() => removeSelectedTitle(title)}
                  title="Click to remove"
                >
                  {title}
                  <X size={14} />
                </button>
              ))
            )}
          </div>

          <label>AI Generated Related Titles</label>

          <div className="button-row">
            {getCurrentRecommendedTitles().length === 0 ? (
              <p className="helper">
                Run title analysis for the current target title to generate fresh related titles.
              </p>
            ) : (
              getCurrentRecommendedTitles().map((title) => {
                const selected = preferences.selectedTitles.includes(title);

                return (
                  <button
                    type="button"
                    key={title}
                    className={selected ? "chip selected" : "chip"}
                    onClick={() =>
                      selected ? removeSelectedTitle(title) : addSelectedTitle(title)
                    }
                  >
                    {selected ? "✓ " : "+ "}
                    {title}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            <DollarSign size={20} />
            <h2>Compensation Preference</h2>
          </div>

          <div className="two-column">
            <div>
              <label htmlFor="min-salary">Minimum Salary</label>
              <input
                id="min-salary"
                placeholder="$90,000"
                value={preferences.minSalary}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    minSalary: event.target.value,
                  })
                }
              />
            </div>

            <div>
              <label htmlFor="max-salary">Maximum Salary</label>
              <input
                id="max-salary"
                placeholder="$170,000"
                value={preferences.maxSalary}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    maxSalary: event.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            <BriefcaseBusiness size={20} />
            <h2>Job Preferences</h2>
          </div>

          <label>Modality</label>

          <div className="button-row">
            {modalities.map((modality) => (
              <button
                type="button"
                key={modality}
                className={
                  preferences.modalities.includes(modality)
                    ? "chip selected"
                    : "chip"
                }
                onClick={() => toggleModality(modality)}
              >
                {modality}
              </button>
            ))}
          </div>

          <label htmlFor="industry">Industry</label>

          <select
            id="industry"
            value={preferences.industry}
            onChange={(event) =>
              setPreferences({
                ...preferences,
                industry: event.target.value,
              })
            }
          >
            <option>Any</option>
            {industries.map((industry) => (
              <option key={industry}>{industry}</option>
            ))}
          </select>

          <label htmlFor="location">
            <MapPin size={16} />
            Location Preference
          </label>

          <input
            id="location"
            placeholder="Enter preferred cities, states, or regions"
            value={preferences.location}
            onChange={(event) =>
              setPreferences({
                ...preferences,
                location: event.target.value,
              })
            }
          />
        </div>

        <div className="card">
          <div className="section-title">
            <Building2 size={20} />
            <h2>Company Preference</h2>
          </div>

          <label htmlFor="preferred-companies">Preferred Company Names</label>

          <input
            id="preferred-companies"
            type="text"
            placeholder="Example: OpenAI, Google, Microsoft"
            value={preferences.preferredCompanies}
            onChange={(event) =>
              setPreferences({
                ...preferences,
                preferredCompanies: event.target.value,
              })
            }
          />

          <p className="helper">
            Enter one or more companies. Matching employers rank higher, but
            other jobs are still included.
          </p>
        </div>

        <div className="card">
          <div className="section-title">
            <Plane size={20} />
            <h2>Travel Preference</h2>
          </div>

          <label>Travel Optimization</label>

          <div className="button-row">
            <button
              type="button"
              className={preferences.minimizeTravel ? "chip selected" : "chip"}
              onClick={() =>
                setPreferences({
                  ...preferences,
                  minimizeTravel: !preferences.minimizeTravel,
                })
              }
            >
              {preferences.minimizeTravel
                ? "✓ Minimal Travel Preferred"
                : "+ Prefer Minimal Travel"}
            </button>
          </div>

          <div className="slider-row">
            <div className="slider-label">
              <span>Maximum Preferred Travel</span>
              <strong>{preferences.maxTravelPercent}%</strong>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={preferences.maxTravelPercent}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  maxTravelPercent: Number(event.target.value),
                })
              }
            />
          </div>

          <p className="helper">
            Jobs that mention heavy travel are ranked lower when minimal travel
            is preferred.
          </p>
        </div>

        <div className="card wide">
          <div className="section-title">
            <SlidersHorizontal size={20} />
            <h2>Optimization Weights</h2>
          </div>

          <p className="helper">
            Each slider is independent. Users can set every category to 100% if
            all factors are critical.
          </p>

          {[
            ["compensation", "Compensation"],
            ["modality", "Modality"],
            ["industry", "Industry Match"],
            ["titleMatch", "Title Match"],
            ["location", "Location Match"],
            ["skillMatch", "Skill Match"],
            ["travel", "Minimal Travel"],
            ["company", "Company Match"],
          ].map(([key, label]) => (
            <div className="slider-row" key={key}>
              <div className="slider-label">
                <span>{label}</span>
                <strong>{weights[key]}%</strong>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights[key]}
                onChange={(event) =>
                  setWeights({
                    ...weights,
                    [key]: Number(event.target.value),
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section className="card results">
        <div className="results-header">
          <div>
            <h2>Ranked Jobs</h2>
            <p className="helper">
              Only live retrieved jobs are shown. Changing the target title clears stale results and forces a fresh search.
              {lastSearchMeta?.sources?.length
                ? ` Sources: ${lastSearchMeta.sources.join(", ")}.`
                : ""}
            </p>
          </div>

          <button className="primary-button compact-button" onClick={runSearch}>
            <Search size={16} />
            Run Search
          </button>
        </div>

        {searchStatus && <p className="status">{searchStatus}</p>}

        {rankedJobs.length === 0 ? (
          <p className="helper">
            No jobs loaded yet. Enter a target title and run a search to retrieve
            live results.
          </p>
        ) : (
          <div className="job-list">
            {rankedJobs.map((job, index) => (
              <article
                className="job-card"
                key={`${job.source}-${job.company}-${job.title}-${job.applyUrl || index}`}
              >
                <div>
                  <h3>{job.title}</h3>
                  <p>{job.company}</p>
                  <span>{job.industry || "General"}</span>
                  {job.source && <span>{job.source}</span>}
                  {job.travel && <span>Travel: {job.travel}</span>}
                  {job.companyScore !== undefined && (
                    <span>Company match: {job.companyScore}/100</span>
                  )}
                  {job.applyUrlSource && (
                    <span>Apply link: {job.applyUrlSource}</span>
                  )}
                  {job.description && (
                    <p className="job-description">{job.description}</p>
                  )}
                  {hasRealApplyUrl(job) && (
                    <a
                      className="apply-link"
                      href={job.applyUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Apply Now <ExternalLink size={14} />
                    </a>
                  )}
                </div>

                <div className="job-meta">
                  <strong>{job.score}/100</strong>
                  <p>
                    {job.compensation
                      ? `$${job.compensation.toLocaleString()}`
                      : "Salary not listed"}{" "}
                    · {job.modality || "Not listed"} ·{" "}
                    {job.location || "Not listed"}
                  </p>
                  <p>
                    Embedding title similarity: {job.titleMatchScore ?? "N/A"}/100
                  </p>
                  {job.travelScore !== undefined && (
                    <p>Travel score: {job.travelScore}/100</p>
                  )}
                  {job.companyScore !== undefined && (
                    <p>Company score: {job.companyScore}/100</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
