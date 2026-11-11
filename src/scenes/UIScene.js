import Phaser from 'phaser';
import { HUD } from '../ui/HUD.js';
import { MobileControls } from '../ui/MobileControls.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UI' });
  }

  create() {
    const gameScene = this.scene.get('Game');

    this.hud = new HUD(this);

    // Touch devices get on-screen controls (read by GameScene.update)
    if (this.sys.game.device.input.touch) {
      this.mobileControls = new MobileControls(this, gameScene.player);
    }

    // Level indicator follows the island the player is standing on
    const onIsland = (index) => this.hud.setLevel(index);
    gameScene.events.on('island-changed', onIsland);

    // Explore Resume — the resume panel is the next build step
    this.events.on('explore-resume', () => this.hud.toast('Resume panel coming soon ✦'));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameScene.events.off('island-changed', onIsland);
    });
  }
}
