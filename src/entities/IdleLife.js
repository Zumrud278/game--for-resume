import Phaser from 'phaser';

/**
 * Idle life on the rainbow island: once she's arrived and stands still, she
 * doesn't freeze —
 *   - blinks every few seconds (sometimes a double blink)
 *   - breathes: a gentle 1px rise and fall
 *   - looks around: turns to face the other way now and then
 *   - occasionally cheers: a little hop in her celebrate pose with sparkles
 * Everything stops the moment she's steered, and starts again after she has
 * stood still for a moment.
 *
 * Breathing uses a visual twin of her sprite (same texture/frame/facing) drawn
 * 1px higher on the "in" breath, so her physics body never moves and she's
 * still drawn 1:1 (no rescaling → her eyes stay crisp).
 */
const SETTLE_MS = 700;          // stand still this long before idle life starts

export class IdleLife {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.active = false;
    this.calmFor = 0;
    this.rnd = new Phaser.Math.RandomDataGenerator(['idle-life']);
    this.twin = scene.add.image(0, 0, 'idle').setVisible(false);
    this.twinOn = false;
    this.twinDy = 0;
    // Position the twin AFTER physics has moved her this frame (otherwise it
    // would trail one frame behind during the cheer hop)
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncTwin, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncTwin, this);
    });
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.schedule(this.scene.time.now);
  }

  schedule(now) {
    this.nextBlink = now + this.rnd.between(1200, 2600);
    this.nextLook = now + this.rnd.between(5000, 8000);
    this.nextCheer = now + this.rnd.between(4000, 7000);
  }

  /** Called every frame with the input she actually received. */
  update(time, delta, input, riding) {
    const p = this.player;
    if (!this.active) return;

    const calm = !riding && p.onGround && !input.left && !input.right && !input.jump &&
      (p.pose === 'idle' || (p.pose === 'celebrate' && p.reaction));
    if (!calm && !p.reaction) {
      this.calmFor = 0;
      this.showTwin(false);
      return;
    }
    this.calmFor += delta;
    if (this.calmFor < SETTLE_MS) return;
    if (this.calmFor - delta < SETTLE_MS) this.schedule(time);   // just settled

    // Blink (only in the plain idle pose)
    if (time >= this.nextBlink && p.pose === 'idle') {
      this.blink(time);
      this.nextBlink = time + this.rnd.between(2200, 4800);
      if (this.rnd.frac() < 0.25) this.scene.time.delayedCall(260, () => this.blink(this.scene.time.now));
    }
    // Look around: turn to face the other way for a while
    if (time >= this.nextLook && p.pose === 'idle') {
      p.facing = -p.facing;
      this.nextLook = time + this.rnd.between(4500, 8500);
    }
    // Occasional happy reaction
    if (time >= this.nextCheer && p.pose === 'idle') {
      p.playReaction('celebrate', 1100);
      p.body.setVelocityY(-240);                     // a little hop
      this.sparkle();
      this.nextCheer = time + this.rnd.between(9000, 15000);
    }

    // Breathing (1px, ~2.6s cycle) via the twin
    this.showTwin(true, Math.sin((time / 2600) * Math.PI * 2) > 0.2 ? -1 : 0);
  }

  blink() {
    const p = this.player;
    if (p.pose !== 'idle' || !this.scene.textures.exists('idle_blink')) return;
    p.setTexture('idle_blink');
    p.alignBody();
    this.scene.time.delayedCall(130, () => {
      if (p.texture.key === 'idle_blink') { p.setTexture('idle'); p.alignBody(); }
    });
  }

  showTwin(on, dy = 0) {
    this.twinOn = on;
    this.twinDy = dy;
    if (!on && this.twin.visible) { this.twin.setVisible(false); this.player.setVisible(true); }
  }

  syncTwin() {
    if (!this.twinOn) return;
    const p = this.player;
    this.twin
      .setTexture(p.texture.key, p.frame.name)
      .setOrigin(p.originX, p.originY)
      .setFlipX(p.flipX)
      .setDepth(p.depth)
      .setPosition(p.x, p.y + this.twinDy)
      .setVisible(true);
    p.setVisible(false);
  }

  sparkle() {
    const p = this.player;
    const e = this.scene.add.particles(p.x, p.y - 70, 'star_small', {
      speed: { min: 60, max: 180 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.35, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 700,
      gravityY: 120,
      tint: [0xffd700, 0xffffff, 0xff9de0, 0xc9a0dc],
      emitting: false,
    }).setDepth(20);
    e.explode(14);
    this.scene.time.delayedCall(900, () => e.destroy());
  }
}
