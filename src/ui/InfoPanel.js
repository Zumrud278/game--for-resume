import { RESUME } from '../data/resume.js';

// Image file for each icon key used in resume.js
const ICON_SRC = {
  education: 'assets/objects/education.png',
  skills: 'assets/objects/skills.png',
  projects: 'assets/objects/projects.png',
  certificate: 'assets/objects/certificate.png',
  trophy: 'assets/objects/trophy.png',
  star: 'assets/effects/star.png',
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Safe text with **bold** support
const richText = (s) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
// Only web links and files inside the project are allowed in links / images
const safeUrl = (u) => (/^(https?:\/\/|assets\/)/.test(u || '') ? escapeHtml(u) : '#');

/**
 * Purple resume information panel, drawn as an HTML overlay so the text
 * is crisp, scrollable and responsive at any screen size.
 *
 *   panel.showSection(section, nodeIndex)
 *        – one island's information as a small card at the top of the
 *          screen: no backdrop, the game keeps running around it
 *   panel.showAll()   – the whole resume (Explore Resume button), full panel
 *                       over a dimmed backdrop; the game waits while it's open
 *   panel.close()
 *   panel.isOpen      panel.blocksGame (true only for the full panel)
 */
export class InfoPanel {
  constructor({ onOpen, onClose } = {}) {
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.isOpen = false;
    this.compact = false;
    this.nodeIndex = null;

    this.root = document.createElement('div');
    this.root.className = 'rp-overlay';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="rp-panel" role="dialog" aria-modal="true" aria-labelledby="rp-title">
        <button type="button" class="rp-close" aria-label="Close">✕</button>
        <header class="rp-header">
          <img class="rp-icon" alt="" />
          <div>
            <p class="rp-level"></p>
            <h2 class="rp-title" id="rp-title"></h2>
          </div>
        </header>
        <div class="rp-body"></div>
        <footer class="rp-footer">
          <span class="rp-hint">Press Enter or Esc to close</span>
          <button type="button" class="rp-continue">Continue ✦</button>
        </footer>
      </div>`;
    document.body.appendChild(this.root);

    this.el = {
      icon: this.root.querySelector('.rp-icon'),
      level: this.root.querySelector('.rp-level'),
      title: this.root.querySelector('.rp-title'),
      body: this.root.querySelector('.rp-body'),
      close: this.root.querySelector('.rp-close'),
      cont: this.root.querySelector('.rp-continue'),
    };

    this.el.close.addEventListener('click', () => this.close());
    this.el.cont.addEventListener('click', () => this.close());
    // Click on the dimmed backdrop (outside the panel) closes it
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target === this.root) this.close();
    });
    // Enter or Esc closes it (a key still held from before doesn't count)
    this.onKey = (e) => {
      if (!this.isOpen || e.repeat) return;
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();          // no extra click on the focused button
        this.close();
      }
    };
    window.addEventListener('keydown', this.onKey);
  }

  /** The full panel pauses the game; the small node card doesn't. */
  get blocksGame() {
    return this.isOpen && !this.compact;
  }

  setCompact(on) {
    this.compact = on;
    this.root.classList.toggle('rp-compact', on);
    this.root.querySelector('.rp-panel').setAttribute('aria-modal', on ? 'false' : 'true');
  }

  showSection(section, nodeIndex = null) {
    this.setCompact(true);
    this.nodeIndex = nodeIndex;
    this.el.icon.src = ICON_SRC[section.icon] || ICON_SRC.star;
    this.el.level.textContent = `Level ${section.level}`;
    this.el.title.textContent = section.title;
    this.el.body.innerHTML = this.renderItems(section.items);
    this.el.cont.textContent = 'Continue ✦';
    this.open();
  }

  showAll() {
    this.setCompact(false);
    this.nodeIndex = null;
    this.el.icon.src = ICON_SRC.star;
    this.el.level.textContent = `${RESUME.name}'s journey`;
    this.el.title.textContent = 'Resume';
    this.el.body.innerHTML = RESUME.sections
      .map(
        (s) => `
        <section class="rp-section">
          <h3 class="rp-section-title">
            <img src="${ICON_SRC[s.icon] || ICON_SRC.star}" alt="" />
            Level ${s.level} – ${escapeHtml(s.title)}
          </h3>
          ${this.renderItems(s.items)}
        </section>`
      )
      .join('');
    this.el.cont.textContent = 'Back to the game ✦';
    this.open();
  }

  renderItems(items) {
    const li = items.map((item) => {
      if (item.placeholder) {
        return `<li class="rp-item rp-placeholder">${escapeHtml(item.placeholder)}<span class="rp-tag">to add</span></li>`;
      }
      return `<li class="rp-item">
          ${item.title ? `<p class="rp-item-title">${richText(item.title)}</p>` : ''}
          ${item.text ? `<p class="rp-item-text">${richText(item.text)}</p>` : ''}
          ${item.image ? `<a class="rp-image" href="${safeUrl(item.image.src)}" target="_blank" rel="noopener" title="Open full size"><img src="${safeUrl(item.image.src)}" alt="${escapeHtml(item.image.alt || '')}" loading="lazy" /></a>` : ''}
          ${item.link ? `<a class="rp-link" href="${safeUrl(item.link.url)}" target="_blank" rel="noopener">${escapeHtml(item.link.label || 'Open link')}</a>` : ''}
        </li>`;
    });
    return `<ul class="rp-list">${li.join('')}</ul>`;
  }

  open() {
    this.el.body.scrollTop = 0;
    if (!this.isOpen) {
      this.isOpen = true;
      this.root.hidden = false;
      // next frame → fade/slide in
      requestAnimationFrame(() => this.root.classList.add('rp-visible'));
      this.onOpen?.();
    }
    // The full panel takes keyboard focus; the small card leaves it with the
    // game (so arrows / Space keep moving her, and Space can't "click" a button)
    if (this.compact) document.activeElement?.blur?.();
    else this.el.close.focus({ preventScroll: true });
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.classList.remove('rp-visible');
    setTimeout(() => {
      if (!this.isOpen) this.root.hidden = true;
    }, 220);
    // Give keyboard focus back to the game
    document.activeElement?.blur?.();
    this.onClose?.();
  }

  destroy() {
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }
}
