/**
 * FRAME - Photography Club Website Application Script
 * ==============================================================================
 * Handles website navigation, gallery interactions, and triggers for FRAME AI.
 * ==============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Interactive triggers for FRAME AI from the website
  const challengeBtn = document.getElementById('challenge-trigger-btn');
  if (challengeBtn) {
    challengeBtn.addEventListener('click', () => {
      if (window.FrameAI) {
        window.FrameAI.ask("I'm ready for today's photography challenge! Give me a creative 1-hour assignment with recommended camera settings and composition guidance.");
      }
    });
  }

  // 2. Workshop cards "Ask FRAME AI" triggers
  const workshopBtns = document.querySelectorAll('.workshop-ask-btn');
  workshopBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const topic = e.currentTarget.getAttribute('data-topic');
      if (window.FrameAI && topic) {
        window.FrameAI.ask(`Can you explain the key concepts and camera settings for ${topic}?`);
      }
    });
  });

  // 3. Gallery Card Click - Ask FRAME AI about that shot's settings
  const galleryCards = document.querySelectorAll('.gallery-card');
  galleryCards.forEach(card => {
    card.addEventListener('click', () => {
      const title = card.querySelector('.card-title')?.textContent || 'this photo';
      const meta = card.querySelector('.card-meta')?.textContent || '';
      if (window.FrameAI) {
        window.FrameAI.ask(`How was "${title}" shot (${meta})? Break down the lighting, camera settings, and composition technique.`);
      }
    });
  });

  // 4. Smooth Nav scroll highlighting
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  console.log('FRAME Photography Club site initialized.');
});
