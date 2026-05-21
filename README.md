# Direct Apply Links Only

Replace:

- `lib/jobRetrieval.js`

What this does:
- Rejects Google Search / Google Jobs / `htidocid` / aggregator search URLs.
- Prefers direct company career/apply links when available.
- Keeps direct ATS links such as Greenhouse, Lever, Workday, Ashby, SmartRecruiters, iCIMS, USAJobs, etc.
- If no real direct application URL is available, `applyUrl` is set to `null`, so no Apply button should show.

Important:
Some job APIs do not always expose the true company application URL. In those cases, the app will hide the Apply button rather than sending users to a Google Jobs search page.

Deploy:

```powershell
npm run build
git add .
git commit -m "Require direct external apply links"
git push
```
