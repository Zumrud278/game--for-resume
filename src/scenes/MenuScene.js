import Phaser from 'phaser';
import { PLAYER_SCALE, COLORS, FONT_FAMILY } from '../utils/constants.js';
import { RESUME_DATA } from '../config/resumeData.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Menu' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // ── Gradient background ──
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.darkPurple, COLORS.darkPurple, COLORS.purple, COLORS.pink, 1);
    bg.fillRect(0, 0, width, height);

    // ── Sky tiled at bottom ──
    const sky = this.add.tileSprite(0, height - 90, width, 180, 'sky')
      .setOrigin(0, 0.5)
      .setAlpha(0.35);

    // ── Twinkling stars ──
    for (let i = 0; i < 18; i++) {
      const starKey = Math.random() > 0.5 ? 'star' : 'star_small';
      const s = this.add.image(
        Phaser.Math.Between(30, width - 30),
        Phaser.Math.Between(20, height * 0.55),
        starKey
      ).setScale(Phaser.Math.FloatBetween(0.3, 0.7)).setAlpha(Phaser.Math.FloatBetween(0.3, 0.8));

      this.tweens.add({
        targets: s,
        alpha: { from: s.alpha, to: Phaser.Math.FloatBetween(0.1, 0.4) },
        duration: Phaser.Math.Between(1200, 2500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // ── Floating clouds ──
    const cloudKeys = ['cloud_1', 'cloud_2', 'cloud_3', 'cloud_4'];
    cloudKeys.forEach((key, i) => {
      const cloud = this.add.image(
        Phaser.Math.Between(80, width - 80),
        Phaser.Math.Between(40, height * 0.4),
        key
      ).setScale(Phaser.Math.FloatBetween(0.4, 0.7)).setAlpha(0.6);

      this.tweens.add({
        targets: cloud,
        x: cloud.x + Phaser.Math.Between(-60, 60),
        duration: Phaser.Math.Between(4000, 7000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // ── Sparkle particles ──
    if (this.textures.exists('sparkles')) {
      this.add.particles(0, 0, 'sparkles', {
        x: { min: 0, max: width },
        y: { min: 0, max: height },
        scale: { start: 0.15, end: 0 },
        alpha: { start: 0.6, end: 0 },
        lifespan: 2500,
        frequency: 400,
        blendMode: 'ADD',
      });
    }

    // ── Character idle ──
    const charScale = PLAYER_SCALE * 1.5;
    const charY = height * 0.68;
    const character = this.add.image(width / 2, charY, 'idle')
      .setScale(charScale);

    this.tweens.add({
      targets: character,
      y: charY - 10,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── Speech bubble above character ──
    const bubble = this.add.image(width / 2, charY - 120, 'speech_bubble')
      .setScale(0.85);

    // Greeting text inside bubble
    const greeting = RESUME_DATA.greeting || `Hi! I'm ${RESUME_DATA.name}`;
    this.add.text(width / 2, charY - 125, greeting, {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#2D1B4E',
      align: 'center',
      wordWrap: { width: 200 },
    }).setOrigin(0.5);

    // ── Title ──
    this.add.text(width / 2, height * 0.12, `${RESUME_DATA.name}'s Adventure`, {
      fontFamily: FONT_FAMILY,
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#2D1B4E',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // ── Start button ──
    const startBtn = this.add.image(width / 2, height * 0.88, 'start')
      .setScale(0.85)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: startBtn,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    startBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 45, 27, 78);
      this.time.delayedCall(400, () => {
        this.scene.start('Game');
      });
    });
  }
}
