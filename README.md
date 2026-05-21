# SerpAPI Primary + Less Filtering Update

Replace:

```text
lib/jobRetrieval.js
```

Changes:
- Google Jobs via SerpAPI is now the primary retrieval source when `SERPAPI_API_KEY` is configured.
- Industry is no longer used to filter out openings before ranking.
- More titles are queried per search.
- Greenhouse filtering is much less aggressive.
- Retrieval returns up to 150 candidates before OpenAI ranking.

Add this Vercel env var:

```text
SERPAPI_API_KEY=your_serpapi_key
```

Then:

```powershell
npm run build
git add .
git commit -m "Use Google Jobs primary retrieval and reduce filtering"
git push
```
