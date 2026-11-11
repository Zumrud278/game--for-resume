import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { ContactScene } from './scenes/ContactScene.js';

const config = {
  ...GAME_CONFIG,
  scene: [BootScene, MenuScene, GameScene, UIScene, ContactScene],
};

const game = new Phaser.Game(config);
