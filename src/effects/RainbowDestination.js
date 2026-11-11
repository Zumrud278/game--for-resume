import { Island } from '../entities/Island.js';
import { DESTINATION } from '../utils/constants.js';

// No rainbow image exists in assets/, so the arc is drawn with Phaser graphics
// as a temporary placeholder. The castle island art is a real asset.
const RAINBOW = [0xff6b6b, 0xffa94d, 0xffe066, 0x8ce99a, 0x74c0fc, 0x9775fa, 0xe599f7];

export class RainbowDestination {
  constructor(scene) {
    this.scene = scene;
    const { x, surfaceY } = DESTINATION;

    // Rainbow arc behind the castle
    const cy = surfaceY - 40;
    const outer = 270;
    const band = 13;
    const g = scene.add.graphics().setDepth(1).setAlpha(0.85);
    RAINBOW.forEach((color, i) => {
      g.lineStyle(band, color, 1);
      g.beginPath();
      g.arc(x, cy, outer - i * band, Math.PI, Math.PI * 2, false);
      g.strokePath();
    });

    // Cloud puffs hiding the rainbow's feet
    [-1, 1].forEach((side) => {
      scene.add
        .image(x + side * (outer - band * 3), cy + 10, 'cloud_3')
        .setScale(0.9)
        .setDepth(3);
    });

    // Castle island — solid, so it can be landed on later
    this.island = new Island(scene, DESTINATION, -1);

    // Gentle glow pulse to mark it as the goal
    scene.tweens.add({
      targets: g,
      alpha: { from: 0.65, to: 0.95 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
