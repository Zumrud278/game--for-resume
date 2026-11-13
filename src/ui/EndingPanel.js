import { RESUME } from '../data/resume.js';

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Simple inline icons (no external requests)
const ICONS = {
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>',
  resume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
};

// Display text for a URL: drop the protocol and "www."
const prettyUrl = (url) => url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');

/**
 * The ending on the rainbow island:
 *   1. the quote fades in over the sky, line by line
 *   2. a contact card appears with working Email / GitHub / LinkedIn buttons
 *   3. "Play again" restarts from START; "Keep exploring" hides the card
 *      (a small button brings it back)
 */
export class EndingPanel {
  constructor({ onRestart } = {}) {
    this.onRestart = onRestart;
    this.isOpen = false;     // true while the quote/card is blocking the game
    this.timers = [];

    const c = RESUME.contact || {};
    const [q1, q2] = RESUME.endingQuote || ['', ''];

    this.root = document.createElement('div');
    this.root.className = 'end-root';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="end-veil"></div>
      <div class="end-quote" aria-live="polite">
        <p class="end-q1">${escapeHtml(q1)}</p>
        <p class="end-q2">${escapeHtml(q2)}</p>
      </div>
      <section class="end-card" role="dialog" aria-labelledby="end-title" hidden>
        <p class="end-kicker">✦ Journey complete ✦</p>
        <h2 class="end-title" id="end-title">Let's stay in touch</h2>
        <p class="end-sub">Thank you for exploring my journey! You can reach me here:</p>
        <ul class="end-links">
          ${this.linkRow('email', 'Email', c.email ? `mailto:${c.email}` : null, c.email, true)}
          ${this.linkRow('github', 'GitHub', c.github, c.github && prettyUrl(c.github))}
          ${this.linkRow('linkedin', 'LinkedIn', c.linkedin, c.linkedin && prettyUrl(c.linkedin))}
          ${this.linkRow('resume', 'Resume (PDF)', c.resumePdf, c.resumePdf && 'Download')}
        </ul>
        <div class="end-actions">
          <button type="button" class="end-btn end-restart">↺ Play again</button>
          <button type="button" class="end-btn end-stay">Keep exploring</button>
        </div>
      </section>
      <button type="button" class="end-reopen" hidden>✉ Contact &amp; restart</button>`;
    document.body.appendChild(this.root);

    this.el = {
      q1: this.root.querySelector('.end-q1'),
      q2: this.root.querySelector('.end-q2'),
      card: this.root.querySelector('.end-card'),
      restart: this.root.querySelector('.end-restart'),
      stay: this.root.querySelector('.end-stay'),
      reopen: this.root.querySelector('.end-reopen'),
      copy: this.root.querySelector('.end-copy'),
    };

    this.el.restart.addEventListener('click', () => this.onRestart?.());
    this.el.stay.addEventListener('click', () => this.hideCard());
    this.el.reopen.addEventListener('click', () => this.showCard());
    this.el.copy?.addEventListener('click', () => this.copyEmail(c.email));
    this.onKey = (e) => {
      if (e.key === 'Escape' && this.isOpen && !this.el.card.hidden) this.hideCard();
    };
    window.addEventListener('keydown', this.onKey);
  }

  // One contact row (a real link). Nothing is shown when the value is missing.
  linkRow(icon, label, href, value, withCopy = false) {
    if (!href) return '';
    const external = !href.startsWith('mailto:');
    return `<li class="end-link-row">
      <a class="end-link" data-contact="${icon}" href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>
        ${ICONS[icon]}
        <span class="end-link-text"><span class="end-link-label">${label}</span>
        <span class="end-link-value">${escapeHtml(value)}</span></span>
      </a>
      ${withCopy ? '<button type="button" class="end-copy" aria-label="Copy email address">Copy</button>' : ''}
    </li>`;
  }

  // Run the ending sequence
  play() {
    this.clearTimers();
    this.isOpen = true;
    this.root.hidden = false;
    this.el.reopen.hidden = true;
    requestAnimationFrame(() => this.root.classList.add('end-show-veil'));
    this.later(400, () => this.el.q1.classList.add('end-in'));
    this.later(1900, () => this.el.q2.classList.add('end-in'));
    this.later(3900, () => this.showCard());
  }

  showCard() {
    this.isOpen = true;
    this.el.reopen.hidden = true;
    this.el.card.hidden = false;
    this.root.classList.add('end-show-veil');
    requestAnimationFrame(() => this.root.classList.add('end-show-card'));
    this.el.restart.focus({ preventScroll: true });
  }

  // "Keep exploring": hide the card, free the controls, keep a reopen button
  hideCard() {
    this.isOpen = false;
    this.root.classList.remove('end-show-card', 'end-show-veil');
    this.later(450, () => {
      if (!this.isOpen) this.el.card.hidden = true;
    });
    this.el.reopen.hidden = false;
    document.activeElement?.blur?.();
  }

  async copyEmail(email) {
    const btn = this.el.copy;
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // Fallback for browsers without clipboard permission
      const t = document.createElement('textarea');
      t.value = email;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    btn.textContent = 'Copied!';
    this.later(1600, () => (btn.textContent = 'Copy'));
  }

  later(ms, fn) {
    this.timers.push(setTimeout(fn, ms));
  }

  clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  destroy() {
    this.clearTimers();
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }
}
