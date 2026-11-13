import Phaser from 'phaser';
import { PLAYER, PLAYER_SCALE, BALLOON } from '../utils/constants.js';

// Unscaled physics body (the character art is ~140×200).
// FEET_PAD = transparent rows under the boots in every pose image.
const BODY_W = 56;
const BODY_H = 150;
const FEET_PAD = 3;

// Her boots are drawn this many screen pixels below the platform's top edge,
// so she stands ON the grass instead of on its very back edge. Visual only:
// the physics body still rests exactly on the platform.
const FOOT_SINK = 5;

// Horizontal anchor of each pose = the centre of her torso inside that image
// (measured from the art). The images are padded differently — e.g. the cape
// trails left in the jump pose — so anchoring every pose at its image centre
// made her slide sideways by up to ~14px whenever the pose changed.
export const POSE_ANCHOR_X = {
  idle: 0.645,
  run_1: 0.601,
  run_2: 0.599,
  run_3: 0.546,
  jump: 0.665,
  fall: 0.617,
  land: 0.524,
  celebrate: 0.63,
  float: 0.504,
};

/**
 * The fantasy explorer.
 * All pose images face RIGHT; moving left mirrors her with flipX.
 *
 * update(input) expects { left, right, jump } booleans (jump = key held).
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'idle');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Feet-anchored origin: poses have different heights, so anchoring at
    // the bottom keeps her boots on the grass whenever the pose changes.
    this.setOrigin(0.5, 1);
    this.setScale(PLAYER_SCALE);
    this.setDepth(10);
    this.setCollideWorldBounds(true);

    // Cap fall speed so she can never move further than a platform's
    // thickness in a single physics step (no tunnelling).
    this.body.setMaxVelocityY(PLAYER.maxFallSpeed);

    this.facing = 1;          // 1 = right, -1 = left
    this.pose = null;
    this.wasOnGround = false;
    this.lastGroundedAt = -Infinity;
    this.jumpPressedAt = -Infinity;
    this.jumpHeld = false;
    this.isJumping = false;
    this.landUntil = 0;
    this.prevFallSpeed = 0;
    this.controlsEnabled = true;

    this.createAnimations(scene);
    this.setPose('idle');

    // Run frames differ by a few pixels — keep anchor + body aligned on each frame
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

  // Anchor the current pose at her torso, then centre the body on it with
  // its bottom at her boots (minus the small visual foot sink)
  alignBody() {
    const f = this.frame;
    // Phaser mirrors a flipped image around its centre, so when she faces
    // left the anchor is mirrored too — her torso stays on the same spot
    const base = POSE_ANCHOR_X[f.texture.key] ?? 0.5;
    const ax = this.flipX ? 1 - base : base;
    if (this.originX !== ax) this.setOrigin(ax, 1);
    this.body.setSize(BODY_W, BODY_H, false);
    this.body.setOffset(
      f.realWidth * ax - BODY_W / 2,
      f.realHeight - BODY_H - FEET_PAD - FOOT_SINK / this.scaleY
    );
  }

  get onGround() {
    return this.body.blocked.down || this.body.touching.down;
  }

  update(input) {
    const now = this.scene.time.now;
    const dt = this.scene.game.loop.delta / 1000;
    const onGround = this.onGround;

    if (!this.controlsEnabled) input = { left: false, right: false, jump: false };

    // ── Ground tracking (coyote time) ──
    if (onGround) {
      this.lastGroundedAt = now;
      if (!this.wasOnGround) this.onLand();
    }

    // ── Horizontal: accelerate / decelerate for smooth movement ──
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const vx = this.body.velocity.x;
    let newVx;
    if (dir !== 0) {
      const accel = onGround ? PLAYER.groundAccel : PLAYER.airAccel;
      // Turning around: brake first so direction changes feel snappy
      const turning = Math.sign(vx) !== 0 && Math.sign(vx) !== dir;
      const rate = turning ? accel + PLAYER.groundDecel : accel;
      newVx = Phaser.Math.Clamp(vx + dir * rate * dt, -PLAYER.speed, PLAYER.speed);
      this.facing = dir;
    } else {
      const decel = (onGround ? PLAYER.groundDecel : PLAYER.airDecel) * dt;
      newVx = Math.abs(vx) <= decel ? 0 : vx - Math.sign(vx) * decel;
    }
    this.setVelocityX(newVx);
    if (this.flipX !== this.facing < 0) {
      this.setFlipX(this.facing < 0);
      this.alignBody();
    }

    // ── Jump: buffered press + coyote time + variable height ──
    const jumpJustPressed = input.jump && !this.jumpHeld;
    this.jumpHeld = input.jump;
    if (jumpJustPressed) this.jumpPressedAt = now;

    const canJump = now - this.lastGroundedAt <= PLAYER.coyoteMs && !this.isJumping;
    const wantsJump = now - this.jumpPressedAt <= PLAYER.jumpBufferMs;
    if (canJump && wantsJump) {
      this.setVelocityY(PLAYER.jumpVelocity);
      this.isJumping = true;
      this.jumpPressedAt = -Infinity;
      this.lastGroundedAt = -Infinity;
    }

    // Releasing jump early while rising → shorter hop
    if (this.isJumping && !input.jump && this.body.velocity.y < 0) {
      this.setVelocityY(this.body.velocity.y * PLAYER.jumpCutFactor);
      this.isJumping = false;
    }
    if (this.body.velocity.y >= 0) this.isJumping = false;

    // Run cycle speed follows her actual speed, so her feet don't slide
    // while she's speeding up or slowing down
    if (this.pose === 'run') {
      this.anims.timeScale = Phaser.Math.Clamp(Math.abs(newVx) / PLAYER.speed, 0.5, 1);
    }

    // ── Pose ── (a jump started this frame counts as airborne immediately)
    if (!onGround || this.body.velocity.y < 0) {
      this.setPose(this.body.velocity.y < 0 ? 'jump' : 'fall');
    } else if (now < this.landUntil && dir === 0) {
      this.setPose('land');
    } else if (dir !== 0 || Math.abs(newVx) > 30) {
      this.setPose('run');
    } else {
      this.setPose('idle');
    }

    this.prevFallSpeed = this.body.velocity.y;
    this.wasOnGround = onGround;
  }

  onLand() {
    this.isJumping = false;
    // Only show the crouch pose after a real drop, not tiny ledge steps
    if (this.prevFallSpeed > PLAYER.landPoseMinSpeed) {
      this.landUntil = this.scene.time.now + PLAYER.landPoseMs;
    }
  }

  setPose(key) {
    if (this.pose === key) return;
    this.pose = key;

    if (key === 'run') {
      this.play('run', true);
    } else {
      this.stop();
      this.setTexture(key);
    }
    this.alignBody();
  }

  /** World position of her fist in the float pose (where balloon strings attach). */
  handPoint() {
    const f = this.frame;
    const s = this.scaleX;
    // displayOriginX is mirrored when flipped; convert back to image coords
    const ax = this.flipX ? f.realWidth - this.displayOriginX : this.displayOriginX;
    return {
      x: this.x + (BALLOON.floatHand.x - ax) * (this.flipX ? -s : s),
      y: this.y - (f.realHeight - BALLOON.floatHand.y) * s,
    };
  }

  // Place her standing at (x, feetY) with no momentum
  resetTo(x, feetY) {
    this.body.reset(x, feetY);
    this.setPosition(x, feetY);
    this.setVelocity(0, 0);
    this.prevFallSpeed = 0;
    this.isJumping = false;
    this.setPose('idle');
  }
}
