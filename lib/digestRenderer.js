export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatMoney(value) {
  if (!Number.isFinite(Number(value))) return "Not listed";
  return `$${Number(value).toLocaleString()}`;
}

export function hasRealApplyUrl(job) {
  return (
    job?.applyUrl &&
    typeof job.applyUrl === "string" &&
    job.applyUrl.startsWith("http") &&
    !job.applyUrl.includes("themeasuredcareer.com") &&
    !job.applyUrl.includes("google.com/search") &&
    !job.applyUrl.includes("htidocid") &&
    !job.applyUrl.includes("adzuna.")
  );
}

function renderApplyButton(job) {
  if (!hasRealApplyUrl(job)) {
    return `
      <p style="margin:8px 0 0;color:#b42318;font-size:13px;font-weight:700;">
        No safe company application link found. Aggregator links are hidden to reduce spam/tracking exposure.
      </p>
    `;
  }

  const label = job.applyLinkLabel || "Apply on company site";
  const note =
    job.applyLinkNote ||
    "This link avoids aggregator redirects when possible.";

  return `
    <a href="${escapeHtml(job.applyUrl)}" style="display:inline-block;background:#172033;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;">
      ${escapeHtml(label)}
    </a>
    <p style="margin:8px 0 0;color:#667085;font-size:12px;line-height:1.4;">
      ${escapeHtml(note)}
    </p>
  `;
}

export function renderJobRows(jobs = []) {
  if (!jobs.length) {
    return `<p style="color:#667085;">No ranked jobs were included. Run a search first, then send the digest again.</p>`;
  }

  return jobs.map((job, index) => `
    <tr>
      <td style="padding:18px;border-bottom:1px solid #e5e7eb;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#667085;font-weight:700;">
          Rank #${index + 1} · Match Score ${job.score ?? "N/A"}/100
        </div>
        <h2 style="margin:6px 0 4px;font-size:18px;color:#172033;">${escapeHtml(job.title)}</h2>
        <p style="margin:0 0 8px;color:#475467;font-weight:700;">${escapeHtml(job.company)}</p>
        <p style="margin:0 0 8px;color:#667085;">
          ${formatMoney(job.compensation)} · ${escapeHtml(job.modality || "Not listed")} · ${escapeHtml(job.location || "Not listed")} · ${escapeHtml(job.industry || "General")}
        </p>
        <p style="margin:0 0 12px;color:#344054;line-height:1.5;">${escapeHtml(job.description || "No description provided.")}</p>
        ${renderApplyButton(job)}
      </td>
    </tr>
  `).join("");
}

export function renderDigestHtml({
  title = "Your Ranked Jobs Digest",
  subtitle = "Ranked opportunities based on your selected preferences.",
  targetTitle = "your selected job preferences",
  recommendedTitles = [],
  jobs = [],
}) {
  return `
    <div style="background:#f5f7fb;padding:24px;font-family:Arial,sans-serif;">
      <div style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#172033;color:#ffffff;padding:28px;">
          <p style="margin:0 0 8px;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:700;">Job Search Smarter</p>
          <h1 style="margin:0;font-size:28px;">${escapeHtml(title)}</h1>
          <p style="margin:10px 0 0;color:#d0d5dd;">${escapeHtml(subtitle)}</p>
        </div>
        <div style="padding:22px;">
          <p style="margin:0 0 8px;"><strong>Target titles:</strong> ${escapeHtml(targetTitle)}</p>
          <p style="margin:0 0 18px;"><strong>Recommended related titles:</strong> ${escapeHtml(recommendedTitles.join(", ") || "None selected")}</p>
          <p style="margin:0 0 18px;color:#667085;font-size:13px;">Aggregator links are suppressed. If an exact role application URL cannot be confirmed, the button may open the company's careers page instead.</p>
          <table style="width:100%;border-collapse:collapse;">${renderJobRows(jobs)}</table>
        </div>
      </div>
    </div>
  `;
}
