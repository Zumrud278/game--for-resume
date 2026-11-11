import Phaser from 'phaser';
import { COLORS } from '../utils/constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload() {
    // ── Loading bar ──
    const { width, height } = this.cameras.main;
    const barW = width * 0.5;
    const barH = 28;
    const barX = (width - barW) / 2;
    const barY = height / 2;

    const bgBar = this.add.graphics();
    bgBar.fillStyle(0x2d1b4e, 1);
    bgBar.fillRect(barX, barY, barW, barH);

    const progressBar = this.add.graphics();

    const loadingText = this.add.text(width / 2, barY - 30, 'Loading...', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#C9A0DC',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(COLORS.purple, 1);
      progressBar.fillRect(barX + 4, barY + 4, (barW - 8) * value, barH - 8);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      bgBar.destroy();
      loadingText.destroy();
    });

    // ── Characters ──
    this.load.image('idle', 'assets/characters/idle.png');
    this.load.spritesheet('run', 'assets/characters/run.png', {
      frameWidth: 144,
      frameHeight: 193,
    });
    this.load.image('jump', 'assets/characters/jump.png');
    this.load.image('fall', 'assets/characters/fall.png');
    this.load.image('land', 'assets/characters/land.png');
    this.load.image('celebrate', 'assets/characters/celebrate.png');
    this.load.image('float', 'assets/characters/float.png');

    // ── Islands ──
    this.load.image('island', 'assets/islands/island.png');
    this.load.image('island_2', 'assets/islands/island_2.png');
    this.load.image('island_3', 'assets/islands/island_3.png');
    this.load.image('island_4', 'assets/islands/island_4.png');
    this.load.image('castle_island', 'assets/islands/castle-island.png');
    this.load.image('trophy_island', 'assets/islands/trophy-island.png');

    // ── Objects ──
    this.load.image('balloons', 'assets/objects/balloons.png');
    this.load.image('certificate', 'assets/objects/certificate.png');
    this.load.image('education', 'assets/objects/education.png');
    this.load.image('projects', 'assets/objects/projects.png');
    this.load.image('skills', 'assets/objects/skills.png');
    this.load.image('trophy', 'assets/objects/trophy.png');

    // ── Effects ──
    this.load.image('sparkles', 'assets/effects/sparkles.png');
    this.load.image('star', 'assets/effects/star.png');
    this.load.image('star_small', 'assets/effects/star_small.png');

    // ── Backgrounds ──
    this.load.image('sky', 'assets/backgrounds/sky.png');
    this.load.image('clouds', 'assets/backgrounds/clouds.png');
    this.load.image('cloud_1', 'assets/backgrounds/clouds/cloud_1.png');
    this.load.image('cloud_2', 'assets/backgrounds/clouds/cloud_2.png');
    this.load.image('cloud_3', 'assets/backgrounds/clouds/cloud_3.png');
    this.load.image('cloud_4', 'assets/backgrounds/clouds/cloud_4.png');

    // ── UI ──
    this.load.image('start', 'assets/ui/start.png');
    this.load.image('explore_resume', 'assets/ui/explore-resume.png');
    this.load.image('back', 'assets/ui/back.png');
    this.load.image('dpad', 'assets/ui/dpad.png');
    this.load.image('space_jump', 'assets/ui/space-jump.png');
    this.load.image('speech_bubble', 'assets/ui/speech-bubble.png');
    this.load.image('social_bar', 'assets/ui/social-bar.png');
    this.load.image('hud_hearts', 'assets/ui/hud-hearts.png');
    this.load.image('level', 'assets/ui/level.png');
  }

  create() {
    this.scene.start('Menu');
  }
}
