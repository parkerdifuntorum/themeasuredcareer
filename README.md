# Real Job Retrieval Update

This update replaces the static 12-result behavior with a real retrieval layer.

## What changed

- `/api/search-jobs.js` now retrieves jobs from configured external job APIs first.
- OpenAI embeddings rank the retrieved jobs.
- Preferences and selected titles change the retrieved candidate pool.
- Daily digest now uses the same live retrieval + ranking flow.
- If no external API keys are configured, the app falls back to a small fallback catalog.

## Replace/add files

- `src/App.jsx`
- `api/search-jobs.js`
- `api/daily-digest.js`
- `lib/jobRetrieval.js`
- `lib/jobRanking.js`
- `package.json`

Keep your existing:
- `lib/security.js`
- `api/title-match.js`
- `api/send-digest.js`
- `api/subscribe-digest.js`
- `api/confirm-digest.js`
- `api/unsubscribe-digest.js`

## Optional job API environment variables

Add at least one provider for real results.

### JSearch via RapidAPI

```text
JSEARCH_API_KEY=your_rapidapi_key
```

### Adzuna

```text
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
ADZUNA_COUNTRY=us
```

### USAJobs

```text
USAJOBS_EMAIL=your_email@example.com
USAJOBS_API_KEY=your_usajobs_api_key
```

## Required existing env vars

```text
OPENAI_API_KEY
RESEND_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
CRON_SECRET
SITE_URL=https://themeasuredcareer.com
```

## Deploy

```powershell
npm install
npm run build
git add .
git commit -m "Add real job retrieval and dynamic ranking"
git push
```
