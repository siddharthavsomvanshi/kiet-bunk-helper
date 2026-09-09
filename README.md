# KIET Attendance Dashboard

Attendance dashboard for KIET ERP. It requires KIET Auth Bridge v0.1.4.

## What is included

- `src/`: React + TypeScript dashboard scaffold
- `api/kiet.js`: Vercel serverless proxy for KIET API calls. It receives the
  session token only for the current request and does not persist it.

## Local app

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the Vite app:

   ```bash
   npm run dev
   ```

3. For the full KIET connection flow locally, run it through Vercel so the
   `/api/kiet` function is available: `npx vercel dev`.

## Connect KIET

1. Download [`bunk-helper-extension.zip`](public/bunk-helper-extension.zip), extract it, and load the folder in Chrome from `chrome://extensions` with Developer Mode enabled.
2. Confirm the extension version is **0.1.4**. Older versions are intentionally unsupported.
3. Sign in to [KIET ERP](https://kiet.cybervidya.net/).
4. In browser DevTools, open **Application → Local Storage →
   kiet.cybervidya.net**.
5. Copy the value of `authenticationtoken`.
6. In the dashboard, select **Connect with v0.1.4** and paste it.

The token stays in that browser's local storage. It is sent to the proxy only
when fetching your data, and a fresh token is needed after KIET expires it.

## Next build steps

- add daywise attendance view
- match schedule entries to exact course components
- add alert thresholds and richer analytics
