import { VIRT_W, VIRT_H } from './config.js';
import { XP_THRESHOLDS } from './progression.js';

export function getXpTarget(level) {
  if (level <= XP_THRESHOLDS.length) {
    return XP_THRESHOLDS[level - 1];
  }
  const overflow = level - XP_THRESHOLDS.length;
  return 3500 + overflow * 400;
}

export function createInitialState() {
  return {
    running: false,
    paused: false,
    over: false,
    time: 0,
    level: 1,
    xp: 0,
    xpTarget: getXpTarget(1),
    ballots: 0,
    bombs: 1,
    dash: { ready: true, timer: 0, cooldown: 6, duration: 0.18 },
    haloPulse: 0,
    camera: { x: 0, y: 0, shake: 0 },
    stats: {
      kills: { decree: 0, expert: 0, burst: 0, dossier: 0, reco: 0, systemic: 0 }
    },
    player: {
      x: VIRT_W / 2,
      y: VIRT_H / 2,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: 48,
      baseSpeed: 48,
      hp: 120,
      max: 120,
      ifr: 0,
      dash: 0,
      sign: 1,
      magnet: 24
    },
    weapon: {
      cooldown: 0,
      rate: 0.55,
      projectiles: 1,
      spread: 0.18,
      damage: 8,
      speed: 110
    },
    upgrades: [],
    projectiles: [],
    enemies: [],
    effects: [],
    orbs: [],
    ballotsItems: [],
    spawn: {
      timer: 0,
      density: 0
    },
    bestiary: {},
    lastSystemic: 0
  };
}
