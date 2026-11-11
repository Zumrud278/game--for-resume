import Phaser from 'phaser';
import { Island } from '../entities/Island.js';
import { DESTINATION, ISLANDS } from '../utils/constants.js';

// No rainbow, flower or platform images exist in assets/, so those are drawn
// with Phaser graphics. The castle island and clouds are your real assets.
const RAINBOW = [0xff6b6b, 0xffa94d, 0xffe066, 0x8ce99a, 0x74c0fc, 0x9775fa, 0xe599f7];
const OUTER_R = 340;
const BAND = 17;
const FLOWER_COLORS = { pink: 0xff8fc8, purple: 0xb57bff, yellow: 0xffe066, white: 0xfff4fb };

/**
 * The final destination: a small castle island under a large rainbow,
 * with flowers, a glowing landing platform, clouds, stars and a
 * purple-pink magical glow.
 */
export class RainbowDestination {
  constructor(scene) {
    this.scene = scene;
    const { x, surfaceY } = DESTINATION;
    this.cx = x;
    this.cy = surfaceY - 30;
    this.progress = 0;     // 0 = hidden, 1 = full arc
    this.revealed = false;

    // Soft radial glow behind everything — fades in with the reveal
    this.glow = scene.add
      .image(this.cx, this.cy - 80, RainbowDestination.glowTexture(scene))
      .setDepth(0)
      .setAlpha(0);

    this.arc = scene.add.graphics().setDepth(1).setAlpha(0.92);

    // Clouds: big puffs hiding the rainbow's feet + soft pink mist around
    this.puffs = [-1, 1].map((side) =>
      scene.add
        .image(this.cx + side * (OUTER_R - BAND * 3), this.cy + 14, 'cloud_3')
        .setScale(1.15)
        .setDepth(3)
    );
    [
      [-430, 130, 'cloud_1', 1.1], [440, 90, 'cloud_4', 1.2],
      [-260, 250, 'cloud_2', 1.3], [300, 260, 'cloud_1', 1.0],
    ].forEach(([dx, dy, key, sc], i) => {
      const c = scene.add
        .image(this.cx + dx, this.cy + dy, key)
        .setScale(sc)
        .setTint(0xffc4e8)
        .setAlpha(0.7)
        .setDepth(i < 2 ? 1 : 3);
      scene.tweens.add({ targets: c, x: c.x + 30, duration: 6000 + i * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // Castle island — solid, so she can land on it
    this.island = new Island(scene, DESTINATION, ISLANDS.length);

    this.createFlowers();
    this.createLandingPlatform();
  }

  // ── Flowers along the grass ────────────────────────────────────
  createFlowers() {
    const scene = this.scene;
    Object.entries(FLOWER_COLORS).forEach(([name, color]) => {
      const key = `flower_${name}`;
      if (scene.textures.exists(key)) return;
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x4f9e3a, 1);                 // stem + leaf
      g.fillRect(9, 12, 2, 14);
      g.fillEllipse(14, 20, 7, 4);
      g.fillStyle(color, 1);                    // 5 petals
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        g.fillCircle(10 + Math.cos(a) * 5, 10 + Math.sin(a) * 5, 4);
      }
      g.fillStyle(0xffd34d, 1);                 // centre
      g.fillCircle(10, 10, 3);
      g.generateTexture(key, 20, 26);
      g.destroy();
    });

    const half = this.island.image.displayWidth * 0.36;
    const names = Object.keys(FLOWER_COLORS);
    const rnd = new Phaser.Math.RandomDataGenerator(['rainbow-flowers']);
    for (let i = 0; i < 16; i++) {
      const fx = this.cx - half + (i / 15) * half * 2 + rnd.between(-8, 8);
      if (Math.abs(fx - DESTINATION.landingX) < 46) continue;   // keep the platform clear
      const f = scene.add
        .image(fx, DESTINATION.surfaceY + rnd.between(2, 9), `flower_${names[i % names.length]}`)
        .setOrigin(0.5, 1)
        .setScale(rnd.realInRange(0.9, 1.25))
        .setDepth(5);
      scene.tweens.add({
        targets: f,
        angle: { from: -6, to: 6 },
        duration: rnd.between(1400, 2200),
        delay: rnd.between(0, 800),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // ── Simple glowing landing platform ────────────────────────────
  createLandingPlatform() {
    const scene = this.scene;
    const x = DESTINATION.landingX;
    const y = DESTINATION.surfaceY + 4;

    this.pad = scene.add.graphics().setDepth(4);
    this.pad.fillStyle(0xffb3e0, 0.35);
    this.pad.fillEllipse(x, y, 110, 26);
    this.pad.lineStyle(3, 0xffffff, 0.85);
    this.pad.strokeEllipse(x, y, 92, 20);
    this.pad.lineStyle(2, 0xd59bff, 0.9);
    this.pad.strokeEllipse(x, y, 70, 14);

    scene.tweens.add({
      targets: this.pad,
      alpha: { from: 0.55, to: 1 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.padPos = { x, y };
  }

  // Called by the balloon journey on touchdown
  onLanded() {
    const scene = this.scene;
    const { x, y } = this.padPos;
    // Ring of light expanding from the platform
    const ring = scene.add.ellipse(x, y, 90, 20).setStrokeStyle(3, 0xffffff, 1).setDepth(6);
    scene.tweens.add({
      targets: ring,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 1100,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    });
    this.startMagic();
  }

  // Pink and purple sparkles drifting up around the island
  startMagic() {
    if (this.magic) return;
    const w = this.island.image.displayWidth;
    this.magic = this.scene.add.particles(this.cx, DESTINATION.surfaceY - 20, 'star_small', {
      x: { min: -w * 0.7, max: w * 0.7 },
      y: { min: -40, max: 40 },
      speedY: { min: -40, max: -15 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.28, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 3200,
      frequency: 140,
      tint: [0xffb3e0, 0xd59bff, 0xffffff, 0xffe066],
      blendMode: 'ADD',
    });
    this.magic.setDepth(7);
  }

  // Radial gradient texture (warm centre → transparent edge), made once
  static glowTexture(scene) {
    const key = 'rainbow_glow';
    if (scene.textures.exists(key)) return key;
    const size = (OUTER_R + 110) * 2;
    const tex = scene.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const r = size / 2;
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, 'rgba(255, 220, 240, 0.6)');
    grad.addColorStop(0.45, 'rgba(230, 170, 255, 0.28)');
    grad.addColorStop(1, 'rgba(200, 150, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
    return key;
  }

  // Draw the arc from its left foot up and over to `progress` (0–1)
  draw() {
    const g = this.arc;
    g.clear();
    if (this.progress <= 0) return;
    const end = Math.PI + Math.PI * this.progress;
    RAINBOW.forEach((color, i) => {
      g.lineStyle(BAND, color, 1);
      g.beginPath();
      g.arc(this.cx, this.cy, OUTER_R - i * BAND, Math.PI, end, false);
      g.strokePath();
    });
  }

  // Sweep the rainbow into view (called during the balloon journey)
  reveal(duration = 2600) {
    if (this.revealed) return;
    this.revealed = true;
    const scene = this.scene;

    scene.tweens.add({
      targets: this,
      progress: 1,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.draw(),
      onComplete: () => {
        scene.tweens.add({
          targets: this.arc,
          alpha: { from: 0.92, to: 0.72 },
          duration: 1800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      },
    });

    scene.tweens.add({ targets: this.glow, alpha: 1, duration: duration * 1.2, ease: 'Sine.easeOut' });
    scene.tweens.add({
      targets: this.glow,
      scale: { from: 0.96, to: 1.04 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Stars twinkling along the arc and in the sky around it
    const spots = [];
    for (let i = 0; i < 10; i++) {
      const a = Math.PI + (Math.PI * (i + 0.5)) / 10;
      const r = OUTER_R - BAND * 3;
      spots.push([this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r, 0.4]);
    }
    const rnd = new Phaser.Math.RandomDataGenerator(['rainbow-stars']);
    for (let i = 0; i < 14; i++) {
      spots.push([this.cx + rnd.between(-560, 560), this.cy - rnd.between(160, 470), rnd.realInRange(0.3, 0.6)]);
    }
    spots.forEach(([sx, sy, sc], i) => {
      const s = scene.add.image(sx, sy, i % 3 ? 'star_small' : 'star').setScale(sc).setDepth(4).setAlpha(0);
      scene.tweens.add({
        targets: s,
        alpha: { from: 0, to: 1 },
        scale: { from: sc * 0.5, to: sc },
        delay: (duration * (i % 10)) / 10,
        duration: 900,
        yoyo: true,
        repeat: -1,
        repeatDelay: rnd.between(200, 1200),
        ease: 'Sine.easeInOut',
      });
    });
  }
}
