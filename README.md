# Greenhouse Retrieval Update

Replace:

```text
lib/jobRetrieval.js
```

This adds Greenhouse public board retrieval using your Vercel variable:

```text
GREENHOUSE_BOARDS=openai,anthropic,databricks,stripe,doordash,scaleai
```

After replacing:

```powershell
npm run build
git add .
git commit -m "Add Greenhouse job retrieval"
git push
```

Then run a search and check Network → /api/search-jobs → Response.

You should see:

```json
"sources": ["JSearch", "Adzuna", "Greenhouse"]
```

or provider errors explaining any invalid board token.
