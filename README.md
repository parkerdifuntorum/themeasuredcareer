# Public Subscription Hardening Update

This version adds public-release guardrails for daily subscriptions:

- Double opt-in confirmation email
- Active subscribers only after confirmation
- Unsubscribe endpoint
- Upstash Redis persistent subscriber storage
- Upstash serverless rate limiting on subscribe and unsubscribe
- Optional Cloudflare Turnstile verification
- Protected cron endpoint using CRON_SECRET
- Daily digest sends only to confirmed subscribers

## Replace/add files

- `src/App.jsx`
- `lib/security.js`
- `api/subscribe-digest.js`
- `api/confirm-digest.js`
- `api/unsubscribe-digest.js`
- `api/daily-digest.js`
- `vercel.json`
- `package.json`

Keep your existing:
- `api/title-match.js`
- `api/search-jobs.js`
- `api/send-digest.js`

## Required Vercel environment variables

```text
OPENAI_API_KEY
RESEND_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
CRON_SECRET
SITE_URL=https://themeasuredcareer.com
```

## Optional but recommended

```text
TURNSTILE_SECRET_KEY
```

If `TURNSTILE_SECRET_KEY` is not set, the API allows subscriptions without Turnstile. This lets you launch now and add Turnstile later.

## Install and deploy

```powershell
npm install
npm run build
git add .
git commit -m "Harden daily digest subscriptions"
git push
```

## Manual cron test

Use your CRON_SECRET:

```powershell
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://themeasuredcareer.com/api/daily-digest
```
