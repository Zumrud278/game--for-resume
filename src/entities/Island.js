import Phaser from 'phaser';
import { FONT_FAMILY } from '../utils/constants.js';

/**
 * A floating grass island.
 * The image is anchored at its grass line, so `surfaceY` is exactly
 * where the player's feet rest.
 */
export class Island {
  constructor(scene, config, index, { solid = true } = {}) {
    this.scene = scene;
    this.config = config;
    this.index = index;
    this.id = config.id;
    this.x = config.x;
    this.surfaceY = config.surfaceY;

    // Island art
    this.image = scene.add
      .image(config.x, config.surfaceY, config.key)
      .setOrigin(0.5, config.grassFrac)
      .setScale(config.scale)
      .setDepth(2);

    // One-way platform along the grass:
    //  - narrower than the art so she doesn't stand on air at rounded edges
    //  - 28px thick, more than the max fall distance per physics step
    //  - only the TOP collides, so she can jump up through from below and
    //    never snags on an island's side
    this.collider = null;
    if (solid) {
      const w = this.image.displayWidth * 0.78;
      const thickness = 28;
      this.collider = scene.add.zone(config.x, config.surfaceY + thickness / 2, w, thickness);
      scene.physics.add.existing(this.collider, true);
      const body = this.collider.body;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
      this.collider.island = this;
    }

    // Floating label above the island
    if (config.label) {
      const labelY = config.surfaceY - this.image.displayHeight * config.grassFrac - 34;
      this.label = scene.add
        .text(config.x, Math.min(labelY, config.surfaceY - 150), config.label, {
          fontFamily: FONT_FAMILY,
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#FFFFFF',
          stroke: '#2D1B4E',
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(4);

      scene.tweens.add({
        targets: this.label,
        y: this.label.y - 6,
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  get width() {
    return this.image.displayWidth;
  }
}
