import { FONT_FAMILY, ISLANDS, DESTINATION } from '../utils/constants.js';

const CONTROLS_TEXT = '←  →  or  A  D   Move        ↑  /  W  /  Space   Jump';

const MARGIN = 20;

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

  // ── Upper-right: Explore Resume button ──
  createExploreButton(width) {
    const btn = this.scene.add
      .image(width - MARGIN, MARGIN, 'explore_resume')
      .setOrigin(1, 0)
      .setScale(0.95)
      .setDepth(150)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setScale(1.0));
    btn.on('pointerout', () => btn.setScale(0.95));
    btn.on('pointerdown', () => {
      btn.setScale(0.9);
      this.scene.events.emit('explore-resume');
    });
    btn.on('pointerup', () => btn.setScale(1.0));

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
