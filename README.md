# KIET Attendance Dashboard (KIET Bunk Helper)

A modern, privacy-first attendance tracking, bunk strategy planning, and analytical platform designed for **KIET Group of Institutions** students accessing KIET ERP (CyberVidya).

---

## 🚀 Key Features

- **🔑 Direct In-App Login**: Sign in directly using your CyberVidya Roll Number / Student ID, Password, and 6-digit OTP—**no Chrome extension required**.
- **📊 Real-Time Attendance Overview**: Instant view of total lectures, present count, extra attendance, current percentages, safe bunks left, and lectures needed to reach target thresholds (e.g., 75%).
- **🔥 Streak Tracker & Reliability Index**: Calculates strict consecutive attendance streaks across subjects with data reliability indicators.
- **🎯 Bunk Strategy & Recovery Planner**: Forecasts future attendance based on planned bunks across upcoming weeks and builds custom recovery plans.
- **🌀 Multiverse Simulator ("What If?")**: Interactive scenario engine allowing students to simulate custom bunking and attendance patterns to view ripple effects.
- **📅 Today's Live Status & Schedule**: Real-time daily timetable breakdown with class timings, subject components, and attendance status.
- **🗓️ 12-Week Schedule Calendar**: Weekly timetable grid with progressive background loading across 12 future weeks.
- **📜 Detailed Date-wise Lecture Logs**: Complete history of every attended, missed, and extra attendance lecture per subject.
- **📝 Exam Mode Eligibility**: Calculator ensuring attendance meets minimum eligibility criteria before exam cutoffs.
- **🔔 Smart PWA & Daily Push Notifications**: Service Worker powered Web Push notifications backed by Supabase snapshot tracking.

---

## 🔒 Security & Privacy Model

- **Client-Side AES-128-CBC Encryption**: Password and Roll Number encryption is executed directly in your browser using the native Web Crypto API prior to transmission.
- **Zero Credential Persistence**: Credentials and authentication tokens are kept strictly in your browser's local storage (`localStorage`). Credentials are never saved on external servers.
- **Stateless Serverless Proxy**: The Vercel API proxy (`/api/cybervidya`) forwards authenticated API requests directly to CyberVidya (`kiet.cybervidya.net`). Tokens are sent transiently per-request via headers and are never persisted or logged.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React Router v7, Vite PWA Plugin, Web Crypto API (AES-128-CBC), Custom CSS Tokens (Light/Dark themes)
- **Backend / Serverless**: Vercel Serverless Functions (Node.js/TypeScript), Supabase (PostgreSQL for Web Push subscriptions & daily snapshots), `web-push`

---

## 📁 Project Structure

```
dashboard/
├── api/                  # Vercel serverless proxy endpoints & notification tasks
│   ├── cybervidya/       # CyberVidya API proxy handler
│   ├── notifications/    # Push notification endpoints & cron jobs
│   └── proxy.ts          # Direct API proxy router
├── public/               # Static web assets, manifest & icons
├── src/                  # React Frontend Application
│   ├── components/       # UI components (LoginScreen, LoginModal, UI cards, etc.)
│   ├── pages/            # Main views (Dashboard, Today, Strategy, Multiverse, Calendar, History, Exam, etc.)
│   ├── services/         # API client (`cybervidyaApi.ts`) & notification utilities
│   ├── types/            # TypeScript interfaces (KIET API, State)
│   └── utils/            # Attendance math, date formatting, streak algorithms
├── vercel.json           # Vercel routes & daily cron configuration
└── vite.config.ts        # Vite configuration & Service Worker setup
```

---

## ⚙️ Local Development Setup

### Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Vercel CLI** *(optional, for testing serverless API routes locally)*: `npm i -g vercel`

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/siddharthavsomvanshi/kiet-bunk-helper.git
   cd kiet-bunk-helper
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://<your-supabase-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   ```

4. **Start the Frontend Development Server**:
   ```bash
   npm run dev
   ```

5. **Start with Serverless Proxy (Recommended for local API testing)**:
   ```bash
   npx vercel dev
   ```

---

## 🔐 How Connection Works

1. Launch the app and click **Connect / Login**.
2. Enter your CyberVidya **Roll Number / Student ID** and **Password**.
3. Enter the 6-digit **OTP** sent to your registered email/phone by CyberVidya.
4. Your attendance data, timetable, and streak metrics will instantly load into the dashboard.

---

## 📜 Build & Deployment

To build the static production bundle:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

Deploy easily to **Vercel**:

```bash
vercel --prod
```

---

## 🤝 Contributing & Feedback

Feedback, bug reports, and feature requests are welcome! Use the in-app **Report** tab or submit an issue/PR on GitHub.
