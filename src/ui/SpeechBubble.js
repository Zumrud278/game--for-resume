import Phaser from 'phaser';
import { COLORS, FONT_FAMILY } from '../utils/constants.js';

export class SpeechBubble {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(100);
    this.container.setVisible(false);
    this.container.setScrollFactor(0); // Fixed on screen for readability

    // Background panel
    this.bg = scene.add.graphics();
    this.container.add(this.bg);

    // Title text
    this.titleText = scene.add.text(0, 0, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#2D1B4E',
      strokeThickness: 3,
    });
    this.titleText.setOrigin(0.5, 0);
    this.container.add(this.titleText);

    // Content text
    this.contentText = scene.add.text(0, 0, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#ffffff',
      lineSpacing: 8,
      wordWrap: { width: 340 },
    });
    this.contentText.setOrigin(0.5, 0);
    this.container.add(this.contentText);

    // Close / Explore hint
    this.hintText = scene.add.text(0, 0, '✦ Jump to next island →', {
      fontFamily: FONT_FAMILY,
      fontSize: '12px',
      color: '#C9A0DC',
      fontStyle: 'italic',
    });
    this.hintText.setOrigin(0.5, 0);
    this.container.add(this.hintText);
  }

  show(x, y, data) {
    // If called with show(data)
    if (!data && typeof x === 'object') {
      data = x;
    }
    if (!data) return;

    this.titleText.setText(data.title || '');

    const lines = (data.items || [])
      .map((item) => `✦ ${item.label}\n   ${item.detail}`)
      .join('\n\n');
    this.contentText.setText(lines);

    const camWidth = this.scene.cameras.main.width;
    const camHeight = this.scene.cameras.main.height;
    const cx = camWidth / 2;

    const padding = 24;
    const contentH = this.contentText.height;
    const panelW = 380;
    const panelH = Math.min(45 + contentH + 45 + padding, camHeight - 80);
    const startY = (camHeight - panelH) / 2;

    // Draw stylized fantasy panel background
    this.bg.clear();
    this.bg.fillStyle(0x2D1B4E, 0.94);
    this.bg.fillRoundedRect(cx - panelW / 2, startY, panelW, panelH, 20);

    // Gold/Purple ornate border
    this.bg.lineStyle(3, 0xC9A0DC, 1);
    this.bg.strokeRoundedRect(cx - panelW / 2, startY, panelW, panelH, 20);
    this.bg.lineStyle(1, 0xFFD700, 0.7);
    this.bg.strokeRoundedRect(cx - panelW / 2 + 4, startY + 4, panelW - 8, panelH - 8, 16);

    this.titleText.setPosition(cx, startY + padding);
    this.contentText.setPosition(cx, startY + padding + 35);
    this.hintText.setPosition(cx, startY + panelH - 28);

    this.container.setVisible(true);
    this.container.setAlpha(0);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });
  }

  hide() {
    if (!this.container.visible) return;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => this.container.setVisible(false),
    });
  }

  isVisible() {
    return this.container.visible;
  }
}
