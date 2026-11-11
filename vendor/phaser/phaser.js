// Lets the game's `import Phaser from 'phaser'` work in the browser
// without a build step (Phaser's ESM file only has named exports).
// Mapped by the import map in index.html. Phaser v3.90.0 — MIT licensed.
import * as Phaser from './phaser.esm.min.js';
export * from './phaser.esm.min.js';
export default Phaser;
