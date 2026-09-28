# Mazdoor Mitra (मजदूर मित्र) | AI-Powered Smart Labour & Safety Network

[![Deployment Status](https://img.shields.io/badge/Deployment-Ready-success?style=for-the-badge&logo=github)](https://github.com)
[![Netlify Status](https://img.shields.io/badge/Netlify-Ready-00C7B7?style=for-the-badge&logo=netlify)](https://www.netlify.com)
[![License: DBOCW Compliant](https://img.shields.io/badge/Compliance-DBOCW%20%2F%20e--Shram-orange?style=for-the-badge)](https://eshram.gov.in)
[![Multilingual: 11 Languages](https://img.shields.io/badge/Languages-11%20Indian%20Vernaculars-blue?style=for-the-badge)](https://bhashini.gov.in)

> **A high-contrast, offline-first progressive web application engineered for unorganized daily-wage workers, skilled artisans, and construction contractors across all 28 States and 8 Union Territories of India.**

---

## 🚀 Instant Deployment Options

### Option A: Deploy to GitHub Pages (Free)
1. Initialize git and push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: complete Mazdoor Mitra V4 release"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/mazdoor-mitra.git
   git push -u origin main
   ```
2. In your GitHub repo:
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, choose **GitHub Actions** (the included `.github/workflows/deploy.yml` workflow will automatically build and publish your site).
3. Your live link will be: `https://YOUR_USERNAME.github.io/mazdoor-mitra/`

---

### Option B: Deploy to Netlify (1-Click Drag & Drop)
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag and drop the `mazdoor-mitra` folder into the upload box.
3. Your site is live immediately with a free HTTPS custom subdomain (e.g., `https://mazdoor-mitra.netlify.app`).

---

### Option C: Run Locally in Browser
Double-click `index.html` or open via browser terminal:
```powershell
Start-Process "index.html"
```

---

## 🌟 Core Features

### 1. Modern Job Card Feed (Elevated Card Layout)
- **Header Line:** Bold Job Title on left + Prominent Daily Wage (**₹950 / PER DAY**, **₹800 / PER DAY**) on right.
- **Subheader:** Italicized contractor / firm name with verified DBOCW badge.
- **Pill Badges:** Light-gray rounded badges showing Trade (`Painting`, `Plumbing`, `Loading/Unloading`, `Construction`), Location (`📍 Kothrud, Pune`), and Shift Duration (`⏱ 8 hours`, `⏱ 6 hours`).
- **Tactile Quick-Actions:**
  - 📞 **Direct Call:** Instant dialing without intermediaries.
  - 💬 **Direct WhatsApp:** Pre-filled template application chat.
  - 🔊 **Voice Readout:** Speaks job requirements aloud in the chosen language.
  - 📋 **Details Modal:** Full job description, location coordinates, and PPE requirements.
  - ⚡ **Apply Now:** Instant 1-tap application with local state tracking.
- **Explore All Jobs:** Quick-action button at feed bottom to reset all active filters.

### 2. Emergency Action Section (Tactile Box Cards)
- **🚑 108 Ambulance:** Direct emergency medical dispatch (`tel:108`).
- **🛡️ 112 National SOS:** Integrated emergency response service (`tel:112`).
- **📞 Labour Board Helpline:** National central helpline (`tel:01123382363`).
- **🩺 Report Injury:** Instant site accident logging compliant with DBOCW and welfare boards.

### 3. Cascading Regional Location Filter (All India)
- Covers **all 28 States and 8 Union Territories**.
- Cascades from **State / UT** ➔ **Districts** ➔ **Cities / Mandals / Hubs**.
- Features an **"All India"** quick reset button and GPS location detector.

### 4. Real-Time Minimum Wage Slider
- Baseline default set to **₹500/day**.
- Dynamic real-time badge updates and instant job filtering on slider drag.

### 5. Multilingual Localization Engine (11 Languages)
- Instant, zero-refresh switching across:
  - English (`en`)
  - Telugu (`te` - తెలుగు)
  - Hindi (`hi` - हिंदी)
  - Tamil (`ta` - தமிழ்)
  - Kannada (`kn` - ಕನ್ನಡ)
  - Malayalam (`ml` - മലയാളം)
  - Marathi (`mr` - मराठी)
  - Bengali (`bn` - বাংলা)
  - Gujarati (`gu` - ગુજરાતી)
  - Punjabi (`pa` - ਪੰਜਾਬੀ)
  - Odia (`or` - ଓଡ଼ିଆ)

### 6. 24/7 AI Voice Sahayak
- Floating bottom assistant modal.
- Voice-in (Speech Recognition) and Voice-out (Speech Synthesis).
- Multilingual answers regarding minimum wages, 15-minute heatwave rest rules, PPE standards, e-Shram card benefits, PM Vishwakarma tool grants, and dispute resolution under the Payment of Wages Act.

### 7. Progressive Web App (PWA) & Offline Mode
- Fully installable on Android and iOS home screens.
- Includes `sw.js` for caching and offline access to emergency helplines and first-aid guides.

---

### 8. Supabase Cloud PostgreSQL & Realtime Backend
- **Project URL:** `https://eeocbfsgsqpymnnnzcmk.supabase.co`
- **Real-time Sync:** Live sync for jobs, worker registrations, applications, and attendance.
- **Offline Resilient:** Operates seamlessly offline with `localStorage` and syncs with Supabase automatically when online.
- **SQL Schema Script:** Complete table definitions, RLS security policies, and initial seed data provided in [`supabase-schema.sql`](supabase-schema.sql).

---

## 🛠 Tech Stack
- **Frontend:** Clean HTML5, Modern CSS, Tailwind CSS (CDN)
- **Database & Realtime:** Supabase Cloud (PostgreSQL 15 + PostgREST + Realtime)
- **Icons:** FontAwesome 6 Pro CDN
- **Charts:** Chart.js for real-time labour supply/demand analytics
- **Architecture:** Zero-build single-file vanilla JavaScript architecture with cloud sync
- **Deployment:** GitHub Pages / Netlify / Vercel ready
