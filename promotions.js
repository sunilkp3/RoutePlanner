(() => {
  'use strict';
  const dialog = document.getElementById('promo-dialog');
  const cards = [...document.querySelectorAll('.sponsor-list .promo')];
  const key = 'blrmetro-promotion-v1';
  const sessionKey = 'blrmetro-promotion-session-v2';
  const cooldown = 30 * 60 * 1000;
  if (!dialog || !cards.length || typeof dialog.showModal !== 'function') return;

  function readState() {
    try {
      if (sessionStorage.getItem(sessionKey)) return null;
      const state = JSON.parse(localStorage.getItem(key) || '{}');
      return state && typeof state === 'object' ? state : {};
    } catch (_) {
      return null;
    }
  }

  function track(eventName, promotionId) {
    // Use the site's existing Google Analytics tags; never block navigation.
    try {
      if (typeof window.gtag === 'function') window.gtag(eventName, {
        promotion_id: promotionId,
        promotion_name: promotionId,
        creative_slot: 'arrival_popup'
      });
    } catch (_) {}
  }

  let shown = false;
  let timer;
  let previousFocus;
  const pageVisible = () => !document.hidden;
  const eligible = state => state && !(Number.isFinite(state.lastShown) && Date.now() - state.lastShown < cooldown);

  function show() {
    timer = undefined;
    const state = readState();
    if (shown || !pageVisible() || !eligible(state) || document.querySelector('dialog[open]')) return;
    const index = Number.isInteger(state.nextIndex) && state.nextIndex >= 0 ? state.nextIndex % cards.length : 0;
    const card = cards[index].cloneNode(true);
    const url = new URL(card.href);
    url.searchParams.set('utm_medium', 'popup');
    card.href = url.href;
    const promotionId = url.searchParams.get('utm_content') || String(index);
    card.addEventListener('click', () => {
      track('select_promotion', promotionId);
      dialog.close();
    });
    document.getElementById('promo-dialog-content').replaceChildren(card);
    // Skip the popup if frequency capping cannot be saved.
    try {
      sessionStorage.setItem(sessionKey, 'shown');
      localStorage.setItem(key, JSON.stringify({ lastShown: Date.now(), nextIndex: (index + 1) % cards.length }));
    } catch (_) { return; }
    previousFocus = document.activeElement;
    dialog.showModal();
    document.documentElement.classList.add('promo-open');
    shown = true;
    track('view_promotion', promotionId);
  }

  function schedule() {
    if (!pageVisible()) {
      clearTimeout(timer);
      timer = undefined;
    } else if (!shown && timer === undefined && eligible(readState())) {
      timer = setTimeout(show, 5000);
    }
  }
  document.getElementById('promo-close').addEventListener('click', () => dialog.close());
  document.getElementById('promo-continue').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('promo-open');
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
  });
  // Native dialog supplies Escape dismissal, focus trapping and an inert background.
  document.addEventListener('visibilitychange', schedule);
  schedule();
})();
