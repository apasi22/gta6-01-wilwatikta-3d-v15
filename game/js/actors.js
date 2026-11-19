// WILWATIKTA 3D — dynamic actors: player, traffic, police, pedestrians, heli.
// Deterministic traffic: every car is a pure function of time t.
(function () {
  'use strict';
  const G = window.WTW.gl;
  const CITY = window.WTW.city;
  const W = window.WTW.world;

  // Traffic lanes: cars loop along streets (lanes at street ±2), pure f(t).
  function trafficAt(t) {
    const rand = G.rng(77);
    const cars = [];
    const lanes = [];
    for (const s of [-108, -84, -36, 12, 60, 108]) {
      lanes.push({ z: s - 2, dir: 1, n: 4 }, { z: s + 2, dir: -1, n: 4 });
      lanes.push({ x: s - 2, dir: 1, n: 4 }, { x: s + 2, dir: -1, n: 4 });
    }
    for (const lane of lanes) {
      for (let i = 0; i < lane.n; i++) {
        const speed = 6 + rand() * 5;
        const off = rand() * 280;
        const u = (((off + speed * t * lane.dir) % 280) + 280) % 280 - 140;
        const def = CITY.CARS[Math.floor(rand() * CITY.CARS.length)];
        // Car forward is (cos ry, -sin ry): horizontal lane -> ry 0/PI,
        // vertical lane -> ry -PI/2 (forward +z) / PI/2 (forward -z).
        if (lane.z !== undefined) cars.push({ x: u, z: lane.z, ry: lane.dir > 0 ? 0 : Math.PI, def });
        else cars.push({ x: lane.x, z: u, ry: lane.dir > 0 ? -Math.PI / 2 : Math.PI / 2, def });
      }
    }
    return cars;
  }

  function pedestriansAt(t) {
    const rand = G.rng(31);
    const folks = [];
    // All spots sit on road corridors (z or x near a street line).
    const spots = [
      [-40, 14], [-8, 10], [30, 14], [60, 110], [-100, -82], [100, -82],
      [-20, 106], [48, -82], [-60, -86], [84, 14], [12, 10], [-120, 110],
    ];
    for (let i = 0; i < spots.length; i++) {
      const [sx, sz] = spots[i];
      const wx = sx + Math.sin(t * 0.25 + i * 2.1) * 4;
      const wz = sz + Math.cos(t * 0.2 + i * 1.3) * 3;
      const yaw = Math.atan2(Math.cos(t * 0.25 + i * 2.1), -Math.sin(t * 0.2 + i * 1.3));
      const shirts = [[0.8, 0.3, 0.3], [0.3, 0.5, 0.9], [0.9, 0.7, 0.2], [0.4, 0.7, 0.4], [0.7, 0.4, 0.7], [0.9, 0.5, 0.2]];
      folks.push({ x: wx, z: wz, yaw, shirt: shirts[i % shirts.length], scale: 0.92 + (i % 3) * 0.05 });
    }
    return folks;
  }

  // Player state (driving / on foot), updated by input in game.js.
  function newPlayer() {
    return {
      x: 0, z: 60, yaw: 0, speed: 0, inCar: true, car: 0,
      health: 95, money: 12480, wanted: 3, weapon: 2,
      mission: 5, checkpoint: 0, timer: 193, rep: 1320, repLevel: 4,
    };
  }

  // Police chase: two units weaving behind the player car.
  // Car forward is (cos ry, -sin ry); local +z maps to (sin ry, cos ry).
  function policeAt(t, px, pz, yaw) {
    const fx = Math.cos(yaw), fz = -Math.sin(yaw);
    const rx = Math.sin(yaw), rz = Math.cos(yaw);
    const back = (d, lat) => {
      return { x: px - fx * d + rx * lat, z: pz - fz * d + rz * lat, ry: yaw };
    };
    const wob = Math.sin(t * 1.7) * 2.5;
    return [back(14 + Math.sin(t * 0.9) * 2, -4 + wob), back(20 + Math.cos(t * 0.7) * 2, 5 - wob)];
  }

  // Heli circles above the action.
  function heliAt(t, cx, cz) {
    const a = t * 0.22;
    return { x: cx + Math.cos(a) * 26, y: 34 + Math.sin(t * 0.5) * 2, z: cz + Math.sin(a) * 26, t };
  }

  // Floating combat text: projected 3D -> 2D by the renderer.
  function drawFloaters(R, list, t) {
    const out = [];
    for (const f of list) {
      const age = t - f.born;
      if (age < 0 || age > 1.6) continue;
      const p = R.project(f.x, f.y + age * 2.2, f.z);
      if (!p) continue;
      out.push({ x: p[0], y: p[1], text: f.text, alpha: 1 - age / 1.6 });
    }
    return out;
  }

  window.WTW.actors = { trafficAt, pedestriansAt, newPlayer, policeAt, heliAt, drawFloaters };
})();
