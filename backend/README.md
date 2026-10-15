# FRAME AI — Backend Service Guide

FastAPI microservice powering the FRAME AI Photography Club Assistant, built with the official `google-genai` Python SDK.

---

## 🛠️ Requirements & Tech Stack
- **Python**: 3.11+
- **Framework**: FastAPI + Uvicorn
- **Validation**: Pydantic v2
- **AI Integration**: Official `google-genai` SDK
- **Security**: In-memory sliding-window IP rate limiting, strict CORS origin filtering, payload truncation

---

## 🚀 Quickstart Local Setup

### 1. Create and Activate Virtual Environment
```bash
# Windows
py -3.11 -m venv .venv
.\.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Secrets (.env)
Copy the example environment file:
```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```
Edit `.env` to configure your Gemini API key (see instructions below).

### 4. Run the Development Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The server will start at `http://localhost:8000`.
- API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

---

## 🔑 Obtaining a Google Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **"Get API key"** in the top navigation or left sidebar.
4. Click **"Create API key"** (select a project or create a new one).
5. Copy the generated key (starts with `AIzaSy...`).
6. Paste into your `backend/.env` file:
   ```env
   GEMINI_API_KEY=AIzaSyYourActualKeyHere
   GEMINI_MODEL=gemini-2.5-flash
   ```
7. Restart the backend server.

---

## 📡 API Contract

### 1. GET `/health`
Returns readiness status without exposing keys or secrets.
**Response**:
```json
{
  "status": "healthy",
  "service": "frame-ai-backend",
  "gemini_configured": true,
  "model": "gemini-2.5-flash"
}
```

### 2. POST `/chat`
Submits a photography query to the assistant.
**Request**:
```json
{
  "message": "What camera settings should I use for golden-hour portraits?",
  "history": [
    { "role": "user", "content": "Hello!" },
    { "role": "model", "content": "Hi there! What are you shooting today?" }
  ]
}
```

**Response**:
```json
{
  "reply": "For golden-hour portraits, here are recommended settings:\n\n* **Aperture**: f/1.8 - f/2.8 for creamy background bokeh...\n* **Shutter Speed**: 1/250s or faster to freeze minor movement...\n* **ISO**: 100 to maximize dynamic range and minimize grain."
}
```

---

## ☁️ Cloud Deployment (e.g. Render)
1. Push this repository to GitHub.
2. In Render, select **"New Web Service"** and connect your repository.
3. Set the **Root Directory** to `backend`.
4. Configure commands:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: `AIzaSy...`
   - `GEMINI_MODEL`: `gemini-2.5-flash`
   - `ALLOWED_ORIGINS`: `https://<your-username>.github.io`
   - `RATE_LIMIT_PER_MINUTE`: `20`
6. Deploy! Render will assign an HTTPS URL like `https://frame-ai-backend.onrender.com`.
7. Update `js/frame-ai-config.js` with your production URL.
