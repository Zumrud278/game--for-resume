import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY } from '../utils/constants.js';

export const GAME_CONFIG = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: false,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: GRAVITY },
      // 240 small physics steps per second (instead of 60): identical gravity,
      // jumps and speeds, but motion is spread evenly over every rendered
      // frame on any monitor (60/120/144 Hz) — no stutter while falling
      fps: 240,
      debug: false,
    },
  },
  // EXPAND fills 100% of the browser window with no bars or stretching: the
  // game is scaled proportionally (like FIT, from the 1280×720 design size)
  // and the view simply extends to cover the window's extra width or height.
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#1E0F3C',
};
