import fs from "fs";
import path from "path";

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("Could not find src/App.jsx. Run this from your project root.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

function patchResultsLinkArea() {
  // Replace generic Apply Now link label with dynamic label/note block where possible.
  const oldBlock = `{hasRealApplyUrl(job) && (
                    <a
                      className="apply-link"
                      href={job.applyUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Apply Now <ExternalLink size={14} />
                    </a>
                  )}`;

  const newBlock = `{hasRealApplyUrl(job) && (
                    <>
                      <a
                        className="apply-link"
                        href={job.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {job.applyLinkLabel || "Apply on company site"} <ExternalLink size={14} />
                      </a>
                      {job.applyLinkNote && (
                        <p className="helper" style={{ marginTop: "8px" }}>
                          {job.applyLinkNote}
                        </p>
                      )}
                    </>
                  )}

                  {!hasRealApplyUrl(job) && job.applyLinkNote && (
                    <p className="helper" style={{ marginTop: "8px", fontWeight: 700 }}>
                      {job.applyLinkNote}
                    </p>
                  )}`;

  if (app.includes(oldBlock)) {
    app = app.replace(oldBlock, newBlock);
    console.log("Patched result Apply link label/note block.");
  } else {
    console.warn("Could not find exact Apply Now block. You may need to add job.applyLinkLabel/job.applyLinkNote manually.");
  }
}

patchResultsLinkArea();

fs.writeFileSync(appPath, app, "utf8");
console.log("Done. Run npm run build.");
