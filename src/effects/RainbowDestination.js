import Phaser from 'phaser';
import { Island } from '../entities/Island.js';
import { DESTINATION, ISLANDS } from '../utils/constants.js';

// No rainbow image exists in assets/, so the arc is drawn with Phaser graphics
// as a temporary placeholder. The castle island art is a real asset.
const RAINBOW = [0xff6b6b, 0xffa94d, 0xffe066, 0x8ce99a, 0x74c0fc, 0x9775fa, 0xe599f7];
const OUTER_R = 270;
const BAND = 13;

export class RainbowDestination {
  constructor(scene) {
    this.scene = scene;
    const { x, surfaceY } = DESTINATION;
    this.cx = x;
    this.cy = surfaceY - 40;
    this.progress = 0;     // 0 = hidden, 1 = full arc
    this.revealed = false;

    // Soft radial glow behind everything — fades in with the reveal
    this.glow = scene.add
      .image(this.cx, this.cy - 60, RainbowDestination.glowTexture(scene))
      .setDepth(0)
      .setAlpha(0);

    this.arc = scene.add.graphics().setDepth(1).setAlpha(0.9);

    // Cloud puffs hiding the rainbow's feet
    this.puffs = [-1, 1].map((side) =>
      scene.add
        .image(this.cx + side * (OUTER_R - BAND * 3), this.cy + 10, 'cloud_3')
        .setScale(0.9)
        .setDepth(3)
    );

    // Castle island — solid, so she can land on it
    this.island = new Island(scene, DESTINATION, ISLANDS.length);
  }

  // Radial gradient texture (warm centre → transparent edge), made once
  static glowTexture(scene) {
    const key = 'rainbow_glow';
    if (scene.textures.exists(key)) return key;
    const size = (OUTER_R + 90) * 2;
    const tex = scene.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const r = size / 2;
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, 'rgba(255, 236, 190, 0.55)');
    grad.addColorStop(0.5, 'rgba(255, 200, 225, 0.25)');
    grad.addColorStop(1, 'rgba(255, 200, 225, 0)');
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
        // Gentle shimmer once complete
        scene.tweens.add({
          targets: this.arc,
          alpha: { from: 0.9, to: 0.7 },
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

    // Sparkles twinkling along the arc
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (Math.PI * (i + 0.5)) / 9;
      const r = OUTER_R - BAND * 3;
      const s = scene.add
        .image(this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r, 'star_small')
        .setScale(0.35)
        .setDepth(4)
        .setAlpha(0);
      scene.tweens.add({
        targets: s,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.2, to: 0.45 },
        delay: (duration * i) / 9,
        duration: 900,
        yoyo: true,
        repeat: -1,
        repeatDelay: Phaser.Math.Between(200, 1200),
        ease: 'Sine.easeInOut',
      });
    }
  }
}
