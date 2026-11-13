import Phaser from 'phaser';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  ISLANDS,
  CAMERA_LOOKAHEAD,
  BALLOON,
  ROUTE,
} from '../utils/constants.js';
import { Player } from '../entities/Player.js';
import { Island } from '../entities/Island.js';
import { Bridge } from '../entities/Bridge.js';
import { Stars } from '../entities/Stars.js';
import { ParallaxBackground } from '../effects/ParallaxBackground.js';
import { RainbowDestination } from '../effects/RainbowDestination.js';
import { SkyCorridor } from '../effects/SkyCorridor.js';
import { BalloonJourney } from '../effects/BalloonJourney.js';

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

    // ── Islands: START → EDUCATION → SKILLS → PROJECTS → ACHIEVEMENTS ──
    this.islands = ISLANDS.map((cfg, i) => new Island(this, cfg, i));
    this.destination = new RainbowDestination(this);
    this.skyCorridor = new SkyCorridor(this);   // clouds & stars along the balloon route

    // Left wall sits at the START island's edge so she can't walk off the back
    const startLeft = this.islands[0].collider.body.left + 10;
    this.physics.world.setBounds(startLeft, 0, WORLD_WIDTH - startLeft, WORLD_HEIGHT);

    // ── The route between nodes: bridges, stepping-stone rocks, jump gaps ──
    this.buildRoute();
    this.wasOnBridge = false;
    // Checked after EVERY physics step (a slow frame can run several steps),
    // so she can never move past a deck between two checks
    this.physics.world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.standOnBridges, this);
    // (On restart Phaser may already have destroyed the world — and its
    // listeners with it — before this runs, hence the ?.)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.physics.world?.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.standOnBridges, this);
    });

    // ── Collectible stars along the route ──
    this.stars = new Stars(this, this.islands, this.bridges, this.jumpGaps);

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

    this.physics.add.collider(this.player, this.platforms, (player, zone) => {
      if (!player.body.touching.down || !zone.island) return;
      this.checkpoint = { x: zone.island.x, y: zone.island.surfaceY };
      if (zone.island.index >= 0) this.setCurrentIsland(zone.island.index);
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
    this.wasd = this.input.keyboard.addKeys('W,A,D');

    // ── Balloon journey (starts after ACHIEVEMENTS is completed) ──
    this.journey = new BalloonJourney(this, this.player, this.destination);
    this.journeyStarted = false;
    this.achievementTime = 0;
    this.restarting = false;

    // ── UI overlay (level indicator, buttons, instructions) ──
    this.scene.launch('UI');
  }

  update(time, delta) {
    if (!this.player?.active) return;

    const cam = this.cameras.main;
    this.background.update(cam.scrollX, cam.scrollY);

    // During the journey the flight is fully scripted
    if (this.journey.active) {
      this.journey.update(time);
      return;
    }


    // While a resume panel is open, she stands still (keys are ignored)
    const c = this.cursors;
    const mobile = this.scene.get('UI')?.mobileControls;
    const input = {
      left: !!(c.left.isDown || this.wasd.A.isDown || mobile?.left),
      right: !!(c.right.isDown || this.wasd.D.isDown || mobile?.right),
      jump: !!(c.up.isDown || c.space.isDown || this.wasd.W.isDown || mobile?.up),
    };
    if (this.isPanelOpen()) {
      this.player.update({ left: false, right: false, jump: false });
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

    this.checkJourneyTrigger(delta);
  }

  /**
   * Builds each crossing between two nodes:
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
    this.islands.slice(0, -1).forEach((a, i) => {
      const b = this.islands[i + 1];
      const left = a.collider.body.right;
      const right = b.collider.body.left;
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
    if (!body?.enable) return;
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

  // Level 4 (Achievements) is complete once she has landed on its island
  // and the achievements panel has been closed
  checkJourneyTrigger(delta) {
    if (this.journeyStarted) return;
    const onAchievements =
      this.currentIsland === ISLANDS.length - 1 && this.player.onGround && !this.isPanelOpen();
    this.achievementTime = onAchievements ? this.achievementTime + delta : 0;
    if (this.achievementTime >= BALLOON.triggerDelayMs) this.startJourney();
  }

  startJourney() {
    if (this.journeyStarted) return;
    this.journeyStarted = true;
    this.lookAhead = 0;
    this.events.emit('journey-start');
    this.journey.start(() => {
      this.setCurrentIsland(DESTINATION_INDEX);
      this.events.emit('journey-complete');
    });
  }

  setCurrentIsland(index) {
    if (this.currentIsland === index) return;
    this.currentIsland = index;
    this.events.emit('island-changed', index);
  }

  respawn() {
    // Back on the last platform she stood on (a node or a stepping rock)
    this.player.resetTo(this.checkpoint.x, this.checkpoint.y - 60);
    this.cameras.main.flash(250, 255, 255, 255, false);
  }
}
