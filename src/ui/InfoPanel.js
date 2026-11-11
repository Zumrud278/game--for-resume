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

/**
 * Purple resume information panel, drawn as an HTML overlay so the text
 * is crisp, scrollable and responsive at any screen size.
 *
 *   panel.showSection(section)  – one island's information
 *   panel.showAll()             – the whole resume (Explore Resume button)
 *   panel.close()
 *   panel.isOpen
 */
export class InfoPanel {
  constructor({ onOpen, onClose } = {}) {
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.isOpen = false;

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
          <span class="rp-hint">Press Esc to close</span>
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
    this.onKey = (e) => {
      if (this.isOpen && e.key === 'Escape') this.close();
    };
    window.addEventListener('keydown', this.onKey);
  }

  showSection(section) {
    this.el.icon.src = ICON_SRC[section.icon] || ICON_SRC.star;
    this.el.level.textContent = `Level ${section.level}`;
    this.el.title.textContent = section.title;
    this.el.body.innerHTML = this.renderItems(section.items);
    this.el.cont.textContent = 'Continue ✦';
    this.open();
  }

  showAll() {
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
    this.el.close.focus({ preventScroll: true });
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
