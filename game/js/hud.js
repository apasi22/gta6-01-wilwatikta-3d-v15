// WILWATIKTA 3D — DOM HUD: minimap, portraits, panels, overlays, floaters.
(function () {
  'use strict';
  const CITY = window.WTW.city;

  function $(id) { return document.getElementById(id); }

  function css(c) { return 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')'; }

  // Minimap: district blocks + POI dots + player arrow + dashed route.
  function drawMinimap(cv, px, pz, pyaw) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0c0e14';
    ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); ctx.clip();
    const scale = W / 288;
    const toX = (x) => (x + 144) * scale;
    const toY = (z) => (z + 144) * scale;
    for (const d of CITY.DISTRICTS) {
      ctx.fillStyle = css(d.color);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(toX(d.x0), toY(d.z0), (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (let v = -132; v <= 132; v += 24) {
      ctx.beginPath(); ctx.moveTo(toX(v + 3.5), 0); ctx.lineTo(toX(v + 3.5), H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, toY(v + 3.5)); ctx.lineTo(W, toY(v + 3.5)); ctx.stroke();
    }
    // Route: safehouse -> objective (dashed yellow).
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(8), toY(108)); ctx.lineTo(toX(-60), toY(120)); ctx.lineTo(toX(-108), toY(60));
    ctx.stroke();
    ctx.setLineDash([]);
    for (const p of CITY.POIS) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(toX(p.x), toY(p.z), 3, 0, Math.PI * 2); ctx.fill();
    }
    // Player arrow.
    const ax = toX(px), ay = toY(pz);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(Math.atan2(Math.sin(pyaw), Math.cos(pyaw)) + Math.PI);
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // Full-screen map overlay.
  function drawBigMap(cv) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.fillStyle = '#0b0d12';
    ctx.fillRect(0, 0, W, H);
    const scale = Math.min(W, H) / 300;
    const ox = (W - 288 * scale) / 2, oy = (H - 288 * scale) / 2;
    const toX = (x) => ox + (x + 144) * scale;
    const toY = (z) => oy + (z + 144) * scale;
    ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      ctx.beginPath(); ctx.moveTo(toX(-144 + i * 48), toY(-144)); ctx.lineTo(toX(-144 + i * 48), toY(144)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(toX(-144), toY(-144 + i * 48)); ctx.lineTo(toX(144), toY(-144 + i * 48)); ctx.stroke();
    }
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    for (const d of CITY.DISTRICTS) {
      ctx.fillStyle = css(d.color);
      ctx.fillRect(toX(d.x0), toY(d.z0), (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
      ctx.fillStyle = '#fff';
      ctx.fillText(d.name, toX(d.x0) + 4, toY(d.z0) + 14);
    }
    // Route.
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(toX(8), toY(108)); ctx.lineTo(toX(-108), toY(60)); ctx.lineTo(toX(-60), toY(120));
    ctx.stroke();
    ctx.setLineDash([]);
    // POIs (labels staggered above/below so neighbours never collide).
    ctx.textAlign = 'center';
    CITY.POIS.forEach((p, i) => {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(toX(p.x), toY(p.z), 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(p.short, toX(p.x), toY(p.z) + 3);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '10px sans-serif';
      ctx.fillText(p.name, toX(p.x), toY(p.z) + (i % 2 === 0 ? 20 : -14));
    });
    // Objective star.
    const ox2 = toX(-60), oy2 = toY(120);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 11 : 5, a = (i * Math.PI) / 5 - Math.PI / 2;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](ox2 + Math.cos(a) * r, oy2 + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText('OBJECTIVE', ox2, oy2 - 18);
  }

  // Crew portrait: flat 2D face on a coloured tile.
  function drawPortrait(cv, crew) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.fillStyle = crew.color;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(W / 2, H * 0.52, W * 0.30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#26221e';
    ctx.fillRect(W * 0.22, H * 0.10, W * 0.56, H * 0.18);
    ctx.fillStyle = '#1c1712';
    ctx.beginPath(); ctx.arc(W * 0.40, H * 0.50, W * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.60, H * 0.50, W * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a3b2e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W / 2, H * 0.60, W * 0.12, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(W * 0.18, H * 0.82, W * 0.64, H * 0.18);
  }

  function stars(n) {
    let s = '';
    for (let i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return s;
  }

  function updateHUD(st) {
    const p = st.player, run = st.run;
    $('hud-money').textContent = '$' + p.money.toLocaleString('en-US');
    $('hud-stars').textContent = stars(p.wanted);
    $('hud-time').textContent = st.clock + ' · DAY 1 1998';
    $('hud-district').textContent = st.district;
    $('hud-street').textContent = st.street;
    $('hud-rep').textContent = 'REP FIXER · ' + p.rep + ' · LV ' + p.repLevel;
    $('hud-health').style.width = p.health + '%';
    const h2 = $('hud-health2');
    if (h2) h2.style.width = p.health + '%';
    $('hud-radio-name').textContent = CITY.RADIO[st.radio].name;
    $('hud-radio-track').textContent = CITY.RADIO[st.radio].track;
    const car = CITY.CARS[p.car];
    $('hud-car-name').textContent = p.inCar ? car.name : 'SUGENG WIBOWO — ON FOOT';
    $('hud-car-sub').textContent = p.inCar ? 'CONDITION' : 'HEALTH';
    $('hud-speed').textContent = p.inCar ? Math.round(Math.abs(p.speed) * 3.2) : p.health;
    $('hud-speed-unit').textContent = p.inCar ? 'KM/H' : 'HP';
    $('hud-gear').textContent = p.inCar ? 'G' + Math.min(5, 1 + Math.floor(Math.abs(p.speed) / 6)) : 'JALAN';
    // Weapon slots.
    const slots = document.querySelectorAll('#weapon-slots .wslot');
    slots.forEach((el, i) => {
      el.classList.toggle('active', i === p.weapon);
      el.classList.toggle('locked', !!CITY.WEAPONS[i].locked);
    });
    $('hud-weapon-line').textContent = CITY.WEAPONS[p.weapon].name + ' · ' + CITY.WEAPONS[p.weapon].ammo.toUpperCase() + ' ROUNDS';
    // Mission panel.
    const mt = window.WTW.missions.missionText(run);
    $('hud-mission-title').textContent = mt.title;
    $('hud-mission-body').textContent = mt.body;
    $('hud-timer').textContent = window.WTW.missions.fmtTimer(run.timer);
    $('hud-next').textContent = 'NEXT: ' + run.next;
    $('hud-dispatch').textContent = 'WPD DISPATCH: 2 unit mengejar — HELI 2';
    // Dialogue.
    $('dlg-who').textContent = run.dialogue.who;
    $('dlg-role').textContent = run.dialogue.role;
    $('dlg-text').textContent = run.dialogue.text;
    drawMinimap($('minimap'), p.x, p.z, p.yaw);
  }

  function buildStatic() {
    // Weapon slots.
    const ws = $('weapon-slots');
    CITY.WEAPONS.forEach((w) => {
      const d = document.createElement('div');
      d.className = 'wslot' + (w.locked ? ' locked' : '');
      d.innerHTML = '<span class="wkey">' + w.key + '</span><span class="wname">' + w.name + '</span><span class="wammo">' + (w.locked ? 'LOCKED' : w.ammo) + '</span>';
      ws.appendChild(d);
    });
    // Crew portraits.
    const row = $('crew-row');
    CITY.CREW.forEach((c, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'crew';
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      drawPortrait(cv, c);
      const nm = document.createElement('div');
      nm.className = 'crew-name';
      nm.textContent = c.name;
      const sub = document.createElement('div');
      sub.className = 'crew-sub';
      sub.textContent = i === 0 ? 'YOU' : '$' + c.hire + ' HIRE [2]';
      wrap.appendChild(cv); wrap.appendChild(nm); wrap.appendChild(sub);
      row.appendChild(wrap);
    });
    // Dialogue face tile (Agus, the speaker on the title chase).
    const face = $('dlg-face');
    if (face) drawPortrait(face, CITY.CREW[1]);
    // Mission list (map overlay).
    const ml = $('mission-list');
    CITY.MISSIONS.forEach((m, i) => {
      const d = document.createElement('div');
      d.className = 'mrow' + (i === 5 ? ' active' : '') + (i < 5 ? ' done' : '');
      d.innerHTML = '<span class="mnum">' + (i + 1) + '.</span><span class="mname">' + m.name + '</span><span class="mpay">$' + m.pay + '</span><span class="mstate">' + (i < 5 ? 'DONE ✓' : i === 5 ? 'ACTIVE' : '—') + '</span>';
      ml.appendChild(d);
    });
  }

  function renderFloaters(list) {
    const layer = $('floaters');
    layer.innerHTML = '';
    for (const f of list) {
      const d = document.createElement('div');
      d.className = 'floater';
      d.style.left = f.x + 'px';
      d.style.top = f.y + 'px';
      d.style.opacity = f.alpha;
      d.textContent = f.text;
      layer.appendChild(d);
    }
  }

  function setScreen(name) {
    ['title', 'map', 'upgrade', 'pause', 'passed'].forEach((n) => {
      const el = $('screen-' + n);
      if (el) el.style.display = n === name ? 'flex' : 'none';
    });
    $('hud').style.display = name === 'play' ? 'block' : 'none';
  }

  window.WTW.hud = { buildStatic, updateHUD, drawMinimap, drawBigMap, drawPortrait, renderFloaters, setScreen, stars };
})();
