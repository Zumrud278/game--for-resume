import Phaser from 'phaser';
import { BALLOON, BALLOON_RIDE } from '../utils/constants.js';

/**
 * A balloon station: a bouquet tied to a post. Used in both directions
 * between PROJECTS and ACHIEVEMENTS:
 *   up   — post on the launch rock after PROJECTS, target ACHIEVEMENTS
 *   down — post on the left edge of ACHIEVEMENTS, target anything below
 *
 *  - Walk up to the post → she grabs the strings (float pose, knot in her fist)
 *  - ↑ / W held   → she rises gradually (eases in and out, never jerks)
 *  - ↑ released   → the climb slows to a gentle hover
 *  - ← → / A D    → drift sideways      ↓ / S → descend
 *  - Touch down   → she lets go. On ACHIEVEMENTS the balloon floats away;
 *                   anywhere else it drifts back to its post.
 *
 * Movement is real physics velocity (gravity off while holding), so islands
 * still collide normally — no teleporting.
 */
export class BalloonRide {
  /**
   * @param target  island she rides to (up ride) — or null with opts.isTarget
   * @param opts    { isTarget(feetY), ceilingIsland, facing (1 right / -1 left), hint,
   *                  waitForArrival — starts empty: its bouquet is the one she
   *                  carries up and puts down beside her (see placeInto) }
   */
  constructor(scene, player, { x, y }, target, opts = {}) {
    this.scene = scene;
    this.player = player;
    this.target = target;
    this.facing = opts.facing ?? 1;
    this.name = opts.name ?? 'ride';      // 'up' / 'down' — sent with the grab / release events
    // where letting go counts as "arrived" (balloon floats away)
    this.isTarget = opts.isTarget ?? ((feetY) => Math.abs(feetY - target.surfaceY) < 4);
    this.holding = false;
    this.mustLeave = false;        // after letting go, step away before grabbing again
    this.gated = !!opts.waitForArrival;
    this.ready = !this.gated;      // a gated station is empty until she puts a bouquet on it

    // Post on the launch rock, with the bouquet tied to its top
    this.post = scene.add.image(x, y + 6, 'bridge_post').setOrigin(0.5, 1).setDepth(3);
    this.tie = { x, y: y - this.post.displayHeight + 10 };

    const tex = scene.textures.get('balloons').getSourceImage();
    this.bouquet = scene.add
      .image(this.tie.x, this.tie.y, 'balloons')
      .setOrigin(BALLOON.bouquetKnot.x / tex.width, BALLOON.bouquetKnot.y / tex.height)
      .setScale(BALLOON_RIDE.bouquetScale)
      .setDepth(9);
    this.idleSway();

    // Small sign so the player knows what to do
    this.hint = scene.add
      .text(x, this.tie.y - 175, opts.hint ?? '🎈 Grab the balloon', {
        fontFamily: 'Georgia, serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#FFFFFF',
        backgroundColor: 'rgba(45,27,78,0.82)',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(4);
    scene.tweens.add({ targets: this.hint, y: this.hint.y - 6, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (this.gated) { this.bouquet.setVisible(false); this.hint.setVisible(false); }

    // Highest her feet may go: a little above ACHIEVEMENTS, enough to steer onto it
    this.ceiling = (opts.ceilingIsland ?? target).surfaceY - BALLOON_RIDE.ceilingAbove;

    // Keep the knot in her fist AFTER physics has moved her sprite this frame
    // (doing it during update would leave the balloon one frame behind)
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.followHand, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.followHand, this);
    });
  }

  followHand() {
    if (!this.attached) return;
    const h = this.player.handPoint();
    this.bouquet.setPosition(h.x, h.y);
    const vx = this.player.body.velocity.x;
    this.bouquet.setAngle(-vx * 0.05 + Math.sin(this.scene.time.now / 700) * 3);
  }

  idleSway() {
    this.swayTween?.stop();
    this.swayTween = this.scene.tweens.add({
      targets: this.bouquet,
      angle: { from: -5, to: 5 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Called every frame. Returns true while she's holding the balloon
   * (the ride controls her instead of the normal walking/jumping).
   */
  update(input, dt) {
    const p = this.player;
    const body = p.body;

    if (!this.holding) {
      if (!this.ready) return false;
      const near = Math.abs(body.center.x - this.tie.x) < BALLOON_RIDE.grabRange &&
        Math.abs(body.bottom - this.post.y) < 30;
      if (!near) this.mustLeave = false;
      // grabbed only by walking TOWARD the post (not by landing next to it,
      // and not when walking away from it)
      else {
        const dx = this.tie.x - body.center.x;
        const toward = (input.right && dx > -6) || (input.left && dx < 6);
        if (!this.mustLeave && p.onGround && !this.returning && toward) this.grab();
      }
      return this.holding;
    }

    // ── Steering: ease velocity toward the target (smooth, floaty) ──
    const vyTarget = input.up ? -BALLOON_RIDE.rise : input.down ? BALLOON_RIDE.descend : 0;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const accel = BALLOON_RIDE.accel * dt;
    let vy = approach(body.velocity.y, vyTarget, accel);
    const vx = approach(body.velocity.x, dir * BALLOON_RIDE.drift, accel);

    // Soft ceiling: slow to a stop as her feet reach it
    const room = body.bottom - this.ceiling;
    if (vy < 0 && room < 60) vy = Math.max(vy, -Math.max(0, room) * 3);

    body.setVelocity(vx, vy);
    if (Math.abs(vx) > 20) p.setFlipX(vx < 0);

    // Leaving the ground (up OR down) counts as airborne; touching down after that lets go
    if (Math.abs(this.grabY - body.bottom) > 8) this.airborne = true;
    const grounded = body.blocked.down || body.touching.down;
    if (this.airborne && grounded && vy >= 0) {
      this.release();
      return false;
    }

    return true;
  }

  grab() {
    const p = this.player;
    this.holding = true;
    this.airborne = false;
    this.attached = false;
    this.grabY = p.body.bottom;

    p.body.setAllowGravity(false);
    p.body.setVelocity(0, 0);
    p.stop();
    p.setFlipX(this.facing < 0);
    p.facing = this.facing;
    p.setTexture('float');
    p.pose = 'float';
    p.setScale(1);   // the float pose texture is pre-scaled to its in-game size
    p.alignBody();

    // The bouquet comes off the post into her hand
    this.swayTween?.stop();
    this.hint.setVisible(false);
    const h = p.handPoint();
    this.scene.tweens.add({
      targets: this.bouquet,
      x: h.x,
      y: h.y,
      angle: 0,
      duration: 260,
      ease: 'Sine.easeOut',
      onComplete: () => { this.attached = true; },
    });
    this.scene.events.emit('balloon-grab', this.name);
  }

  release() {
    const p = this.player;
    const onTarget = this.isTarget(p.body.bottom);
    this.holding = false;
    this.attached = false;
    this.mustLeave = true;

    p.body.setAllowGravity(true);
    p.body.setVelocity(0, 0);
    p.setScale(1);
    p.pose = null;
    p.setPose('idle');

    if (onTarget && this.handoffTo) {
      // Arrived: she puts the balloons down beside her, on the waiting post
      this.placeInto(this.handoffTo);
    } else if (onTarget) {
      this.leaving = true;
      if (this.gated) this.ready = false;   // she took this station's balloons away with her
      // Job done: the balloon floats off into the sky; a fresh one appears on the post
      this.scene.tweens.add({
        targets: this.bouquet,
        x: this.bouquet.x + 120 * this.facing,
        y: this.bouquet.y - 600,
        angle: 15,
        alpha: 0,
        duration: 2600,
        ease: 'Sine.easeIn',
        onComplete: () => this.resetToPost(true),
      });
    } else {
      this.returnToPost();
    }
    this.scene.events.emit('balloon-release', onTarget, this.name, false);
  }

  // Drift back to the post (she let go somewhere other than the target)
  returnToPost() {
    this.returning = true;
    this.scene.tweens.add({
      targets: this.bouquet,
      x: this.tie.x,
      y: this.tie.y,
      angle: 0,
      duration: 900,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.returning = false;
        this.hint.setVisible(this.ready);
        this.idleSway();
      },
    });
  }

  resetToPost(fade = false) {
    this.leaving = false;
    this.bouquet.setPosition(this.tie.x, this.tie.y).setAngle(0);
    if (!this.ready) {             // gated and empty: stays hidden until she brings a bouquet
      this.bouquet.setVisible(false).setAlpha(1);
      this.hint.setVisible(false);
      this.idleSway();
      return;
    }
    this.bouquet.setAlpha(fade ? 0 : 1);
    if (fade) this.scene.tweens.add({ targets: this.bouquet, alpha: 1, duration: 600 });
    this.hint.setVisible(true);
    this.idleSway();
  }

  /**
   * She has landed: crouching down, she sets the bouquet from her hand onto
   * `station`'s post (a short, gentle arc). It then simply stays there as that
   * station's waiting balloons — no new set pops into view. This station gets
   * a fresh bouquet back on its own post (out of view, far below).
   */
  placeInto(station) {
    const p = this.player;
    const to = station.tie;
    p.facing = to.x < p.x ? -1 : 1;
    p.setFlipX(p.facing < 0);
    p.playReaction('land', 480, { locked: true });   // bends down to set them down (plays out even if a key is held)
    this.leaving = true;
    this.scene.tweens.killTweensOf(this.bouquet);
    const from = { x: this.bouquet.x, y: this.bouquet.y, a: this.bouquet.angle };
    const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: Phaser.Math.Clamp(500 + dist * 1.4, 600, 1300),
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const t = tw.getValue();
        this.bouquet.setPosition(
          Phaser.Math.Linear(from.x, to.x, t),
          Phaser.Math.Linear(from.y, to.y, t) - Math.sin(Math.PI * t) * 16,
        );
        this.bouquet.setAngle(Phaser.Math.Linear(from.a, 0, t) - Math.sin(Math.PI * t) * 6 * p.facing);
      },
      onComplete: () => {
        station.receive();                       // the same bouquet, now tied to the post
        this.resetToPost(true);                  // this one goes back to its own post
      },
    });
  }

  /** A bouquet she carried here has been tied to this post: it waits for the ride down. */
  receive() {
    this.ready = true;
    this.leaving = false;
    this.returning = false;
    this.mustLeave = false;
    this.scene.tweens.killTweensOf(this.bouquet);
    this.bouquet.setPosition(this.tie.x, this.tie.y).setAngle(0).setAlpha(1).setVisible(true);
    this.idleSway();
    this.hint.setAlpha(0).setVisible(true);
    this.scene.tweens.add({ targets: this.hint, alpha: 1, duration: 500 });
  }

  /**
   * Put this station away: no balloon and no sign on its post, and it can't be
   * grabbed (used for the PROJECTS balloon after "Keep exploring").
   */
  hide() {
    this.ready = false;
    this.hint.setVisible(false);
    if (!this.holding && !this.leaving && !this.returning) {
      this.scene.tweens.killTweensOf(this.bouquet);
      this.bouquet.setVisible(false);
    }
  }

  // Respawn / restart: drop the balloon without any animation
  cancel() {
    if (!this.holding) return;
    this.holding = false;
    this.attached = false;
    this.player.body.setAllowGravity(true);
    this.player.setScale(1);
    this.player.pose = null;
    this.player.setPose('idle');
    this.scene.tweens.killTweensOf(this.bouquet);
    this.returning = false;
    this.resetToPost();
    this.scene.events.emit('balloon-release', false, this.name, true);   // cancelled (respawn / restart)
  }
}

// Move `value` toward `target` by at most `step`
function approach(value, target, step) {
  return value < target ? Math.min(value + step, target) : Math.max(value - step, target);
}
