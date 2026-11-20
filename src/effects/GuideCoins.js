import Phaser from 'phaser';

const COIN_SCALE = 0.34;     // assets/effects/star.png → ~17px, smaller than the collectible stars
const GLOW_SIZE = 64;

/**
 * Glowing star coins that light the way between SKILLS and ACHIEVEMENTS.
 * They're only guides (not collectible) and only show while a
 * "Follow the stars" hint is up. A soft wave of light runs along them in the
 * direction she should go: up the route, or back down it.
 */
export class GuideCoins {
  /**
   * @param points  [{ x, y, both, sky }] in route order
   *                `sky`  = on the balloon route (lit for the ride up)
   *                `both` = also on the way back down
   */
  constructor(scene, points) {
    this.scene = scene;
    if (!scene.textures.exists('guide_glow')) makeGlowTexture(scene);

    this.coins = points.map((pt, i) => {
      const glow = scene.add.image(pt.x, pt.y, 'guide_glow')
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(5).setAlpha(0).setVisible(false);
      const coin = scene.add.image(pt.x, pt.y, 'star')
        .setScale(COIN_SCALE).setTint(0xffe27a).setDepth(5).setAlpha(0).setVisible(false);
      return { glow, coin, i, both: pt.both, sky: pt.sky, on: false };
    });
    this.fade = { v: 0 };
    this.dir = 1;
  }

  /** 'up' | 'down' | null */
  show(mode) {
    if (mode) {
      this.dir = mode === 'up' ? 1 : -1;
      this.coins.forEach((c) => {
        c.on = mode === 'up' ? !!c.sky : c.both;
        c.glow.setVisible(c.on);
        c.coin.setVisible(c.on);
      });
    }
    this.scene.tweens.killTweensOf(this.fade);
    this.scene.tweens.add({
      targets: this.fade,
      v: mode ? 1 : 0,
      duration: mode ? 450 : 350,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (!mode) this.coins.forEach((c) => { c.glow.setVisible(false); c.coin.setVisible(false); });
      },
    });
  }

  update(time) {
    const f = this.fade.v;
    if (f <= 0) return;
    const t = time / 1000;
    for (const c of this.coins) {
      if (!c.on) continue;
      // A wave of light travelling along the coins toward where she should go
      const b = 0.5 + 0.5 * Math.sin(c.i * 0.6 - t * 4.2 * this.dir);
      c.coin.setAlpha(f * (0.55 + 0.45 * b)).setScale(COIN_SCALE * (0.92 + 0.16 * b));
      c.glow.setAlpha(f * (0.25 + 0.6 * b)).setScale(0.55 + 0.35 * b);
    }
  }
}

function makeGlowTexture(scene) {
  const tex = scene.textures.createCanvas('guide_glow', GLOW_SIZE, GLOW_SIZE);
  const ctx = tex.getContext();
  const r = GLOW_SIZE / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(255, 236, 150, 0.9)');
  grad.addColorStop(0.35, 'rgba(255, 210, 90, 0.45)');
  grad.addColorStop(1, 'rgba(255, 190, 60, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);
  tex.refresh();
}
