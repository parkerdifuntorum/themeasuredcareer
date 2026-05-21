# Run Search Update

Replace/add these files:

- `src/App.jsx`
- `api/search-jobs.js`
- `package.json` if your dependencies are missing `openai` or `resend`

This update adds:

- Multiple selected recommended titles
- Run Search button
- `/api/search-jobs` Vercel serverless endpoint
- OpenAI embedding search over a starter job catalog
- Updated rankings when new results return
- Automatic re-ranking when preferences or optimization weights change

Required Vercel env vars:

```text
OPENAI_API_KEY
RESEND_API_KEY
```
