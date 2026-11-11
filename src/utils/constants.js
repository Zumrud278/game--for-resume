// ── Game view (fixed resolution, scaled to fit the window) ──
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// ── World dimensions ──
export const WORLD_WIDTH = 2900;
export const WORLD_HEIGHT = 1450;

// ── Player physics ──
export const GRAVITY = 1100;
export const PLAYER_SCALE = 0.5;

export const PLAYER = {
  speed: 280,            // max run speed (px/s)
  groundAccel: 2000,     // px/s² while running on the ground
  groundDecel: 2600,     // braking when no key is held on the ground
  airAccel: 1400,        // a little less control in the air
  airDecel: 700,         // keep some momentum mid-jump
  jumpVelocity: -640,    // full jump peak ≈ 186px (each step is 110px)
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
export const ISLANDS = [
  { id: 'start',        label: 'START',        x: 240,  surfaceY: 1180, key: 'island',        scale: 1.7,  grassFrac: 0.24 },
  { id: 'education',    label: 'EDUCATION',    x: 660,  surfaceY: 1070, key: 'island_2',      scale: 2.1,  grassFrac: 0.2  },
  { id: 'skills',       label: 'SKILLS',       x: 1080, surfaceY: 960,  key: 'island_3',      scale: 2.5,  grassFrac: 0.2  },
  { id: 'projects',     label: 'PROJECTS',     x: 1500, surfaceY: 850,  key: 'island_4',      scale: 1.95, grassFrac: 0.13 },
  { id: 'achievements', label: 'ACHIEVEMENTS', x: 1920, surfaceY: 740,  key: 'trophy_island', scale: 1.7,  grassFrac: 0.44 },
];

// ── Final rainbow destination ──
// Well above the achievements island (≈380px higher) and offset to the right,
// so it is clearly NOT on the same horizontal line. Reached later via balloons.
export const DESTINATION = {
  label: 'RAINBOW',
  x: 2480,
  surfaceY: 360,
  key: 'castle_island',
  scale: 1.5,
  grassFrac: 0.53,
};

// ── Balloon transition ──
export const BALLOON_START_Y = 680;
export const BALLOON_END_Y = -200;
export const BALLOON_DURATION = 4000;

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
