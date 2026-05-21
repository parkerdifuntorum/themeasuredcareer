# No-dependency email verification fix

This avoids Vercel function crashes caused by missing `resend` or `@upstash/redis` package imports.

Replace/add:

- api/request-email-verification.js
- api/confirm-email.js
- api/check-email-env.js

Then deploy:

npm run build
git add .
git commit -m "Use no-dependency email verification routes"
git push

After deploying, test with:

Invoke-WebRequest `
  -Uri "https://themeasuredcareer.com/api/request-email-verification" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"YOUR_EMAIL_HERE"}'

Use Invoke-WebRequest instead of Invoke-RestMethod so PowerShell shows the response body on errors.
