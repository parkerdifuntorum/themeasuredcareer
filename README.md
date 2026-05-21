# No Placeholder Jobs + Real Apply Links

Replace/add:

- `src/App.jsx`
- `lib/jobRetrieval.js`
- `api/send-digest.js`

Changes:
- No prepopulated jobs are shown.
- Company name box is blank by default and does not prepopulate CAISO or any company.
- Apply buttons only appear for real external URLs.
- `themeasuredcareer.com` is never used as a fake apply link.
- Email digests also hide apply buttons unless a real external apply URL exists.

Deploy:

```powershell
npm run build
git add .
git commit -m "Remove placeholder jobs and require real apply links"
git push
```
