import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_JUMP, PLAYER_SCALE } from '../utils/constants.js';

// Unscaled physics body size (the character art is ~140×200)
const BODY_W = 60;
const BODY_H = 150;

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'idle');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Origin at the feet: every pose image has a different height,
    // so anchoring at the bottom keeps the feet on the grass when swapping.
    this.setOrigin(0.5, 1);
    this.setScale(PLAYER_SCALE);
    this.setDepth(10);
    this.setCollideWorldBounds(true);

    this.currentAnim = 'idle';
    this.wasOnGround = false;
    this.landUntil = 0;

    this.createAnimations(scene);
    this.alignBody();

    // Run frames have slightly different sizes — re-align on every frame
    this.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => this.alignBody());
  }

  createAnimations(scene) {
    if (!scene.anims.exists('run')) {
      scene.anims.create({
        key: 'run',
        frames: [{ key: 'run_1' }, { key: 'run_2' }, { key: 'run_3' }],
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  // Keep the body centred horizontally with its bottom at the sprite's feet
  alignBody() {
    const f = this.frame;
    this.body.setSize(BODY_W, BODY_H, false);
    this.body.setOffset((f.realWidth - BODY_W) / 2, f.realHeight - BODY_H);
  }

  update(input) {
    const onGround = this.body.blocked.down || this.body.touching.down;
    const now = this.scene.time.now;

    // Horizontal movement
    if (input.left) {
      this.setVelocityX(-PLAYER_SPEED);
      this.setFlipX(true);
    } else if (input.right) {
      this.setVelocityX(PLAYER_SPEED);
      this.setFlipX(false);
    } else {
      this.setVelocityX(0);
    }

    // Jump
    if (input.jump && onGround) {
      this.setVelocityY(PLAYER_JUMP);
    }

    // Pose selection
    if (!onGround) {
      this.playAnim(this.body.velocity.y < 0 ? 'jump' : 'fall');
    } else {
      if (!this.wasOnGround) this.landUntil = now + 120; // short landing pose
      if (now < this.landUntil && !input.left && !input.right) {
        this.playAnim('land');
      } else if (input.left || input.right) {
        this.playAnim('run');
      } else {
        this.playAnim('idle');
      }
    }

    this.wasOnGround = onGround;
  }

  playAnim(key) {
    if (this.currentAnim === key) return;
    this.currentAnim = key;

    if (key === 'run') {
      this.play('run', true);
    } else {
      this.stop();
      this.setTexture(key);
    }
    this.alignBody();
  }

  celebrateAnim() {
    this.playAnim('celebrate');
  }

  floatAnim() {
    this.stop();
    this.currentAnim = 'float';
    this.setTexture('float');
    this.setScale(PLAYER_SCALE * 0.85); // float sprite is bigger
  }
}
