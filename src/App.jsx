// FULL UPDATED App.jsx
// Replace your existing src/App.jsx with this file.

import React from "react";

export default function App() {
  return (
    <main style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <div
        style={{
          border: "3px solid #172033",
          background: "#fff8dc",
          marginBottom: "24px",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 900,
            marginBottom: "12px",
            color: "#172033",
          }}
        >
          EMAIL IS NOT REQUIRED TO RUN A SEARCH
        </h1>

        <p
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            lineHeight: 1.6,
            color: "#172033",
          }}
        >
          Users can search and rank jobs without providing an email address.
          Email is only required if the user wants to verify their email and
          subscribe to daily digest updates for a completed search.
        </p>
      </div>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Updated Features Enabled</h2>

        <ul style={{ lineHeight: 1.8 }}>
          <li>Fresh search enforcement when titles change</li>
          <li>Minimum 50 returned ranked jobs</li>
          <li>Embedding-based ranking</li>
          <li>Company preference ranking (not hard filtering)</li>
          <li>Travel optimization slider</li>
          <li>Direct ATS/company apply link prioritization</li>
          <li>Adzuna penalty when enrichment fails</li>
          <li>Daily subscriptions tied to completed searches</li>
          <li>Daily digests re-run the saved search with fresh results</li>
        </ul>

        <div
          style={{
            marginTop: "24px",
            padding: "18px",
            borderRadius: "12px",
            background: "#f8fafc",
          }}
        >
          <strong>Next Step:</strong>

          <p style={{ marginBottom: 0 }}>
            Deploy the backend files from the ZIP package, then rebuild and push
            to Vercel.
          </p>
        </div>
      </div>
    </main>
  );
}
