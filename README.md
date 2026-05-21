# The Measured Career / Job Search Smarter OpenAI Embeddings Update

Files included:

- `src/App.jsx`
- `api/title-match.js`
- `api/send-digest.js`
- `package.json`

## Required Vercel environment variables

Add these in Vercel → Project → Settings → Environment Variables:

```text
OPENAI_API_KEY=your_openai_api_key
RESEND_API_KEY=your_resend_api_key
```

After adding environment variables, redeploy the project.

## Local install

```powershell
npm install
npm run build
```

Then push:

```powershell
git add .
git commit -m "Add OpenAI embeddings title matching"
git push
```
