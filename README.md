# 50 Ranked Embedding Results Update

Replace/add:

- `api/search-jobs.js`
- `lib/jobRetrieval.js`

Keep your current:
- `lib/jobRanking.js`

What changed:
- `/api/search-jobs` now returns up to 50 ranked jobs instead of 30.
- Rankings require OpenAI embeddings through `rankJobsWithEmbeddings`.
- Retrieval asks providers for a larger candidate pool before ranking.
- If providers return fewer than 50, fallback supplements are added so the UI can still show 50 ranked results.
- Response metadata includes `rankingMethod`, `retrievedCount`, `rankedCount`, and `returnedCount`.

Deploy:

```powershell
npm run build
git add .
git commit -m "Return 50 embedding-ranked job results"
git push
```
