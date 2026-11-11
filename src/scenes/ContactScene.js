import Phaser from 'phaser';
import { COLORS, FONT_FAMILY } from '../utils/constants.js';
import { RESUME_DATA } from '../config/resumeData.js';

export class ContactScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Contact' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // ── Rainbow gradient background ──
    const bg = this.add.graphics();
    const rainbowColors = [
      0x2D1B4E, // dark purple (top)
      0x6B3FA0, // purple
      0x4169E1, // blue
      0x2E8B57, // green
      0xFFD700, // gold
      0xFF8C00, // orange
      0xE891B9, // pink (bottom)
    ];
    const bandH = height / (rainbowColors.length - 1);
    for (let i = 0; i < rainbowColors.length - 1; i++) {
      bg.fillGradientStyle(
        rainbowColors[i], rainbowColors[i],
        rainbowColors[i + 1], rainbowColors[i + 1],
        1
      );
      bg.fillRect(0, i * bandH, width, bandH + 1);
    }

    // ── Floating clouds ──
    const cloudKeys = ['cloud_1', 'cloud_2', 'cloud_3', 'cloud_4'];
    cloudKeys.forEach((key) => {
      const cloud = this.add.image(
        Phaser.Math.Between(50, width - 50),
        Phaser.Math.Between(30, height * 0.35),
        key
      ).setScale(Phaser.Math.FloatBetween(0.35, 0.6)).setAlpha(0.5);

      this.tweens.add({
        targets: cloud,
        x: cloud.x + Phaser.Math.Between(-80, 80),
        duration: Phaser.Math.Between(5000, 8000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // ── Stars / sparkle twinkling ──
    for (let i = 0; i < 20; i++) {
      const starKey = Math.random() > 0.5 ? 'star' : 'star_small';
      const s = this.add.image(
        Phaser.Math.Between(20, width - 20),
        Phaser.Math.Between(10, height * 0.45),
        starKey
      ).setScale(Phaser.Math.FloatBetween(0.25, 0.6)).setAlpha(Phaser.Math.FloatBetween(0.3, 0.9));

      this.tweens.add({
        targets: s,
        alpha: { from: s.alpha, to: Phaser.Math.FloatBetween(0.05, 0.3) },
        duration: Phaser.Math.Between(1000, 2200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // ── Confetti particles ──
    if (this.textures.exists('sparkles')) {
      this.add.particles(0, 0, 'sparkles', {
        x: { min: 0, max: width },
        y: -20,
        gravityY: 50,
        scale: { start: 0.2, end: 0.05 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 4000,
        frequency: 300,
        speedX: { min: -30, max: 30 },
        speedY: { min: 20, max: 60 },
        blendMode: 'ADD',
      });
    }

    if (this.textures.exists('star_small')) {
      this.add.particles(0, 0, 'star_small', {
        x: { min: 0, max: width },
        y: -10,
        gravityY: 40,
        scale: { start: 0.35, end: 0 },
        alpha: { start: 0.9, end: 0 },
        lifespan: 3500,
        frequency: 500,
        speedX: { min: -20, max: 20 },
        speedY: { min: 15, max: 50 },
        rotate: { min: 0, max: 360 },
        blendMode: 'ADD',
      });
    }

    // ── Castle island in center ──
    const castleY = height * 0.52;
    const castle = this.add.image(width / 2, castleY, 'castle_island')
      .setScale(0.55);

    this.tweens.add({
      targets: castle,
      y: castleY - 6,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── Character celebrate on castle ──
    const charY = castleY - 85;
    const character = this.add.image(width / 2, charY, 'celebrate')
      .setScale(0.45);

    this.tweens.add({
      targets: character,
      y: charY - 8,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── "Thanks" heading ──
    const thanksText = this.add.text(width / 2, height * 0.1, 'Thanks for exploring my journey! 🌟', {
      fontFamily: FONT_FAMILY,
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#2D1B4E',
      strokeThickness: 4,
      align: 'center',
      wordWrap: { width: width * 0.85 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: thanksText,
      y: thanksText.y - 5,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── Social bar ──
    const barY = height * 0.82;
    const socialBar = this.add.image(width / 2, barY, 'social_bar').setScale(0.8);

    // Divide the social bar into 4 clickable zones (evenly split)
    const barBounds = socialBar.getBounds();
    const zoneW = barBounds.width / 4;
    const contact = RESUME_DATA.contact || {};
    const links = [
      { label: 'GitHub', url: contact.github },
      { label: 'LinkedIn', url: contact.linkedin },
      { label: 'Email', url: contact.email ? `mailto:${contact.email}` : null },
      { label: 'Resume', url: contact.resume },
    ];

    links.forEach((link, i) => {
      const zoneX = barBounds.left + zoneW * i + zoneW / 2;
      const zone = this.add.zone(zoneX, barY, zoneW, barBounds.height)
        .setInteractive({ useHandCursor: true });

      zone.on('pointerdown', () => {
        if (link.url) {
          window.open(link.url, '_blank');
        }
      });
    });

    // ── Back button (top-left) ──
    const backBtn = this.add.image(85, 40, 'back')
      .setScale(0.55)
      .setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(350, 45, 27, 78);
      this.time.delayedCall(350, () => {
        this.scene.start('Menu');
      });
    });
  }
}
