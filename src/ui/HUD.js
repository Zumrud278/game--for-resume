import Phaser from 'phaser';
import { FONT_FAMILY, ISLANDS, DESTINATION } from '../utils/constants.js';

const CONTROLS_TEXT = '←  →  or  A  D   Move        ↑  /  W  /  Space   Jump';

const MARGIN = 20;

// Explore Resume button: drawn as pixel art on a small grid (1 art pixel =
// BTN.px screen pixels) with nearest-neighbour scaling → crisp edges
const BTN = { px: 2, gw: 104, gh: 28 };
BTN.w = BTN.gw * BTN.px;
BTN.h = BTN.gh * BTN.px;

function makeButtonTextures(scene) {
  const variants = {
    btn_explore: { body: '#6b3fa0', top: '#9a6fd0', bottom: '#47286f' },
    btn_explore_hover: { body: '#7d4fb8', top: '#b48be6', bottom: '#56318a' },
    btn_explore_down: { body: '#5a3389', top: '#6b3fa0', bottom: '#3c2160' },
  };
  Object.entries(variants).forEach(([key, c]) => {
    if (scene.textures.exists(key)) return;
    const { gw: W, gh: H } = BTN;
    const tex = scene.textures.createCanvas(key, W, H);
    const ctx = tex.getContext();
    const rect = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    const px = (x, y, col) => rect(x, y, 1, 1, col);
    // outline with chamfered (pixel-rounded) corners
    rect(2, 0, W - 4, H, '#1b0f33'); rect(0, 2, W, H - 4, '#1b0f33'); rect(1, 1, W - 2, H - 2, '#1b0f33');
    // body with bevel: lit top, shaded bottom
    rect(2, 2, W - 4, H - 4, c.body);
    rect(3, 2, W - 6, 3, c.top);
    rect(3, H - 6, W - 6, 3, c.bottom);
    // lavender inner rim
    rect(3, 1, W - 6, 1, '#c9a0dc'); rect(1, 3, 1, H - 6, '#c9a0dc');
    rect(W - 2, 3, 1, H - 6, '#9a6fd0'); rect(3, H - 2, W - 6, 1, '#9a6fd0');
    // gold corner studs
    [[3, 3], [W - 5, 3], [3, H - 5], [W - 5, H - 5]].forEach(([x, y]) => { rect(x, y, 2, 2, '#ffd34d'); px(x, y, '#fff2b0'); });
    // pixel star icon (with outline + highlight)
    const sx = 9, sy = 8;
    const star = [
      '....#....', '....#....', '...###...', '#########', '.#######.', '..#####..', '..##.##..', '.##...##.', '##.....##',
    ];
    star.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '#') px(sx + x, sy + y + 1, '#8a5a12');   // drop shadow
    }));
    star.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '#') px(sx + x, sy + y, y < 4 ? '#ffe680' : '#ffd34d');
    }));
    px(sx + 4, sy + 2, '#ffffff'); px(sx + 3, sy + 3, '#fff6c8');
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  });
}

/**
 * Screen-fixed overlay:
 *  - level indicator (upper-left)
 *  - Explore Resume button (upper-right)
 *  - keyboard instructions (bottom)
 */
export class HUD {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = scene.scale.gameSize;

