import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

const config = {
  ...GAME_CONFIG,
  scene: [BootScene, MenuScene, GameScene, UIScene],
};

const game = new Phaser.Game(config);

// Debug handle for the browser console: always in `npm run dev`,
// and on any server when the URL ends with ?debug
if (import.meta.env?.DEV || new URLSearchParams(location.search).has('debug')) {
  window.__game = game;
}
