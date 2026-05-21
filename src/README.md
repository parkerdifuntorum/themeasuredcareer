# Verification Email Fix

Replace/add these files:

- `lib/security.js`
- `api/request-email-verification.js`
- `api/confirm-email.js`
- `api/check-email-env.js`
- `package.json` if needed

## Add this Vercel environment variable

This is the most important fix if Resend is failing because of the sender:

```text
EMAIL_FROM=Job Search Smarter <digest@themeasuredcareer.com>
```

Also confirm these exist:

```text
RESEND_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
SITE_URL=https://themeasuredcareer.com
```

## Deploy

```powershell
npm install
npm run build
git add .
git commit -m "Fix verification email diagnostics"
git push
```

## Verify after deploy

Open:

```text
https://themeasuredcareer.com/api/check-email-env
```

You want:

```json
{
  "hasResendKey": true,
  "hasRedisUrl": true,
  "hasRedisToken": true,
  "hasSiteUrl": true,
  "emailFrom": "Job Search Smarter <digest@themeasuredcareer.com>"
}
```

Then click Verify Email First again. If it still fails, the frontend should now show the exact Resend or Redis error.
