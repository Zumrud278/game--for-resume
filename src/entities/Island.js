import Phaser from 'phaser';
import { FONT_FAMILY } from '../utils/constants.js';
import { POLISH_PAD } from '../utils/textureQuality.js';

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

    // Footprint of the original picture at its game scale — the platform,
    // bridge attachment points and sign spacing are all based on it
    const src = scene.textures.get(config.key).getSourceImage();
    this.footprint = { w: src.width * config.scale, h: src.height * config.scale };

    // Island art. Level nodes use their polished copy (same artwork, upscaled
    // with high quality, sharpened and outlined at boot — drawn 1:1).
    const polished = `node_${config.id}`;
    if (config.id && scene.textures.exists(polished)) {
      const t = scene.textures.get(polished).getSourceImage();
      this.image = scene.add
        .image(config.x, config.surfaceY, polished)
        .setOrigin(0.5, (config.grassFrac * this.footprint.h + POLISH_PAD) / t.height)
        .setDepth(2);
    } else {
      this.image = scene.add
        .image(config.x, config.surfaceY, config.key)
        .setOrigin(0.5, config.grassFrac)
        .setScale(config.scale)
        .setDepth(2);
    }

    // One-way platform along the grass:
    //  - narrower than the art so she doesn't stand on air at rounded edges
    //  - 28px thick, more than the max fall distance per physics step
    //  - only the TOP collides, so she can jump up through from below and
    //    never snags on an island's side
    this.collider = null;
    if (solid) {
      const w = this.footprint.w * 0.78;
      const thickness = 28;
      this.collider = scene.add.zone(config.x, config.surfaceY + thickness / 2, w, thickness);
      scene.physics.add.existing(this.collider, true);
      const body = this.collider.body;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
      this.collider.island = this;
    }

    // Floating sign above the island: [icon] LABEL
    if (config.label) {
      const labelY = config.surfaceY - this.footprint.h * config.grassFrac - 34;
      this.label = this.createSign(scene, config, Math.min(labelY, config.surfaceY - 150));

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

  createSign(scene, config, y) {
    const ICON_H = 34;
    const PAD_X = 14;
    const GAP = 8;
    const H = 46;

    const text = scene.add
      .text(0, 0, config.label, {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#FFFFFF',
      })
      .setOrigin(0, 0.5);

    let icon = null;
    let iconW = 0;
    if (config.icon && scene.textures.exists(config.icon)) {
      icon = scene.add.image(0, 0, config.icon).setOrigin(0, 0.5);
      icon.setScale(ICON_H / icon.height);
      iconW = icon.displayWidth + GAP;
    }

    const w = PAD_X * 2 + iconW + text.width;
    const left = -w / 2;
    icon?.setPosition(left + PAD_X, 0);
    text.setPosition(left + PAD_X + iconW, 1);

    const bg = scene.add.graphics();
    bg.fillStyle(0x2D1B4E, 0.82);
    bg.fillRoundedRect(left, -H / 2, w, H, H / 2);
    bg.lineStyle(2, 0xC9A0DC, 1);
    bg.strokeRoundedRect(left, -H / 2, w, H, H / 2);

    return scene.add
      .container(config.x, y, [bg, icon, text].filter(Boolean))
      .setDepth(4);
  }

  get width() {
    return this.footprint.w;
  }
}
