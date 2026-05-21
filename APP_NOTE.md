# UI note

No `src/App.jsx` change is strictly required if your current file already checks:

```js
job.applyUrl &&
job.applyUrl.startsWith("http") &&
!job.applyUrl.includes("themeasuredcareer.com")
```

This update fixes the actual source of the issue in `lib/jobRetrieval.js` by rejecting Google search / Google Jobs URLs before they reach the UI.
