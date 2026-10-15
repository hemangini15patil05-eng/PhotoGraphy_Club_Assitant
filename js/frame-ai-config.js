/**
 * FRAME AI - Client Configuration
 * ==============================================================================
 * This file contains public, non-secret configuration options for the frontend widget.
 * NEVER put API keys, passwords, or secrets in this file or any client JavaScript!
 * The API key is securely stored in the Python backend environment variables.
 * ==============================================================================
 */

const FRAME_AI_CONFIG = {
  // Automatically detects local development vs production hosting
  API_BASE_URL: (function() {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.protocol === 'file:';
    
    // When testing locally, point to local FastAPI backend
    if (isLocalhost) {
      return 'http://localhost:8000';
    }
    
    // In production on GitHub Pages, point to your deployed backend (e.g. Render/Railway)
    // Replace this with your actual deployed Render URL:
    return 'https://frame-ai-backend.onrender.com';
  })(),

  // Maximum character limit for user prompts
  MAX_MESSAGE_LENGTH: 1000,

  // Maximum number of past conversation turns to retain for context
  MAX_HISTORY_TURNS: 8,

  // Suggested prompt definitions for instant trigger
  SUGGESTED_PROMPTS: [
    {
      label: "📷 Camera Settings",
      query: "What camera settings (aperture, shutter speed, ISO) should I use for golden-hour portraits?"
    },
    {
      label: "👤 Portrait Photography",
      query: "How can I achieve creamy background blur (bokeh) and sharp eyes in outdoor portraits?"
    },
    {
      label: "🌙 Night Photography",
      query: "How do I take clean night street photos without introducing noisy grain?"
    },
    {
      label: "🎨 Editing & Grading",
      query: "What is the best workflow in Lightroom to get cinematic warm orange and teal color tones?"
    },
    {
      label: "📐 Composition Tips",
      query: "Explain leading lines and negative space with practical composition examples."
    },
    {
      label: "🎯 Today's Challenge",
      query: "Give me a creative 1-hour photo challenge with camera settings to try right now!"
    },
    {
      label: "📁 Portfolio Guidance",
      query: "How should I curate and sequence my photos for the college photography exhibition?"
    },
    {
      label: "🔭 Equipment Advice",
      query: "What is the best affordable prime lens for a beginner student photographer?"
    }
  ]
};
