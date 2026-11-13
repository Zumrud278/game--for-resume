import { RESUME_SECTIONS } from '../data/resume.js';

// ── Game view (fixed resolution, scaled to fit the window) ──
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// ── World dimensions ──
export const WORLD_WIDTH = 6600;   // room for the rainbow island after ACHIEVEMENTS
// Tall world: the route climbs from the ground row up to the rainbow island
export const WORLD_HEIGHT = 3600;

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
  jumpVelocity: -640,    // full jump peak ≈ 186px (bridges connect the islands)
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
//   Ground row — START, EDUCATION, SKILLS on the same level
//   Upper tier — PROJECTS one STEP up, ACHIEVEMENTS high above (balloon ride)
// GAP = distance between the walkable edges of neighbouring nodes. Each
// crossing is a little journey of its own (built in GameScene.buildRoute):
//   [node] ══bridge══ (rock) ~~jump~~ (rock) ══bridge══ [node]
const GROUND = 3330;
const STEP = 360;
const GAP = 900;
// PROJECTS → ACHIEVEMENTS is the balloon section: ACHIEVEMENTS floats this
// far above PROJECTS — too high for bridges or jumps, so she rides a balloon
const LIFT = 700;

// Node x positions are chained so each gap is exactly GAP wide
// (half-widths = half of each island's walkable top)
const HALF = { start: 142, education: 119, skills: 119, projects: 120, achievements: 120, rainbow: 136 };
const X0 = 240;
const X1 = X0 + HALF.start + GAP + HALF.education;
const X2 = X1 + HALF.education + GAP + HALF.skills;
const X3 = X2 + HALF.skills + GAP + HALF.projects;
const X4 = X3 + HALF.projects + GAP + HALF.achievements;
// The rainbow island is the next node after ACHIEVEMENTS: same GAP, one STEP up
const X5 = X4 + HALF.achievements + GAP + HALF.rainbow;

export const ISLANDS = [
  { id: 'start', label: 'START', hudName: 'Start', icon: 'star', x: X0, surfaceY: GROUND,            key: 'island',        scale: 1.7,  grassFrac: 0.24 },
  { ...fromResume('education'),                                   x: X1, surfaceY: GROUND,            key: 'island_2',      scale: 2.1,  grassFrac: 0.2  },
  { ...fromResume('skills'),                                      x: X2, surfaceY: GROUND,            key: 'island_3',      scale: 2.5,  grassFrac: 0.2  },
  { ...fromResume('projects'),                                    x: X3, surfaceY: GROUND - STEP,     key: 'island_4',      scale: 1.95, grassFrac: 0.13 },
  { ...fromResume('achievements'),                                x: X4, surfaceY: GROUND - STEP - LIFT, key: 'trophy_island', scale: 1.7,  grassFrac: 0.44 },
];

// Small stepping-stone rocks in the middle of each crossing, with a jump
// between them (her jump reaches ~326px across on the level)
export const ROUTE = {
  rock: { key: 'island_3', scale: 1.0, grassFrac: 0.2 },
  jumpGap: 200,
  launchBridge: 255,   // PROJECTS → launch rock (where the balloon is tied)
};

// ── Final rainbow destination ──
// The last node of the route, right after ACHIEVEMENTS and connected the same
// way as every other level (bridges, stepping rocks, a jump) — one STEP higher.
export const DESTINATION = {
  id: 'rainbow',
  label: 'RAINBOW',
  icon: 'star',
  hudName: 'Rainbow Island',
  x: X5,
  surfaceY: GROUND - STEP - LIFT - STEP,
  key: 'castle_island',
  scale: 1.25,          // small fantasy castle under a large rainbow
  grassFrac: 0.53,
  landingX: X5 - 20,    // the glowing landing platform in front of the castle gate
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

// ── Balloon ride (PROJECTS → ACHIEVEMENTS), controlled with the keyboard ──
export const BALLOON_RIDE = {
  rise: 170,           // px/s while ↑ is held
  descend: 130,        // px/s while ↓ is held
  drift: 170,          // px/s sideways with ← →
  accel: 420,          // px/s² — how gently she speeds up / slows down
  ceilingAbove: 260,   // she can float this far above ACHIEVEMENTS, no higher
  grabRange: 42,       // how close to the post she must walk to grab it
  bouquetScale: PLAYER_SCALE * 1.25,
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
