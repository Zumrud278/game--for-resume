import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  COLORS,
} from '../utils/constants.js';

/**
 * Full-screen purple fantasy sky with small stars and clouds.
 * Layers move slower than the world (scrollFactor < 1) for depth.
 */
export class ParallaxBackground {
  constructor(scene) {
    this.scene = scene;
    // Seeded RNG → the same sky every time the game loads
    const rnd = new Phaser.Math.RandomDataGenerator(['resume-sky']);

    // ── Sky gradient: pinned to the screen, always fills the view ──
    const sky = scene.add.graphics().setScrollFactor(0).setDepth(-30);
    const half = GAME_HEIGHT * 0.55;
    sky.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyMid, COLORS.skyMid, 1);
    sky.fillRect(0, 0, GAME_WIDTH, half);
    sky.fillGradientStyle(COLORS.skyMid, COLORS.skyMid, COLORS.skyBottom, COLORS.skyBottom, 1);
    sky.fillRect(0, half, GAME_WIDTH, GAME_HEIGHT - half);

    // ── High-altitude glow: a warm rose-gold sky that fades in as the
    //    camera climbs toward the rainbow island ──
    this.highSky = scene.add.graphics().setScrollFactor(0).setDepth(-29).setAlpha(0);
    this.highSky.fillGradientStyle(0x2A1460, 0x2A1460, 0xFFB3D1, 0xFFC98A, 1);
    this.highSky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.maxScrollY = WORLD_HEIGHT - GAME_HEIGHT;

    // Visible span of a layer = screen + how far that layer scrolls
    const span = (factor) => ({
      w: GAME_WIDTH + (WORLD_WIDTH - GAME_WIDTH) * factor,
      h: GAME_HEIGHT + (WORLD_HEIGHT - GAME_HEIGHT) * factor,
    });

    // ── Tiny dot stars (far layer) ──
    const farF = 0.08;
    const far = span(farF);
    const dots = scene.add.graphics().setScrollFactor(farF).setDepth(-25);
    for (let i = 0; i < 110; i++) {
      dots.fillStyle(0xffffff, rnd.realInRange(0.25, 0.8));
      dots.fillCircle(rnd.between(0, far.w), rnd.between(0, far.h * 0.7), rnd.realInRange(0.8, 1.8));
    }

    // ── Small twinkling star sprites ──
    const starF = 0.12;
    const starSpan = span(starF);
    for (let i = 0; i < 26; i++) {
      const key = i % 3 === 0 ? 'star' : 'star_small';
      const star = scene.add
        .image(rnd.between(20, starSpan.w - 20), rnd.between(20, starSpan.h * 0.6), key)
        .setScale(rnd.realInRange(0.18, 0.38))
        .setScrollFactor(starF)
        .setDepth(-24)
        .setAlpha(0.6);

      scene.tweens.add({
        targets: star,
        alpha: { from: 0.25, to: 0.95 },
        duration: rnd.between(1200, 2600),
        delay: rnd.between(0, 2000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // ── Clouds: far (slow, faint) and near (faster, brighter) ──
    this.addClouds(scene, rnd, { factor: 0.25, count: 7, scale: [0.9, 1.4], alpha: [0.35, 0.5], depth: -20, yRange: [0.15, 0.9] }, span);
    this.addClouds(scene, rnd, { factor: 0.45, count: 5, scale: [1.3, 1.9], alpha: [0.5, 0.7], depth: -15, yRange: [0.45, 1.0] }, span);
  }

  addClouds(scene, rnd, opts, span) {
    const s = span(opts.factor);
    for (let i = 0; i < opts.count; i++) {
      // Spread evenly across the layer with a little jitter
      const x = (s.w / opts.count) * (i + 0.5) + rnd.between(-80, 80);
      const y = rnd.between(s.h * opts.yRange[0], s.h * opts.yRange[1]);
      const cloud = scene.add
        .image(x, y, `cloud_${(i % 4) + 1}`)
        .setScale(rnd.realInRange(...opts.scale))
        .setAlpha(rnd.realInRange(...opts.alpha))
        .setScrollFactor(opts.factor)
        .setDepth(opts.depth);

      scene.tweens.add({
        targets: cloud,
        x: x + rnd.between(40, 110),
        duration: rnd.between(9000, 16000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // Layers scroll by themselves (scrollFactor); only the altitude glow
  // needs updating: 0 near the islands, up to 0.7 at the very top.
  update(scrollX, scrollY) {
    const altitude = 1 - scrollY / this.maxScrollY;
    this.highSky.setAlpha(Phaser.Math.Clamp((altitude - 0.3) / 0.6, 0, 1) * 0.7);
  }
}
