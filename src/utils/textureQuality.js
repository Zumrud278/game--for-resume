/**
 * Texture quality helpers (run once at boot). They never change what the art
 * looks like — only how cleanly it's rendered at its on-screen size.
 *
 * prescaleTexture  — redraws an image at the exact size it's shown, with
 *                    high-quality smoothing, so it can be drawn 1:1. With
 *                    roundPixels every image pixel then lands on exactly one
 *                    screen pixel, so fine details (like the character's eyes)
 *                    stay identical frame to frame instead of shimmering as the
 *                    GPU re-samples a scaled image at shifting sub-pixel offsets.
 *
 * polishTexture    — for the level nodes: high-quality upscale, a light
 *                    sharpen, a touch of vibrance, and a thin dark outline.
 *                    Same artwork, crisper and cleaner.
 */

function drawScaled(srcImg, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // big reductions look best done in halving steps
  let img = srcImg;
  let iw = srcImg.width;
  let ih = srcImg.height;
  while (iw / 2 > w && ih / 2 > h) {
    const step = document.createElement('canvas');
    step.width = Math.round(iw / 2);
    step.height = Math.round(ih / 2);
    const sctx = step.getContext('2d');
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(img, 0, 0, step.width, step.height);
    img = step; iw = step.width; ih = step.height;
  }
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

/** Replace texture `key` with a high-quality copy scaled by `scale` (or save it as `newKey`). */
export function prescaleTexture(scene, key, scale, newKey = key) {
  const src = scene.textures.get(key).getSourceImage();
  const canvas = drawScaled(src, Math.max(1, Math.round(src.width * scale)), Math.max(1, Math.round(src.height * scale)));
  if (newKey === key) scene.textures.remove(key);
  if (scene.textures.exists(newKey)) scene.textures.remove(newKey);
  scene.textures.addCanvas(newKey, canvas);
}

/**
 * Polished copy of `key` at `scale`, saved as `newKey`. Adds PAD transparent
 * pixels on every side for the outline; returns { pad, width, height }.
 */
export const POLISH_PAD = 3;
export function polishTexture(scene, key, scale, newKey) {
  const src = scene.textures.get(key).getSourceImage();
  const w = Math.round(src.width * scale);
  const h = Math.round(src.height * scale);
  const P = POLISH_PAD;
  const W = w + P * 2;
  const H = h + P * 2;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(drawScaled(src, w, h), P, P);

  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const orig = new Uint8ClampedArray(d);
  const at = (x, y) => (y * W + x) * 4;

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = at(x, y);
      if (orig[i + 3] < 8) continue;
      for (let ch = 0; ch < 3; ch++) {
        // unsharp mask (3×3 box blur), amount 0.55
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += orig[at(x + dx, y + dy) + ch];
        d[i + ch] = orig[i + ch] + 0.55 * (orig[i + ch] - sum / 9);
      }
      // gentle vibrance + contrast
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = 1.1, con = 1.05;
      d[i] = (l + (r - l) * sat - 128) * con + 128;
      d[i + 1] = (l + (g - l) * sat - 128) * con + 128;
      d[i + 2] = (l + (b - l) * sat - 128) * con + 128;
    }
  }

  // Thin dark-plum outline around the silhouette (2px, soft)
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && orig[at(x, y) + 3] > 140;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = at(x, y);
      if (orig[i + 3] > 140) continue;
      let near = 0;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy <= 5 && solid(x + dx, y + dy)) { near = dx * dx + dy * dy <= 2 ? 2 : 1; break; }
      }
      if (near) {
        const a = near === 2 ? 235 : 120;
        // blend under any existing soft edge pixel
        const ea = orig[i + 3] / 255;
        d[i] = orig[i] * ea + 42 * (1 - ea);
        d[i + 1] = orig[i + 1] * ea + 20 * (1 - ea);
        d[i + 2] = orig[i + 2] * ea + 66 * (1 - ea);
        d[i + 3] = Math.max(orig[i + 3], a);
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  if (scene.textures.exists(newKey)) scene.textures.remove(newKey);
  scene.textures.addCanvas(newKey, canvas);
  return { pad: P, width: W, height: H };
}
