# Secondary Apply Link Enrichment

Add/replace:

- `lib/applyEnrichment.js`
- `api/search-jobs.js`

What it does:
- Keeps Google Jobs / SerpAPI as a discovery source.
- After embedding ranking, enriches the top 50 jobs.
- Attempts to replace weak/intermediary links with direct application URLs.
- Tries provider links first, then redirect resolution, Greenhouse, Lever, then SerpAPI company careers search.
- Does not drop jobs if no direct apply link is found.
- Adds metadata:
  - `applyUrlSource`
  - `applyUrlConfidence`
  - `meta.enrichedApplyLinks`
  - `meta.directHighConfidenceApplyLinks`

Deploy:

```powershell
npm run build
git add .
git commit -m "Add secondary direct apply link enrichment"
git push
```
