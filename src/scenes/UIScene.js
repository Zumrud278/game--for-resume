import Phaser from 'phaser';
import { HUD } from '../ui/HUD.js';
import { MobileControls } from '../ui/MobileControls.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UI' });
  }

  create() {
    // ── HUD (hearts + level) — top-left ──
    this.hud = new HUD(this);

    // ── Mobile controls — only on touch devices ──
    const gameScene = this.scene.get('Game');

    if (this.sys.game.device.input.touch) {
      this.mobileControls = new MobileControls(this, gameScene.player);
    }

    // ── Listen for level-up events from GameScene ──
    gameScene.events.on('levelUp', (n) => {
      this.hud.setLevel(n);
    });

    // Clean up listener when this scene shuts down
    this.events.on('shutdown', () => {
      gameScene.events.off('levelUp');
    });
  }
}
