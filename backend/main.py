"""
FRAME AI — Backend Service
=============================================================================
FastAPI server integrating Google Gemini via the official google-genai SDK,
with rate limiting, CORS security, input validation, and photography mentorship.
=============================================================================
"""

import os
import time
import logging
from collections import defaultdict
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator

# Configure safe logging (no secrets or sensitive payload dumps)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("frame_ai_backend")

# Load environment variables from .env file
load_dotenv()

# Configuration Settings
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
ALLOWED_ORIGINS_RAW = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5500,http://127.0.0.1:5500,http://localhost:8000,http://127.0.0.1:8000"
)
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "20"))
REQUEST_TIMEOUT_SECONDS = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "25"))
PORT = int(os.getenv("PORT", "8000"))

# Parse allowed origins
allowed_origins = [origin.strip() for origin in ALLOWED_ORIGINS_RAW.split(",") if origin.strip()]
if not allowed_origins:
    allowed_origins = ["*"]

# Initialize FastAPI Application
app = FastAPI(
    title="FRAME AI - Photography Club Assistant API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# =============================================================================
# SYSTEM INSTRUCTION FOR PHOTOGRAPHY MENTOR
# =============================================================================
FRAME_AI_SYSTEM_INSTRUCTION = """
You are FRAME AI, an intelligent, inspiring, and approachable photography mentor for a college Photography Club.
Your mission is to help students learn photography, understand camera settings, master composition, discover creative challenges, learn editing techniques, prepare portfolios, and discuss equipment on student budgets.

Tone and Personality:
- Friendly, encouraging, creative, and professional.
- Beginner-friendly without oversimplifying or being condescending.
- Practical, concise, and structured. Avoid rambling essays. Provide actionable advice first.
- Offer alternative approaches for different gear (e.g., kit lenses vs. fast primes, mirrorless vs. smartphone).

Formatting Guidelines:
- For camera-setting inquiries, use this structured format when helpful:
  * **Recommended Starting Settings**: Aperture (e.g., f/1.8 - f/2.8), Shutter Speed (e.g., 1/250s), ISO (e.g., 100 - 400).
  * **Why Those Settings Work**: 1-2 sentence optical explanation (depth of field, light intake, freezing motion).
  * **How to Adjust**: Quick pointers for changing lighting or fast motion.
  * **Practical Tip**: Pro technique (e.g., eye autofocus, golden-hour rim backlight, reflector).
  * **Creative Experiment**: A fun exercise to try right now.

Boundaries and Honesty:
- Focus on photography, cinematography, optics, editing, and photography club topics.
- Do NOT invent or fabricate real club event dates, ticket prices, official registration links, or live contact details. If asked about official club announcements or private dates, explain politely that you are the creative mentor and advise checking with the club student executive board or attending the next club meeting.
- Never claim to see or analyze an uploaded photograph unless image upload processing is actually performed.
- Maintain safety and helpfulness at all times.
"""

# =============================================================================
# RATE LIMITING (Sliding Window in Memory per IP)
# =============================================================================
ip_request_timestamps = defaultdict(list)

def enforce_rate_limit(request: Request):
    """Enforces a per-IP rate limit window."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    window_start = now - 60.0

    # Filter timestamps within the last 60 seconds
    timestamps = [t for t in ip_request_timestamps[client_ip] if t > window_start]
    ip_request_timestamps[client_ip] = timestamps

    if len(timestamps) >= RATE_LIMIT_PER_MINUTE:
        logger.warning(f"Rate limit exceeded for client IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {RATE_LIMIT_PER_MINUTE} messages per minute."
        )

    ip_request_timestamps[client_ip].append(now)

# =============================================================================
# REQUEST & RESPONSE MODELS
# =============================================================================
class ChatMessage(BaseModel):
    role: str = Field(default="user", description="Role must be 'user' or 'model'/'assistant'")
    content: str = Field(..., min_length=1, max_length=50000, description="Message content")

    @validator("role")
    def validate_role(cls, v):
        v_clean = str(v).lower().strip()
        if v_clean in ("assistant", "model"):
            return "model"
        if v_clean == "user":
            return "user"
        return "user"

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000, description="User question or prompt")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Recent conversation turns")

    @validator("message")
    def trim_message(cls, v):
        trimmed = str(v).strip()
        if not trimmed:
            raise ValueError("Message cannot be blank or whitespace only.")
        return trimmed

class ChatResponse(BaseModel):
    reply: str

class HealthResponse(BaseModel):
    status: str
    service: str
    gemini_configured: bool
    model: str

# =============================================================================
# GEMINI CLIENT INITIALIZATION
# =============================================================================
def get_gemini_client():
    """Returns official google-genai client if API key is present."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "replace_with_your_key":
        return None
    try:
        from google import genai
        return genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        logger.error(f"Error initializing Google GenAI Client: {e}")
        return None

# =============================================================================
# ENDPOINTS
# =============================================================================
@app.get("/", response_model=dict)
def root_endpoint():
    """Root endpoint for basic health check."""
    return {
        "name": "FRAME AI API",
        "description": "Cinematic Photography Club Assistant Backend",
        "version": "1.0.0"
    }

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Minimal health check endpoint without exposing sensitive information."""
    is_configured = bool(GEMINI_API_KEY and GEMINI_API_KEY != "replace_with_your_key")
    return HealthResponse(
        status="healthy",
        service="frame-ai-backend",
        gemini_configured=is_configured,
        model=GEMINI_MODEL
    )

@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(enforce_rate_limit)])
async def chat_endpoint(payload: ChatRequest):
    """
    Main chat endpoint. Validates input, builds bounded context,
    invokes Google Gemini model with photography mentorship instructions,
    and returns a clean JSON response.
    """
    client = get_gemini_client()

    # If API key is not yet configured, provide a seamless developer testing fallback
    if not client:
        logger.info("Chat request handled in preview mode (GEMINI_API_KEY not configured).")
        preview_response = (
            f"**[FRAME AI Mentor Preview]**\n\n"
            f"Thank you for asking about: *\"{payload.message}\"*\n\n"
            f"The backend is fully operational and awaiting your **Google Gemini API Key**.\n\n"
            f"To enable live Gemini responses:\n"
            f"1. Open [Google AI Studio](https://aistudio.google.com/) and create a free API key.\n"
            f"2. Add your key to `backend/.env`:\n"
            f"   ```env\n   GEMINI_API_KEY=AIzaSy...\n   ```\n"
            f"3. Restart the backend server.\n\n"
            f"**Quick Photography Tip for \"{payload.message}\"**:\n"
            f"- **Settings**: For portraits, try `f/1.8 - f/2.8`, `1/250s`, `ISO 100`.\n"
            f"- **Focus**: Align single-point eye autofocus directly on the subject's nearest pupil.\n"
            f"- **Composition**: Utilize the rule of thirds and leave leading looking-space in the direction of the subject's gaze!"
        )
        return ChatResponse(reply=preview_response)

    # Build conversation contents for Google GenAI SDK
    try:
        # pyrefly: ignore [missing-import]
        from google.genai import types

        contents = []

        # Limit recent history turns to maximum 8 to bound token consumption
        bounded_history = payload.history[-8:] if payload.history else []
        for turn in bounded_history:
            contents.append(
                types.Content(
                    role=turn.role,
                    parts=[types.Part.from_text(text=turn.content)]
                )
            )

        # Add current user prompt
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=payload.message)]
            )
        )

        # Execute generation call with official google-genai SDK
        candidate_models = [GEMINI_MODEL]
        if "flash" in GEMINI_MODEL and GEMINI_MODEL != "gemini-3.5-flash-lite":
            candidate_models.append("gemini-3.5-flash-lite")
        if GEMINI_MODEL != "gemini-3.5-flash":
            candidate_models.append("gemini-3.5-flash")

        response = None
        last_exception = None

        for model_to_try in candidate_models:
            try:
                logger.info(f"Calling Gemini model '{model_to_try}' with {len(contents)} contents.")
                response = client.models.generate_content(
                    model=model_to_try,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=FRAME_AI_SYSTEM_INSTRUCTION,
                        max_output_tokens=1000,
                        temperature=0.7,
                    )
                )
                if response and response.text:
                    break
            except Exception as try_exc:
                last_exception = try_exc
                logger.warning(f"Model '{model_to_try}' failed with: {try_exc}. Trying next candidate if available...")
                continue

        if not response or not response.text:
            if last_exception:
                raise last_exception
            raise RuntimeError("Empty response received from AI model.")

        return ChatResponse(reply=response.text)

    except Exception as exc:
        err_msg = str(exc)
        logger.error(f"Error during Gemini generation: {err_msg}")

        # Check for quota or rate limit errors
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="The AI provider is experiencing high traffic or quota limits. Please try again in a few moments."
            )
        elif "400" in err_msg or "API_KEY_INVALID" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Configured GEMINI_API_KEY appears to be invalid. Please verify the key in backend/.env."
            )
        elif "timeout" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Request to AI service timed out. Please try again."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to generate response from AI model. Please verify server logs."
            )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
