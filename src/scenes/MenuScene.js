import Phaser from 'phaser';
import { COLORS } from '../utils/constants.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Menu' });
  }

  // sky.png scaled uniformly to `width`, with its top 40% faded to transparent
  static horizonTexture(scene, width) {
    const key = 'menu_horizon';
    if (scene.textures.exists(key)) return key;
    const src = scene.textures.get('sky').getSourceImage();
    // sky.png has a semi-transparent 1–4px fringe on its edges: use the clean interior
    const sx = 2, sy = 2, sw = src.width - 4, sh = src.height - 7;
    const h = Math.round(sh * (width / sw));
    const tex = scene.textures.createCanvas(key, width, h);
    const ctx = tex.getContext();
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, width, h);
    ctx.globalCompositeOperation = 'destination-in';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.4, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, h);
    tex.refresh();
    return key;
  }

  create() {
    const { width, height } = this.cameras.main;

    // ── Gradient background ──
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.darkPurple, COLORS.darkPurple, COLORS.purple, COLORS.pink, 1);
    bg.fillRect(0, 0, width, height);

    // ── Sky picture along the bottom ──
    // Shown once at full width with a uniform scale (no repeat → no seam, no
    // stretching), fading softly into the sky at its top (no hard edge)
    this.add.image(0, height, MenuScene.horizonTexture(this, width))
      .setOrigin(0, 1)
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

    // ── Character idle ── (centred in the open sky above the horizon)
    // start-screen size (0.75 of the original art), pre-scaled at boot and drawn 1:1
    const charY = height * 0.5;
    const character = this.add.image(width / 2, charY, 'idle_menu');

    this.tweens.add({
      targets: character,
      y: charY - 10,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── Start button ── (below her, inside the bottom sky band)
    const startBtn = this.add.image(width / 2, height * 0.82, 'start')
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
