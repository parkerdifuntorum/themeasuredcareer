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
  "Software Engineer",
  "Project Manager",
  "Business Analyst",
  "Product Manager",
  "Research Analyst",
  "Operations Manager",
  "Cybersecurity Analyst",
];

const starterJobs = [
  {
    title: "Data Analyst",
    company: "Business Intelligence Group",
    compensation: 112000,
    modality: "Remote",
    industry: "Data / AI",
    location: "Remote",
    skillMatch: 88,
    source: "Starter Result",
    description:
      "Analyze business performance data, build dashboards, write SQL queries, and translate operational data into decision-ready insights.",
    applyUrl: "https://themeasuredcareer.com/jobs/data-analyst",
  },
  {
    title: "Software Engineer",
    company: "Cloud Applications Co.",
    compensation: 155000,
    modality: "Hybrid",
    industry: "Software",
    location: "Sacramento, CA",
    skillMatch: 84,
    source: "Starter Result",
    description:
      "Develop full-stack application features, integrate APIs, improve platform reliability, and collaborate with product and design teams.",
    applyUrl: "https://themeasuredcareer.com/jobs/software-engineer",
  },
  {
    title: "Healthcare Data Analyst",
    company: "Health Systems Analytics",
    compensation: 118000,
    modality: "Remote",
    industry: "Healthcare",
    location: "Remote",
    skillMatch: 86,
    source: "Starter Result",
    description:
      "Work with clinical, claims, and operational datasets to support reporting, population health analysis, and healthcare process improvement.",
    applyUrl: "https://themeasuredcareer.com/jobs/healthcare-data-analyst",
  },
  {
    title: "Financial Analyst",
    company: "Capital Planning Partners",
    compensation: 105000,
    modality: "Hybrid",
    industry: "Finance",
    location: "Folsom, CA",
    skillMatch: 82,
    source: "Starter Result",
    description:
      "Support budgeting, forecasting, financial modeling, variance analysis, and executive reporting for strategic planning teams.",
    applyUrl: "https://themeasuredcareer.com/jobs/financial-analyst",
  },
  {
    title: "Research Engineer",
    company: "Applied Research Lab",
    compensation: 132000,
    modality: "Hybrid",
    industry: "Research",
    location: "Davis, CA",
    skillMatch: 89,
    source: "Starter Result",
    description:
      "Design experiments, build prototypes, analyze technical results, and support applied research projects across engineering domains.",
    applyUrl: "https://themeasuredcareer.com/jobs/research-engineer",
  },
];

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseSalary(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/[$,\s]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function App() {
  const [digestEmail, setDigestEmail] = useState("");
  const [digestStatus, setDigestStatus] = useState("");
  const [titleStatus, setTitleStatus] = useState("");
  const [searchStatus, setSearchStatus] = useState("");

  const [jobs, setJobs] = useState(starterJobs);

  const [preferences, setPreferences] = useState({
    targetTitle: "",
    selectedTitles: [],
    minSalary: "$90,000",
    maxSalary: "$170,000",
    modalities: [],
    industry: "Any",
    location: "",
  });

  const [weights, setWeights] = useState({
    compensation: 70,
    modality: 70,
    industry: 60,
    titleMatch: 75,
    location: 50,
    skillMatch: 75,
  });

  const [titleIntelligence, setTitleIntelligence] = useState({
    normalizedTitle: "",
    confidence: 0,
    recommendedTitles: fallbackRecommendedTitles,
    titleScores: {},
    source: "default",
  });

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
    setPreferences((current) => {
      if (current.selectedTitles.includes(title)) {
        return current;
      }

      return {
        ...current,
        selectedTitles: [...current.selectedTitles, title],
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

  async function analyzeTitleWithOpenAI() {
    const targetTitle = preferences.targetTitle.trim();

    if (!targetTitle) {
      setTitleStatus("Enter a target job title first.");
      return;
    }

    setTitleStatus("Analyzing title with OpenAI embeddings...");

    try {
      const response = await fetch("/api/title-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetTitle,
          jobTitles: jobs.map((job) => job.title),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "OpenAI title analysis failed.");
      }

      const data = await response.json();

      setTitleIntelligence({
        normalizedTitle: data.normalizedTitle,
        confidence: data.confidence,
        recommendedTitles: data.recommendedTitles,
        titleScores: data.titleScores,
        source: data.source || "openai",
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
        "OpenAI title analysis complete. Normalized title added to selected titles."
      );
    } catch (error) {
      setTitleStatus(`OpenAI title analysis failed: ${error.message}`);
    }
  }

  async function runSearch() {
    const titlesToSearch = [
      ...preferences.selectedTitles,
      preferences.targetTitle.trim(),
    ].filter(Boolean);

    if (titlesToSearch.length === 0) {
      setSearchStatus("Add at least one target title before running search.");
      return;
    }

    setSearchStatus("Searching jobs and updating rankings...");

    try {
      const response = await fetch("/api/search-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preferences: {
            ...preferences,
            selectedTitles: titlesToSearch,
          },
          recommendedTitles: titleIntelligence.recommendedTitles,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Job search failed.");
      }

      const data = await response.json();

      setJobs(data.jobs || []);
      setTitleIntelligence((current) => ({
        ...current,
        titleScores: data.titleScores || current.titleScores,
      }));

      setSearchStatus(`Search complete. Found ${data.jobs?.length || 0} jobs.`);
    } catch (error) {
      setSearchStatus(`Search failed: ${error.message}`);
    }
  }

  const rankedJobs = useMemo(() => {
    const minSalary = parseSalary(preferences.minSalary);
    const maxSalary = parseSalary(preferences.maxSalary);
    const totalWeight =
      Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;

    const selectedTitleText = preferences.selectedTitles.join(" ").toLowerCase();

    return jobs
      .map((job) => {
        let compensationScore = 75;

        if (minSalary && job.compensation < minSalary) {
          compensationScore = Math.max(
            0,
            Math.round((job.compensation / minSalary) * 100)
          );
        } else if (
          minSalary &&
          maxSalary &&
          job.compensation >= minSalary &&
          job.compensation <= maxSalary
        ) {
          compensationScore = 100;
        } else if (maxSalary && job.compensation > maxSalary) {
          compensationScore = 95;
        }

        const modalityScore =
          preferences.modalities.length === 0 ||
          preferences.modalities.includes(job.modality)
            ? 100
            : 40;

        const industryScore =
          preferences.industry === "Any" || preferences.industry === job.industry
            ? 100
            : 45;

        const locationPreference = preferences.location.trim().toLowerCase();
        const locationScore =
          !locationPreference ||
          job.location.toLowerCase().includes(locationPreference) ||
          job.location.toLowerCase() === "remote"
            ? 100
            : 55;

        const openAiScore = titleIntelligence.titleScores[job.title];
        const selectedTitleBonus =
          preferences.selectedTitles.length > 0 &&
          selectedTitleText
            .split(/\s+/)
            .some((word) => word.length > 3 && job.title.toLowerCase().includes(word))
            ? 10
            : 0;

        const titleMatchScore =
          openAiScore !== undefined
            ? Math.min(100, openAiScore + selectedTitleBonus)
            : preferences.selectedTitles.length > 0
              ? 65 + selectedTitleBonus
              : 75;

        const score =
          (compensationScore * weights.compensation +
            modalityScore * weights.modality +
            industryScore * weights.industry +
            titleMatchScore * weights.titleMatch +
            locationScore * weights.location +
            job.skillMatch * weights.skillMatch) /
          totalWeight;

        return {
          ...job,
          titleMatchScore,
          score: Math.round(score),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [jobs, preferences, weights, titleIntelligence]);

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
          recommendedTitles: titleIntelligence.recommendedTitles,
          jobs: rankedJobs.slice(0, 10),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to send digest");
      }

      setDigestStatus("Digest sent successfully with ranked jobs.");
    } catch (error) {
      setDigestStatus(`Failed to send digest: ${error.message}`);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Intelligent opportunity ranking</p>
        <h1>Job Search Smarter</h1>
        <p>
          Search jobs, rank them by your preferences, and use OpenAI embeddings
          to compare titles beyond keyword matching.
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

          <button className="primary-button" onClick={sendDigest}>
            Send Digest
          </button>

          {digestStatus && <p className="status">{digestStatus}</p>}
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
            onChange={(event) =>
              setPreferences({
                ...preferences,
                targetTitle: event.target.value,
              })
            }
          />

          <div className="button-row">
            <button className="primary-button" onClick={analyzeTitleWithOpenAI}>
              <Wand2 size={16} />
              Analyze Title with OpenAI
            </button>

            <button className="secondary-button" type="button" onClick={addTypedTitle}>
              Add Entered Title
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
            {titleIntelligence.recommendedTitles.map((title) => {
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
            })}
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
              Results update after each search and automatically re-rank when
              preferences or weights change.
            </p>
          </div>

          <button className="primary-button compact-button" onClick={runSearch}>
            <Search size={16} />
            Run Search
          </button>
        </div>

        {searchStatus && <p className="status">{searchStatus}</p>}

        <div className="job-list">
          {rankedJobs.map((job) => (
            <article className="job-card" key={`${job.company}-${job.title}`}>
              <div>
                <h3>{job.title}</h3>
                <p>{job.company}</p>
                <span>{job.industry}</span>
                {job.source && <span>{job.source}</span>}
                {job.description && <p className="job-description">{job.description}</p>}
                {job.applyUrl && (
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
                  ${job.compensation.toLocaleString()} · {job.modality} ·{" "}
                  {job.location}
                </p>
                <p>Embedding title similarity: {job.titleMatchScore}/100</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
