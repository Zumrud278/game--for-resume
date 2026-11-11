import Phaser from 'phaser';

export class MobileControls {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.left = false;
    this.right = false;
    this.up = false;

    const cam = scene.cameras.main;
    const h = cam.height;
    const w = cam.width;

    // D-pad (bottom left)
    if (scene.textures.exists('dpad')) {
      this.dpad = scene.add
        .image(110, h - 80, 'dpad')
        .setScrollFactor(0)
        .setDepth(200)
        .setScale(0.9)
        .setAlpha(0.8)
        .setInteractive();

      this.dpad.on('pointerdown', (pointer, localX, localY) => {
        const dw = this.dpad.displayWidth;
        const dh = this.dpad.displayHeight;
        if (localY < dh * 0.35) this.up = true;
        else if (localX < dw * 0.35) this.left = true;
        else if (localX > dw * 0.65) this.right = true;
      });

      this.dpad.on('pointerup', () => {
        this.left = false;
        this.right = false;
        this.up = false;
      });

      this.dpad.on('pointerout', () => {
        this.left = false;
        this.right = false;
        this.up = false;
      });
    }

    // Jump button (bottom right)
    if (scene.textures.exists('space_jump')) {
      this.jumpBtn = scene.add
        .image(w - 90, h - 70, 'space_jump')
        .setScrollFactor(0)
        .setDepth(200)
        .setScale(0.9)
        .setAlpha(0.85)
        .setInteractive();

      this.jumpBtn.on('pointerdown', () => {
        this.up = true;
      });
      this.jumpBtn.on('pointerup', () => {
        this.up = false;
      });
      this.jumpBtn.on('pointerout', () => {
        this.up = false;
      });
    }
  }
}
