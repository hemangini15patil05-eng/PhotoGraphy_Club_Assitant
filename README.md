# FRAME AI — Cinematic Photography Club Assistant

An editorial, responsive College Photography Club website featuring **FRAME AI**, an intelligent floating photography assistant powered by Google Gemini and FastAPI.

---

## 📸 Overview
- **Visual Design**: Cinematic dark theme (`#08090B`), deep charcoal cards, burnt-orange luminescence (`#FF7628`), editorial typography (`Syne` + `Plus Jakarta Sans`).
- **Aperture Launcher**: Circular mechanical camera-lens launcher with detailed interlocking aperture blades, breathing orange glow, rotating concentric ring, and accessible modal behavior.
- **AI Mentorship**: Real-time advice on camera settings (ISO, aperture, shutter speed), composition, lighting, editing, student gear recommendations, and creative daily challenges.
- **Architecture**: Decoupled Vanilla HTML5/CSS3/JavaScript frontend with a secure, rate-limited Python FastAPI backend using the official `google-genai` SDK.

---

## 📁 Repository Structure
```
AI Chatbot/
├── index.html                  # Main Photography Club Website with FRAME AI widget
├── css/
│   ├── style.css               # Website styling (Editorial dark theme & gallery)
│   └── frame-ai.css            # Fully namespaced assistant styles (frame-ai-*)
├── js/
│   ├── app.js                  # Website interactions (gallery clicks, challenge prompts)
│   ├── frame-ai-config.js      # Public, non-secret client configuration
│   └── frame-ai.js             # Assistant controller (state, DOM, safety, auto-scroll)
├── assets/
│   └── images/                 # Editorial photographs (vintage car, portrait, teacup, etc.)
├── backend/
│   ├── main.py                 # FastAPI backend server with Google Gemini integration
│   ├── requirements.txt        # Python backend dependencies
│   ├── .env.example            # Safe template for environment variables
│   ├── .gitignore              # Ignores .env, .venv, and Python caches
│   └── README.md               # Backend-specific instructions
├── .gitignore                  # Root gitignore
└── README.md                   # Complete project documentation
```

---

## ⚡ Quickstart Guide

### 1. Run the Backend Server
Open a terminal in the project root:
```powershell
# Navigate into backend directory
cd backend

# Create virtual environment (Python 3.11+)
py -3.11 -m venv .venv

# Activate virtual environment
.\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The backend will run at `http://localhost:8000`.
- Health check: `http://localhost:8000/health`
- Interactive API Docs: `http://localhost:8000/docs`

> [!NOTE]
> Even before adding your Gemini API key, the backend includes a built-in preview mentor mode so you can test end-to-end communication immediately!

---

### 2. Run the Frontend Website
You can serve the frontend using any static file server or VS Code / Antigravity Live Server:

**Option A: Using Python http.server (Port 5500)**
```powershell
# In the root folder (AI Chatbot)
python -m http.server 5500
```
Then visit: [http://localhost:5500](http://localhost:5500)

**Option B: Direct Browser Preview**
Simply open `index.html` in Chrome or Edge.

---

## 🔑 How to Configure Google Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **"Get API key"** &rarr; **"Create API key"**.
4. In `backend/`, copy `.env.example` to `.env`:
   ```powershell
   copy backend\.env.example backend\.env
   ```
5. Open `backend/.env` and insert your key:
   ```env
   GEMINI_API_KEY=AIzaSy...YourKeyHere
   GEMINI_MODEL=gemini-2.5-flash
   ```
6. Restart the backend server (`uvicorn main:app --reload`).
7. Your assistant is now live with real Google Gemini intelligence!

---

## 🔒 Security Architecture

| Security Layer | Implementation |
| :--- | :--- |
| **API Key Privacy** | Keys reside strictly in backend `.env` / server environment variables. Zero exposure in frontend JavaScript or HTML. |
| **CORS Protection** | Configurable `ALLOWED_ORIGINS` restricting browser requests to authorized frontend domains. |
| **Rate Limiting** | In-memory sliding window tracking requests per client IP (default: 20 req/min) returning `HTTP 429`. |
| **Input Sanitization** | Pydantic trims whitespace, rejects blank input, and enforces a 1,000 character ceiling. |
| **XSS Prevention** | Safe DOM rendering with full HTML entity escaping before markdown tokenization. |
| **Bounded Context** | History is restricted to the last 8 conversation turns to prevent context window bloat and excessive token consumption. |

---

## 🚀 Production Deployment

### Frontend &rarr; GitHub Pages
1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of FRAME Photography Club and AI Assistant"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. In GitHub, go to **Settings &rarr; Pages**.
3. Under **Build and deployment**, select **Source: Deploy from a branch** and select `main` / `/ (root)`.
4. Update `js/frame-ai-config.js` with your deployed backend URL.

### Backend &rarr; Render
1. Create a free account on [Render](https://render.com/).
2. Select **New &rarr; Web Service** and connect your GitHub repo.
3. Set **Root Directory** to `backend`.
4. Set **Build Command**: `pip install -r requirements.txt`.
5. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
6. Add Environment Variables:
   - `GEMINI_API_KEY`: Your key from Google AI Studio.
   - `GEMINI_MODEL`: `gemini-2.5-flash`.
   - `ALLOWED_ORIGINS`: `https://<your-username>.github.io`.
7. Once deployed, test `https://<your-app>.onrender.com/health` in your browser.

---

## 🧪 Testing Checklist
- [x] Floating camera aperture icon with concentric rings and breathing glow
- [x] Smooth open/close panel animation
- [x] Suggested question chips trigger queries
- [x] User and AI messages display with distinct typography
- [x] Typing indicator displays during generation
- [x] Conversation context handles follow-up questions
- [x] Reset button clears history and returns to welcome state
- [x] Rate limiting prevents request flooding
- [x] Responsive layout on desktop, tablet, and mobile viewports
