import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_JUMP, PLAYER_SCALE } from '../utils/constants.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'idle');
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setScale(PLAYER_SCALE);
    this.setCollideWorldBounds(true);
    
    // Physics body — make the collision box smaller than the sprite
    // Character is about 139x203 at full size, scaled by 0.55 → ~76x111
    // Use a tighter body
    this.body.setSize(80, 170);
    this.body.setOffset(30, 30);
    
    this.isJumping = false;
    this.currentAnim = 'idle';
    
    this.createAnimations(scene);
  }
  
  createAnimations(scene) {
    // Run animation from spritesheet
    if (!scene.anims.exists('run')) {
      scene.anims.create({
        key: 'run',
        frames: scene.anims.generateFrameNumbers('run', { start: 0, end: 2 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    
    // Static pose "animations" (single frame) — use the individual images
    // For these, we swap the texture directly rather than using anims
  }
  
  update(cursors, mobileControls) {
    const onGround = this.body.blocked.down || this.body.touching.down;
    
    // Determine input
    const leftPressed = cursors.left.isDown || (mobileControls && mobileControls.left);
    const rightPressed = cursors.right.isDown || (mobileControls && mobileControls.right);
    const jumpPressed = cursors.up.isDown || Phaser.Input.Keyboard.JustDown(cursors.space) || (mobileControls && mobileControls.up);
    
    // Horizontal movement
    if (leftPressed) {
      this.setVelocityX(-PLAYER_SPEED);
      this.setFlipX(true);
      if (onGround) this.playAnim('run');
    } else if (rightPressed) {
      this.setVelocityX(PLAYER_SPEED);
      this.setFlipX(false);
      if (onGround) this.playAnim('run');
    } else {
      this.setVelocityX(0);
      if (onGround) this.playAnim('idle');
    }
    
    // Jumping
    if (jumpPressed && onGround) {
      this.setVelocityY(PLAYER_JUMP);
      this.isJumping = true;
      this.playAnim('jump');
    }
    
    // Air state
    if (!onGround) {
      if (this.body.velocity.y < 0) {
        this.playAnim('jump');
      } else {
        this.playAnim('fall');
      }
    } else if (this.isJumping) {
      this.isJumping = false;
      // Brief land animation then back to idle
      this.playAnim('land');
      this.scene.time.delayedCall(200, () => {
        if (this.body.blocked.down) this.playAnim('idle');
      });
    }
  }
  
  playAnim(key) {
    if (this.currentAnim === key) return;
    this.currentAnim = key;
    
    if (key === 'run') {
      // Use the spritesheet animation
      this.setTexture('run');
      this.play('run', true);
    } else {
      // Use static texture (stop any running animation)
      this.stop();
      this.setTexture(key);
    }
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
