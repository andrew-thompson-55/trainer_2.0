# Local Testing Plan for Chimera Applications

This document outlines the steps to set up and run the Chimera API and Mobile App locally for testing purposes.

## 1. Chimera API (Python/FastAPI)

### Prerequisites
*   Python 3.8+
*   `pip` (Python package installer)
*   `uvicorn` (ASGI server)
*   Environment variables for:
    *   `GEMINI_API_KEY`
    *   `SUPABASE_URL`
    *   `SUPABASE_KEY`
    *   `STRAVA_CLIENT_ID`
    *   `STRAVA_CLIENT_SECRET`
    *   `STRAVA_VERIFY_TOKEN`
    These should be set in a `.env` file in the `chimera_api` directory.

### Setup Steps
1.  Navigate to the `chimera_api` directory:
    ```bash
    cd chimera_api
    ```
2.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```

### Running Locally
1.  Start the FastAPI server:
    ```bash
    uvicorn main:app --reload
    ```
    The API will typically be accessible at `http://127.0.0.1:8000`.

## 2. Chimera Mobile App (React Native/Expo)

### Prerequisites
*   Node.js (LTS recommended)
*   npm or yarn
*   Expo Go app installed on a physical mobile device or an Android/iOS emulator/simulator.
*   To test against the deployed API, set the `EXPO_PUBLIC_API_BASE` environment variable in `chimera_mobile_app/app.json` to your Render instance URL (e.g., `https://trainer-2-0.onrender.com/v1`).
*   Environment variables for the mobile app are managed on the Render instance.
    *   **Note:** For Android emulators, you might need to use `http://10.0.2.2:8000/v1` to access the host machine's localhost.

### Setup Steps
1.  Navigate to the `chimera_mobile_app` directory:
    ```bash
    cd chimera_mobile_app
    ```
2.  Install JavaScript dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

### Running Locally
1.  Start the Expo development server:
    ```bash
    npm start
    # or
    expo start
    ```
2.  This command will open a new tab in your browser with the Expo Dev Tools.
3.  To run the app:
    *   Scan the displayed QR code using the Expo Go app on your physical device.
    *   Alternatively, use the options in the Expo Dev Tools to run on an Android emulator or iOS simulator.