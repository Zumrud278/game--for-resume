import Phaser from 'phaser';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  ISLANDS,
  PLAYER_SPEED,
  PLAYER_JUMP,
  PLAYER_SCALE,
  COLORS,
  FONT_FAMILY,
} from '../utils/constants.js';
import { RESUME_DATA } from '../config/resumeData.js';
import { Player } from '../entities/Player.js';
import { Island } from '../entities/Island.js';
import { ParallaxBackground } from '../effects/ParallaxBackground.js';
import { Sparkles } from '../effects/Sparkles.js';
import { BalloonTransition } from '../effects/BalloonTransition.js';
import { SpeechBubble } from '../ui/SpeechBubble.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  create() {
    // ── World bounds ──
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // ── Parallax background ──
    this.parallaxBg = new ParallaxBackground(this);

    // ── Islands ──
    this.islands = ISLANDS.map((cfg) => new Island(this, cfg));

    // Build a static group from each island's invisible collider body
    this.platformGroup = this.physics.add.staticGroup();
    this.islands.forEach((island) => {
      if (island.collider) {
        this.platformGroup.add(island.collider);
      }
    });

    // ── Player ──
    const startIsland = ISLANDS[0];
    this.player = new Player(this, startIsland.x, startIsland.y - 200);

    // Collider: player vs platforms
    this.physics.add.collider(this.player, this.platformGroup);

    // ── Camera ──
    this.cameras.main
      .setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
      .startFollow(this.player, true, 0.08, 0.08);

    // ── Input ──
    this.cursors = this.input.keyboard.createCursorKeys();

    // ── Effects ──
    this.sparkles = new Sparkles(this);

    // ── Speech bubble ──
    this.speechBubble = new SpeechBubble(this);

    // ── Balloon transition ──
    this.balloonTransition = new BalloonTransition(this);

    // ── Visited-island tracking ──
    // Content islands are indices 1-4 (skip 0 = Start)
    this.visitedSet = new Set();
    this.currentOverlapIsland = null;
    this.lastVisitedIslandIndex = 0;

    // ── Overlap zones for island icons ──
    this.overlapZones = [];
    this.islands.forEach((island, idx) => {
      if (!island.dataKey) return; // skip Start island (no data)

      // Create invisible trigger zone around the icon position
      const zone = this.add.zone(island.x, island.y - 60, 120, 140);
      this.physics.add.existing(zone, true); // static body

      // Store reference
      zone._islandIndex = idx;
      zone._dataKey = island.dataKey;
      this.overlapZones.push(zone);
    });

    // Overlap: player vs icon zones
    this.overlapZones.forEach((zone) => {
      this.physics.add.overlap(this.player, zone, () => {
        this._onEnterIslandZone(zone);
      });
    });

    // ── Launch UI overlay ──
    this.scene.launch('UI');

    // Track if balloon transition has been triggered
    this.balloonTriggered = false;
  }

  update() {
    if (!this.player || !this.player.active) return;

    // Player movement
    this.player.update(this.cursors);

    // Parallax scrolling
    const cam = this.cameras.main;
    this.parallaxBg.update(cam.scrollX, cam.scrollY);

    // Check if player left all overlap zones this frame
    this._checkOverlapExit();

    // Fall-off-world respawn
    if (this.player.y > WORLD_HEIGHT + 100) {
      this._respawn();
    }
  }

  // ── Island interaction helpers ──

  _onEnterIslandZone(zone) {
    const idx = zone._islandIndex;
    const dataKey = zone._dataKey;

    if (this.currentOverlapIsland === idx) return; // already showing

    this.currentOverlapIsland = idx;
    this.lastVisitedIslandIndex = idx;

    // Show speech bubble with resume data
    const data = RESUME_DATA[dataKey];
    if (data) {
      const island = this.islands[idx];
      this.speechBubble.show(island.x, island.y - 160, data);

      // Bounce the icon
      if (island.iconSprite) {
        island.showIcon();
      }
    }

    // Mark visited
    if (!this.visitedSet.has(idx)) {
      this.visitedSet.add(idx);
      // Emit level-up event for UI scene
      this.events.emit('levelUp', this.visitedSet.size);

      // Check if all 4 content islands visited
      this._checkAllVisited();
    }
  }

  _checkOverlapExit() {
    if (this.currentOverlapIsland === null) return;

    // See if player still overlaps any zone
    let stillOverlapping = false;
    for (const zone of this.overlapZones) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(
        this.player.getBounds(),
        zone.getBounds()
      )) {
        stillOverlapping = true;
        break;
      }
    }

    if (!stillOverlapping) {
      this.currentOverlapIsland = null;
      this.speechBubble.hide();
    }
  }

  _checkAllVisited() {
    // Content islands are indices 1-4
    const contentIndices = ISLANDS
      .map((_, i) => i)
      .filter((i) => ISLANDS[i].dataKey !== null);

    const allVisited = contentIndices.every((i) => this.visitedSet.has(i));

    if (allVisited && !this.balloonTriggered) {
      this.balloonTriggered = true;
      // Small delay so the player can see the last bubble
      this.time.delayedCall(1500, () => {
        this.speechBubble.hide();
        this.balloonTransition.play(this.player, () => {
          this.scene.stop('UI');
          this.scene.start('Contact');
        });
      });
    }
  }

  _respawn() {
    const island = ISLANDS[this.lastVisitedIslandIndex] || ISLANDS[0];
    this.player.setPosition(island.x, island.y - 200);
    this.player.setVelocity(0, 0);
  }
}
