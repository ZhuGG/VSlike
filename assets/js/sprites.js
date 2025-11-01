import { PAL } from './config.js';

export function makeSprite(map, colors, w = 16, h = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const x = canvas.getContext('2d');
  const img = x.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const row = map[y];
    for (let c = 0; c < w; c++) {
      const code = row[c];
      const color = colors[code] || 'transparent';
      const idx = (y * w + c) * 4;
      if (color === 'transparent' || color === '.') {
        img.data[idx + 3] = 0;
      } else {
        const hex = PAL[color] || color;
        const r = parseInt(hex.substr(1, 2), 16);
        const g = parseInt(hex.substr(3, 2), 16);
        const b = parseInt(hex.substr(5, 2), 16);
        img.data[idx] = r;
        img.data[idx + 1] = g;
        img.data[idx + 2] = b;
        img.data[idx + 3] = 255;
      }
    }
  }
  x.putImageData(img, 0, 0);
  return canvas;
}

export const SPRITES = {
  player: [
    makeSprite([
      '................',
      '.....BBBB........',
      '....BWWWWB.......',
      '...BWWSWWWB......',
      '...BWWWWWB......',
      '..BWWWWWWWB.....',
      '..BWWSWWWWB.....',
      '..BWWWWWBBB.....',
      '..BWWWWB........',
      '..BWWWWB........',
      '...BWWB.........',
      '...BWWB.........',
      '....BB..........',
      '...BBBB.........',
      '..BB..BB........',
      '................'
    ], { B: 'B', W: 'W', S: 'S' }),
    makeSprite([
      '................',
      '.....BBBB........',
      '....BWWWWB.......',
      '...BWWSWWWB......',
      '...BWWWWWB......',
      '..BWWWWWWWB.....',
      '..BWWWSWWWB.....',
      '..BWWWWBBBB.....',
      '..BWWWWB........',
      '..BWWWWB........',
      '...BWWB.........',
      '...BWWB.........',
      '....BB..........',
      '....BBBB........',
      '...BB..BB.......',
      '................'
    ], { B: 'B', W: 'W', S: 'S' })
  ],
  halo: makeSprite([
    '................',
    '................',
    '.....CCCCCC.....',
    '...CC......CC...',
    '..C..........C..',
    '.C............C.',
    '.C............C.',
    'C..............C',
    'C..............C',
    '.C............C.',
    '.C............C.',
    '..C..........C..',
    '...CC......CC...',
    '.....CCCCCC.....',
    '................',
    '................'
  ], { C: 'C' })
};

export const ENEMY_SPR = {
  decree: makeSprite([
    '................',
    '........BBBB....',
    '.......BWWWWB...',
    '......BWWWWWWB..',
    '......BWWWWWWB..',
    '.......BWWWWB...',
    '........BBBB....',
    '.....BBBBBBBB...',
    '....BWWWWWWWWB..',
    '....BWWWWWWWWB..',
    '.....BBBBBBBB...',
    '........BBBB....',
    '................',
    '................',
    '................',
    '................'
  ], { B: 'B', W: 'W' }),
  expert: makeSprite([
    '................',
    '......SSSS......',
    '.....SWWWS......',
    '....SWWWWWS.....',
    '...SWWWWWWWS....',
    '..SWWWWWWWWWS...',
    '..SWWWWWWWWWS...',
    '...SWWWWWWWS....',
    '....SWWWWWS.....',
    '......SWWWS.....',
    '......SSSS......',
    '......S..S......',
    '.....S....S.....',
    '................',
    '................',
    '................'
  ], { S: 'S', W: 'W' }),
  burst: makeSprite([
    '................',
    '......RRRR......',
    '.....RWWWWR.....',
    '....RWRRRWR....',
    '....RWRRRWR....',
    '....RWRRRWR....',
    '.....RWRWR.....',
    '......RRRR......',
    '......R..R......',
    '.....R....R.....',
    '....R......R....',
    '................',
    '................',
    '................',
    '................',
    '................'
  ], { R: 'R', W: 'W' }),
  dossier: makeSprite([
    '................',
    '....NNNNNNNN....',
    '...NWNNNNNNWN...',
    '..NWWNNNNNNWWN..',
    '..NWWNNNNNNWWN..',
    '..NWWWWWWWWWWN..',
    '..NWWWWWWWWWWN..',
    '..NWWNNNNNNWWN..',
    '..NWWNNNNNNWWN..',
    '..NWWNNNNNNWWN..',
    '...NWNNNNNNWN...',
    '....NNNNNNNN....',
    '................',
    '................',
    '................',
    '................'
  ], { N: 'N', W: 'W' }),
  reco: makeSprite([
    '................',
    '.....CCCCCC.....',
    '....CBBBBBBC....',
    '...CBWWWWWWBC...',
    '...CBWWWWWWBC...',
    '....CBBBBBBC....',
    '.....CCCCCC.....',
    '....CBBBBBBC....',
    '...CBWWWWWWBC...',
    '...CBWWWWWWBC...',
    '....CBBBBBBC....',
    '.....CCCCCC.....',
    '................',
    '................',
    '................',
    '................'
  ], { C: 'C', B: 'B', W: 'W' }),
  systemic: makeSprite([
    '................',
    '....BBBBRRRR....',
    '...BBWWRRWWBB...',
    '..BWWSWWWWSSWB..',
    '..BWSSWWWWSSWB..',
    '..BWWSSWWSSWWB..',
    '..BWWWSSSSWWWB..',
    '..BWWWWSSWWWBB..',
    '..BWWWWWSSWWWB..',
    '..BWSSWWWWSSWB..',
    '..BWWSWWWWSSWB..',
    '...BBWWRRWWBB...',
    '....BBBBRRRR....',
    '................',
    '................',
    '................'
  ], { B: 'B', R: 'R', W: 'W', S: 'S' })
};

export const FX_SPARK = makeSprite([
  '................',
  '................',
  '.......YY.......',
  '......YYYY......',
  '.......YY.......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................'
], { Y: 'Y' }, 16, 16);
