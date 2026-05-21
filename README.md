# Upstash URL sanitize fix

The error showed your Vercel value contains quotes:

"UPSTASH_REDIS_REST_URL" = "https://united-pup-132768.upstash.io"

Best fix in Vercel:
Remove the quote characters so the value is exactly:

https://united-pup-132768.upstash.io

This code also strips quotes defensively.

Replace/add:
- api/request-email-verification.js
- api/confirm-email.js
- api/check-email-env.js

Deploy:
npm run build
git add .
git commit -m "Sanitize Upstash URL in verification routes"
git push