    this.createLevelIndicator();
    this.createStarCounter();
    this.createExploreButton(width);
    this.createInstructions(width, height);
    this.layout(width, height);
  }

  // Keep the right / bottom anchored elements in place at any view size
  layout(width, height) {
    this.exploreButton.setPosition(width - MARGIN - BTN.w, MARGIN);
    this.instructions.setPosition(width / 2, height - MARGIN - 4);
    this.drawInstructionsBg();
  }

  // ── Upper-left: level badge ──
  // Drawn with graphics because assets/ui/level.png has "Level 1 / 5" baked in.
  createLevelIndicator() {
    const w = 230;
    const h = 48;
    this.level = this.scene.add.container(MARGIN, MARGIN).setDepth(150);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x2D1B4E, 0.85);
    bg.fillRoundedRect(0, 0, w, h, 14);
    bg.lineStyle(2, 0xC9A0DC, 1);
    bg.strokeRoundedRect(0, 0, w, h, 14);

    const star = this.scene.add.image(26, h / 2, 'star').setScale(0.5);

    this.levelText = this.scene.add
      .text(50, 7, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#FFFFFF',
      });

    this.levelName = this.scene.add
      .text(50, 27, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        color: '#C9A0DC',
      });

    this.level.add([bg, star, this.levelText, this.levelName]);
    this.setLevel(0);
  }

  // 0 = START, 1–4 = resume levels, ISLANDS.length = rainbow island
  setLevel(index) {
    const levels = ISLANDS.length - 1;
    if (index === 0) {
      this.levelText.setText('Start');
      this.levelName.setText('Begin the journey');
    } else if (index >= ISLANDS.length) {
      this.levelText.setText(DESTINATION.hudName + ' ✦');
      this.levelName.setText('Journey complete!');
    } else {
      this.levelText.setText(`Level ${index} / ${levels}`);
      this.levelName.setText(ISLANDS[index].hudName);
    }

    this.scene.tweens.add({
      targets: this.level,
      scale: { from: 1.08, to: 1 },
      duration: 250,
      ease: 'Back.easeOut',
    });
  }

  // ── Under the level badge: collected stars ──
  createStarCounter() {
    const h = 34;
    this.starBox = this.scene.add.container(MARGIN, MARGIN + 56).setDepth(150);
    this.starBg = this.scene.add.graphics();
    const icon = this.scene.add.image(18, h / 2, 'star').setScale(0.4);
    this.starText = this.scene.add.text(36, h / 2, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#FFE37A',
    }).setOrigin(0, 0.5);
    this.starBox.add([this.starBg, icon, this.starText]);
    this.setStars(0, 0, false);
  }

  setStars(count, total, pulse = true) {
    this.starText.setText(`${count} / ${total}`);
    const w = 48 + this.starText.width;
    const h = 34;
    this.starBg.clear();
    this.starBg.fillStyle(0x2D1B4E, 0.85);
    this.starBg.fillRoundedRect(0, 0, w, h, h / 2);
    this.starBg.lineStyle(2, count && count === total ? 0xFFD700 : 0xC9A0DC, 1);
    this.starBg.strokeRoundedRect(0, 0, w, h, h / 2);
    if (pulse) {
      this.scene.tweens.add({ targets: this.starBox, scale: { from: 1.15, to: 1 }, duration: 260, ease: 'Back.easeOut' });
    }
  }

  // ── Upper-right: Explore Resume button (crisp pixel art) ──
  createExploreButton(width) {
    makeButtonTextures(this.scene);
    const face = this.scene.add.image(0, 0, 'btn_explore').setOrigin(0, 0).setScale(BTN.px);
    const label = this.scene.add
      .text(BTN.w / 2 + 12, BTN.h / 2 - 2, 'Explore Resume', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#FFFFFF',
        resolution: 2,                                   // extra-sharp text
        shadow: { offsetX: 0, offsetY: 2, color: '#2a1846', blur: 0, fill: true },
      })
      .setOrigin(0.5, 0.5);
    const btn = this.scene.add.container(width - MARGIN - BTN.w, MARGIN, [face, label]).setDepth(150);
    btn.setSize(BTN.w, BTN.h);
    // (a Container's hit area is measured from its centre, hence the w/2, h/2 offset)
    btn.setInteractive(new Phaser.Geom.Rectangle(BTN.w / 2, BTN.h / 2, BTN.w, BTN.h), Phaser.Geom.Rectangle.Contains);
    btn.input.cursor = 'pointer';

    const state = (key, dy) => { face.setTexture(key); face.y = dy; label.y = BTN.h / 2 - 2 + dy; };
    btn.on('pointerover', () => state('btn_explore_hover', -1));
    btn.on('pointerout', () => state('btn_explore', 0));
    btn.on('pointerdown', () => {
      state('btn_explore_down', 2);
      this.scene.events.emit('explore-resume');
    });
    btn.on('pointerup', () => state('btn_explore_hover', -1));

    this.exploreButton = btn;
  }

  // ── Bottom: keyboard controls ──
  createInstructions(width, height) {
    const text = this.scene.add
      .text(width / 2, height - MARGIN - 4, CONTROLS_TEXT, {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#FFFFFF',
      })
      .setOrigin(0.5, 1)
      .setDepth(151);

    this.instructions = text;
    this.instructionsBg = this.scene.add.graphics().setDepth(150);
    this.drawInstructionsBg();
  }

  drawInstructionsBg() {
    const t = this.instructions;
    const padX = 22;
    const padY = 8;
    const bg = this.instructionsBg;
    bg.clear();
    bg.fillStyle(0x2D1B4E, 0.7);
    bg.fillRoundedRect(t.x - t.width / 2 - padX, t.y - t.height - padY, t.width + padX * 2, t.height + padY * 2, 12);
  }

  // Swap the bottom bar text (e.g. during the balloon journey)
  setInstructions(message = CONTROLS_TEXT) {
    this.instructions.setText(message);
    this.drawInstructionsBg();
  }

  // Small temporary message under the top bar
  toast(message) {
    const { width } = this.scene.scale.gameSize;
    this.currentToast?.destroy();
    const t = this.scene.add
      .text(width - MARGIN, 90, message, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#FFFFFF',
        backgroundColor: 'rgba(45,27,78,0.85)',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(1, 0)
      .setDepth(160);
    this.currentToast = t;
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 1600, duration: 400, onComplete: () => t.destroy() });
  }
}
