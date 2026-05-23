# Stronger Company / ATS Apply Link Enrichment

Replace/add:

- `lib/applyEnrichment.js`
- `api/search-jobs.js`

What this changes:
- Treats Adzuna as a discovery source only, not an apply destination.
- Rejects Adzuna, Google Jobs, Indeed, LinkedIn, ZipRecruiter, Glassdoor, and other aggregator URLs as Apply links.
- Searches harder for direct company/ATS links using:
  - Greenhouse public boards
  - Lever public postings
  - exact company + title search
  - company careers page search
  - shallow company careers page crawl
  - redirect resolution
- Gives a very strong ranking penalty to Adzuna jobs when no direct company/ATS URL is found.
- Gives a boost to jobs with high-confidence company/ATS Apply links.
- Still returns up to 50 jobs, but jobs without direct apply links should fall lower.

Deploy:

```powershell
npm run build
git add .
git commit -m "Strengthen company ATS apply link enrichment"
git push
```
