import { VIRT_W, VIRT_H, PAL, PLAYFIELD_SCALE } from './config.js';
import { SPRITES, ENEMY_SPR } from './sprites.js';
import { playSound, resumeAudioContext } from './audio.js';
import { createInitialState, getXpTarget } from './state.js';
import { UPGRADES, ENEMY_HP, ENEMY_SPEED } from './progression.js';

export function initGame() {
  const screen = document.getElementById('screen');
  const ctx = screen.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const crt = document.getElementById('crt');
  const crtCtx = crt.getContext('2d');
  crtCtx.imageSmoothingEnabled = false;
  const grain = document.getElementById('grain');
  const grainCtx = grain.getContext('2d');
  grainCtx.imageSmoothingEnabled = false;

  let crtTexture = null;
  let grainTextures = [];
  let grainFrame = 0;

  const off = document.createElement('canvas');
  off.width = VIRT_W;
  off.height = VIRT_H;
  const g = off.getContext('2d');
  g.imageSmoothingEnabled = false;

  let W = 0, H = 0;
  function fit() {
    W = innerWidth;
    H = innerHeight;
    const styles = getComputedStyle(document.documentElement);
    const safeFromVar = (name) => {
      const value = styles.getPropertyValue(name);
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const viewport = window.visualViewport;
    const viewportSafe = viewport ? {
      top: viewport.offsetTop,
      right: Math.max(0, W - viewport.width - viewport.offsetLeft),
      bottom: Math.max(0, H - viewport.height - viewport.offsetTop),
      left: viewport.offsetLeft,
    } : { top: 0, right: 0, bottom: 0, left: 0 };
    const safeTop = Math.max(safeFromVar('--safe-top'), viewportSafe.top);
    const safeRight = Math.max(safeFromVar('--safe-right'), viewportSafe.right);
    const safeBottom = Math.max(safeFromVar('--safe-bottom'), viewportSafe.bottom);
    const safeLeft = Math.max(safeFromVar('--safe-left'), viewportSafe.left);
    const usableW = Math.max(1, W - safeLeft - safeRight);
    const usableH = Math.max(1, H - safeTop - safeBottom);
    const aspect = usableH / Math.max(1, usableW);
    let scale = Math.min(usableW / VIRT_W, usableH / VIRT_H);
    scale = Math.max(1, Math.min(6, scale));
    const viewW = Math.round(VIRT_W * scale);
    const viewH = Math.round(VIRT_H * scale);
    const offsetX = Math.round((usableW - viewW) / 2 + safeLeft);
    let bias = 0.5;
    if (aspect > 1.6) bias = 0.85; else if (aspect > 1.3) bias = 0.65;
    let offsetY = safeTop + (usableH - viewH) * bias;
    offsetY = Math.max(safeTop, Math.min(offsetY, H - safeBottom - viewH));
    offsetY = Math.round(offsetY);

    const placeCanvas = (canvas, ctx) => {
      if (ctx) ctx.imageSmoothingEnabled = false;
      canvas.width = viewW;
      canvas.height = viewH;
      canvas.style.position = 'fixed';
      canvas.style.width = viewW + 'px';
      canvas.style.height = viewH + 'px';
      canvas.style.left = offsetX + 'px';
      canvas.style.top = offsetY + 'px';
    };

    placeCanvas(screen, ctx);
    placeCanvas(crt, crtCtx);
    placeCanvas(grain, grainCtx);
    rebuildCRTTexture(crt.width, crt.height);
    rebuildGrainTextures(grain.width, grain.height);
  }
  addEventListener('resize', fit);
  fit();

  const state = createInitialState();

  const progression = {
    upgrades: UPGRADES,
    enemyHp: ENEMY_HP,
    enemySpeed: ENEMY_SPEED,
  };

  function addEffect(x, y, life, color, size = 2) {
    state.effects.push({ x, y, life, maxLife: life, color, size });
  }

  function spawnOrb(x, y, value) {
    state.orbs.push({ x, y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, value, life: 18 });
  }

  function spawnBallot(x, y) {
    state.ballotsItems.push({ x, y, vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.5) * 18, life: 16 });
  }

  function spawnProjectile() {
    const { player, weapon } = state;
    const base = player.angle;
    const count = weapon.projectiles;
    for (let i = 0; i < count; i++) {
      const ang = base + (Math.random() - 0.5) * weapon.spread;
      const speed = weapon.speed;
      const vx = Math.cos(ang) * speed;
      const vy = Math.sin(ang) * speed;
      state.projectiles.push({
        x: player.x + Math.cos(ang) * 6,
        y: player.y + Math.sin(ang) * 6,
        vx,
        vy,
        damage: weapon.damage,
        life: 1.2,
      });
    }
    playSound('shoot', 0.14, 1.1 + Math.random() * 0.1);
  }

  function spawnEnemy(type, x, y) {
    const diff = Math.min(12, Math.floor(state.time / 60));
    const hpFn = progression.enemyHp[type];
    const spFn = progression.enemySpeed[type];
    const hp = hpFn ? hpFn(diff) : 20;
    const speed = spFn ? spFn(diff) : 20;
    const enemy = {
      type,
      x,
      y,
      hp,
      max: hp,
      speed,
      dir: Math.random() * Math.PI * 2,
      timer: 0,
      anim: 0,
      frame: 0,
      wobble: Math.random() * Math.PI * 2,
    };
    if (type === 'systemic') {
      enemy.hp *= 1 + diff * 0.25;
      enemy.max = enemy.hp;
      enemy.radius = 16;
    } else if (type === 'dossier') {
      enemy.radius = 12;
    } else {
      enemy.radius = 8;
    }
    state.enemies.push(enemy);
    if (!state.bestiary[type]) state.bestiary[type] = { hp: enemy.max, speed: speed, kills: 0 };
    state.bestiary[type].hp = Math.max(state.bestiary[type].hp, enemy.max);
    state.bestiary[type].speed = Math.max(state.bestiary[type].speed, speed);
  }

  function spawnRing(x, y) {
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      state.effects.push({ x, y, vx: Math.cos(ang) * 40, vy: Math.sin(ang) * 40, life: 0.45, maxLife: 0.45, color: PAL.R, size: 1 });
    }
  }

  function systemicAlert() {
    addEffect(state.player.x, state.player.y, 0.8, PAL.P, 5);
    state.camera.shake = 6;
    playSound('alert', 0.3, 0.7);
  }

  function spawnSystemic() {
    const margin = 10;
    const x = Math.random() < 0.5 ? (Math.random() * VIRT_W) : (Math.random() < 0.5 ? -margin : VIRT_W + margin);
    const y = Math.random() < 0.5 ? (Math.random() * VIRT_H) : (Math.random() < 0.5 ? -margin : VIRT_H + margin);
    spawnEnemy('systemic', x, y);
    systemicAlert();
  }

  function updateAutoAim() {
    const { player, enemies } = state;
    if (!enemies.length) return;
    let closest = null;
    let bestDist = Infinity;
    for (const enemy of enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist) {
        bestDist = dist;
        closest = { dx, dy };
      }
    }
    if (closest) {
      player.angle = Math.atan2(closest.dy, closest.dx);
    }
  }

  function enemyBehavior(enemy, dt) {
    const player = state.player;
    enemy.timer += dt;
    enemy.wobble += dt * 4;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirToPlayer = Math.atan2(dy, dx);
    const accelerate = (speedMult = 1, offset = 0) => {
      enemy.x += Math.cos(dirToPlayer + offset) * enemy.speed * speedMult * dt;
      enemy.y += Math.sin(dirToPlayer + offset) * enemy.speed * speedMult * dt;
    };
    switch (enemy.type) {
      case 'decree': {
        const oscillation = Math.sin(enemy.timer * 6 + enemy.wobble) * 0.35;
        enemy.x += Math.cos(dirToPlayer + oscillation) * enemy.speed * dt;
        enemy.y += Math.sin(dirToPlayer + oscillation) * enemy.speed * dt;
        break;
      }
      case 'expert': {
        const talk = Math.sin(enemy.timer * 8) * 0.6;
        enemy.dir = dirToPlayer + talk * 0.4;
        enemy.x += Math.cos(enemy.dir) * enemy.speed * dt;
        enemy.y += Math.sin(enemy.dir) * enemy.speed * dt;
        break;
      }
      case 'burst': {
        enemy.dir = dirToPlayer;
        accelerate(1.05);
        if (dist < 14) {
          enemy.hp = 0;
          spawnRing(enemy.x, enemy.y);
          damagePlayer(24, enemy.x, enemy.y);
        }
        break;
      }
      case 'dossier': {
        const slowWave = Math.sin(enemy.timer * 1.5) * 0.3;
        enemy.x += Math.cos(dirToPlayer + slowWave) * enemy.speed * 0.8 * dt;
        enemy.y += Math.sin(dirToPlayer + slowWave) * enemy.speed * 0.8 * dt;
        break;
      }
      case 'reco': {
        const floatAng = dirToPlayer + Math.sin(enemy.timer * 2.5) * 0.7;
        const drift = Math.cos(enemy.timer * 3.4) * 0.5;
        enemy.x += Math.cos(floatAng) * enemy.speed * 0.9 * dt;
        enemy.y += Math.sin(floatAng) * enemy.speed * 0.9 * dt;
        enemy.x += Math.cos(enemy.wobble) * drift;
        enemy.y += Math.sin(enemy.wobble) * drift;
        break;
      }
      case 'systemic': {
        const swirl = Math.sin(enemy.timer * 0.8) * 0.6;
        enemy.x += Math.cos(dirToPlayer + swirl) * enemy.speed * dt;
        enemy.y += Math.sin(dirToPlayer + swirl) * enemy.speed * dt;
        if (enemy.timer > 1.6) {
          enemy.timer = 0.2;
          shootSpiral(enemy);
        }
        break;
      }
    }
  }

  function shootSpiral(enemy) {
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + Math.random() * 0.1;
      state.projectiles.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(ang) * 40,
        vy: Math.sin(ang) * 40,
        damage: 0,
        enemyShot: true,
        life: 3,
      });
    }
    playSound('alert', 0.25, 1.4);
  }

  function damagePlayer(amount, x, y) {
    const player = state.player;
    if (player.ifr > 0 || state.over) return;
    player.hp -= amount;
    if (player.hp <= 0) {
      player.hp = 0;
      gameOver();
    }
    player.ifr = 1;
    state.camera.shake = Math.min(8, state.camera.shake + amount * 0.08);
    addEffect(x, y, 0.4, PAL.R, 3);
    playSound('hit', 0.25, 0.9 + Math.random() * 0.1);
  }

  function killEnemy(enemy) {
    const idx = state.enemies.indexOf(enemy);
    if (idx !== -1) state.enemies.splice(idx, 1);
    const xpValue = 8 + Math.random() * 4;
    spawnOrb(enemy.x, enemy.y, xpValue);
    if (Math.random() < 0.12) spawnBallot(enemy.x, enemy.y);
    addEffect(enemy.x, enemy.y, 0.5, PAL.W, 2);
    playSound('hit', 0.18, 1.4);
    state.stats.kills[enemy.type] = (state.stats.kills[enemy.type] || 0) + 1;
    if (!state.bestiary[enemy.type]) state.bestiary[enemy.type] = { hp: enemy.max, speed: enemy.speed, kills: 1 };
    else state.bestiary[enemy.type].kills += 1;
    if (enemy.type === 'burst') {
      spawnRing(enemy.x, enemy.y);
    }
    if (enemy.type === 'systemic') {
      state.ballots += 3;
      state.bombs += 1;
      playSound('bomb', 0.3, 0.8);
    }
  }

  function collectOrb(orb, dt) {
    const player = state.player;
    const dx = player.x - orb.x;
    const dy = player.y - orb.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    if (dist < 3) {
      state.xp += orb.value;
      playSound('xp', 0.22, 1.2 + Math.random() * 0.2);
      levelCheck();
      return true;
    }
    const dirX = dx / dist;
    const dirY = dy / dist;
    const attraction = player.magnet + 40;
    const accel = (attraction / Math.max(dist, 12)) * 35;
    orb.vx += dirX * accel * dt;
    orb.vy += dirY * accel * dt;
    orb.vx *= 0.9;
    orb.vy *= 0.9;
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;
    orb.life -= dt;
    return orb.life <= 0;
  }

  function collectBallot(item, dt) {
    const dx = state.player.x - item.x;
    const dy = state.player.y - item.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2.5) {
      state.ballots += 1;
      playSound('xp', 0.22, 0.6 + Math.random() * 0.2);
      return true;
    }
    item.vx *= 0.95;
    item.vy *= 0.95;
    item.x += item.vx * dt;
    item.y += item.vy * dt;
    item.life -= dt;
    return item.life <= 0;
  }

  function levelCheck() {
    if (state.xp >= state.xpTarget) {
      state.xp -= state.xpTarget;
      state.level += 1;
      state.xpTarget = getXpTarget(state.level);
      pauseGame(true);
      showUpgradePanel();
    }
  }

  function showUpgradePanel() {
    const overlay = document.getElementById('overlay');
    const card = document.getElementById('overlayCard');
    overlay.classList.remove('overlay-hidden');
    overlay.dataset.mode = 'upgrade';
    const choices = [...progression.upgrades];
    choices.sort(() => Math.random() - 0.5);
    const pick = choices.slice(0, 3);
    card.innerHTML = '<div class="title">UPGRADE</div><p class="subtitle">Choisis un symbole</p>';
    pick.forEach(upg => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = `${upg.icon} ${upg.text}`;
      btn.onclick = () => {
        upg.apply(state);
        overlay.classList.add('overlay-hidden');
        resumeGame();
      };
      card.appendChild(btn);
      card.appendChild(document.createElement('br'));
    });
  }

  function updateHUD() {
    document.getElementById('time').textContent = formatTime(state.time);
    document.getElementById('level').textContent = state.level;
    document.getElementById('ballots').textContent = state.ballots;
    document.getElementById('bomb').textContent = state.bombs;
    const dash = document.getElementById('dash');
    dash.textContent = state.dash.ready ? '0' : state.dash.timer.toFixed(1);
  }

  function formatTime(time) {
    const t = Math.floor(time);
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function togglePause() {
    if (state.over) return;
    if (state.paused) {
      resumeGame();
    } else {
      pauseGame(false);
      showPausePanel();
    }
  }

  function pauseGame(levelUp) {
    state.paused = true;
    state.running = false;
    if (!levelUp) playSound('alert', 0.2, 0.6);
  }

  function resumeGame() {
    const overlay = document.getElementById('overlay');
    overlay.classList.add('overlay-hidden');
    state.paused = false;
    state.running = true;
    last = performance.now();
    loop();
  }

  function showPausePanel() {
    const overlay = document.getElementById('overlay');
    const card = document.getElementById('overlayCard');
    overlay.classList.remove('overlay-hidden');
    overlay.dataset.mode = 'pause';
    const lines = buildBestiary();
    card.innerHTML = `<div class="title">BESTIAIRE</div><div class="panel"><pre>${lines}</pre></div>`;
    const resume = document.createElement('button');
    resume.className = 'btn';
    resume.textContent = '▶️ Continuer';
    resume.onclick = () => {
      overlay.classList.add('overlay-hidden');
      resumeGame();
    };
    card.appendChild(resume);
  }

  function buildBestiary() {
    const header = 'TYPE               PV    VIT.   ABATTUS\n';
    const pad = (str, len) => (str + ' '.repeat(len)).slice(0, len);
    const map = {
      decree: 'Décret volant',
      expert: 'Expert TV',
      burst: 'Crise ponctuelle',
      dossier: 'Dossier secret',
      reco: 'Reco. européenne',
      systemic: 'Crise systémique',
    };
    let body = '';
    for (const key of Object.keys(map)) {
      const info = state.bestiary[key] || { hp: 0, speed: 0, kills: 0 };
      body += `${pad(map[key], 18)}${pad(Math.round(info.hp), 6)}${pad(Math.round(info.speed), 7)}${pad(info.kills, 8)}\n`;
    }
    body += '\nTOTAL 🗳️ : ' + state.ballots + '    TEMPS : ' + formatTime(state.time) + '    NIVEAU : ' + state.level;
    return header + body;
  }

  function showGameOver() {
    const overlay = document.getElementById('overlay');
    const card = document.getElementById('overlayCard');
    overlay.classList.remove('overlay-hidden');
    overlay.dataset.mode = 'over';
    const bestiary = buildBestiary();
    card.innerHTML = `<div class="title">CRÉDITS</div><div class="panel"><pre>${bestiary}</pre></div>`;
    const retry = document.createElement('button');
    retry.className = 'btn';
    retry.textContent = '↻ REJOUER';
    retry.onclick = () => location.reload();
    card.appendChild(retry);
  }

  function gameOver() {
    state.over = true;
    state.running = false;
    playSound('bomb', 0.3, 0.6);
    showGameOver();
  }

  const dashHalo = document.getElementById('dashHalo');
  const joy = document.getElementById('joy');
  const stick = document.getElementById('stick');
  const dashBtn = document.getElementById('dashBtn');
  const bombBtn = document.getElementById('bombBtn');
  let joyActive = false;
  let joyVec = { x: 0, y: 0 };

  function joyUpdate(e) {
    const rect = joy.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const dx = x - rect.width / 2;
    const dy = y - rect.height / 2;
    const dist = Math.hypot(dx, dy);
    const max = rect.width * 0.35;
    const clamped = Math.min(dist, max);
    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);
    stick.style.transform = `translate(calc(-50% + ${nx * clamped}px), calc(-50% + ${ny * clamped}px))`;
    joyVec.x = Math.max(-1, Math.min(1, dx / max));
    joyVec.y = Math.max(-1, Math.min(1, dy / max));
  }

  joy.addEventListener('touchstart', e => { joyActive = true; joyUpdate(e); }, { passive: false });
  joy.addEventListener('touchmove', e => { if (joyActive) joyUpdate(e); }, { passive: false });
  joy.addEventListener('touchend', () => { joyActive = false; stick.style.transform = 'translate(-50%, -50%)'; joyVec.x = joyVec.y = 0; });

  const keys = {};
  addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') e.preventDefault();
    if (e.key === 'p') { togglePause(); }
    if (e.key === 'Escape') { togglePause(); }
    if (e.key === 'e') { triggerBomb(); }
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  addEventListener('mousedown', e => { if (!state.running && !state.over) startGame(); });

  dashBtn.addEventListener('touchstart', e => { e.preventDefault(); triggerDash(); }, { passive: false });
  dashBtn.addEventListener('click', triggerDash);
  bombBtn.addEventListener('touchstart', e => { e.preventDefault(); triggerBomb(); }, { passive: false });
  bombBtn.addEventListener('click', triggerBomb);

  function triggerDash() {
    if (!state.dash.ready || state.player.dash > 0) return;
    state.player.dash = state.dash.duration;
    state.dash.ready = false;
    state.dash.timer = state.dash.cooldown;
    state.player.ifr = 0.3;
    dashHalo.style.opacity = 0.85;
    state.camera.shake = 4;
    playSound('dash', 0.25, 1.2);
  }

  function triggerBomb() {
    if (state.bombs <= 0 && state.ballots < 3) return;
    if (state.bombs > 0) state.bombs -= 1; else state.ballots -= 3;
    playSound('bomb', 0.36, 0.8);
    state.camera.shake = 12;
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      if (enemy.type === 'systemic') {
        enemy.hp -= 150;
        if (enemy.hp <= 0) killEnemy(enemy);
      } else {
        killEnemy(enemy);
      }
    }
  }

  function startGame() {
    resumeAudioContext();
    document.getElementById('start').classList.add('overlay-hidden');
    state.running = true;
    state.time = 0;
    state.xpTarget = getXpTarget(state.level);
    last = performance.now();
    loop();
  }

  document.getElementById('play').addEventListener('click', () => {
    startGame();
  });
  document.getElementById('play').addEventListener('touchend', () => {
    startGame();
  }, { passive: false });

  document.getElementById('pause').addEventListener('click', togglePause);

  let last = 0;
  function loop(timestamp) {
    if (!state.running) return;
    const now = timestamp || performance.now();
    let dt = (now - last) / 1000;
    if (dt > 0.08) dt = 0.08;
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    state.time += dt;
    updateHUD();
    const player = state.player;

    state.spawn.timer -= dt;
    const difficulty = 1 + state.time / 50;
    if (state.spawn.timer <= 0) {
      const spawnRate = difficulty * PLAYFIELD_SCALE;
      state.spawn.timer = Math.max(0.2, 1.4 / spawnRate);
      const type = pickEnemyType();
      const edge = spawnPoint();
      spawnEnemy(type, edge.x, edge.y);
    }

    if (state.time - state.lastSystemic > 120) {
      state.lastSystemic = state.time;
      spawnSystemic();
    }

    state.weapon.cooldown = Math.max(0, state.weapon.cooldown - dt);

    let inputX = 0, inputY = 0;
    if (keys['arrowleft'] || keys['a'] || keys['q']) inputX -= 1;
    if (keys['arrowright'] || keys['d']) inputX += 1;
    if (keys['arrowup'] || keys['w'] || keys['z']) inputY -= 1;
    if (keys['arrowdown'] || keys['s']) inputY += 1;
    if (joyActive) { inputX += joyVec.x; inputY += joyVec.y; }
    const len = Math.hypot(inputX, inputY);
    const dashMultiplier = player.dash > 0 ? 2.4 : 1;
    const speed = (player.baseSpeed + state.level * 0.6) * dashMultiplier;
    if (len > 0.1) {
      player.vx = (inputX / len) * speed;
      player.vy = (inputY / len) * speed;
    } else {
      player.vx *= 0.85;
      player.vy *= 0.85;
    }
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.x = Math.max(6, Math.min(VIRT_W - 6, player.x));
    player.y = Math.max(6, Math.min(VIRT_H - 6, player.y));

    updateAutoAim();

    if (state.weapon.cooldown <= 0) {
      spawnProjectile();
      state.weapon.cooldown = state.weapon.rate;
    }

    if (keys[' '] || keys['shift']) triggerDash();

    if (player.dash > 0) player.dash -= dt; else player.dash = 0;
    if (!state.dash.ready) {
      state.dash.timer = Math.max(0, state.dash.timer - dt);
      if (state.dash.timer <= 0) {
        state.dash.ready = true;
      }
    }
    if (player.dash > 0) {
      dashHalo.style.opacity = 0.85;
    } else {
      dashHalo.style.opacity = state.dash.ready ? 0.35 : 0.05;
    }

    if (player.ifr > 0) player.ifr -= dt;
    if (player.hp < player.max) player.hp += dt * 1.5;

    for (let i = state.orbs.length - 1; i >= 0; i--) {
      if (collectOrb(state.orbs[i], dt)) state.orbs.splice(i, 1);
    }
    for (let i = state.ballotsItems.length - 1; i >= 0; i--) {
      if (collectBallot(state.ballotsItems[i], dt)) state.ballotsItems.splice(i, 1);
    }

    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || p.x < -10 || p.y < -10 || p.x > VIRT_W + 10 || p.y > VIRT_H + 10) {
        state.projectiles.splice(i, 1);
        continue;
      }
      if (p.enemyShot) {
        if (Math.hypot(p.x - player.x, p.y - player.y) < 6) {
          damagePlayer(14, p.x, p.y);
          state.projectiles.splice(i, 1);
        }
      } else {
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const enemy = state.enemies[j];
          if (Math.hypot(p.x - enemy.x, p.y - enemy.y) < enemy.radius) {
            enemy.hp -= p.damage;
            addEffect(p.x, p.y, 0.2, PAL.Y, 1);
            state.projectiles.splice(i, 1);
            if (enemy.hp <= 0) {
              killEnemy(enemy);
            }
            break;
          }
        }
      }
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      enemyBehavior(enemy, dt);
      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.radius + 4) {
        damagePlayer(12, enemy.x, enemy.y);
        enemy.hp -= 10;
        if (enemy.hp <= 0) killEnemy(enemy);
      }
      if (enemy.x < -30 || enemy.y < -30 || enemy.x > VIRT_W + 30 || enemy.y > VIRT_H + 30) {
        enemy.x = Math.max(-24, Math.min(VIRT_W + 24, enemy.x));
        enemy.y = Math.max(-24, Math.min(VIRT_H + 24, enemy.y));
      }
    }

    for (let i = state.effects.length - 1; i >= 0; i--) {
      const fx = state.effects[i];
      if (fx.vx !== undefined) {
        fx.x += fx.vx * dt;
        fx.y += fx.vy * dt;
      }
      fx.life -= dt;
      if (fx.life <= 0) state.effects.splice(i, 1);
    }

    if (state.camera.shake > 0) state.camera.shake -= dt * 10; else state.camera.shake = 0;

    state.haloPulse += dt * 4;
  }

  function pickEnemyType() {
    const t = state.time;
    const weights = [];
    weights.push({ type: 'decree', w: 50 });
    if (t > 15) weights.push({ type: 'expert', w: 14 + t * 0.1 });
    if (t > 30) weights.push({ type: 'burst', w: 10 + t * 0.08 });
    if (t > 50) weights.push({ type: 'dossier', w: 8 + t * 0.06 });
    if (t > 70) weights.push({ type: 'reco', w: 12 + t * 0.05 });
    let sum = weights.reduce((acc, cur) => acc + cur.w, 0);
    let r = Math.random() * sum;
    for (const w of weights) {
      if ((r -= w.w) <= 0) return w.type;
    }
    return 'decree';
  }

  function spawnPoint() {
    const margin = 6;
    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0: return { x: Math.random() * VIRT_W, y: -margin };
      case 1: return { x: VIRT_W + margin, y: Math.random() * VIRT_H };
      case 2: return { x: Math.random() * VIRT_W, y: VIRT_H + margin };
      default: return { x: -margin, y: Math.random() * VIRT_H };
    }
  }

  function render() {
    g.clearRect(0, 0, VIRT_W, VIRT_H);
    drawBackground();
    const shakeX = (Math.random() - 0.5) * state.camera.shake;
    const shakeY = (Math.random() - 0.5) * state.camera.shake;
    g.save();
    g.translate(shakeX, shakeY);
    drawPlayer();
    drawOrbs();
    drawBallots();
    drawEnemies();
    drawProjectiles();
    drawEffects();
    g.restore();
    ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, screen.width, screen.height);
    drawCRT();
    drawGrain();
  }

  function drawBackground() {
    const patternSize = 32;
    g.fillStyle = '#0a0d18';
    g.fillRect(0, 0, VIRT_W, VIRT_H);
    for (let y = 0; y < VIRT_H; y += patternSize) {
      for (let x = 0; x < VIRT_W; x += patternSize) {
        g.fillStyle = `rgba(20, 24, 36, ${0.08 + Math.random() * 0.08})`;
        g.fillRect(x, y, patternSize, patternSize);
      }
    }
    const poster = 18;
    for (let y = 0; y < VIRT_H + poster; y += poster) {
      g.fillStyle = `rgba(60, 60, 70, ${Math.random() * 0.15})`;
      g.fillRect(0, y, VIRT_W, 1);
    }
  }

  function drawPlayer() {
    const player = state.player;
    const halo = SPRITES.halo;
    const frame = SPRITES.player[Math.floor((state.haloPulse % 1.2) / 0.6)];
    const pulse = (Math.sin(state.haloPulse * 2) + 1) * 0.2 + 0.5;
    g.save();
    g.translate(player.x, player.y);
    g.globalAlpha = 0.3 + pulse * 0.4;
    g.drawImage(halo, -8, -8, 16, 16);
    g.restore();
    g.save();
    g.translate(player.x, player.y);
    g.rotate(player.angle + Math.PI / 2);
    g.drawImage(frame, -8, -8, 16, 16);
    g.restore();
    const hpRatio = player.hp / player.max;
    g.fillStyle = '#1e2937';
    g.fillRect(player.x - 9, player.y + 10, 18, 3);
    g.fillStyle = '#2ee6a6';
    g.fillRect(player.x - 9, player.y + 10, 18 * hpRatio, 3);
  }

  function drawOrbs() {
    g.save();
    g.globalCompositeOperation = 'screen';
    g.fillStyle = 'rgba(255,214,102,0.8)';
    for (const orb of state.orbs) {
      g.beginPath();
      g.arc(orb.x, orb.y, 2, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  function drawBallots() {
    g.fillStyle = '#ffd166';
    for (const b of state.ballotsItems) {
      g.fillRect(b.x - 2, b.y - 2, 4, 4);
    }
  }

  function drawEnemies() {
    for (const enemy of state.enemies) {
      const spr = ENEMY_SPR[enemy.type];
      if (spr) g.drawImage(spr, enemy.x - 8, enemy.y - 8, 16, 16);
      g.fillStyle = 'rgba(10,10,10,0.4)';
      g.fillRect(enemy.x - 8, enemy.y + 10, 16, 2);
      g.fillStyle = '#ff4d6d';
      g.fillRect(enemy.x - 8, enemy.y + 10, 16 * (enemy.hp / enemy.max), 2);
    }
  }

  function drawProjectiles() {
    g.fillStyle = '#f8faff';
    for (const p of state.projectiles) {
      if (p.enemyShot) {
        g.fillStyle = '#ff4d6d';
        g.fillRect(p.x - 1, p.y - 1, 2, 2);
      } else {
        g.fillStyle = '#f8faff';
        g.fillRect(p.x - 1, p.y - 1, 2, 2);
      }
    }
  }

  function drawEffects() {
    for (const fx of state.effects) {
      const alpha = fx.life / fx.maxLife;
      g.fillStyle = fx.color || '#ffffff';
      g.globalAlpha = alpha;
      g.fillRect(fx.x - fx.size, fx.y - fx.size, fx.size * 2, fx.size * 2);
      g.globalAlpha = 1;
    }
  }

  function rebuildCRTTexture(width, height) {
    if (width === 0 || height === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, width, height);
    const scanColor = 'rgba(32, 40, 68, 0.55)';
    for (let y = 0; y < height; y += 2) {
      c.fillStyle = scanColor;
      c.fillRect(0, y, width, 1);
    }
    const gradient = c.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 1.1);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    c.fillStyle = gradient;
    c.fillRect(0, 0, width, height);
    crtTexture = canvas;
  }

  function rebuildGrainTextures(width, height) {
    grainTextures = [];
    grainFrame = 0;
    if (width === 0 || height === 0) return;
    const layers = 4;
    for (let i = 0; i < layers; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const c = canvas.getContext('2d');
      const data = c.createImageData(width, height);
      for (let p = 0; p < data.data.length; p += 4) {
        const n = Math.random() * 36;
        data.data[p] = n;
        data.data[p + 1] = n;
        data.data[p + 2] = n;
        data.data[p + 3] = 40;
      }
      c.putImageData(data, 0, 0);
      grainTextures.push(canvas);
    }
  }

  function drawCRT() {
    const w = crt.width;
    const h = crt.height;
    if (!crtTexture || crtTexture.width !== w || crtTexture.height !== h) {
      rebuildCRTTexture(w, h);
      if (!crtTexture) return;
    }
    crtCtx.clearRect(0, 0, w, h);
    const pulse = 0.75 + Math.sin(performance.now() * 0.004) * 0.08;
    crtCtx.globalAlpha = pulse;
    crtCtx.drawImage(crtTexture, 0, 0);
    crtCtx.globalAlpha = 1;
  }

  function drawGrain() {
    const w = grain.width;
    const h = grain.height;
    if (!grainTextures.length || grainTextures[0].width !== w || grainTextures[0].height !== h) {
      rebuildGrainTextures(w, h);
      if (!grainTextures.length) return;
    }
    grainCtx.clearRect(0, 0, w, h);
    grainCtx.globalAlpha = 0.35;
    grainFrame = (grainFrame + 1) % grainTextures.length;
    grainCtx.drawImage(grainTextures[grainFrame], 0, 0);
    grainCtx.globalAlpha = 1;
  }
}
