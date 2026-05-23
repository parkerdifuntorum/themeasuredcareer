# Penalize Jobs Without Direct Company/ATS Apply Links

Replace/add:

- `api/search-jobs.js`
- `lib/applyEnrichment.js`

Behavior:
- Adzuna jobs can still be discovered.
- Adzuna redirect links are never used as Apply links.
- If enrichment cannot find a company/ATS URL for an Adzuna job, it gets a strong ranking markdown.
- Jobs with high-confidence direct company/ATS links rank higher.
- Still returns up to 50 ranked jobs.

Deploy:

```powershell
npm run build
git add .
git commit -m "Penalize jobs without direct apply links"
git push
```
