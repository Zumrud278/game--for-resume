/**
 * Ambient backdrop for the page behind the game.
 *
 * The game keeps its fixed 16:9 view (Scale.FIT), so on windows of any other
 * shape there's space beside or above/below it. Instead of a flat colour
 * there, this shows a heavily blurred, slightly dimmed live copy of the
 * current frame, scaled to cover the whole window — so the edges always
 * continue whatever scene is on screen (forest, sky, rainbow…), with no
 * stretching, seams or empty-looking bars. Purely visual, behind the canvas.
 *
 * Cost: one tiny 64×36 copy ~15 times a second.
 */
const W = 64;
const H = 36;

export class AmbientBackdrop {
  constructor(game) {
    this.game = game;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.canvas.setAttribute('aria-hidden', 'true');
    Object.assign(this.canvas.style, {
      position: 'fixed',
      left: '50%',
      top: '50%',
      // cover the window at 16:9 (never stretched), centred
      width: 'max(100vw, 177.78vh)',
      height: 'max(100vh, 56.25vw)',
      transform: 'translate(-50%, -50%) scale(1.12)',
      filter: 'blur(40px) saturate(0.85) brightness(0.62)',
      zIndex: '0',
      pointerEvents: 'none',
    });
    // appended last so the game's canvas stays the first <canvas> on the page;
    // z-index keeps the backdrop underneath
    document.body.append(this.canvas);
    // keep the game itself layered above the backdrop
    const container = document.getElementById(game.config.parent) || game.canvas.parentElement;
    if (container) Object.assign(container.style, { position: 'relative', zIndex: '1' });
    // soft dark glow around the game frame so it melts into the backdrop
    game.canvas.style.boxShadow = '0 0 80px 30px rgba(18, 7, 40, 0.55)';
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingQuality = 'high';
    this.frame = 0;

    // Copy right after Phaser has drawn a frame (the WebGL buffer is valid then)
    game.events.on('postrender', () => {
      if (++this.frame % 4) return;
      try {
        this.ctx.drawImage(game.canvas, 0, 0, W, H);
      } catch {
        // drawing can fail very early (e.g. before the first frame); just skip
      }
    });
  }
}
