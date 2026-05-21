# Real Email Verification Fix

Replace/add:

- `lib/security.js`
- `api/request-email-verification.js`
- `api/confirm-email.js`
- `api/send-digest.js`
- `api/subscribe-digest.js`

Old verification emails will NOT count. Request a new verification email after deploying this.

Required Vercel env vars:

```text
RESEND_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
SITE_URL=https://themeasuredcareer.com
EMAIL_FROM=Job Search Smarter <digest@themeasuredcareer.com>
```

Deploy:

```powershell
npm run build
git add .
git commit -m "Fix real email verification"
git push
```
