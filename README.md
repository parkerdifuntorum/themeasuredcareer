# Search-Specific Daily Subscriptions

Add/replace:

- `api/subscribe-digest.js`
- `api/send-digest.js`
- `api/daily-digest-cron.js`
- `lib/digestRenderer.js`
- `vercel.json`
- Apply the patch in `patches/App_PATCH.md` to `src/App.jsx`

What changed:
- Big bold UI notice: email is NOT required to run search.
- Email is only needed to verify and subscribe/send digest.
- Users can subscribe only after running a completed search.
- Subscription saves the completed search settings.
- Daily cron re-runs the saved search every day and sends updated ranked results.

Deploy:

```powershell
npm run build
git add .
git commit -m "Add search-specific daily subscriptions"
git push
```

Manual cron test after deploy:

```powershell
Invoke-WebRequest `
  -Uri "https://themeasuredcareer.com/api/daily-digest-cron?secret=YOUR_CRON_SECRET" `
  -Method GET
```
