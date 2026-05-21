# Daily Subscription Update

This adds:

- Subscribe to Daily Updates button
- Subscriber storage with Upstash Redis
- Daily Vercel Cron endpoint
- Daily ranked job emails with apply links
- Unsubscribe endpoint

Replace/add:

- `src/App.jsx`
- `api/subscribe-digest.js`
- `api/unsubscribe-digest.js`
- `api/daily-digest.js`
- `vercel.json`
- `package.json`

Required Vercel environment variables:

```text
OPENAI_API_KEY
RESEND_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
CRON_SECRET
```

Vercel Cron schedule in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/daily-digest",
      "schedule": "0 15 * * *"
    }
  ]
}
```

This sends around 7 AM Pacific depending on daylight savings/UTC behavior.

After replacing files:

```powershell
npm install
npm run build
git add .
git commit -m "Add daily email subscriptions"
git push
```
