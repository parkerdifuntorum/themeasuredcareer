# Company Careers Link Fallback Update

Replace/add:

- `lib/applyEnrichment.js`
- `api/search-jobs.js`
- `lib/digestRenderer.js`
- `scripts/patch-app-apply-link-notes.mjs`

Then run:

```powershell
node scripts/patch-app-apply-link-notes.mjs
npm run build
git add .
git commit -m "Use company careers links instead of aggregator apply links"
git push
```

Behavior:
- Adzuna remains a discovery source.
- Adzuna links are never shown to users.
- If exact company/ATS role URL is found, button says something like “Apply on company ATS.”
- If exact role URL is not confirmed, app tries to find the company careers page and uses that instead.
- The link note tells users when it is a company careers fallback rather than an exact application page.
- If no company-owned career/apply URL is found, no aggregator link is shown.
