import fs from "fs";
import path from "path";

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("Could not find src/App.jsx. Run this from your project root.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

function replaceOnce(search, replacement, label) {
  if (!app.includes(search)) {
    console.warn(`Skipped ${label}: pattern not found.`);
    return false;
  }

  app = app.replace(search, replacement);
  console.log(`Applied ${label}`);
  return true;
}

function insertAfter(search, insertion, label) {
  if (!app.includes(search)) {
    console.warn(`Skipped ${label}: anchor not found.`);
    return false;
  }

  app = app.replace(search, `${search}${insertion}`);
  console.log(`Applied ${label}`);
  return true;
}

function insertBefore(search, insertion, label) {
  if (!app.includes(search)) {
    console.warn(`Skipped ${label}: anchor not found.`);
    return false;
  }

  app = app.replace(search, `${insertion}${search}`);
  console.log(`Applied ${label}`);
  return true;
}

function ensureImportIcon() {
  if (!app.includes("LockKeyhole")) {
    app = app.replace(
      /from "lucide-react";/,
      (match) => match.replace("}", "  LockKeyhole,\n}")
    );
  }
}

ensureImportIcon();

if (!app.includes("lastCompletedSearch")) {
  const jobsStatePattern = /const \[lastSearchMeta, setLastSearchMeta\] = useState\(null\);/;
  if (jobsStatePattern.test(app)) {
    app = app.replace(
      jobsStatePattern,
      `const [lastSearchMeta, setLastSearchMeta] = useState(null);
  const [lastCompletedSearch, setLastCompletedSearch] = useState(null);`
    );
    console.log("Added lastCompletedSearch state.");
  } else {
    console.warn("Could not add lastCompletedSearch state automatically.");
  }
}

if (!app.includes("EMAIL IS NOT REQUIRED TO RUN A SEARCH")) {
  const heroClose = `</section>

      <section className="grid">`;

  insertBefore(
    heroClose,
    `
        <div
          className="card"
          style={{
            border: "3px solid #172033",
            background: "#fff8dc",
            marginTop: "24px",
          }}
        >
          <div className="section-title">
            ${app.includes("<LockKeyhole") ? "" : "<LockKeyhole size={24} />"}
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900 }}>
              EMAIL IS NOT REQUIRED TO RUN A SEARCH
            </h2>
          </div>
          <p style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>
            You can search and rank jobs without providing an email address.
            Email is only required if you want to verify your address and subscribe
            to daily digest updates for a completed search.
          </p>
        </div>
`,
    "big email optional notice"
  );
}

replaceOnce(
  `setLastSearchMeta(null);`,
  `setLastSearchMeta(null);
    setLastCompletedSearch(null);`,
  "clear completed search with stale results"
);

// Patch runSearch after successful setLastSearchMeta.
if (!app.includes("completedAt: new Date().toISOString()")) {
  const successPattern = `setLastSearchMeta(data.meta || null);`;

  insertAfter(
    successPattern,
    `
      setLastCompletedSearch({
        preferences: {
          ...preferences,
          selectedTitles: titlesToSearch,
        },
        weights,
        recommendedTitles,
        titleSignature,
        completedAt: new Date().toISOString(),
        resultCount: data.jobs?.length || 0,
      });`,
    "save completed search after successful search"
  );
}

// Make digest require completed search
if (!app.includes("Run a search first, then send a digest for that completed search.")) {
  const digestGuardAnchor = `if (!emailIsValid(digestEmail)) {
      setDigestStatus("Please enter a valid email address.");
      return;
    }`;

  insertAfter(
    digestGuardAnchor,
    `

    if (!lastCompletedSearch) {
      setDigestStatus("Run a search first, then send a digest for that completed search.");
      return;
    }`,
    "send digest requires completed search"
  );
}

// Make send digest use completed search if possible.
app = app.replace(
  /preferences,\s*\n\s*recommendedTitles: [^,\n]+,/,
  `preferences: lastCompletedSearch?.preferences || preferences,
          recommendedTitles: lastCompletedSearch?.recommendedTitles || getCurrentRecommendedTitles?.() || titleIntelligence.recommendedTitles,`
);

// Patch subscription function guard.
if (!app.includes("Subscriptions are tied to the completed search results and settings.")) {
  const subscribeGuardAnchor = `if (!emailIsValid(digestEmail)) {
      setSubscribeStatus("Please enter a valid email address before subscribing.");
      return;
    }`;

  insertAfter(
    subscribeGuardAnchor,
    `

    if (!lastCompletedSearch) {
      setSubscribeStatus("Run a search first. Subscriptions are tied to the completed search results and settings.");
      return;
    }`,
    "subscribe requires completed search"
  );
}

// Replace subscribe payload.
app = app.replace(
  /body: JSON\.stringify\(\{\s*email: digestEmail,\s*preferences,\s*weights,\s*recommendedTitles: [^,]+,\s*\}\),/s,
  `body: JSON.stringify({
          email: digestEmail,
          searchSubscription: {
            preferences: lastCompletedSearch.preferences,
            weights: lastCompletedSearch.weights,
            recommendedTitles: lastCompletedSearch.recommendedTitles,
            titleSignature: lastCompletedSearch.titleSignature,
            completedAt: lastCompletedSearch.completedAt,
          },
          latestJobs: rankedJobs.slice(0, 10),
        }),`
);

// Change subscribe button text.
app = app.replace(/Subscribe to Daily Updates/g, "Subscribe to This Search");

// Add disabled to subscribe button if recognizable.
app = app.replace(
  /<button\s+className="secondary-button"\s+type="button"\s+onClick=\{subscribeDailyDigest\}\s*>/g,
  `<button
            className="secondary-button"
            type="button"
            onClick={subscribeDailyDigest}
            disabled={!lastCompletedSearch}
            title={!lastCompletedSearch ? "Run a search first" : "Subscribe to this completed search"}
          >`
);

// Add clear note in Email Digest card.
if (!app.includes("Email is optional for search. Required only for daily digest subscription.")) {
  const emailCardAnchor = `<label htmlFor="digest-email">Recipient Email</label>`;
  insertBefore(
    emailCardAnchor,
    `          <p
            className="status"
            style={{
              fontWeight: 900,
              fontSize: "1.05rem",
              textTransform: "uppercase",
            }}
          >
            Email is optional for search. Required only for daily digest subscription.
          </p>

`,
    "email digest note"
  );
}

// Improve completed search success text.
app = app.replace(
  /`Fresh search complete\. Ranked \$\{data\.jobs\?\.length \|\| 0\} jobs from \$\{\s*data\.meta\?\.retrievedCount \|\| 0\s*\} candidates\$\{sourceText\}\.`/s,
  "`Fresh search complete. Ranked ${data.jobs?.length || 0} jobs from ${data.meta?.retrievedCount || 0} candidates${sourceText}. You can now subscribe to this exact completed search.`"
);

fs.writeFileSync(appPath, app, "utf8");
console.log("Done. Now run: npm run build");
