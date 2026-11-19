// WILWATIKTA 3D — static city geometry + vehicle / person / heli drawing.
// Deterministic: one seeded layout (seed 1998), built once at load.
(function () {
  'use strict';
  const G = window.WTW.gl;
  const CITY = window.WTW.city;

  function buildCity() {
    const rand = G.rng(1998);
    const buildings = [];
    const palms = [];
    // Roads are 7u corridors centred on s ≡ 12 (mod 24): -132,-108,...,132.
    // No building or palm may overlap a road corridor (with 1u margin).
    const roadAt = (u) => {
      const r = (((u + 132) % 24) + 24) % 24;
      return r <= 3.5 || r >= 20.5;
    };
    const onRoad = (x, z, hw, hd) => {
      for (let ox = -hw; ox <= hw; ox += 2) {
        for (let oz = -hd; oz <= hd; oz += 2) {
          if (roadAt(x + ox) || roadAt(z + oz)) return true;
        }
      }
      return false;
    };
    for (let bx = -132; bx <= 132; bx += 24) {
      for (let bz = -132; bz <= 132; bz += 24) {
        const cx = bx + 12, cz = bz + 12;
        const d = CITY.DISTRICTS.find((q) => cx >= q.x0 && cx < q.x1 && cz >= q.z0 && cz < q.z1);
        if (!d) continue;
        const n = 1 + Math.floor(rand() * 2);
        for (let i = 0; i < n; i++) {
          const w = 6 + rand() * 8, dep = 6 + rand() * 8;
          const h = d.id === 'emas' ? 14 + rand() * 26 : d.id === 'segara' ? 5 + rand() * 6 : d.id === 'kidul' ? 4 + rand() * 7 : 6 + rand() * 14;
          const x = cx + (i === 0 ? -3 : 4) + (rand() - 0.5) * 3;
          const z = cz + (rand() - 0.5) * 6;
          if (onRoad(x, z, w / 2, dep / 2)) continue;
          const tint = 0.75 + rand() * 0.45;
          buildings.push({
            x, z, w, d: dep, h,
            color: [d.dark[0] * tint + 0.05, d.dark[1] * tint + 0.05, d.dark[2] * tint + 0.08],
            roof: [0.16 + rand() * 0.1, 0.16 + rand() * 0.1, 0.18],
            seed: rand(),
          });
        }
        if (rand() < 0.5) {
          const px = cx + 9, pz = cz + 9;
          if (!onRoad(px, pz, 1, 1)) palms.push({ x: px, z: pz, h: 4 + rand() * 2 });
        }
      }
    }
    return { buildings, palms };
  }

  const WORLD = buildCity();

  function drawGround(R, pal) {
    R.box({ x: 0, y: -0.6, z: 0, sx: 340, sy: 1, sz: 340 }, pal.ground);
    // Roads: flat dark strips along every street line (centred on s).
    const roadY = -0.05;
    for (let v = -132; v <= 132; v += 24) {
      R.box({ x: 0, y: roadY, z: v, sx: 300, sy: 0.1, sz: 7 }, pal.road);
      R.box({ x: v, y: roadY, z: 0, sx: 7, sy: 0.1, sz: 300 }, pal.road);
    }
    // Centre dashes (yellow) along each street.
    const dash = [0.85, 0.7, 0.15];
    for (let v = -132; v <= 132; v += 24) {
      for (let u = -140; u <= 140; u += 12) {
        R.box({ x: u, y: 0.02, z: v, sx: 3, sy: 0.05, sz: 0.35 }, dash);
        R.box({ x: v, y: 0.02, z: u, sx: 0.35, sy: 0.05, sz: 3 }, dash);
      }
    }
  }

  function drawBuildings(R, pal, cam) {
    const win = pal.window;
    for (const b of WORLD.buildings) {
      R.box({ x: b.x, y: b.h / 2, z: b.z, sx: b.w, sy: b.h, sz: b.d }, b.color);
      R.box({ x: b.x, y: b.h + 0.15, z: b.z, sx: b.w * 0.9, sy: 0.3, sz: b.d * 0.9 }, b.roof);
      // Lit windows, only near the camera (bounded draw calls).
      const dx = b.x - cam[0], dz = b.z - cam[2];
      if (dx * dx + dz * dz > 70 * 70) continue;
      const rows = Math.min(4, Math.floor(b.h / 3));
      const cols = Math.min(3, Math.floor(b.w / 3));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((b.seed * 97 + r * 7 + c * 13) % 1 > 0.45) continue;
          const wy = 2 + r * 3;
          const wx = b.x - b.w / 2 + 1.5 + c * ((b.w - 3) / Math.max(1, cols - 1 || 1));
          R.box({ x: wx, y: wy, z: b.z + b.d / 2 + 0.06, sx: 1.1, sy: 1.4, sz: 0.1 }, win, 0.35);
        }
      }
    }
    // Palms: trunk + leaf crown.
    for (const p of WORLD.palms) {
      R.box({ x: p.x, y: p.h / 2, z: p.z, sx: 0.35, sy: p.h, sz: 0.35 }, [0.35, 0.24, 0.14]);
      R.box({ x: p.x, y: p.h + 0.3, z: p.z, sx: 2.6, sy: 0.35, sz: 0.7 }, [0.12, 0.5, 0.2]);
      R.box({ x: p.x, y: p.h + 0.3, z: p.z, sx: 0.7, sy: 0.35, sz: 2.6 }, [0.14, 0.55, 0.22]);
    }
  }

  function drawCar(R, x, z, ry, def, police) {
    const body = police ? [0.92, 0.92, 0.95] : def.color;
    const dark = [0.08, 0.08, 0.10];
    const cos = Math.cos(ry), sin = Math.sin(ry);
    const fwd = (dx, dz) => [x + dx * cos + dz * sin, z - dx * sin + dz * cos];
    // Body + cabin + roof + wheels + lights (local frame, +x = forward).
    let p = fwd(0, 0);
    R.box({ x: p[0], y: 0.55, z: p[1], ry, sx: 4.4, sy: 0.75, sz: 2.0 }, body);
    p = fwd(-0.2, 0);
    R.box({ x: p[0], y: 1.15, z: p[1], ry, sx: 2.2, sy: 0.65, sz: 1.7 }, police ? [0.15, 0.2, 0.3] : [0.20, 0.22, 0.27]);
    for (const [wx, wz] of [[1.5, 0.95], [1.5, -0.95], [-1.5, 0.95], [-1.5, -0.95]]) {
      p = fwd(wx, wz);
      R.box({ x: p[0], y: 0.35, z: p[1], ry, sx: 0.7, sy: 0.7, sz: 0.35 }, dark);
    }
    p = fwd(2.25, 0.6); R.box({ x: p[0], y: 0.6, z: p[1], ry, sx: 0.15, sy: 0.25, sz: 0.35 }, [1.0, 0.95, 0.7], 0.6);
    p = fwd(2.25, -0.6); R.box({ x: p[0], y: 0.6, z: p[1], ry, sx: 0.15, sy: 0.25, sz: 0.35 }, [1.0, 0.95, 0.7], 0.6);
    p = fwd(-2.25, 0.6); R.box({ x: p[0], y: 0.6, z: p[1], ry, sx: 0.15, sy: 0.2, sz: 0.3 }, [0.9, 0.1, 0.1], 0.4);
    p = fwd(-2.25, -0.6); R.box({ x: p[0], y: 0.6, z: p[1], ry, sx: 0.15, sy: 0.2, sz: 0.3 }, [0.9, 0.1, 0.1], 0.4);
    if (police) {
      p = fwd(-0.2, 0);
      R.box({ x: p[0], y: 1.6, z: p[1], ry, sx: 0.9, sy: 0.18, sz: 0.5 }, [0.9, 0.1, 0.1], 0.7);
      R.box({ x: p[0], y: 1.6, z: p[1], ry, sx: 0.9, sy: 0.18, sz: 0.5 }, [0.1, 0.2, 0.95], 0.0);
      R.box({ x: p[0], y: 0.95, z: p[1], ry, sx: 4.42, sy: 0.12, sz: 0.3 }, [0.1, 0.35, 0.85], 0.2);
    }
  }

  // A blocky person. yaw: facing direction, 0 = +z. opts: shirt, pants, skin,
  // scale, face (eyes+mouth on the facing side), gun (pistol in outstretched
  // left hand — appears on the viewer's right when facing the camera).
  function drawPerson(R, x, z, yaw, opts) {
    const o = opts || {};
    const s = o.scale || 1;
    const shirt = o.shirt || [0.2, 0.55, 0.25];
    const pants = o.pants || [0.22, 0.22, 0.26];
    const skin = o.skin || [0.85, 0.62, 0.42];
    const fx = Math.sin(yaw), fz = Math.cos(yaw); // facing dir
    const lx = fz, lz = -fx; // person's left
    const put = (dx, dy, dz, sx, sy, sz, color, glow) => {
      // dx: along facing, dz: along left, in person-local space.
      const wx = x + fx * dx + lx * dz;
      const wz = z + fz * dx + lz * dz;
      R.box({ x: wx, y: dy * s, z: wz, ry: yaw, sx: sx * s, sy: sy * s, sz: sz * s }, color, glow || 0);
    };
    // Legs (two).
    put(0, 0.4, -0.13, 0.18, 0.8, 0.2, pants);
    put(0, 0.4, 0.13, 0.18, 0.8, 0.2, pants);
    // Torso.
    put(0, 1.12, 0, 0.34, 0.66, 0.6, shirt);
    // Right arm down (person's right = -left).
    put(0, 1.05, -0.38, 0.16, 0.62, 0.18, shirt);
    put(0, 0.68, -0.38, 0.14, 0.18, 0.16, skin);
    // Left arm RAISED (diagonal, two segments) so the pistol silhouettes
    // against the sky instead of the buildings — it must read at a glance.
    if (o.gun) {
      put(0.02, 1.38, 0.55, 0.16, 0.16, 0.55, shirt);
      put(0.02, 1.55, 0.85, 0.15, 0.15, 0.45, shirt);
      put(0.02, 1.68, 1.05, 0.15, 0.15, 0.15, skin);
      // Barrel: light gunmetal so it stands out against the dusk sky.
      put(0.05, 1.70, 1.35, 0.14, 0.14, 0.85, [0.5, 0.53, 0.57], 0.2);
      // Grip: a clear vertical handle below the barrel — the L-shape is
      // what makes the bar read as a pistol, not a slab.
      put(0.14, 1.55, 1.10, 0.16, 0.30, 0.14, [0.22, 0.22, 0.24]);
      put(0.05, 1.70, 1.82, 0.10, 0.10, 0.10, [0.12, 0.12, 0.14]);
    } else {
      put(0, 1.05, 0.38, 0.16, 0.62, 0.18, shirt);
      put(0, 0.68, 0.38, 0.14, 0.18, 0.16, skin);
    }
    // Head + hair.
    put(0, 1.72, 0, 0.36, 0.36, 0.34, skin);
    put(-0.02, 1.92, 0, 0.38, 0.12, 0.36, o.hair || [0.10, 0.08, 0.06]);
    if (o.face) {
      // Eyes and mouth proud of the face plane (facing side, +dx).
      put(0.21, 1.76, -0.09, 0.04, 0.06, 0.05, [0.08, 0.06, 0.05]);
      put(0.21, 1.76, 0.09, 0.04, 0.06, 0.05, [0.08, 0.06, 0.05]);
      put(0.21, 1.62, 0, 0.04, 0.04, 0.14, [0.45, 0.15, 0.12]);
    }
  }

  function drawHeli(R, x, y, z, t, beamTarget) {
    const body = [0.92, 0.92, 0.95];
    R.box({ x, y, z, sx: 3.4, sy: 1.4, sz: 1.8 }, body);
    R.box({ x: x - 2.6, y: y + 0.2, z, sx: 2.6, sy: 0.5, sz: 0.5 }, body);
    R.box({ x: x + 1.2, y: y - 0.9, z: 0.9, sx: 0.3, sy: 0.5, sz: 0.3 }, [0.1, 0.1, 0.12]);
    R.box({ x: x + 1.2, y: y - 0.9, z: -0.9, sx: 0.3, sy: 0.5, sz: 0.3 }, [0.1, 0.1, 0.12]);
    R.box({ x, y: y + 0.9, z, ry: t * 9, sx: 7.5, sy: 0.08, sz: 0.35 }, [0.15, 0.15, 0.18]);
    R.box({ x: x - 3.8, y: y + 0.2, z, sx: 0.1, sy: 1.6, sz: 0.1 }, [0.15, 0.15, 0.18]);
    // Searchlight beam straight down from the heli, pool of light on the ground.
    if (beamTarget) {
      R.ghostBox({ x, y: y / 2, z, sx: 1.8, sy: y, sz: 1.8 }, [1.0, 0.95, 0.6], 0.15);
      R.box({ x: beamTarget[0], y: 0.1, z: beamTarget[2], sx: 5, sy: 0.12, sz: 5 }, [1.0, 0.95, 0.6], 0.55);
    }
  }

  function drawCheckpoint(R, x, z, t) {
    const pulse = 1 + 0.12 * Math.sin(t * 3);
    R.ghostBox({ x, y: 6, z, sx: 1.4 * pulse, sy: 12, sz: 1.4 * pulse }, [1.0, 0.85, 0.15], 0.28);
    R.box({ x, y: 0.08, z, sx: 6, sy: 0.12, sz: 6 }, [1.0, 0.85, 0.15], 0.5);
    R.box({ x, y: 0.16, z, sx: 4.4, sy: 0.12, sz: 4.4 }, [0.1, 0.1, 0.12], 0);
  }

  window.WTW.world = { WORLD, drawGround, drawBuildings, drawCar, drawPerson, drawHeli, drawCheckpoint };
})();
