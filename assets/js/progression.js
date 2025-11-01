export const XP_THRESHOLDS = [
  30, 50, 80, 120, 180, 260, 360, 480, 620, 780,
  960, 1160, 1380, 1620, 1880, 2160, 2460, 2780, 3120, 3480
];

export const ENEMY_HP = {
  decree: t => 12 + t * 2.5,
  expert: t => 40 + t * 3.2,
  burst: t => 24 + t * 2.8,
  dossier: t => 110 + t * 5,
  reco: t => 45 + t * 3.5,
  systemic: t => 550 + t * 15
};

export const ENEMY_SPEED = {
  decree: t => 32 + t * 0.9,
  expert: t => 26 + t * 0.7,
  burst: t => 36 + t * 0.8,
  dossier: t => 18 + t * 0.5,
  reco: t => 20 + Math.sin(t * 0.3) * 6 + t * 0.3,
  systemic: t => 28 + t * 0.45
};

export const UPGRADES = [
  {
    id: 'firerate',
    icon: '🔁',
    text: 'Cadence accrue',
    apply: state => {
      state.weapon.rate = Math.max(0.32, state.weapon.rate - 0.06);
    }
  },
  {
    id: 'spread',
    icon: '🎯',
    text: 'Dispersion maîtrisée',
    apply: state => {
      state.weapon.spread = Math.max(0.06, state.weapon.spread - 0.02);
    }
  },
  {
    id: 'burst',
    icon: '💥',
    text: 'Dommages majorés',
    apply: state => {
      state.weapon.damage += 2;
    }
  },
  {
    id: 'orb',
    icon: '🧲',
    text: 'Collecte magnétique',
    apply: state => {
      state.player.magnet += 10;
    }
  },
  {
    id: 'speed',
    icon: '👟',
    text: 'Mouvement fluide',
    apply: state => {
      state.player.baseSpeed += 4;
    }
  },
  {
    id: 'bomb',
    icon: '📣',
    text: 'Appel renforcé',
    apply: state => {
      state.bombs += 1;
    }
  },
  {
    id: 'dash',
    icon: '⚡',
    text: 'Dash condensé',
    apply: state => {
      state.dash.cooldown = Math.max(3.2, state.dash.cooldown - 0.6);
    }
  }
];
