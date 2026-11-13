import Phaser from 'phaser';
import { BALLOON, DESTINATION, PLAYER_SCALE } from '../utils/constants.js';

/**
 * THE BALLOON JOURNEY
 *
 *  1. celebrate     – she cheers, star burst + "Level complete" text
 *  2. arrive        – a big bouquet (balloons.png) floats down above her
 *  3. grab          – she switches to the float pose (float.png) and the
 *                     bouquet's string knot locks onto her fist
 *  4. fly           – balloons lift her along a smooth path ~1670px up,
 *                     through clouds and stars; the camera follows
 *  5. reveal        – the rainbow sweeps into view as she nears the top
 *  6. land          – she touches down on the rainbow island, lets go,
 *                     and the balloons drift away
 *
 * The flight is a real movement through world coordinates — no
 * teleporting and no scene change.
 */
export class BalloonJourney {
  constructor(scene, player, destination) {
    this.scene = scene;
    this.player = player;
    this.destination = destination;
    this.active = false;
    this.attached = false;   // bouquet knot follows her hand
    this.sway = 0;           // bouquet swing angle (degrees)
    this.stage = 'idle';
  }

  start(onComplete) {
    if (this.active) return;
    this.active = true;
    this.onComplete = onComplete;

    const p = this.player;
    p.controlsEnabled = false;
    p.body.enable = false;            // movement is fully scripted now
    p.setVelocity(0, 0);
    p.setFlipX(false);                // facing the rainbow (right)
    p.facing = 1;

    this.celebrate();
  }

  // ── 1. Celebration ──────────────────────────────────────────────
  celebrate() {
    this.stage = 'celebrate';
    const { scene, player: p } = this;
    p.setPose('celebrate');

    // Little happy hop
    scene.tweens.add({ targets: p, y: p.y - 18, duration: 220, yoyo: true, ease: 'Quad.easeOut' });

    this.burst(p.x, p.y - 70, 26);

    const msg = scene.add
      .text(p.x, p.y - 150, 'Level complete! ✦', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#FFD700',
        stroke: '#2D1B4E',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setScale(0.6)
      .setAlpha(0);
    scene.tweens.add({ targets: msg, alpha: 1, scale: 1, duration: 350, ease: 'Back.easeOut' });
    scene.tweens.add({
      targets: msg,
      y: msg.y - 50,
      alpha: 0,
      delay: 1100,
      duration: 700,
      onComplete: () => msg.destroy(),
    });

    scene.time.delayedCall(BALLOON.celebrateMs, () => this.arrive());
  }

  // ── 2. The bouquet floats down to her ───────────────────────────
  arrive() {
    this.stage = 'arrive';
    const { scene, player: p } = this;
    const tex = scene.textures.get('balloons').getSourceImage();

    this.bouquet = scene.add
      .image(0, 0, 'balloons')
      .setOrigin(BALLOON.bouquetKnot.x / tex.width, BALLOON.bouquetKnot.y / tex.height)
      .setScale(BALLOON.bouquetScale)
      .setDepth(9)                     // just behind her (player depth 10)
      .setAlpha(0);

    // Knot ends up just above her raised hands
    const target = { x: p.x + 4, y: p.y - 224 * PLAYER_SCALE };
    this.bouquet.setPosition(target.x + 40, target.y - 520);

    scene.tweens.add({ targets: this.bouquet, alpha: 1, duration: 500 });
    scene.tweens.add({
      targets: this.bouquet,
      x: target.x,
      y: target.y,
      duration: BALLOON.arriveMs,
      ease: 'Sine.easeOut',
      onComplete: () => this.grab(),
    });
    // Swing gently while descending
    scene.tweens.add({ targets: this.bouquet, angle: { from: -8, to: 5 }, duration: BALLOON.arriveMs, ease: 'Sine.easeInOut' });
  }

  // ── 3. She grabs the strings ────────────────────────────────────
  grab() {
    this.stage = 'grab';
    const { scene, player: p } = this;

    // Float pose = her holding the strings above her head
    p.stop();
    p.setTexture('float');
    p.pose = 'float';
    p.setScale(BALLOON.floatScale);
    p.alignBody();                     // anchor the float pose at her torso

    // Pull the knot into her fist
    const hand = this.handPoint();
    scene.tweens.add({
      targets: this.bouquet,
      x: hand.x,
      y: hand.y,
      angle: 0,
      duration: BALLOON.grabMs,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.attached = true;
        this.fly();
      },
    });
    this.burst(hand.x, hand.y, 10, 0.25);
  }

  // World position of her fist in the float pose
  handPoint() {
    const p = this.player;
    const f = p.frame;
    const s = p.scaleX;
    return {
      // displayOriginX is mirrored when flipped; convert back to image coords
      x: p.x + (BALLOON.floatHand.x - (p.flipX ? f.realWidth - p.displayOriginX : p.displayOriginX)) * (p.flipX ? -s : s),
      y: p.y - (f.realHeight - BALLOON.floatHand.y) * s,
    };
  }

