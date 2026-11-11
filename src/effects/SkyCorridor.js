import Phaser from 'phaser';
import { ISLANDS, DESTINATION } from '../utils/constants.js';

/**
 * Clouds and stars placed in WORLD space along the balloon route,
 * between the achievements island and the rainbow island.
 * Because they scroll at full speed, they stream past her during the
 * flight, so she visibly travels through the sky.
 */
export class SkyCorridor {
  constructor(scene) {
    const rnd = new Phaser.Math.RandomDataGenerator(['balloon-corridor']);
    const start = ISLANDS[ISLANDS.length - 1];
    const top = DESTINATION.surfaceY + 120;
    const bottom = start.surfaceY - 380;   // keep clear of the achievements island
    const left = start.x - 380;
    const right = DESTINATION.x + 260;

    // ── Stars: small, twinkling, behind everything ──
    for (let i = 0; i < 40; i++) {
      const s = scene.add
        .image(rnd.between(left, right), rnd.between(top - 300, bottom), i % 4 ? 'star_small' : 'star')
        .setScale(rnd.realInRange(0.18, 0.4))
        .setDepth(0)
        .setAlpha(0.7);
      scene.tweens.add({
        targets: s,
        alpha: { from: 0.3, to: 1 },
        duration: rnd.between(900, 2200),
        delay: rnd.between(0, 1500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // ── Clouds: stacked bands up the route ──
    const bands = 9;
    for (let b = 0; b < bands; b++) {
      const y = Phaser.Math.Linear(bottom, top, b / (bands - 1));
      // One cloud behind her route…
      this.cloud(scene, rnd, rnd.between(left, right), y + rnd.between(-60, 60), 1, [0.45, 0.65], [1.0, 1.6]);
      // …and every other band, a soft cloud IN FRONT that she flies through
      if (b % 2 === 0 && b < bands - 1) {
        this.cloud(scene, rnd, start.x + rnd.between(-60, 160), y + rnd.between(-40, 40), 15, [0.35, 0.5], [1.1, 1.5]);
      }
    }
  }

  cloud(scene, rnd, x, y, depth, alpha, scale) {
    const c = scene.add
      .image(x, y, `cloud_${rnd.between(1, 4)}`)
      .setScale(rnd.realInRange(...scale))
      .setAlpha(rnd.realInRange(...alpha))
      .setDepth(depth);
    scene.tweens.add({
      targets: c,
      x: x + rnd.between(30, 90),
      duration: rnd.between(7000, 12000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
