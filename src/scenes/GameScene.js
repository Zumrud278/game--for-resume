import Phaser from 'phaser';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  ISLANDS,
  CAMERA_LOOKAHEAD,
  ROUTE,
} from '../utils/constants.js';
import { Player } from '../entities/Player.js';
import { Island } from '../entities/Island.js';
import { Bridge } from '../entities/Bridge.js';
import { Stars } from '../entities/Stars.js';
import { BalloonRide } from '../entities/BalloonRide.js';
import { ParallaxBackground } from '../effects/ParallaxBackground.js';
import { RainbowDestination } from '../effects/RainbowDestination.js';
import { Scenery } from '../effects/Scenery.js';

// Index used for the rainbow island in island-changed events
export const DESTINATION_INDEX = ISLANDS.length;

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  create() {
    // ── World: open at the bottom so falling off can trigger a respawn ──
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.setBoundsCollision(true, true, false, false);

    // ── Background ──
    this.background = new ParallaxBackground(this);

    // ── Islands: START → EDUCATION → SKILLS → PROJECTS → ACHIEVEMENTS → RAINBOW ──
    this.islands = ISLANDS.map((cfg, i) => new Island(this, cfg, i));
    this.destination = new RainbowDestination(this);

    // Left wall sits at the START island's edge so she can't walk off the back
    const startLeft = this.islands[0].collider.body.left + 10;
    this.physics.world.setBounds(startLeft, 0, WORLD_WIDTH - startLeft, WORLD_HEIGHT);

    // ── The route between nodes: bridges, stepping-stone rocks, jump gaps ──
    this.buildRoute();

    // ── Environment depth & atmosphere (visual only: forest layers, glows, spores) ──
    this.scenery = new Scenery(this, [...this.islands, ...this.rocks, this.destination.island]
      .map((i) => ({ x: i.x, surfaceY: i.surfaceY, width: i.width })));
    this.wasOnBridge = false;
    // Checked after EVERY physics step (a slow frame can run several steps),
    // so she can never move past a deck between two checks
    this.physics.world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.standOnBridges, this);
    // (On restart Phaser may already have destroyed the world — and its
    // listeners with it — before this runs, hence the ?.)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.physics.world?.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.standOnBridges, this);
    });

    // ── Balloon after PROJECTS (keyboard-controlled ride up to ACHIEVEMENTS) ──
    // (created after the player below; position is known now)

    // ── Collectible stars along the route (incl. a trail up the balloon ride) ──
    const L = this.launch;
    const skyTrail = [];
    for (let k = 1; k <= 6; k++) {
      const t = k / 7;
      skyTrail.push({
        x: Phaser.Math.Linear(L.x + 40, L.target.collider.body.left - 30, t),
        y: Phaser.Math.Linear(L.y - 140, L.target.surfaceY - 90, t) - Math.sin(Math.PI * t) * 60,
      });
    }
    this.stars = new Stars(this, this.islands, this.bridges, this.jumpGaps, skyTrail);

    this.platforms = this.physics.add.staticGroup();
    [...this.islands, ...this.rocks, this.destination.island].forEach((island) => {
      if (island.collider) this.platforms.add(island.collider);
    });

    // ── Player on the START island ──
    const start = ISLANDS[0];
    this.player = new Player(this, start.x - 40, start.surfaceY);
    this.currentIsland = 0;
    // Last platform she stood on (node or rock) — where a fall respawns her
    this.checkpoint = { x: start.x, y: start.surfaceY };

    this.ride = new BalloonRide(this, this.player, this.launch, this.launch.target);

    this.physics.add.collider(this.player, this.platforms, (player, zone) => {
      if (!player.body.touching.down || !zone.island) return;
      this.checkpoint = { x: zone.island.x, y: zone.island.surfaceY };
      if (zone.island.index >= 0) this.setCurrentIsland(zone.island.index);
      if (zone.island.index === DESTINATION_INDEX) this.arrive();
    });

    // ── Camera: fixed zoom, smooth follow, clamped to the world ──
    // Small vertical deadzone so jumps don't make the view bob;
    // a horizontal look-ahead shows more of where she's heading.
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    cam.setZoom(1);
    cam.startFollow(this.player, true, 0.1, 0.08, 0, 60);
    cam.setDeadzone(40, 140);
    cam.fadeIn(400, 30, 15, 60);
    this.lookAhead = 0;

    // ── Keyboard: arrows + WASD + Space ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    this.arrived = false;      // reached the rainbow island (ending shown)
    this.restarting = false;

    // ── UI overlay (level indicator, buttons, instructions) ──
    this.scene.launch('UI');
  }

  update(time, delta) {
    if (!this.player?.active) return;

    const cam = this.cameras.main;
    this.background.update(cam.scrollX, cam.scrollY);
    this.scenery.update(cam.scrollX, cam.scrollY);


    // While a resume panel is open, she stands still (keys are ignored)
    const c = this.cursors;
    const mobile = this.scene.get('UI')?.mobileControls;
    const input = {
      left: !!(c.left.isDown || this.wasd.A.isDown || mobile?.left),
      right: !!(c.right.isDown || this.wasd.D.isDown || mobile?.right),
      jump: !!(c.up.isDown || c.space.isDown || this.wasd.W.isDown || mobile?.up),
      up: !!(c.up.isDown || this.wasd.W.isDown || mobile?.up),
      down: !!(c.down.isDown || this.wasd.S.isDown),
    };
    const paused = this.isPanelOpen();
    const none = { left: false, right: false, jump: false, up: false, down: false };

    // Holding the balloon: the ride steers her instead of walking/jumping
    const riding = this.ride.update(paused ? none : input, delta / 1000);
    if (riding) {
      this.player.jumpHeld = input.jump;   // no surprise jump when she lets go
    } else if (paused) {
      this.player.update(none);
      // A jump key still held when the panel closes must be released and
      // pressed again — otherwise she'd hop by herself on close
      this.player.jumpHeld = input.jump;
    } else {
      this.player.update(input);
    }

    // Collect any star she's touching
    this.stars.update(this.player.body);

    // Camera look-ahead eases toward the facing direction
    const target = -this.player.facing * CAMERA_LOOKAHEAD;
    this.lookAhead = Phaser.Math.Linear(this.lookAhead, target, 0.04);
    this.cameras.main.followOffset.x = this.lookAhead;

    // Fell below the world → back to the last island stood on
    if (this.player.y > WORLD_HEIGHT + 150) this.respawn();

    // Heading on from ACHIEVEMENTS: the rainbow sweeps into view ahead of her
    if (!this.destination.revealed && this.player.x > this.islands[this.islands.length - 1].x + 60) {
      this.destination.reveal();
    }
  }

  /**
   * Builds each crossing between two nodes (the rainbow island is the last node):
   *   [node] ══bridge══ (rock) ~~ jump gap ~~ (rock) ══bridge══ [node]
   * The rocks sit halfway up any height difference; the bridges take the climb.
   */
  buildRoute() {
    const rockCfg = ROUTE.rock;
    const rockTex = this.textures.get(rockCfg.key).getSourceImage();
    const rockW = rockTex.width * rockCfg.scale * 0.78;   // walkable width (matches Island)

    this.rocks = [];
    this.bridges = [];
    this.jumpGaps = [];
    const nodes = [...this.islands, this.destination.island];
    nodes.slice(0, -1).forEach((a, i) => {
      const b = nodes[i + 1];
      const left = a.collider.body.right;
      const right = b.collider.body.left;

      // Last crossing (PROJECTS → ACHIEVEMENTS): bridge to a launch rock with
      // a balloon; ACHIEVEMENTS is far above, reached by riding the balloon
      if (i === this.islands.length - 2) {
        const rock = new Island(this, { ...rockCfg, x: left + ROUTE.launchBridge + rockW / 2, surfaceY: a.surfaceY }, -1);
        this.rocks.push(rock);
        this.bridges.push(new Bridge(this, { x: left, y: a.surfaceY }, { x: rock.collider.body.left, y: a.surfaceY }));
        this.launch = { x: rock.x + 18, y: a.surfaceY, rock, target: b };
        return;
      }

      const span = (right - left - 2 * rockW - ROUTE.jumpGap) / 2;   // each bridge's length
      const rockY = (a.surfaceY + b.surfaceY) / 2;

      const r1 = new Island(this, { ...rockCfg, x: left + span + rockW / 2, surfaceY: rockY }, -1);
      const r2 = new Island(this, { ...rockCfg, x: right - span - rockW / 2, surfaceY: rockY }, -1);
      this.rocks.push(r1, r2);

      this.bridges.push(
        new Bridge(this, { x: left, y: a.surfaceY }, { x: r1.collider.body.left, y: rockY }),
        new Bridge(this, { x: r2.collider.body.right, y: rockY }, { x: right, y: b.surfaceY })
      );
      this.jumpGaps.push({ x1: r1.collider.body.right, x2: r2.collider.body.left, y: rockY });
    });
  }

  // Bridges are line segments (Arcade physics has no slopes): when her feet
  // reach the deck while falling or walking, hold them exactly on it.
  // One-way like the islands — while rising she passes up through it.
  standOnBridges() {
    const body = this.player?.body;
    if (!body?.enable || this.ride?.holding) return;
    const x = body.position.x + body.halfWidth;
    const bridge = this.bridges.find((b) => b.covers(x));
    if (!bridge || body.velocity.y < 0) {
      this.wasOnBridge = false;
      return;
    }
    const below = body.bottom - bridge.yAt(x);      // > 0: feet below the deck
    // Already walking (on the bridge or the island before it) → stay attached
    // going downhill, where the deck drops a few px per frame; otherwise only
    // catch feet that actually reach the deck
    const reachAbove = this.wasOnBridge || this.player.wasOnGround ? 14 : 2;
    if (below >= -reachAbove && below <= 22) {
      body.y -= below;            // the sprite follows the body after the step
      body.velocity.y = 0;
      body.blocked.down = true;
      this.wasOnBridge = true;
    } else {
      this.wasOnBridge = false;
    }
  }

  // Resume panel or ending card open → game input is paused
  isPanelOpen() {
    const ui = this.scene.get('UI');
    return !!(ui?.panel?.isOpen || ui?.ending?.isOpen);
  }

  // "Play again": fade out and start over from the START island
  restartGame() {
    if (this.restarting) return;
    this.restarting = true;
    const cam = this.cameras.main;
    cam.fadeOut(600, 30, 15, 60);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop('UI');
      this.scene.restart();
    });
  }

  // She walked onto the rainbow island: light the landing platform, then the
  // ending (quote + contact card) plays — once per playthrough
  arrive() {
    if (this.arrived) return;
    this.arrived = true;
    this.destination.reveal();          // in case she got here very fast
    this.destination.onLanded();
    // The ending quote appears where the island's "RAINBOW" sign floats — fade the sign out
    const sign = this.destination.island.label;
    if (sign) {
      this.tweens.killTweensOf(sign);
      this.tweens.add({ targets: sign, alpha: 0, duration: 500 });
    }
    this.time.delayedCall(700, () => this.events.emit('journey-complete'));
  }

  setCurrentIsland(index) {
    if (this.currentIsland === index) return;
    this.currentIsland = index;
    this.events.emit('island-changed', index);
  }

  respawn() {
    this.ride.cancel();
    // Back on the last platform she stood on (a node or a stepping rock)
    this.player.resetTo(this.checkpoint.x, this.checkpoint.y - 60);
    this.cameras.main.flash(250, 255, 255, 255, false);
  }
}
