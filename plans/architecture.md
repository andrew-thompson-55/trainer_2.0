# 🏗️ Project Chimera: Architecture & Tech Stack

## 1. System Overview
Chimera is an AI-powered endurance training coach. It ingests workout data from Strava, uses Google Gemini to analyze performance, and schedules adaptive workouts directly to Google Calendar.

**Core Stack:**
* **Mobile:** React Native (via Expo) using TypeScript.
* **Backend:** Python 3.12+ running FastAPI.
* **Database:** PostgreSQL (managed by Supabase).
* **AI:** Google Gemini 2.5 Pro (via Google AI Studio).

## 2. Architecture Decisions (ADRs)

### 2.1 Backend: FastAPI vs Django/Flask
**Decision:** Selected FastAPI.
**Reasoning:**
* Native async support is critical for handling long-running AI requests and external API calls (Strava/Google) without blocking.
* Pydantic integration ensures strict data validation (crucial for clean AI inputs).
* Auto-generated Swagger UI (`/docs`) speeds up frontend development.

### 2.2 Infrastructure: Render + Supabase
**Decision:** PaaS over raw AWS/EC2.
**Reasoning:**
* **Render:** Zero-downtime deploys via Git push. No server maintenance required for solo founder.
* **Supabase:** Provides Auth, Database, and Realtime subscriptions out of the box, saving weeks of boilerplate code.

### 2.3 Mobile: Expo
**Decision:** Expo Managed Workflow.
**Reasoning:** Allows rapid iteration and Over-The-Air (OTA) updates without waiting for App Store reviews for JS-only changes.

## 3. Environment & Configuration
* **Secrets Management:** Environment variables (`.env`) are used for all keys.
* **Required Keys:**
    * `STRAVA_CLIENT_ID` : 
    * `STRAVA_CLIENT_SECRET`: For OAuth flow.
    * `STRAVA_REFRESH_TOKEN` : 
    * `STRAVA_VERIFY_TOKEN` : 
    * `GOOGLE_CREDENTIALS_JSON`: Service account for Calendar access.
    * `GEMINI_API_KEY`: For AI generation.
    * `GOOGLE_CALENDAR_ID` : 
    * `SUPABASE_SERVICE_KEY` : 
    * `SUPABASE_URL` / `KEY`: DB connection.


## 4. Third-Party Integrations
* **Strava Webhooks:** Listens for `activity.create` and `activity.update` events to trigger auto-analysis.
* **Google Calendar API:** Uses a Service Account to read/write events to the user's specific "Training" calendar.

## 5. Deployment Pipeline
1.  **Commit** to `main` branch on GitHub.
2.  **Render** detects change and triggers build.
3.  **Build Command:** `pip install -r requirements.txt`.
4.  **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`.


## 5. Testing Protocol
1. cd chimera_mobile_app
2. npx expo start --tunnel -c


## 6. Building APK
1. "bump" the version in app.json. ie: 1.0.1 -> 1.0.2
2. npx eas build -p android --profile preview


## 7. run the build to test via native app (required for google auth branches)
1. eas build --profile development --platform android
npx expo start --dev-client