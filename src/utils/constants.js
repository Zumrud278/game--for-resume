import { RESUME_SECTIONS } from '../data/resume.js';

// ── Game view (fixed resolution, scaled to fit the window) ──
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// ── World dimensions ──
export const WORLD_WIDTH = 2900;
// Tall world: the climb happens at the bottom, the balloon journey
// carries her ~1670px straight up to the rainbow island at the top.
export const WORLD_HEIGHT = 2900;

// ── Player physics ──
export const GRAVITY = 1100;
// Character size: ~118px tall when standing — sized against the islands,
// flowers, trophy and castle so she reads as the hero without crowding them.
export const PLAYER_SCALE = 0.6;

export const PLAYER = {
  speed: 280,            // max run speed (px/s)
  groundAccel: 2000,     // px/s² while running on the ground
  groundDecel: 2600,     // braking when no key is held on the ground
  airAccel: 1400,        // a little less control in the air
  airDecel: 700,         // keep some momentum mid-jump
  jumpVelocity: -640,    // full jump peak ≈ 186px (each upward step is 120px)
  jumpCutFactor: 0.45,   // release jump early → shorter hop
  maxFallSpeed: 900,     // 15px per physics step < platform thickness
  coyoteMs: 100,         // can still jump just after walking off an edge
  jumpBufferMs: 120,     // jump pressed just before landing still counts
  landPoseMs: 110,       // how long the crouch pose shows after landing
  landPoseMinSpeed: 350, // only crouch after a real drop
};

// ── Camera ──
export const CAMERA_LOOKAHEAD = 120; // px shown ahead of her facing direction

// ── Islands ──
// Stair layout, left → right, each step ~110px higher than the previous.
//   x         – horizontal centre of the island
//   surfaceY  – y of the walkable grass (the player's feet rest here)
//   grassFrac – where the grass line sits inside the image (0 = top, 1 = bottom)
// Labels, HUD names and icons come from src/data/resume.js
const fromResume = (id) => ({
  id,
  label: RESUME_SECTIONS[id].islandLabel,
  hudName: RESUME_SECTIONS[id].title,
  icon: RESUME_SECTIONS[id].icon,
});

// Layout (surfaceY = grass height; smaller = higher):
//   Ground row — START, EDUCATION, SKILLS on the same level, 180px gaps
//   Upper tier — PROJECTS one 120px step up, ACHIEVEMENTS one more step up
// Her jump reaches 186px high and 326px across on the level (260px when
// jumping 120px up), so every gap is clearly visible but comfortable.
const GROUND = 2630;
const STEP = 120;

export const ISLANDS = [
  { id: 'start', label: 'START', hudName: 'Start', icon: 'star', x: 240,  surfaceY: GROUND,            key: 'island',        scale: 1.7,  grassFrac: 0.24 },
  { ...fromResume('education'),                                   x: 682,  surfaceY: GROUND,            key: 'island_2',      scale: 2.1,  grassFrac: 0.2  },
  { ...fromResume('skills'),                                      x: 1100, surfaceY: GROUND,            key: 'island_3',      scale: 2.5,  grassFrac: 0.2  },
  { ...fromResume('projects'),                                    x: 1509, surfaceY: GROUND - STEP,     key: 'island_4',      scale: 1.95, grassFrac: 0.13 },
  { ...fromResume('achievements'),                                x: 1919, surfaceY: GROUND - STEP * 2, key: 'trophy_island', scale: 1.7,  grassFrac: 0.44 },
];

// ── Final rainbow destination ──
// ~1670px ABOVE the achievements island and offset to the right.
// Out of jumping reach — the balloon journey carries her up here.
export const DESTINATION = {
  id: 'rainbow',
  label: 'RAINBOW',
  icon: 'star',
  hudName: 'Rainbow Island',
  x: 2400,
  surfaceY: 520,
  key: 'castle_island',
  scale: 1.25,          // small fantasy castle under a large rainbow
  grassFrac: 0.53,
  landingX: 2380,       // where the balloons set her down (the landing platform)
};

// ── Balloon journey ──
export const BALLOON = {
  triggerDelayMs: 500,   // standing on ACHIEVEMENTS this long starts the journey
  celebrateMs: 1300,     // celebration before the balloons arrive
  arriveMs: 1700,        // bouquet floats down to her
  grabMs: 450,           // she grabs the strings
  flightMs: 9000,        // the flight itself
  bouquetScale: PLAYER_SCALE * 1.8,  // big bouquet (assets/objects/balloons.png), sized to her
  floatScale: PLAYER_SCALE * 1.1,    // float.png draws her ~10% smaller, so it's scaled up to match
  // Pixel positions inside the images where the strings meet
  bouquetKnot: { x: 99, y: 192 },  // balloons.png: knot where strings gather
  floatHand: { x: 130, y: 170 },   // float.png: her fist holding the strings
};

// ── Colors ──
export const COLORS = {
  purple: 0x6B3FA0,
  pink: 0xE891B9,
  darkPurple: 0x2D1B4E,
  lightPurple: 0xC9A0DC,
  gold: 0xFFD700,
  white: 0xFFFFFF,
  skyTop: 0x1E0F3C,
  skyMid: 0x4B2A85,
  skyBottom: 0xB979C9,
};

// ── UI ──
export const FONT_FAMILY = 'Georgia, serif';
