
import React, { useMemo, useState } from "react";
import { Mail, SlidersHorizontal, MapPin, BriefcaseBusiness, DollarSign } from "lucide-react";
import { createRoot } from "react-dom/client";
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

const defaultWeights = {
  compensation: 70,
  modality: 70,
  industry: 60,
  titleMatch: 75,
  location: 50,
  skillMatch: 75,
};

const emptyWeights = {
  compensation: "",
  modality: "",
  industry: "",
  titleMatch: "",
  location: "",
  skillMatch: "",
};

const sampleJobs = [
  {
    title: "Senior Power Systems Data Engineer",
    company: "Grid Analytics Co.",
    compensation: 165000,
    modality: "Remote",
    industry: "Utilities / Energy",
    location: "Sacramento, CA",
    titleMatch: 96,
    skillMatch: 94,
  },
  {
    title: "Distribution Planning Engineer",
    company: "Regional Utility",
    compensation: 142000,
    modality: "Hybrid",
    industry: "Engineering",
    location: "South Lake Tahoe, CA",
    titleMatch: 86,
    skillMatch: 88,
  },
  {
    title: "Market Risk Data Analyst",
    company: "Energy Market Operator",
    compensation: 155000,
    modality: "Hybrid",
    industry: "Finance",
    location: "Folsom, CA",
    titleMatch: 78,
    skillMatch: 84,
  },
];

function parseMoney(value) {
  if (!value) return null;
  const parsed = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getEffectiveWeights(weights) {
  const anySelected = Object.values(weights).some((value) => value !== "" && Number(value) > 0);
  if (!anySelected) return defaultWeights;

  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, value === "" ? 0 : Number(value)])
  );
}

function scoreJob(job, preferences, effectiveWeights) {
  const minSalary = parseMoney(preferences.minSalary);
  const maxSalary = parseMoney(preferences.maxSalary);

  let compensationScore = 70;
  if (minSalary && maxSalary) {
    if (job.compensation >= minSalary && job.compensation <= maxSalary) compensationScore = 100;
    else if (job.compensation > maxSalary) compensationScore = 110;
    else compensationScore = Math.max(0, Math.round((job.compensation / minSalary) * 100));
  } else if (minSalary) {
    compensationScore = job.compensation >= minSalary ? 100 : Math.max(0, Math.round((job.compensation / minSalary) * 100));
  }

  const modalityScore =
    preferences.modalities.length === 0 || preferences.modalities.includes(job.modality) ? 100 : 35;

  const industryScore =
    !preferences.industry || preferences.industry === "Any" || preferences.industry === job.industry ? 100 : 45;

  const locationText = preferences.location.trim().toLowerCase();
  const locationScore =
    !locationText || job.location.toLowerCase().includes(locationText) ? 100 : 55;

  const scoringInputs = {
    compensation: compensationScore,
    modality: modalityScore,
    industry: industryScore,
    titleMatch: job.titleMatch,
    location: locationScore,
    skillMatch: job.skillMatch,
  };

  const totalWeight = Object.values(effectiveWeights).reduce((sum, value) => sum + Number(value || 0), 0);

  if (totalWeight === 0) return 0;

  const weightedScore = Object.entries(scoringInputs).reduce((sum, [key, value]) => {
    return sum + value * (effectiveWeights[key] || 0);
  }, 0);

  return Math.round(weightedScore / totalWeight);
}

function App() {
  const [digestEmail, setDigestEmail] = useState("");
  const [preferences, setPreferences] = useState({
    minSalary: "",
    maxSalary: "",
    modalities: [],
    industry: "Any",
    location: "",
  });
  const [weights, setWeights] = useState(emptyWeights);
  const [digestStatus, setDigestStatus] = useState("");

  const effectiveWeights = useMemo(() => getEffectiveWeights(weights), [weights]);
  const usingDefaultWeights = Object.values(weights).every((value) => value === "" || Number(value) === 0);

  const rankedJobs = useMemo(() => {
    return sampleJobs
      .map((job) => ({ ...job, score: scoreJob(job, preferences, effectiveWeights) }))
      .sort((a, b) => b.score - a.score);
  }, [preferences, effectiveWeights]);

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

  function sendDigest() {
    if (!emailIsValid(digestEmail)) {
      setDigestStatus("Please enter a valid recipient email address.");
      return;
    }

    setDigestStatus(`Digest ready to send to ${digestEmail}. Connect this action to your email service/API.`);
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Intelligent opportunity ranking</p>
        <h1>Job Search Smarter</h1>
        <p>
          Rank jobs based on compensation, work modality, industry fit, location preferences,
          title alignment, and skills match.
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
            <DollarSign size={20} />
            <h2>Compensation Preference</h2>
          </div>

          <div className="two-column">
            <div>
              <label htmlFor="min-salary">Minimum Salary</label>
              <input
                id="min-salary"
                inputMode="numeric"
                placeholder="$120,000"
                value={preferences.minSalary}
                onChange={(event) =>
                  setPreferences({ ...preferences, minSalary: event.target.value })
                }
              />
            </div>

            <div>
              <label htmlFor="max-salary">Maximum Salary</label>
              <input
                id="max-salary"
                inputMode="numeric"
                placeholder="$180,000"
                value={preferences.maxSalary}
                onChange={(event) =>
                  setPreferences({ ...preferences, maxSalary: event.target.value })
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
                key={modality}
                className={preferences.modalities.includes(modality) ? "chip selected" : "chip"}
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
              setPreferences({ ...preferences, industry: event.target.value })
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
              setPreferences({ ...preferences, location: event.target.value })
            }
          />
        </div>

        <div className="card wide">
          <div className="section-title">
            <SlidersHorizontal size={20} />
            <h2>Optimization Weights</h2>
          </div>

          <p className="helper">
            Each slider is independent. Users can set every category to 100% if all factors are critical.
            If no weights are selected, Job Search Smarter uses default AI ranking weights.
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
                <strong>{weights[key] === "" ? "Default" : `${weights[key]}%`}</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights[key] === "" ? 0 : weights[key]}
                onChange={(event) =>
                  setWeights({ ...weights, [key]: event.target.value })
                }
              />
            </div>
          ))}

          <div className="weight-note">
            {usingDefaultWeights
              ? "Default AI ranking is currently active."
              : "Custom optimization weights are currently active."}
          </div>
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
                <p>${job.compensation.toLocaleString()} · {job.modality} · {job.location}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
