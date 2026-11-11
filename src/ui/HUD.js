import { FONT_FAMILY, ISLANDS } from '../utils/constants.js';

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

  setLevel(index) {
    this.levelText.setText(`Level ${index + 1} / ${ISLANDS.length}`);
    this.levelName.setText(ISLANDS[index].label);

    this.scene.tweens.add({
      targets: this.level,
      scale: { from: 1.08, to: 1 },
      duration: 250,
      ease: 'Back.easeOut',
    });
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
      .text(width / 2, height - MARGIN - 4, '←  →  or  A  D   Move        ↑  /  W  /  Space   Jump', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#FFFFFF',
      })
      .setOrigin(0.5, 1)
      .setDepth(151);

    const padX = 22;
    const padY = 8;
    const bg = this.scene.add.graphics().setDepth(150);
    bg.fillStyle(0x2D1B4E, 0.7);
    bg.fillRoundedRect(
      text.x - text.width / 2 - padX,
      text.y - text.height - padY,
      text.width + padX * 2,
      text.height + padY * 2,
      12
    );
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
