import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT, ISLANDS, CAMERA_LOOKAHEAD } from '../utils/constants.js';
import { Player } from '../entities/Player.js';
import { Island } from '../entities/Island.js';
import { ParallaxBackground } from '../effects/ParallaxBackground.js';
import { RainbowDestination } from '../effects/RainbowDestination.js';

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

    // Left wall sits at the START island's edge so she can't walk off the back
    const startLeft = this.islands[0].collider.body.left + 10;
    this.physics.world.setBounds(startLeft, 0, WORLD_WIDTH - startLeft, WORLD_HEIGHT);

    this.platforms = this.physics.add.staticGroup();
    [...this.islands, this.destination.island].forEach((island) => {
      if (island.collider) this.platforms.add(island.collider);
    });

    // ── Player on the START island ──
    const start = ISLANDS[0];
    this.player = new Player(this, start.x - 40, start.surfaceY);
    this.currentIsland = 0;

    this.physics.add.collider(this.player, this.platforms, (player, zone) => {
      if (player.body.touching.down && zone.island && zone.island.index >= 0) {
        this.setCurrentIsland(zone.island.index);
      }
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

    // ── UI overlay (level indicator, buttons, instructions) ──
    this.scene.launch('UI');
  }

  update() {
    if (!this.player?.active) return;

    const c = this.cursors;
    const mobile = this.scene.get('UI')?.mobileControls;
    this.player.update({
      left: c.left.isDown || this.wasd.A.isDown || mobile?.left,
      right: c.right.isDown || this.wasd.D.isDown || mobile?.right,
      jump: c.up.isDown || c.space.isDown || this.wasd.W.isDown || mobile?.up,
    });

    // Camera look-ahead eases toward the facing direction
    const target = -this.player.facing * CAMERA_LOOKAHEAD;
    this.lookAhead = Phaser.Math.Linear(this.lookAhead, target, 0.04);
    this.cameras.main.followOffset.x = this.lookAhead;

    // Fell below the world → back to the last island stood on
    if (this.player.y > WORLD_HEIGHT + 150) this.respawn();
  }

  setCurrentIsland(index) {
    if (this.currentIsland === index) return;
    this.currentIsland = index;
    this.events.emit('island-changed', index, ISLANDS[index]);
  }

  respawn() {
    const island = ISLANDS[this.currentIsland] || ISLANDS[0];
    this.player.resetTo(island.x, island.surfaceY - 60);
    this.cameras.main.flash(250, 255, 255, 255, false);
  }
}
