import Phaser from 'phaser';
import { COLORS } from '../utils/constants.js';
import {
  makeTitleEmblem, makeEmeraldIsland, makeStartButton, makeMoon, makePixelStar, makeSpark4,
} from '../effects/pixelArt.js';

/**
 * Start screen — a centred, layered pixel-art fantasy composition (16:9):
 *   sky:     twilight gradient, twinkling stars, a few clouds, white crescent
 *            moon on the left, misty mountains and the distant castle below
 *   top:     "Emerald / World" title in an open gold filigree frame
 *   sides:   smaller floating islands from the game itself framing the view
 *   centre:  the girl standing on a wide floating island with vines and
 *            wildflowers — she blinks, breathes, looks toward the pointer,
 *            and reacts when hovered or clicked
 *   bottom:  ONE Start button over the island's rocky underside
 * All pixel art is generated in src/effects/pixelArt.js and shown at a
 * whole-number scale with NEAREST filtering (crisp, pixelated).
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Menu' });
  }

  // sky.png scaled uniformly to `width`, with its top 40% faded to transparent
  // (its small moon is removed: the start screen has its own crescent moon)
  static horizonTexture(scene, width) {
    width = Math.round(width);
    const key = `menu_horizon_${Math.round(width)}`;   // one per view width
    if (scene.textures.exists(key)) return key;
    const src = scene.textures.get('sky').getSourceImage();
    // sky.png has a semi-transparent 1–4px fringe on its edges: use the clean interior
    const sx = 2, sy = 2, sw = src.width - 4, sh = src.height - 7;
    const k = width / sw;
    const h = Math.round(sh * k);
    const tex = scene.textures.createCanvas(key, width, h);
    const ctx = tex.getContext();
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, width, h);
    ctx.globalCompositeOperation = 'destination-out';
    const mx = (229 - sx) * k, my = (46 - sy) * k, mr = 17 * k;
    const moon = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
    moon.addColorStop(0, 'rgba(0,0,0,1)');
    moon.addColorStop(0.75, 'rgba(0,0,0,1)');
    moon.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = moon;
    ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    ctx.globalCompositeOperation = 'destination-in';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.4, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, h);
    tex.refresh();
    return key;
  }

  // Soft round light (drawn additively), in emerald / gold / white
  static glow(scene, name, inner, outer) {
    const key = `menu_glow_${name}`;
    if (scene.textures.exists(key)) return key;
    const S = 128;
    const tex = scene.textures.createCanvas(key, S, S);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.4, outer);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    tex.refresh();
    return key;
  }

  create() {
    const { width, height } = this.cameras.main;
    const rnd = new Phaser.Math.RandomDataGenerator(['emerald-world']);
    const ADD = Phaser.BlendModes.ADD;

    // The view follows the window shape — re-lay out the start screen on resize
    const onResize = () => this.scene.restart();
    this.scale.once(Phaser.Scale.Events.RESIZE, onResize);
    // Pixel-art screen: the browser scales the canvas to the window — keep pixels square
    const canvas = this.game.canvas;
    canvas.style.imageRendering = 'pixelated';
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      canvas.style.imageRendering = '';
    });

    // Pixel size: every pixel-art element is drawn at this whole-number scale
    const P = Phaser.Math.Clamp(Math.floor(height / 360), 1, 4);
    const cx = Math.round(width / 2);
    const glowGold = MenuScene.glow(this, 'gold', 'rgba(255,225,130,0.7)', 'rgba(255,190,80,0.25)');
    const glowWhite = MenuScene.glow(this, 'white', 'rgba(255,255,255,0.7)', 'rgba(220,210,255,0.22)');

    // ── Twilight sky: deep purple → lavender ──
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.lightPurple, COLORS.lightPurple, 1);
    bg.fillRect(0, 0, width, height);
    const mid = this.add.graphics();       // a richer purple band through the middle, fading both ways
    mid.fillGradientStyle(COLORS.skyMid, COLORS.skyMid, COLORS.skyMid, COLORS.skyMid, 0, 0, 0.5, 0.5);
    mid.fillRect(0, 0, width, height * 0.35);
    mid.fillGradientStyle(COLORS.skyMid, COLORS.skyMid, COLORS.skyMid, COLORS.skyMid, 0.5, 0.5, 0, 0);
    mid.fillRect(0, height * 0.35, width, height * 0.4);

    // Pixel stars, twinkling
    makePixelStar(this);
    for (let i = 0; i < 70; i++) {
      const s = this.add.image(rnd.between(8, width - 8), rnd.between(6, Math.round(height * 0.6)), 'px_star')
        .setScale(rnd.frac() < 0.2 ? P : Math.max(1, P - 1))
        .setAlpha(rnd.realInRange(0.35, 0.95));
      this.tweens.add({
        targets: s, alpha: { from: s.alpha, to: rnd.realInRange(0.05, 0.3) },
        duration: rnd.between(900, 2600), delay: rnd.between(0, 2000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // White crescent moon, left-centre sky
    const moonX = Math.round(width * 0.27), moonY = Math.round(height * 0.3);
    this.add.image(moonX, moonY, glowWhite).setBlendMode(ADD).setDisplaySize(64 * P, 64 * P).setAlpha(0.35);
    this.add.image(moonX, moonY, makeMoon(this)).setScale(P);

    // Misty mountains, clouds and the distant castle along the bottom
    this.add.image(0, height, MenuScene.horizonTexture(this, width)).setOrigin(0, 1).setAlpha(0.6);
    const mist = this.add.graphics();
    mist.fillGradientStyle(0xd9c4f0, 0xd9c4f0, 0xd9c4f0, 0xd9c4f0, 0, 0, 0.35, 0.35);
    mist.fillRect(0, height * 0.72, width, height * 0.28);

    // A few small clouds
    [['cloud_1', 0.12, 0.2], ['cloud_2', 0.66, 0.1], ['cloud_4', 0.4, 0.42]].forEach(([key, fx, fy]) => {
      const cloud = this.add.image(width * fx, height * fy, key).setScale(0.42 * (height / 720)).setAlpha(0.45);
      this.tweens.add({ targets: cloud, x: cloud.x + rnd.between(-40, 40), duration: rnd.between(6000, 9000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // ── Midground: the game's own floating island nodes framing the left and right ──
    // (positions are fractions of the view; sizes follow the view height) — kept
    // clear of the crescent moon (left) and the distant castle (lower right)
    const u = height / 720;
    [
      // [texture, x, y, scale, depth tint]  — farther ones smaller and hazier
      ['island_2', 0.055, 0.17, 0.6, 0xc9bce0],          // far, top-left
      ['island_4', 0.09, 0.42, 1.0, 0xece6f6],           // left, Projects island
      ['island_3', 0.2, 0.73, 0.95, 0xe6def3],           // lower left, Skills island
      ['island_3', 0.745, 0.42, 0.55, 0xc9bce0],         // far, right of centre (above the castle)
      ['trophy_island', 0.925, 0.25, 0.8, 0xece6f6],     // right, Achievements island
      ['island_2', 0.955, 0.66, 0.62, 0xd8cdea],         // lower right, beside the castle
    ].forEach(([key, fx, fy, s, tint], i) => {
      const isl = this.add.image(Math.round(width * fx), Math.round(height * fy), key).setScale(s * u).setTint(tint);
      this.tweens.add({ targets: isl, y: isl.y - 5 * u, duration: 2800 + i * 350, delay: i * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // ── Layout (top → bottom): title, character on the centre island, Start ──
    const emblemKey = makeTitleEmblem(this);
    const emblemTex = this.textures.get(emblemKey).getSourceImage();
    const emblemInfo = this.textures.get(emblemKey).customData.emblem;
    const emW = emblemTex.width * P, emH = emblemTex.height * P;
    const emY = Math.round(Math.max(emH / 2 + height * 0.03, height * 0.2));

    // her start-screen frames are pre-drawn at 0.75 of the art = 1:1 at P = 2
    const charScale = P / 2;
    const charTex = this.textures.get('idle_menu').getSourceImage();
    const charH = charTex.height * charScale;

    const islandKey = makeEmeraldIsland(this);
    const islandTex = this.textures.get(islandKey).getSourceImage();
    const islandInfo = this.textures.get(islandKey).customData.island;

    const btnKey = makeStartButton(this);
    const btnTex = this.textures.get(btnKey).getSourceImage();
    const btnH = btnTex.height * P;

    const grassY = Math.round(Math.max(height * 0.57, emY + emH / 2 + height * 0.05 + charH));
    const islandTop = grassY - islandInfo.grassY * P;
    const btnY = Math.round(Math.min(grassY + 86 * P, height * 0.965 - btnH / 2));

    // ── Title emblem (no box behind it — just a soft gold glow) ──
    const emGlow = this.add.image(cx, emY, glowGold).setBlendMode(ADD).setDisplaySize(emW * 1.1, emH * 1.15).setAlpha(0.2);
    this.tweens.add({ targets: emGlow, alpha: 0.32, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const emblem = this.add.image(cx, emY, emblemKey).setScale(P);
    const gemShine = this.add.image(
      cx + (emblemInfo.gemX - emblemTex.width / 2 - 2) * P, emY + (emblemInfo.gemY - emblemTex.height / 2 - 2) * P, 'star_small',
    ).setBlendMode(ADD).setScale(0.1 * P).setAlpha(0);
    this.tweens.add({ targets: [emblem, gemShine], y: `-=${2 * P}`, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: gemShine, alpha: 1, scale: 0.24 * P, duration: 500, hold: 120, yoyo: true, repeat: -1, repeatDelay: 2200 });
    // four-point star sparkles twinkling around the title
    makeSpark4(this);
    [[-0.52, -0.38], [0.5, -0.3], [-0.46, 0.42], [0.55, 0.36], [-0.2, -0.56], [0.24, 0.56]].forEach(([fx, fy], i) => {
      const s = this.add.image(cx + fx * emW, emY + fy * emH, 'px_spark4').setScale(Math.max(1, P - 1)).setAlpha(0);
      this.tweens.add({ targets: s, alpha: 1, duration: 600, delay: i * 520, hold: 200, yoyo: true, repeat: -1, repeatDelay: 1800 + i * 150 });
    });

    // ── Centre island ──
    this.add.image(cx, islandTop, islandKey).setOrigin(0.5, 0).setScale(P);

    // ── The girl, standing on the grass in the middle of the island ──
    const character = this.createGirl(cx, grassY + P, charScale, charTex.width * charScale, height / 720);

    // Starlight / firefly motes drifting around the island
    this.add.particles(0, 0, 'star_small', {
      x: { min: cx - islandTex.width * P * 0.6, max: cx + islandTex.width * P * 0.6 },
      y: { min: grassY - 60 * P, max: grassY + 100 * P },
      speedX: { min: -12, max: 12 }, speedY: { min: -12, max: 8 },
      scale: { start: 0.09 * P, end: 0.02 * P },
      alpha: { values: [0, 1, 0.6, 1, 0] },
      tint: [0xfff1a8, 0xffd1f0, 0xffffff],
      lifespan: 3200, frequency: 220, blendMode: 'ADD',
    });

    // ── The single Start button, over the island's rocky underside ──
    const btnGlow = this.add.image(0, 0, glowGold).setBlendMode(ADD)
      .setDisplaySize(btnTex.width * P * 1.15, btnH * 1.6).setAlpha(0.18);
    const startBtn = this.add.image(0, 0, btnKey).setScale(P).setInteractive({ useHandCursor: true });
    const button = this.add.container(cx, btnY, [btnGlow, startBtn]);

    // Hover: a little bigger, with a brighter glow
    startBtn.on('pointerover', () => {
      this.tweens.add({ targets: button, scale: 1.06, duration: 160, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: btnGlow, alpha: 0.5, duration: 160 });
    });
    startBtn.on('pointerout', () => {
      this.tweens.add({ targets: button, scale: 1, duration: 160, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: btnGlow, alpha: 0.18, duration: 160 });
    });

    startBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 45, 27, 78);
      this.time.delayedCall(400, () => {
        this.scene.start('Game');
      });
    });

    // Where everything landed (used by the layout checks)
    this.layoutInfo = {
      P,
      crest: { top: emY - emH / 2 - 2 * P, bottom: emY + emH / 2, left: cx - emW / 2, right: cx + emW / 2 },
      character: { top: character.y - charH * character.originY, bottom: character.y },
      island: { top: islandTop, bottom: islandTop + islandTex.height * P, grassY },
      button: { top: btnY - btnH / 2, bottom: btnY + btnH / 2, y: btnY },
    };
  }

  /**
   * The girl on the start screen, with a little life of her own:
   *  - blinks every few seconds (sometimes twice), breathes gently
   *  - turns to look toward the mouse pointer
   *  - hover over her → a happy little hop with sparkles
   *  - click her → she cheers (celebrate pose, bigger hop, sparkle burst)
   *  - left alone for a while, she glances around or hops on her own
   * Her frames are pre-drawn at their screen size, so she stays crisp.
   */
  createGirl(x, feetY, scale, width, u) {
    const POSES = {                       // texture → [torso anchor x, feet y] (fractions of the frame)
      idle_menu: [0.645, 201 / 203],
      idle_blink_menu: [0.645, 201 / 203],
      celebrate_menu: [0.63, 208 / 210],
    };
    const baseX = Math.round(x + (POSES.idle_menu[0] - 0.5) * width);   // same spot as before, anchored at her torso
    const girl = this.add.image(baseX, feetY, 'idle_menu').setScale(scale);
    const st = { hop: 0, breath: 0, busy: false, facing: 1, pose: 'idle_menu', lastPointer: 0 };
    const rnd = new Phaser.Math.RandomDataGenerator(['girl']);

    const setPose = (key) => {
      if (!this.textures.exists(key)) return;
      st.pose = key;
      const [ax, fy] = POSES[key];
      girl.setTexture(key).setFlipX(st.facing < 0).setOrigin(st.facing < 0 ? 1 - ax : ax, fy);
    };
    const face = (dir) => {
      if (dir === st.facing) return;
      st.facing = dir;
      setPose(st.pose);
    };
    setPose('idle_menu');

    // Breathing (1px) and hops move her; her feet return to the grass every time
    this.tweens.add({ targets: st, breath: 1, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const place = () => girl.setPosition(baseX, Math.round(feetY - st.hop - (st.breath > 0.6 ? Math.max(1, scale) : 0)));
    this.events.on(Phaser.Scenes.Events.UPDATE, place);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, place));

    const sparkle = (n, spread) => {
      const e = this.add.particles(girl.x, girl.y - girl.displayHeight * 0.7, 'star_small', {
        speed: { min: 50 * u, max: spread * u },
        angle: { min: 200, max: 340 },
        scale: { start: 0.32 * u, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 750,
        gravityY: 140,
        tint: [0xffd700, 0xffffff, 0xff9de0, 0xc9a0dc],
        emitting: false,
      });
      e.explode(n);
      this.time.delayedCall(900, () => e.destroy());
    };
    const hop = (h, ms) => {
      this.tweens.killTweensOf(st, ['hop']);
      st.hop = 0;
      this.tweens.add({ targets: st, hop: h * u, duration: ms, yoyo: true, ease: 'Quad.easeOut' });
    };

    // Blinking: every 2–5 s, sometimes a double blink
    const blinkOnce = () => {
      if (st.pose !== 'idle_menu' || st.busy) return;
      setPose('idle_blink_menu');
      this.time.delayedCall(130, () => { if (st.pose === 'idle_blink_menu') setPose('idle_menu'); });
    };
    const scheduleBlink = () => {
      this.time.delayedCall(rnd.between(2000, 4800), () => {
        blinkOnce();
        if (rnd.frac() < 0.25) this.time.delayedCall(280, blinkOnce);
        scheduleBlink();
      });
    };
    this.time.delayedCall(900, blinkOnce);
    scheduleBlink();

    // She looks toward the pointer
    this.input.on('pointermove', (p) => {
      st.lastPointer = this.time.now;
      if (st.busy) return;
      const dx = p.x - girl.x;
      if (Math.abs(dx) > 50 * u) face(dx < 0 ? -1 : 1);
    });

    // Hover → happy hop; click → cheer
    girl.setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 40 });
    let hoverReady = 0;
    girl.on('pointerover', () => {
      if (st.busy || this.time.now < hoverReady) return;
      hoverReady = this.time.now + 1400;
      hop(9, 160);
      sparkle(6, 120);
      this.events.emit('girl-react', 'hover');
    });
    girl.on('pointerdown', () => {
      if (st.busy) return;
      st.busy = true;
      setPose('celebrate_menu');
      hop(18, 220);
      sparkle(16, 200);
      this.events.emit('girl-react', 'cheer');
      this.time.delayedCall(1100, () => { st.busy = false; setPose('idle_menu'); });
    });

    // Left alone for a while: glance around, or a little hop
    this.time.addEvent({
      delay: 6500,
      loop: true,
      callback: () => {
        if (st.busy || this.time.now - st.lastPointer < 4000) return;
        if (rnd.frac() < 0.6) face(-st.facing); else { hop(6, 150); }
      },
    });

    girl.lifeState = st;      // for checks
    return girl;
  }
}
