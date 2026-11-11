import Phaser from 'phaser';

export const GAME_CONFIG = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1024,
  height: 576,
  pixelArt: false,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 700 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#2d1b4e',
};
