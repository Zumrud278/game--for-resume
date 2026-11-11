import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT, ISLANDS } from '../utils/constants.js';
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
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    cam.setZoom(1);
    cam.startFollow(this.player, true, 0.1, 0.1, 0, 80); // keep player slightly below centre
    cam.setDeadzone(160, 100);
    cam.fadeIn(400, 30, 15, 60);

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
    this.player.setVelocity(0, 0);
    this.player.setPosition(island.x, island.surfaceY - 120);
    this.cameras.main.flash(250, 255, 255, 255, false);
  }
}
