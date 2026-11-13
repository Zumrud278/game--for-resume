import Phaser from 'phaser';
import { PLAYER, GRAVITY } from '../utils/constants.js';

const STAR_SCALE = 0.55;     // assets/effects/star.png → ~28px
const RADIUS = 14;           // touch radius
const LOW = 52;              // trail stars: at her chest height while walking
const HIGH = 150;            // bonus stars: only reachable with a jump
const TRAIL_PER_BRIDGE = 4;
const CHEST = 45;            // her chest is ~45px above her feet

/**
 * Collectible stars placed along the route: a trail on every bridge
 * (collected just by walking across), one high bonus star above each
 * bridge's middle (needs a jump), an arc over every jump gap (collected
 * by jumping across), and one star on each island.
 * Each star can be collected once per playthrough.
 */
export class Stars {
  constructor(scene, islands, bridges, jumpGaps = [], skyTrail = []) {
    this.scene = scene;
    this.stars = [];
    this.collected = 0;

    bridges.forEach((b) => {
      for (let i = 1; i <= TRAIL_PER_BRIDGE; i++) {
        const x = Phaser.Math.Linear(b.x1, b.x2, i / (TRAIL_PER_BRIDGE + 1));
        this.add(x, b.yAt(x) - LOW);
      }
      const mid = (b.x1 + b.x2) / 2;
      this.add(mid, b.yAt(mid) - HIGH, true);
    });

    // An arc over every jump gap that traces her actual jump: taking off
    // just before the edge at full speed, her chest passes through each star
    jumpGaps.forEach((g) => {
      const takeoff = g.x1 - 25;
      [50, 100, 150].forEach((dx) => {
        const x = g.x1 + dx;
        const t = (x - takeoff) / PLAYER.speed;                        // seconds after take-off
        const rise = -PLAYER.jumpVelocity * t - (GRAVITY / 2) * t * t; // height of her feet
        this.add(x, g.y - rise - CHEST);
      });
    });

    // A trail through the sky along the balloon ride
    skyTrail.forEach((p) => this.add(p.x, p.y));

    // One on each island before ACHIEVEMENTS, beside the sign, at walking height
    islands.slice(0, -1).forEach((isl) => this.add(isl.x + 75, isl.surfaceY - LOW));

    this.total = this.stars.length;
  }

  add(x, y, high = false) {
    const img = this.scene.add.image(x, y, 'star').setScale(STAR_SCALE).setDepth(6);
    // Gentle bob + twinkle, offset per star so they don't move in unison
    const delay = (this.stars.length * 137) % 1200;
    this.scene.tweens.add({ targets: img, y: y - 6, duration: 1100, delay, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: img, angle: { from: -8, to: 8 }, duration: 1600, delay, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (high) img.setTint(0xfff1a8);   // bonus stars glow a little warmer
    this.stars.push({ img, x, y, high, taken: false });
  }

  /** Check her body against every remaining star (called each frame). */
  update(body) {
    const rect = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
    for (const s of this.stars) {
      if (s.taken) continue;
      const circle = new Phaser.Geom.Circle(s.img.x, s.img.y, RADIUS);
      if (Phaser.Geom.Intersects.CircleToRectangle(circle, rect)) this.collect(s);
    }
  }

  collect(s) {
    s.taken = true;
    this.collected++;
    const scene = this.scene;
    const { img } = s;
    scene.tweens.killTweensOf(img);

    // Pop, spin and float up while fading out
    scene.tweens.add({
      targets: img,
      scale: STAR_SCALE * 1.8,
      y: img.y - 34,
      angle: img.angle + 180,
      alpha: 0,
      duration: 380,
      ease: 'Back.easeOut',
      onComplete: () => img.destroy(),
    });

    // Sparkle burst
    const burst = scene.add.particles(img.x, img.y, 'star_small', {
      speed: { min: 60, max: 170 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      tint: [0xffd700, 0xffffff, 0xffe9a8],
      emitting: false,
    }).setDepth(7);
    burst.explode(10);
    scene.time.delayedCall(700, () => burst.destroy());

    scene.events.emit('star-collected', this.collected, this.total);
  }
}
