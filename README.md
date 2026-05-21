# Better Title Recommendations + Company Preference Update

Replace/add:

- `src/App.jsx`
- `api/title-match.js`
- `lib/jobRanking.js`

What changed:
- Better OpenAI recommended titles using chat completion + embeddings.
- Broader cross-industry title recommendations.
- New preferred company text box.
- New Company Match optimization slider.
- Company preference changes final ranking but does not filter out other jobs.

Deploy:

```powershell
npm run build
git add .
git commit -m "Add company preference ranking and improve title recommendations"
git push
```
