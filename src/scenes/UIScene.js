import Phaser from 'phaser';
import { HUD } from '../ui/HUD.js';
import { MobileControls } from '../ui/MobileControls.js';
import { InfoPanel } from '../ui/InfoPanel.js';
import { ISLANDS } from '../utils/constants.js';
import { RESUME_SECTIONS } from '../data/resume.js';

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

    // Resume information panel (HTML overlay)
    this.panel = new InfoPanel();

    // Reaching an island: update the level badge and show its resume info
    const onIsland = (index) => {
      this.hud.setLevel(index);
      const section = RESUME_SECTIONS[ISLANDS[index]?.id];
      if (section) this.panel.showSection(section);
    };
    gameScene.events.on('island-changed', onIsland);

    // Balloon journey: controls are paused, so say what's happening
    const onJourneyStart = () => this.hud.setInstructions('✦  The balloons are carrying you to the Rainbow…  ✦');
    const onJourneyEnd = () => this.hud.setInstructions();
    gameScene.events.on('journey-start', onJourneyStart);
    gameScene.events.on('journey-complete', onJourneyEnd);

    // Explore Resume button: the whole resume in one panel
    this.events.on('explore-resume', () => this.panel.showAll());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameScene.events.off('island-changed', onIsland);
      gameScene.events.off('journey-start', onJourneyStart);
      gameScene.events.off('journey-complete', onJourneyEnd);
      this.panel.destroy();
    });
  }
}
