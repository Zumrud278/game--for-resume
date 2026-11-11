// World dimensions
export const WORLD_WIDTH = 4200;
export const WORLD_HEIGHT = 1800;

// Player physics
export const PLAYER_SPEED = 250;
export const PLAYER_JUMP = -520;

// Player sprite scale
export const PLAYER_SCALE = 0.55;

// Island positions — each { x, y, key, iconKey, dataKey, scale }
export const ISLANDS = [
  { x: 450,  y: 1350, key: 'island',        iconKey: null,          dataKey: null,           scale: 1.8, label: 'Start' },
  { x: 1150, y: 1180, key: 'island_2',      iconKey: 'education',   dataKey: 'education',    scale: 1.6, label: 'Education' },
  { x: 1850, y: 1020, key: 'island_3',      iconKey: 'skills',      dataKey: 'skills',       scale: 1.6, label: 'Skills' },
  { x: 2550, y: 860,  key: 'island_4',      iconKey: 'certificate', dataKey: 'projects',     scale: 1.6, label: 'Projects' },
  { x: 3300, y: 680,  key: 'trophy_island', iconKey: 'trophy',      dataKey: 'certificates', scale: 1.2, label: 'Achievements' },
];

// Balloon transition
export const BALLOON_START_Y = 680;
export const BALLOON_END_Y = -200;
export const BALLOON_DURATION = 4000;

// Colors
export const COLORS = {
  purple: 0x6B3FA0,
  pink: 0xE891B9,
  darkPurple: 0x2D1B4E,
  lightPurple: 0xC9A0DC,
  gold: 0xFFD700,
  white: 0xFFFFFF,
};

// UI
export const FONT_FAMILY = 'Georgia, serif';
