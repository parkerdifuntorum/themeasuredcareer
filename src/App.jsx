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
  "Power Systems Engineer",
  "SCADA Engineer",
  "Data Engineer",
  "AI Engineer",
  "Cybersecurity Engineer",
  "Energy Market Analyst",
];

const sampleJobs = [
  {
    title: "Senior Power Systems Data Engineer",
    company: "Grid Analytics Co.",
    compensation: 165000,
    modality: "Remote",
    industry: "Utilities / Energy",
    location: "Sacramento, CA",
    skillMatch: 94,
  },
  {
    title: "Distribution Planning Engineer",
    company: "Regional Utility",
    compensation: 142000,
    modality: "Hybrid",
    industry: "Engineering",
    location: "South Lake Tahoe, CA",
    skillMatch: 88,
  },
  {
    title: "Market Risk Data Analyst",
    company: "Energy Market Operator",
    compensation: 155000,
    modality: "Hybrid",
    industry: "Finance",
    location: "Folsom, CA",
    skillMatch: 84,
  },
  {
    title: "OT Cybersecurity Engineer",
    company: "Critical Infrastructure Security Lab",
    compensation: 172000,
    modality: "Remote",
    industry: "Cybersecurity",
    location: "Remote",
    skillMatch: 90,
  },
  {
    title: "EMS Applications Engineer",
    company: "Transmission Operations Platform",
    compensation: 158000,
    modality: "Hybrid",
    industry: "Utilities / Energy",
    location: "Rocklin, CA",
    skillMatch: 96,
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

  const [preferences, setPreferences] = useState({
    targetTitle: "",
    minSalary: "",
    maxSalary: "",
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
          jobTitles: sampleJobs.map((job) => job.title),
        }),
      });

      if (!response.ok) {
        throw new Error("OpenAI title analysis failed.");
      }

      const data = await response.json();

      setTitleIntelligence({
        normalizedTitle: data.normalizedTitle,
        confidence: data.confidence,
        recommendedTitles: data.recommendedTitles,
        titleScores: data.titleScores,
        source: data.source || "openai",
      });

      setTitleStatus("OpenAI title analysis complete.");
    } catch (error) {
      setTitleStatus("OpenAI title analysis failed. Check OPENAI_API_KEY in Vercel.");
    }
  }

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
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send digest");
      }

      setDigestStatus("Digest sent successfully.");
    } catch (error) {
      setDigestStatus("Failed to send digest.");
    }
  }

  const rankedJobs = useMemo(() => {
    const minSalary = parseSalary(preferences.minSalary);
    const maxSalary = parseSalary(preferences.maxSalary);
    const totalWeight =
      Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;

    return sampleJobs
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
          job.location.toLowerCase().includes(locationPreference)
            ? 100
            : 55;

        const titleMatchScore =
          titleIntelligence.titleScores[job.title] ??
          (preferences.targetTitle ? 50 : 75);

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
  }, [preferences, weights, titleIntelligence]);

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Intelligent opportunity ranking</p>
        <h1>Job Search Smarter</h1>
        <p>
          Rank jobs based on compensation, work modality, industry fit, location
          preferences, OpenAI embedding-based title similarity, and skills match.
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
            <h2>Target Job Title</h2>
          </div>

          <label htmlFor="target-title">Desired Job Title</label>

          <input
            id="target-title"
            type="text"
            placeholder="Example: EMS Engineer, Data Engineer, Grid Cybersecurity"
            value={preferences.targetTitle}
            onChange={(event) =>
              setPreferences({
                ...preferences,
                targetTitle: event.target.value,
              })
            }
          />

          <button className="primary-button" onClick={analyzeTitleWithOpenAI}>
            <Wand2 size={16} />
            Analyze Title with OpenAI
          </button>

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

          <label>AI Generated Related Titles</label>

          <div className="button-row">
            {titleIntelligence.recommendedTitles.map((title) => (
              <button
                type="button"
                key={title}
                className="chip"
                onClick={() =>
                  setPreferences({
                    ...preferences,
                    targetTitle: title,
                  })
                }
              >
                {title}
              </button>
            ))}
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
                placeholder="$120,000"
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
                placeholder="$180,000"
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
        <h2>Ranked Jobs</h2>

        <div className="job-list">
          {rankedJobs.map((job) => (
            <article className="job-card" key={`${job.company}-${job.title}`}>
              <div>
                <h3>{job.title}</h3>
                <p>{job.company}</p>
                <span>{job.industry}</span>
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
