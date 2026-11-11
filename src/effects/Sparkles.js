import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/constants.js';

export class Sparkles {
  constructor(scene) {
    this.scene = scene;
    this.sparkles = [];

    const tints = [0xffd700, 0xc9a0dc, 0xe891b9, 0xffffff];

    for (let i = 0; i < 35; i++) {
      const key = i % 4 === 0 ? 'sparkles' : i % 2 === 0 ? 'star' : 'star_small';
      const sp = scene.add.image(
        Phaser.Math.Between(100, WORLD_WIDTH - 100),
        Phaser.Math.Between(200, WORLD_HEIGHT - 200),
        key
      );

      const baseScale = key === 'sparkles' ? 0.35 : Phaser.Math.FloatBetween(0.2, 0.45);
      sp.setScale(baseScale);
      sp.setAlpha(0);
      sp.setDepth(1);
      sp.setTint(Phaser.Utils.Array.GetRandom(tints));

      this.sparkles.push(sp);

      // Fade in & out pulse
      scene.tweens.add({
        targets: sp,
        alpha: { from: 0, to: Phaser.Math.FloatBetween(0.4, 0.9) },
        scale: { from: baseScale * 0.6, to: baseScale },
        duration: Phaser.Math.Between(1600, 3500),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        ease: 'Sine.easeInOut',
      });

      // Subtle float up
      scene.tweens.add({
        targets: sp,
        y: sp.y - Phaser.Math.Between(8, 20),
        duration: Phaser.Math.Between(2500, 4500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
