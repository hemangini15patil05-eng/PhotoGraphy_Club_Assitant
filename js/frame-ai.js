/**
 * FRAME AI - Assistant Frontend Controller
 * ==============================================================================
 * Namespaced controller managing the floating aperture launcher, chat interactions,
 * secure API communication with FastAPI backend, safe text rendering, and accessibility.
 * ==============================================================================
 */

(function () {
  'use strict';

  // Prevent multiple initializations
  if (window.__FRAME_AI_INITIALIZED__) return;
  window.__FRAME_AI_INITIALIZED__ = true;

  // State Management
  const state = {
    isOpen: false,
    isLoading: false,
    history: [], // [{ role: 'user', content: '...' }, { role: 'model', content: '...' }]
    lastUserMessage: '',
    backendOnline: false
  };

  // DOM Elements cache
  let dom = {};

  /**
   * Safe HTML Escaper to prevent any XSS injection
   */
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') {
      if (Array.isArray(str)) {
        return str.map(item => (typeof item === 'object' && item !== null) ? (item.msg || JSON.stringify(item)) : String(item)).join('; ');
      }
      if (typeof str === 'object') {
        return str.msg || JSON.stringify(str);
      }
      str = String(str);
    }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Safe Markdown Formatter
   * Converts basic markdown tokens (bold, italics, code, lists) into safe HTML
   */
  function formatMarkdown(text) {
    if (!text) return '';
    
    // 1. First escape everything
    let safe = escapeHTML(text);

    // 2. Format code blocks ```code```
    safe = safe.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gi, function (_, lang, code) {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // 3. Format inline code `code`
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 4. Format bold **text**
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 5. Format italic *text*
    safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 6. Format lists (lines starting with - or * )
    const lines = safe.split('\n');
    let inList = false;
    let formattedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Support markdown headers (### or ##)
      const matchHeader = line.match(/^#{1,4}\s+(.*)$/);
      // Support horizontal rules (--- or ***)
      const matchHR = line.match(/^(-{3,}|\*{3,})$/);
      // Support bullet and numbered lists
      const matchBullet = line.match(/^(\s*)[-*]\s+(.*)$/);
      const matchNumber = line.match(/^(\s*)\d+\.\s+(.*)$/);

      if (matchHeader) {
        if (inList) {
          formattedLines.push('</ul>');
          inList = false;
        }
        formattedLines.push(`<h4 class="frame-ai-heading">${matchHeader[1]}</h4>`);
      } else if (matchHR) {
        if (inList) {
          formattedLines.push('</ul>');
          inList = false;
        }
        formattedLines.push('<hr class="frame-ai-divider">');
      } else if (matchBullet) {
        if (!inList) {
          formattedLines.push('<ul>');
          inList = true;
        }
        formattedLines.push(`<li>${matchBullet[2]}</li>`);
      } else if (matchNumber) {
        if (!inList) {
          formattedLines.push('<ol>');
          inList = true;
        }
        formattedLines.push(`<li>${matchNumber[2]}</li>`);
      } else {
        if (inList) {
          formattedLines.push('</ul>');
          inList = false;
        }
        if (line.trim().length > 0) {
          formattedLines.push(`<p>${line}</p>`);
        }
      }
    }
    if (inList) {
      formattedLines.push('</ul>');
    }

    return formattedLines.join('');
  }

  /**
   * Initializes the Assistant DOM Elements
   */
  function initDOM() {
    dom.launcher = document.getElementById('frame-ai-launcher');
    dom.panel = document.getElementById('frame-ai-panel');
    dom.body = document.getElementById('frame-ai-body');
    dom.messagesContainer = document.getElementById('frame-ai-messages');
    dom.welcome = document.getElementById('frame-ai-welcome');
    dom.textarea = document.getElementById('frame-ai-textarea');
    dom.sendBtn = document.getElementById('frame-ai-send-btn');
    dom.charCount = document.getElementById('frame-ai-char-count');
    dom.closeBtn = document.getElementById('frame-ai-close-btn');
    dom.resetBtn = document.getElementById('frame-ai-reset-btn');
    dom.statusDot = document.getElementById('frame-ai-status-dot');
    dom.statusText = document.getElementById('frame-ai-status-text');
    dom.chipsContainer = document.getElementById('frame-ai-chips');

    // Render suggested question chips
    renderChips();

    // Bind event listeners
    bindEvents();

    // Check backend health
    checkBackendHealth();
  }

  /**
   * Renders the interactive question chips from config
   */
  function renderChips() {
    if (!dom.chipsContainer || !FRAME_AI_CONFIG.SUGGESTED_PROMPTS) return;
    dom.chipsContainer.innerHTML = '';

    FRAME_AI_CONFIG.SUGGESTED_PROMPTS.forEach(item => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'frame-ai-chip';
      chip.textContent = item.label;
      chip.setAttribute('aria-label', `Ask: ${item.label}`);
      chip.addEventListener('click', () => {
        sendMessage(item.query);
      });
      dom.chipsContainer.appendChild(chip);
    });
  }

  /**
   * Attach all keyboard and click event listeners
   */
  function bindEvents() {
    // Toggle launcher
    dom.launcher.addEventListener('click', togglePanel);

    // Close button
    if (dom.closeBtn) {
      dom.closeBtn.addEventListener('click', closePanel);
    }

    // Reset button
    if (dom.resetBtn) {
      dom.resetBtn.addEventListener('click', resetChat);
    }

    // Textarea input sizing and character counter
    dom.textarea.addEventListener('input', handleTextInput);

    // Keyboard submit (Enter sends, Shift+Enter new line)
    dom.textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    });

    // Send button click
    dom.sendBtn.addEventListener('click', handleSubmit);

    // Global Escape key to close panel
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.isOpen) {
        closePanel();
        dom.launcher.focus();
      }
    });
  }

  /**
   * Toggle Chat Panel visibility
   */
  function togglePanel() {
    if (state.isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function openPanel() {
    state.isOpen = true;
    dom.panel.classList.add('frame-ai-open');
    dom.launcher.classList.add('frame-ai-active');
    dom.launcher.setAttribute('aria-expanded', 'true');
    dom.panel.setAttribute('aria-hidden', 'false');

    // Auto-focus input on desktop
    if (window.innerWidth > 600) {
      setTimeout(() => {
        dom.textarea.focus();
      }, 200);
    }
    scrollToBottom();
  }

  function closePanel() {
    state.isOpen = false;
    dom.panel.classList.remove('frame-ai-open');
    dom.launcher.classList.remove('frame-ai-active');
    dom.launcher.setAttribute('aria-expanded', 'false');
    dom.panel.setAttribute('aria-hidden', 'true');
  }

  /**
   * Handle text input adjustments
   */
  function handleTextInput() {
    const text = dom.textarea.value;
    const len = text.length;
    const max = FRAME_AI_CONFIG.MAX_MESSAGE_LENGTH;

    dom.charCount.textContent = `${len} / ${max}`;
    if (len > max) {
      dom.charCount.style.color = '#ff6b6b';
      dom.sendBtn.disabled = true;
    } else {
      dom.charCount.style.color = '';
      dom.sendBtn.disabled = state.isLoading || text.trim().length === 0;
    }

    // Auto resize height
    dom.textarea.style.height = 'auto';
    dom.textarea.style.height = Math.min(dom.textarea.scrollHeight, 100) + 'px';
  }

  /**
   * Submit current textarea value
   */
  function handleSubmit() {
    const text = dom.textarea.value.trim();
    if (!text || state.isLoading) return;
    if (text.length > FRAME_AI_CONFIG.MAX_MESSAGE_LENGTH) return;

    dom.textarea.value = '';
    dom.textarea.style.height = 'auto';
    dom.charCount.textContent = `0 / ${FRAME_AI_CONFIG.MAX_MESSAGE_LENGTH}`;
    sendMessage(text);
  }

  /**
   * Reset conversation
   */
  function resetChat() {
    state.history = [];
    dom.messagesContainer.innerHTML = '';
    if (dom.welcome) {
      dom.welcome.style.display = 'block';
    }
    dom.textarea.value = '';
    dom.textarea.style.height = 'auto';
    dom.charCount.textContent = `0 / ${FRAME_AI_CONFIG.MAX_MESSAGE_LENGTH}`;
    dom.sendBtn.disabled = false;
    scrollToBottom();
  }

  /**
   * Append message bubble to UI
   */
  function appendMessage(role, text) {
    if (dom.welcome) {
      dom.welcome.style.display = 'none';
    }

    const msgEl = document.createElement('div');
    msgEl.className = `frame-ai-message ${role === 'user' ? 'frame-ai-message-user' : 'frame-ai-message-ai'}`;

    if (role === 'model' || role === 'assistant') {
      const avatar = document.createElement('div');
      avatar.className = 'frame-ai-msg-avatar';
      avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`;
      msgEl.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = 'frame-ai-bubble';
    bubble.innerHTML = formatMarkdown(text);
    msgEl.appendChild(bubble);

    dom.messagesContainer.appendChild(msgEl);
    scrollToBottom();
  }

  /**
   * Show typing indicator
   */
  function showTypingIndicator() {
    const typingEl = document.createElement('div');
    typingEl.id = 'frame-ai-typing-indicator';
    typingEl.className = 'frame-ai-message frame-ai-message-ai';
    typingEl.innerHTML = `
      <div class="frame-ai-msg-avatar">
        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
      </div>
      <div class="frame-ai-typing">
        <div class="frame-ai-typing-dot"></div>
        <div class="frame-ai-typing-dot"></div>
        <div class="frame-ai-typing-dot"></div>
      </div>
    `;
    dom.messagesContainer.appendChild(typingEl);
    scrollToBottom();
  }

  /**
   * Remove typing indicator
   */
  function removeTypingIndicator() {
    const indicator = document.getElementById('frame-ai-typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Show error with retry option
   */
  function showError(errorMessage, retryQuery) {
    removeTypingIndicator();
    const errorContainer = document.createElement('div');
    errorContainer.className = 'frame-ai-message frame-ai-message-ai';
    
    const avatar = document.createElement('div');
    avatar.className = 'frame-ai-msg-avatar';
    avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`;
    errorContainer.appendChild(avatar);

    const bubble = document.createElement('div');
    bubble.className = 'frame-ai-bubble';
    
    const box = document.createElement('div');
    box.className = 'frame-ai-error-box';
    box.innerHTML = `<strong>Assistant Alert:</strong> ${escapeHTML(errorMessage)}`;

    if (retryQuery) {
      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'frame-ai-retry-btn';
      retryBtn.innerHTML = `↻ Retry Request`;
      retryBtn.addEventListener('click', () => {
        errorContainer.remove();
        sendMessage(retryQuery);
      });
      box.appendChild(retryBtn);
    }

    bubble.appendChild(box);
    errorContainer.appendChild(bubble);
    dom.messagesContainer.appendChild(errorContainer);
    scrollToBottom();
  }

  /**
   * Auto scroll message container
   */
  function scrollToBottom() {
    if (dom.body) {
      dom.body.scrollTop = dom.body.scrollHeight;
    }
  }

  /**
   * Ping backend to check health
   */
  async function checkBackendHealth() {
    try {
      const response = await fetch(`${FRAME_AI_CONFIG.API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      if (response.ok) {
        state.backendOnline = true;
        if (dom.statusDot) dom.statusDot.classList.remove('offline');
        if (dom.statusText) dom.statusText.textContent = 'PHOTOGRAPHY CLUB ASSISTANT';
      } else {
        markOffline();
      }
    } catch (err) {
      markOffline();
    }
  }

  function markOffline() {
    state.backendOnline = false;
    if (dom.statusDot) dom.statusDot.classList.add('offline');
    if (dom.statusText) dom.statusText.textContent = 'ASSISTANT READY (STANDBY)';
  }

  /**
   * Send user message to FastAPI backend
   */
  async function sendMessage(text) {
    if (!text || state.isLoading) return;

    state.isLoading = true;
    state.lastUserMessage = text;
    dom.sendBtn.disabled = true;

    // Open panel if closed
    if (!state.isOpen) {
      openPanel();
    }

    // Render user message bubble
    appendMessage('user', text);

    // Show AI typing indicator
    showTypingIndicator();

    // Prepare bounded history context
    const recentHistory = state.history.slice(-FRAME_AI_CONFIG.MAX_HISTORY_TURNS).map(h => ({
      role: h.role,
      content: String(h.content).slice(0, 4000)
    }));

    try {
      const payload = {
        message: text,
        history: recentHistory
      };

      const response = await fetch(`${FRAME_AI_CONFIG.API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25000)
      });

      removeTypingIndicator();

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        let detailMsg = errData.detail;
        if (Array.isArray(detailMsg)) {
          detailMsg = detailMsg.map(d => d.msg || d).join(', ');
        } else if (typeof detailMsg === 'object' && detailMsg !== null) {
          detailMsg = detailMsg.msg || JSON.stringify(detailMsg);
        } else if (!detailMsg) {
          detailMsg = `Server returned status ${response.status}. Please try again.`;
        }
        showError(detailMsg, text);
        return;
      }

      const data = await response.json();
      const reply = data.reply || 'No response received from the assistant.';

      // Save to conversation history
      state.history.push({ role: 'user', content: text });
      state.history.push({ role: 'model', content: reply });

      // Append assistant reply bubble
      appendMessage('model', reply);

      // Keep status active
      if (dom.statusDot) dom.statusDot.classList.remove('offline');

    } catch (err) {
      removeTypingIndicator();
      let errorMsg = 'Could not establish connection with the AI server.';
      if (err.name === 'TimeoutError') {
        errorMsg = 'Request timed out waiting for the AI model to respond.';
      } else if (!navigator.onLine) {
        errorMsg = 'No network connection detected. Please check your internet.';
      }
      showError(errorMsg, text);
    } finally {
      state.isLoading = false;
      handleTextInput();
    }
  }

  // Public API exposure for external triggers (e.g. website workshop buttons)
  window.FrameAI = {
    open: openPanel,
    close: closePanel,
    ask: sendMessage,
    reset: resetChat
  };

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDOM);
  } else {
    initDOM();
  }
})();