  // ── 4. The flight ───────────────────────────────────────────────
  fly() {
    this.stage = 'fly';
    const { scene, player: p, destination } = this;

    const sx = p.x;
    const sy = p.y;
    const dx = DESTINATION.landingX; // touchdown on the landing platform
    const dy = DESTINATION.surfaceY;
    const H = sy - dy;
    // Stay left of the floating rock until she's above its grass line
    const rockLeft = destination.island.image.getBounds().left;
    const clearX = rockLeft - 70;

    this.path = new Phaser.Curves.Spline([
      new Phaser.Math.Vector2(sx, sy),
      new Phaser.Math.Vector2(sx + 6, sy - H * 0.22),
      new Phaser.Math.Vector2(Phaser.Math.Linear(sx, clearX, 0.4), sy - H * 0.55),
      new Phaser.Math.Vector2(clearX - 20, dy + 150),
      new Phaser.Math.Vector2(clearX + 40, dy - 200),
      new Phaser.Math.Vector2(dx - 80, dy - 230),
      new Phaser.Math.Vector2(dx, dy),
    ]);

    // Camera: keep her in the lower part of the screen so the sky
    // ahead (and soon the rainbow) is visible above her
    const cam = scene.cameras.main;
    scene.tweens.add({ targets: cam.followOffset, x: 0, y: 150, duration: 1500, ease: 'Sine.easeInOut' });

    this.progress = { t: 0 };
    scene.tweens.add({
      targets: this.progress,
      t: 1,
      duration: BALLOON.flightMs,
      ease: 'Sine.easeInOut',
      onComplete: () => this.land(),
    });
  }

  // Called every frame by GameScene while the journey is active
  update(time) {
    if (!this.active) return;
    const p = this.player;

    if (this.stage === 'fly') {
      const t = this.progress.t;
      const pt = this.path.getPointAt(t);
      // Gentle sideways drift, fading out at take-off and touchdown
      const envelope = Math.sin(Math.PI * t);
      p.setPosition(pt.x + Math.sin(time / 650) * 10 * envelope, pt.y);
      this.sway = Math.sin(time / 800) * 5 * envelope;

      // Reveal the rainbow once it's about to come on screen
      if (!this.destination.revealed && p.y < DESTINATION.surfaceY + 900) {
        this.destination.reveal();
      }
    }

    if (this.attached && this.bouquet) {
      const hand = this.handPoint();
      this.bouquet.setPosition(hand.x, hand.y);
      this.bouquet.setAngle(this.sway);
    }
  }

  // ── 6. Touchdown on the rainbow island ──────────────────────────
  land() {
    this.stage = 'land';
    const { scene, player: p } = this;
    const hand = this.handPoint();

    // Let go: her pose drops the in-hand balloons, the big bouquet
    // drifts up and away
    this.attached = false;
    p.setScale(PLAYER_SCALE);
    p.pose = null;
    p.setPose('celebrate');
    this.burst(hand.x, hand.y, 14, 0.3);
    this.burst(p.x, p.y - 60, 24);

    scene.tweens.add({
      targets: this.bouquet,
      x: this.bouquet.x + 140,
      y: this.bouquet.y - 650,
      angle: 12,
      duration: 3200,
      ease: 'Sine.easeIn',
    });
    scene.tweens.add({
      targets: this.bouquet,
      alpha: 0,
      delay: 2000,
      duration: 1200,
      onComplete: () => this.bouquet.destroy(),
    });

    const cam = scene.cameras.main;
    scene.tweens.add({ targets: cam.followOffset, y: 60, duration: 1500, ease: 'Sine.easeInOut' });

    // Light up the landing platform (the ending text is shown by the UI)
    this.destination.onLanded?.();

    // Hand control back: physics on, standing on the castle island
    scene.time.delayedCall(1400, () => {
      p.body.enable = true;
      p.resetTo(p.x, p.y);
      p.controlsEnabled = true;
      this.active = false;
      this.stage = 'done';
      this.onComplete?.();
    });
  }

  // Star/sparkle burst at (x, y)
  burst(x, y, count, scale = 0.45) {
    const scene = this.scene;
    const emitter = scene.add.particles(x, y, 'star_small', {
      speed: { min: 80, max: 260 },
      angle: { min: 0, max: 360 },
      scale: { start: scale, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 600, max: 1100 },
      gravityY: 160,
      rotate: { min: 0, max: 360 },
      tint: [0xffd700, 0xffffff, 0xe891b9, 0xc9a0dc, 0x8ce99a],
      emitting: false,
    });
    emitter.setDepth(20);
    emitter.explode(count);
    scene.time.delayedCall(1400, () => emitter.destroy());
  }
}
