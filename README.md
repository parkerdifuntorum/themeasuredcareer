# Search Debug + Failsafe Patch

This patch helps diagnose why live job search is failing.

Replace/add:

- `api/search-jobs.js`
- `lib/jobRetrieval.js`
- `package.json` if needed

What this does:

- Does not hard-fail if Upstash rate limiting is misconfigured.
- Does not hard-fail if JSearch fails.
- Returns fallback jobs instead of breaking the whole app.
- Returns provider errors in `meta.providerErrors`.
- Returns env flags in `meta.env`.

After deploying, click Run Search and inspect:

```text
F12 → Network → /api/search-jobs → Response
```

Look for:

```json
"providerErrors": [...]
"env": {
  "hasJSearch": true,
  "hasOpenAI": true
}
```

Deploy:

```powershell
npm install
npm run build
git add .
git commit -m "Add job search debug failsafe"
git push
```
