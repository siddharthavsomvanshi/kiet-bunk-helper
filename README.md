# KIET Attendance Dashboard

Starter workspace for a KIET attendance dashboard plus Chrome extension bridge.

## What is included

- `src/`: React + TypeScript dashboard scaffold
- `extension/chrome/`: Manifest V3 extension with:
  - token capture from KIET ERP
  - service-worker-based API proxy
  - app-to-extension message bridge

## Local app

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the Vite app:

   ```bash
   npm run dev
   ```

3. Open the local app, usually `http://localhost:5173`.

## Chrome extension

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the folder:

   ```text
   extension/chrome
   ```

5. Return to the dashboard and click `Connect with KIET ERP`

## Current flow

1. Dashboard asks the extension to prepare login.
2. User is sent to KIET ERP.
3. Extension reads `authenticationtoken` from KIET local storage after login.
4. Token is stored inside extension storage.
5. Extension redirects back to the dashboard without putting the token in the URL.
6. Dashboard asks the extension to fetch attendance and weekly schedules.

## Next build steps

- add daywise attendance view
- match schedule entries to exact course components
- add alert thresholds and richer analytics
- package extension icons and release ZIPs
