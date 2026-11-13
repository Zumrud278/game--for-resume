import Phaser from 'phaser';
import { COLORS, PLAYER_SCALE, BALLOON, ISLANDS } from '../utils/constants.js';
import { prescaleTexture, polishTexture } from '../utils/textureQuality.js';

const CHARACTER_KEYS = ['idle', 'jump', 'fall', 'land', 'celebrate', 'float', 'run_1', 'run_2', 'run_3'];

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

    // Remember any asset that fails so a placeholder can be drawn instead
    this.missing = [];
    this.load.on('loaderror', (file) => {
      console.warn(`[Boot] Missing asset "${file.key}" (${file.src}) — using placeholder`);
      this.missing.push(file.key);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      bgBar.destroy();
      loadingText.destroy();
    });

    // ── Characters ──
    this.load.image('idle', 'assets/characters/idle.png');
    // Individual run frames (run.png is 433px wide, which doesn't split evenly)
    this.load.image('run_1', 'assets/characters/frames/run_1.png');
    this.load.image('run_2', 'assets/characters/frames/run_2.png');
    this.load.image('run_3', 'assets/characters/frames/run_3.png');
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
    this.load.image('social_bar', 'assets/ui/social-bar.png');
    this.load.image('hud_hearts', 'assets/ui/hud-hearts.png');
    this.load.image('level', 'assets/ui/level.png');
  }

  create() {
    this.missing.forEach((key) => this.makePlaceholder(key));

    // Character: every pose drawn once at its exact in-game size, so she's
    // rendered 1:1 — her eyes and fine details stay stable while she moves
    prescaleTexture(this, 'idle', 0.75, 'idle_menu');   // start-screen copy (its own size)
    CHARACTER_KEYS.forEach((key) => {
      prescaleTexture(this, key, key === 'float' ? BALLOON.floatScale : PLAYER_SCALE);
    });

    // Level nodes: polished copies of the original island pictures
    ISLANDS.forEach((cfg) => polishTexture(this, cfg.key, cfg.scale, `node_${cfg.id}`));

    this.scene.start('Menu');
  }

  // Simple temporary texture for a missing image.
  makePlaceholder(key) {
    if (this.textures.exists(key)) this.textures.remove(key);
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    if (CHARACTER_KEYS.includes(key)) {
      // Character-sized stand-in (same ~140×200 footprint as the real art,
      // so physics and feet alignment behave identically)
      const w = 140;
      const h = 200;
      g.fillStyle(0x7B3FA0, 1);            // purple cape
      g.fillRoundedRect(30, 70, 80, 110, 20);
      g.fillStyle(0xF3E6D0, 1);            // cream outfit
      g.fillRoundedRect(48, 80, 44, 80, 12);
      g.fillStyle(0x6B3A1F, 1);            // brown boots
      g.fillRect(48, 172, 18, 25);
      g.fillRect(74, 172, 18, 25);
      g.fillStyle(0x7A4A2A, 1);            // brown hair
      g.fillCircle(70, 48, 40);
      g.fillStyle(0xFAD9C1, 1);            // face
      g.fillCircle(78, 52, 24);
      g.fillStyle(0x9B4FD0, 1);            // purple bow
      g.fillTriangle(38, 12, 38, 34, 54, 23);
      g.fillTriangle(70, 12, 70, 34, 54, 23);
      g.generateTexture(key, w, h);
    } else {
      // Generic soft purple box
      g.fillStyle(0x6B3FA0, 0.9);
      g.fillRoundedRect(0, 0, 120, 120, 16);
      g.lineStyle(4, 0xC9A0DC, 1);
      g.strokeRoundedRect(2, 2, 116, 116, 14);
      g.generateTexture(key, 120, 120);
    }
    g.destroy();
  }
}
