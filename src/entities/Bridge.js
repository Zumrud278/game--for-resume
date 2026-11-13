import Phaser from 'phaser';

// No bridge image exists in assets/, so the bridge is pixel art generated
// here: chunky 3×3 "pixels" with hard edges, in warm wood tones that match
// the islands' palette.
const PX = 3;                      // size of one art pixel on screen
const PLANK_W = 6;                 // plank size in art pixels
const PLANK_H = 5;
const PLANK_GAP = 1;
const POST_H = 14;                 // post height in art pixels
const OVERLAP = 14;                // how far the deck reaches onto each island
const HANDOFF = 20;                // walking surface continues this far onto each island (flat)

const C = {
  top: 0xd29a58,       // sunlit top face of a plank
  topLight: 0xe8b877,
  front: 0xa5682f,     // front face
  frontDark: 0x87521f,
  shadow: 0x5a3418,    // bottom edge
  outline: 0x4a2a14,
  rope: 0xe3c58f,
  ropeDark: 0xa98250,
  stringer: 0x4f2e16,
};

/** Builds the pixel-art plank and post textures once (crisp, unfiltered). */
function makeTextures(scene) {
  if (scene.textures.exists('bridge_plank')) return;
  const draw = (key, w, h, paint) => {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const px = (x, y, color) => { g.fillStyle(color, 1); g.fillRect(x * PX, y * PX, PX, PX); };
    paint(px);
    g.generateTexture(key, w * PX, h * PX);
    g.destroy();
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  };

  // Plank: 2-pixel top face, 2-pixel front face with wood grain, dark bottom
  draw('bridge_plank', PLANK_W, PLANK_H, (px) => {
    for (let x = 0; x < PLANK_W; x++) {
      const edge = x === 0 || x === PLANK_W - 1;
      px(x, 0, edge ? C.top : C.topLight);
      px(x, 1, C.top);
      px(x, 2, edge ? C.frontDark : C.front);
      px(x, 3, x === 2 || x === 4 ? C.frontDark : C.front);   // grain
      px(x, 4, C.shadow);
    }
  });

  // Post: a rounded cap, wood body with a highlight stripe, darker base
  draw('bridge_post', 4, POST_H, (px) => {
    px(1, 0, C.topLight); px(2, 0, C.top);
    for (let y = 1; y < POST_H; y++) {
      px(0, y, C.outline);
      px(1, y, y < 3 ? C.topLight : C.top);
      px(2, y, y > POST_H - 3 ? C.frontDark : C.front);
      px(3, y, C.outline);
    }
    px(0, 2, C.rope); px(1, 2, C.rope); px(2, 2, C.rope); px(3, 2, C.rope);   // rope lashing
  });
}

/**
 * A walkable wooden bridge between two islands.
 *
 *   from / to – { x, y } points on the grass edges of the two islands
 *
 * Physics: Arcade physics has no slopes, so each bridge is a line segment
 * that the player's feet are held on (see GameScene.standOnBridges).
 * Like the islands it's one-way: she can jump up through it from below.
 */
export class Bridge {
  constructor(scene, from, to) {
    makeTextures(scene);
    this.scene = scene;

    // Walking line (physics): exactly from one grass edge to the other, so
    // it meets each island at precisely that island's height
    this.x1 = from.x;
    this.y1 = from.y;
    this.x2 = to.x;
    this.y2 = to.y;
    this.slope = (this.y2 - this.y1) / (this.x2 - this.x1);

    // Visible deck: reaches a little onto each island so there's never a
    // visible gap (art only — on the islands she walks on the island itself)
    this.dx1 = from.x - OVERLAP;
    this.dx2 = to.x + OVERLAP;
    this.dy1 = from.y;
    this.dy2 = to.y;

    const angle = Math.atan2(this.dy2 - this.dy1, this.dx2 - this.dx1);
    const length = Math.hypot(this.dx2 - this.dx1, this.dy2 - this.dy1);
    const step = (PLANK_W + PLANK_GAP) * PX;
    const plankH = PLANK_H * PX;

    // Under-deck beam (stringer) that the planks rest on
    const beam = scene.add.graphics().setDepth(3);
    beam.lineStyle(PX * 2, C.stringer, 1);
    const nx = -Math.sin(angle);   // normal pointing "down" the screen
    const ny = Math.cos(angle);
    const off = plankH - PX;
    beam.lineBetween(this.dx1 + nx * off, this.dy1 + ny * off, this.dx2 + nx * off, this.dy2 + ny * off);

    // Planks laid along the deck line; top of each plank = walking surface
    this.planks = [];
    const count = Math.floor(length / step);
    const margin = (length - count * step + PLANK_GAP * PX) / 2;
    for (let i = 0; i < count; i++) {
      const d = margin + i * step + (PLANK_W * PX) / 2;
      const px = this.dx1 + Math.cos(angle) * d;
      const py = this.dy1 + Math.sin(angle) * d;
      this.planks.push(
        scene.add.image(px, py, 'bridge_plank').setOrigin(0.5, 0).setRotation(angle).setDepth(3)
      );
    }

    // Posts at both ends, standing on the island grass
    const postInset = OVERLAP - 2;
    const posts = [
      { x: this.dx1 + postInset, y: this.deckY(this.dx1 + postInset) },
      { x: this.dx2 - postInset, y: this.deckY(this.dx2 - postInset) },
    ];
    posts.forEach((p) => scene.add.image(p.x, p.y + PX * 2, 'bridge_post').setOrigin(0.5, 1).setDepth(3));

    // Hand rope: sags gently between the posts, with hangers down to the deck
    const ropeTop = POST_H * PX - PX * 4;
    const a = new Phaser.Math.Vector2(posts[0].x, posts[0].y - ropeTop);
    const b = new Phaser.Math.Vector2(posts[1].x, posts[1].y - ropeTop);
    const mid = new Phaser.Math.Vector2((a.x + b.x) / 2, (a.y + b.y) / 2 + 16);
    const curve = new Phaser.Curves.QuadraticBezier(a, mid, b);
    const rope = scene.add.graphics().setDepth(3);
    const hangers = Math.max(2, Math.round(length / 42));
    rope.lineStyle(PX - 1, C.ropeDark, 1);
    for (let i = 1; i < hangers; i++) {
      const p = curve.getPoint(i / hangers);
      rope.lineBetween(p.x, p.y, p.x, this.deckY(p.x) + 1);
    }
    rope.lineStyle(PX, C.rope, 1);
    curve.draw(rope, 24);

  }

  /**
   * True if x is over the bridge — the gap plus a short HANDOFF stretch onto
   * each island, where the surface is flat at exactly the island's height.
   * That way she always leaves a bridge perfectly level with the island.
   */
  covers(x) {
    return x >= this.x1 - HANDOFF && x <= this.x2 + HANDOFF;
  }

  /** Height of the walking surface at x (flat on the handoff stretches). */
  yAt(x) {
    const cx = Phaser.Math.Clamp(x, this.x1, this.x2);
    return this.y1 + (cx - this.x1) * this.slope;
  }

  /** Height of the drawn deck at x (art, includes the overlap onto islands). */
  deckY(x) {
    return this.dy1 + ((x - this.dx1) * (this.dy2 - this.dy1)) / (this.dx2 - this.dx1);
  }
}
