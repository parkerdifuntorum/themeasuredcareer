# Email Verification Required Update

This update requires users to verify their email before:

- Sending themselves a one-time digest
- Subscribing to daily digest updates

## Replace/add files

- `src/App.jsx`
- `lib/security.js`
- `api/request-email-verification.js`
- `api/confirm-email.js`
- `api/send-digest.js`
- `api/subscribe-digest.js`

## Behavior

1. User enters email.
2. User clicks **Verify Email First**.
3. User receives a confirmation link.
4. User clicks the link and becomes verified.
5. User can now use **Send Digest Now** or **Subscribe to Daily Updates**.

## Required env vars

```text
RESEND_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
SITE_URL=https://themeasuredcareer.com
```

Optional:

```text
TURNSTILE_SECRET_KEY
```

## Deploy

```powershell
npm run build
git add .
git commit -m "Require email verification before digest and subscription"
git push
```
