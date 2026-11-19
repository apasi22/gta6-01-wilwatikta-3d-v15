// WILWATIKTA 3D — main loop, input, cameras, shot staging, game state.
(function () {
  'use strict';
  const G = window.WTW.gl;
  const CITY = window.WTW.city;
  const W = window.WTW.world;
  const A = window.WTW.actors;
  const M = window.WTW.missions;
  const HUD = window.WTW.hud;
  const AU = window.WTW.audio;

  const params = new URLSearchParams(location.search);
  const SHOT = params.get('shot') || '';
  const STAGED = !!SHOT;

  const canvas = document.getElementById('gl');
  const R = G.createRenderer(canvas);
  if (!R) {
    document.getElementById('nogl').style.display = 'flex';
    return;
  }

  const player = A.newPlayer();
  const run = M.newRun();
  const state = {
    screen: SHOT ? 'play' : 'title',
    clock: '18:37', district: 'PANTAI KIDUL', street: 'Jl. Batik Tulis',
    radio: 0, palette: 'dusk', t: 0, hudTick: 0,
    keys: {}, mouseDown: false, camYaw: 0, camPitch: 0.32,
    floaters: [], muzzle: 0, saveMsg: '',
  };
  // Staged shot setups (frozen, deterministic).
  const SHOTS = {
    title: { palette: 'dusk', clock: '18:37', t: 2.0, mission: 5 },
    chase: { palette: 'dusk', clock: '18:37', t: 8.0, mission: 5 },
    night: { palette: 'night', clock: '19:49', t: 5.0, mission: 6 },
    map: { palette: 'dusk', clock: '18:37', t: 8.0, mission: 5 },
  };

  function districtAt(x, z) {
    const d = CITY.DISTRICTS.find((q) => x >= q.x0 && x < q.x1 && z >= q.z0 && z < q.z1);
    return d ? d.name : 'WILWATIKTA';
  }
  function streetAt(x, z) {
    let best = null, bd = 1e9;
    for (const s of CITY.STREETS) {
      const d = s.horizontal ? Math.abs(z - s.z) : Math.abs(x - s.x);
      if (d < bd) { bd = d; best = s; }
    }
    return bd < 9 ? best.name : 'Jl. Gamelan';
  }

  function applyPalette(name) {
    const pal = CITY.PALETTES[name];
    R.clearColor = pal.sky.slice();
    R.fogColor = pal.fog.slice();
    R.light = pal.light.slice();
    R.fogRange = name === 'night' ? [60, 240] : [90, 320];
    document.body.classList.toggle('night', name === 'night');
  }

  function drawScene(t) {
    const pal = CITY.PALETTES[state.palette];
    R.begin();
    const cam = state.camPos || [0, 4, 0];
    W.drawGround(R, pal);
    W.drawBuildings(R, pal, cam);
    // Ambient traffic + pedestrians — skipped for the title shot so no
    // random walker photobombs the hero.
    if (SHOT !== 'title') {
      for (const c of A.trafficAt(t)) W.drawCar(R, c.x, c.z, c.ry, c.def, false);
      for (const f of A.pedestriansAt(t)) W.drawPerson(R, f.x, f.z, f.yaw, { shirt: f.shirt, scale: f.scale });
    }
    drawShotActors(t);
  }

  function drawShotActors(t) {
    if (SHOT === 'title') {
      // TITLE DIORAMA: hero front-facing at the Jl. Kenanga / Jl. Pahlawan
      // crossing (12,12) — an open intersection, no building in the sightline.
      // Camera 3.8m in front, hero ~42% of frame height, pistol out.
      const hx = 12, hz = 12;
      const cam = [hx + 0.5, 1.55, hz + 3.8];
      const yaw = Math.atan2(cam[0] - hx, cam[2] - hz); // face the camera
      W.drawPerson(R, hx, hz, yaw, { shirt: [0.16, 0.5, 0.22], pants: [0.38, 0.38, 0.44], scale: 1.0, face: true, gun: true });
      // Red Garuda GT parked on Jl. Pahlawan behind the hero, angled.
      W.drawCar(R, 13, 2, 0.9, CITY.CARS[0], false);
      for (const [lx, lz] of [[9, 16], [15, 8]]) {
        R.box({ x: lx, y: 1.5, z: lz, sx: 0.18, sy: 3, sz: 0.18 }, [0.12, 0.12, 0.14]);
        R.box({ x: lx, y: 3.1, z: lz, sx: 0.5, sy: 0.3, sz: 0.5 }, [1.0, 0.85, 0.45], 0.8);
      }
      // Pedestrians further down Jl. Kenanga.
      W.drawPerson(R, -20, 12, 1.2, { shirt: [0.8, 0.3, 0.3], scale: 0.95 });
      W.drawPerson(R, 40, 14, -1.4, { shirt: [0.3, 0.5, 0.9], scale: 0.92 });
      return;
    }
    if (SHOT === 'chase') {
      // Player car + police closing in + checkpoint on Jl. Segara Anakan.
      W.drawCar(R, 0, 108, 0, CITY.CARS[0], false);
      W.drawCar(R, 24, 105, Math.PI, CITY.CARS[2], true);
      W.drawCar(R, 30, 111, Math.PI, CITY.CARS[2], true);
      W.drawCheckpoint(R, 44, 108, t);
      // Heli over the Jl. Pahlawan / street-96 intersection, clear of the
      // centre HUD so it is not hidden behind the weapon slots.
      W.drawHeli(R, 12, 10, 96, t, [12, 0, 96]);
      return;
    }
    if (SHOT === 'night') {
      // On-foot night on Jl. Kenanga: hero from behind, enemies ahead, heli.
      W.drawPerson(R, 0, 12, Math.PI / 2, { shirt: [0.16, 0.5, 0.22], scale: 1.0, face: false });
      const enemies = [[14, 12], [20, 13], [26, 11], [32, 12.5]];
      const shirts = [[0.75, 0.2, 0.25], [0.3, 0.3, 0.35], [0.2, 0.55, 0.3], [0.6, 0.2, 0.5]];
      enemies.forEach((e, i) => W.drawPerson(R, e[0], e[1], -Math.PI / 2 + (i % 2 ? 0.4 : -0.3), { shirt: shirts[i], scale: 0.95 }));
      // Low-flying search heli so it is fully in frame, not clipped at the top.
      W.drawHeli(R, 8, 6, 8, t, [8, 0, 12]);
      state.floaters = [
        { x: 14, y: 2.2, z: 12, text: 'HIT! -12 HP', born: t - 0.4 },
        { x: 20, y: 2.2, z: 13, text: 'HIT! -5 HP', born: t - 0.8 },
      ];
      return;
    }
    // Free play: player car or on-foot + police when wanted.
    if (player.inCar) {
      W.drawCar(R, player.x, player.z, player.yaw, CITY.CARS[player.car], false);
      if (player.wanted >= 2) {
        const pol = A.policeAt(t, player.x, player.z, player.yaw);
        for (const p of pol) W.drawCar(R, p.x, p.z, p.ry, CITY.CARS[2], true);
      }
      if (player.wanted >= 3) {
        const heli = A.heliAt(t, player.x, player.z);
        W.drawHeli(R, heli.x, heli.y, heli.z, t, [player.x, 0, player.z]);
      }
    } else {
      W.drawPerson(R, player.x, player.z, player.yaw, { shirt: [0.16, 0.5, 0.22], scale: 1.0, face: false, gun: player.weapon >= 1 });
    }
    // Mission checkpoint beam.
    const cp = checkpointPos();
    if (cp) W.drawCheckpoint(R, cp[0], cp[1], t);
  }

  function checkpointPos() {
    // Checkpoint for the current mission: fixed spots, all on road corridors.
    const spots = [[12, 12], [108, 108], [-84, -84], [108, 12], [12, 108], [-84, 12], [12, -36], [-36, 12], [84, 108], [-84, -36], [36, 12], [12, 60]];
    return spots[run.mission % spots.length];
  }

  function cameraFor(t) {
    if (SHOT === 'title') {
      const hx = 12, hz = 12;
      state.camPos = [hx + 0.5, 1.55, hz + 3.8];
      R.setCamera(state.camPos, [hx, 1.35, hz]);
      return;
    }
    if (SHOT === 'chase') {
      state.camPos = [-10, 4.5, 108];
      R.setCamera(state.camPos, [18, 1.2, 108]);
      return;
    }
    if (SHOT === 'night') {
      state.camPos = [-9, 3.4, 12];
      R.setCamera(state.camPos, [6, 1.3, 12]);
      return;
    }
    // Free-play chase cam.
    const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
    const dist = player.inCar ? 11 : 6.5;
    const h = player.inCar ? 4.4 : 2.8;
    const tx = player.x - fx * dist, tz = player.z - fz * dist;
    state.camPos = [tx, h, tz];
    R.setCamera(state.camPos, [player.x + fx * 6, 1.3, player.z + fz * 6]);
  }

  function updateHUD() {
    state.district = districtAt(player.x, player.z);
    state.street = streetAt(player.x, player.z);
    HUD.updateHUD({ player, run, clock: state.clock, district: state.district, street: state.street, radio: state.radio });
    const fl = A.drawFloaters(R, state.floaters, state.t);
    HUD.renderFloaters(fl);
  }

  function update(dt) {
    state.t += dt;
    if (STAGED) return;
    // Drive / walk.
    const k = state.keys;
    const fwd = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);
    const steer = (k['KeyA'] || k['ArrowLeft'] ? 1 : 0) - (k['KeyD'] || k['ArrowRight'] ? 1 : 0);
    const top = player.inCar ? 26 : 6;
    if (fwd) player.speed += fwd * (player.inCar ? 14 : 9) * dt;
    else player.speed *= Math.pow(0.12, dt);
    player.speed = Math.max(-8, Math.min(top, player.speed));
    if (Math.abs(player.speed) > 0.4) player.yaw += steer * 1.9 * dt * Math.sign(player.speed);
    player.x += Math.sin(player.yaw) * player.speed * dt;
    player.z += Math.cos(player.yaw) * player.speed * dt;
    player.x = Math.max(-142, Math.min(142, player.x));
    player.z = Math.max(-142, Math.min(142, player.z));
    // Mission timer + checkpoint reach.
    run.timer -= dt;
    if (run.timer <= 0) run.timer = 240;
    const cp = checkpointPos();
    if (cp && Math.hypot(player.x - cp[0], player.z - cp[1]) < 7) {
      const done = M.advanceCheckpoint(run);
      if (done) {
        player.money += CITY.MISSIONS[run.mission].pay || 0;
        HUD.setScreen('passed');
        setTimeout(() => { if (state.screen === 'passed') setScreen('play'); }, 2600);
        state.screen = 'passed';
        $('passed-name').textContent = run.passed.name.toUpperCase();
        $('passed-pay').textContent = '$' + run.passed.pay;
      } else {
        AU.blip(880);
      }
    }
    AU.setEngine(Math.abs(player.speed) / 26);
  }

  function setScreen(name) {
    state.screen = name;
    HUD.setScreen(name);
    if (name === 'map') HUD.drawBigMap(document.getElementById('bigmap'));
    if (name === 'play') AU.start();
  }

  function bindInput() {
    addEventListener('keydown', (e) => {
      state.keys[e.code] = true;
      if (e.code === 'KeyM') setScreen(state.screen === 'map' ? 'play' : 'map');
      if (e.code === 'KeyU') setScreen(state.screen === 'upgrade' ? 'play' : 'upgrade');
      if (e.code === 'KeyP' || e.code === 'Escape') setScreen(state.screen === 'pause' ? 'play' : 'pause');
      if (e.code === 'KeyR') { state.radio = (state.radio + 1) % CITY.RADIO.length; AU.blip(520); }
      if (e.code === 'KeyQ') { player.weapon = (player.weapon + 1) % CITY.WEAPONS.length; AU.blip(440); }
      if (e.code === 'KeyE') {
        player.inCar = !player.inCar;
        if (!player.inCar) { player.x += Math.sin(player.yaw + Math.PI / 2) * 3; player.z += Math.cos(player.yaw + Math.PI / 2) * 3; }
        AU.blip(300);
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { state.keys[e.code] = false; });
    canvas.addEventListener('mousedown', (e) => {
      state.mouseDown = true;
      if (state.screen === 'play' && !player.inCar) shoot();
      AU.start();
    });
    addEventListener('mouseup', () => { state.mouseDown = false; });
    addEventListener('mousemove', (e) => {
      if (state.mouseDown && state.screen === 'play') {
        state.camYaw += e.movementX * 0.003;
        player.yaw += e.movementX * 0.003;
      }
    });
    document.querySelectorAll('[data-act]').forEach((b) => {
      b.addEventListener('click', () => {
        const act = b.dataset.act;
        AU.start(); AU.blip(660);
        if (act === 'play') setScreen('play');
        if (act === 'title') setScreen('title');
        if (act === 'map') setScreen(state.screen === 'map' ? 'play' : 'map');
        if (act === 'upgrade') setScreen(state.screen === 'upgrade' ? 'play' : 'upgrade');
        if (act === 'resume') setScreen('play');
        if (act === 'save') saveGame();
        if (act === 'load') loadGame();
        if (act === 'quit') setScreen('title');
      });
    });
    document.querySelectorAll('[data-buy]').forEach((b) => {
      b.addEventListener('click', () => {
        const cost = +b.dataset.buy;
        if (player.money >= cost) {
          player.money -= cost;
          player.health = 100;
          b.textContent = 'TERPASANG ✓';
          AU.blip(990);
          updateHUD();
        }
      });
    });
  }

  function shoot() {
    if (player.weapon === 0) return;
    state.muzzle = 0.12;
    const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
    state.floaters.push({ x: player.x + fx * 9, y: 2.0, z: player.z + fz * 9, text: 'HIT! -12 HP', born: state.t });
    if (state.floaters.length > 6) state.floaters.shift();
    AU.blip(180);
  }

  function saveGame() {
    try {
      localStorage.setItem('wilwatikta-save', JSON.stringify({ money: player.money, mission: run.mission, car: player.car, rep: player.rep }));
      $('save-msg').textContent = 'Tersimpan ✓  ' + new Date().toLocaleTimeString('id-ID');
    } catch (e) { $('save-msg').textContent = 'Gagal menyimpan.'; }
  }
  function loadGame() {
    try {
      const s = JSON.parse(localStorage.getItem('wilwatikta-save') || 'null');
      if (!s) { $('save-msg').textContent = 'Belum ada simpanan.'; return; }
      player.money = s.money; run.mission = s.mission; player.car = s.car; player.rep = s.rep;
      $('save-msg').textContent = 'Simpanan dimuat ✓';
      updateHUD();
    } catch (e) { $('save-msg').textContent = 'Simpanan rusak.'; }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (frame._last || now)) / 1000 || 0.016);
    frame._last = now;
    if (STAGED) {
      const s = SHOTS[SHOT] || SHOTS.chase;
      state.palette = s.palette;
      state.clock = s.clock;
      state.t = s.t;
      run.mission = s.mission;
      applyPalette(state.palette);
      cameraFor(s.t);
      drawScene(s.t);
      updateHUD();
      if (SHOT === 'map') HUD.drawBigMap(document.getElementById('bigmap'));
      return;
    }
    update(dt);
    applyPalette(state.palette);
    cameraFor(state.t);
    drawScene(state.t);
    state.hudTick += dt;
    if (state.hudTick > 0.12) { state.hudTick = 0; updateHUD(); }
  }

  HUD.buildStatic();
  bindInput();
  if (SHOT === 'map') { HUD.setScreen('map'); }
  else if (SHOT === 'title') { HUD.setScreen('title'); }
  else if (SHOT) { HUD.setScreen('play'); }
  else { HUD.setScreen('title'); }
  // Deterministic staged defaults for the HUD numbers in screenshots.
  if (SHOT === 'chase') { player.speed = 31; player.inCar = true; player.x = 0; player.z = 108; player.yaw = 0; }
  if (SHOT === 'night') { player.inCar = false; player.speed = 0; run.mission = 6; run.next = 'KABUR DARI WPD'; run.dialogue = M.lineFor(6, 'AGUS'); player.x = 0; player.z = 12; player.yaw = Math.PI / 2; }
  if (SHOT === 'title') { player.inCar = false; player.x = 12; player.z = 12; }
  applyPalette(state.palette);
  updateHUD();
  requestAnimationFrame(frame);
  window.WTW.game = { player, run, state, setScreen };
})();
