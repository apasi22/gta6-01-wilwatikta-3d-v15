// WILWATIKTA 3D — WebGL1 renderer, written from scratch (no library).
// One unit-cube mesh, per-face lambert shading + distance fog, supersampled
// backing store (2560x1440) shown at 1280x720. All math column-major.
(function () {
  'use strict';

  function matIdentity() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  }
  function matMul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
    }
    return o;
  }
  function matTranslate(x, y, z) {
    const m = matIdentity();
    m[12] = x; m[13] = y; m[14] = z;
    return m;
  }
  function matScale(x, y, z) {
    const m = matIdentity();
    m[0] = x; m[5] = y; m[10] = z;
    return m;
  }
  function matRotY(a) {
    const m = matIdentity();
    const c = Math.cos(a), s = Math.sin(a);
    m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
    return m;
  }
  function matRotX(a) {
    const m = matIdentity();
    const c = Math.cos(a), s = Math.sin(a);
    m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
    return m;
  }
  function matPerspective(fovy, aspect, near, far) {
    const m = new Float32Array(16);
    const f = 1 / Math.tan(fovy / 2);
    m[0] = f / aspect; m[5] = f;
    m[10] = (far + near) / (near - far);
    m[11] = -1; m[14] = (2 * far * near) / (near - far);
    return m;
  }
  function matLookAt(ex, ey, ez, cx, cy, cz) {
    let zx = ex - cx, zy = ey - cy, zz = ez - cz;
    let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    // x = up x z  (up = +y): (zz, 0, -zx)
    let xx = zz, xy = 0, xz = -zx;
    l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    const m = new Float32Array(16);
    m[0] = xx; m[1] = yx; m[2] = zx; m[3] = 0;
    m[4] = xy; m[5] = yy; m[6] = zy; m[7] = 0;
    m[8] = xz; m[9] = yz; m[10] = zz; m[11] = 0;
    m[12] = -(xx * ex + xy * ey + xz * ez);
    m[13] = -(yx * ex + yy * ey + yz * ez);
    m[14] = -(zx * ex + zy * ey + zz * ez);
    m[15] = 1;
    return m;
  }
  function transformPoint(m, x, y, z) {
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [
      (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
      (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
      (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
    ];
  }

  // Unit cube: 24 verts (4 per face), normals per face, 36 indices.
  const CUBE_POS = new Float32Array([
    // +x
    0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
    // -x
    -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5,
    // +y
    -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // -y
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5,
    // +z
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // -z
    0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5,
  ]);
  const CUBE_NRM = new Float32Array([
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
  ]);
  const CUBE_IDX = new Uint16Array([
    0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
  ]);

  const VS = `
attribute vec3 aPos; attribute vec3 aNrm;
uniform mat4 uModel, uView, uProj;
varying vec3 vNrm; varying float vDepth;
void main(){
  vec4 wp = uModel * vec4(aPos, 1.0);
  vec4 vp = uView * wp;
  vNrm = mat3(uModel) * aNrm;
  vDepth = -vp.z;
  gl_Position = uProj * vp;
}`;
  const FS = `
precision mediump float;
uniform vec3 uColor; uniform vec3 uLight; uniform vec3 uFog; uniform vec2 uFogRange;
uniform float uGlow;
varying vec3 vNrm; varying float vDepth;
void main(){
  vec3 n = normalize(vNrm);
  float lam = max(dot(n, normalize(uLight)), 0.0);
  float shade = 0.58 + 0.42 * lam;
  vec3 col = uColor * shade + uColor * uGlow;
  float f = clamp((vDepth - uFogRange.x) / (uFogRange.y - uFogRange.x), 0.0, 1.0);
  gl_FragColor = vec4(mix(col, uFog, f), 1.0);
}`;

  function createRenderer(canvas) {
    const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    const W = 2560, H = 1440;
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    function shader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, CUBE_POS, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    const nrmBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf);
    gl.bufferData(gl.ARRAY_BUFFER, CUBE_NRM, gl.STATIC_DRAW);
    const aNrm = gl.getAttribLocation(prog, 'aNrm');
    gl.enableVertexAttribArray(aNrm);
    gl.vertexAttribPointer(aNrm, 3, gl.FLOAT, false, 0, 0);
    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, CUBE_IDX, gl.STATIC_DRAW);

    const U = {};
    ['uModel', 'uView', 'uProj', 'uColor', 'uLight', 'uFog', 'uFogRange', 'uGlow'].forEach(
      (n) => { U[n] = gl.getUniformLocation(prog, n); },
    );

    const R = {
      gl,
      view: matIdentity(),
      proj: matPerspective((58 * Math.PI) / 180, W / H, 0.1, 900),
      light: [0.5, 0.8, 0.35],
      fogColor: [0.16, 0.10, 0.28],
      fogRange: [90, 320],
      clearColor: [0.16, 0.10, 0.28],
      _alpha: false,
    };

    R.setCamera = function (eye, center) {
      R.view = matLookAt(eye[0], eye[1], eye[2], center[0], center[1], center[2]);
    };
    R.begin = function () {
      gl.clearColor(R.clearColor[0], R.clearColor[1], R.clearColor[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(U.uView, false, R.view);
      gl.uniformMatrix4fv(U.uProj, false, R.proj);
      gl.uniform3fv(U.uLight, R.light);
      gl.uniform3fv(U.uFog, R.fogColor);
      gl.uniform2fv(U.uFogRange, R.fogRange);
    };
    // model: {x,y,z, ry, rx, sx,sy,sz}; color: [r,g,b] 0..1; glow adds flat light.
    R.box = function (m, color, glow) {
      let M = matTranslate(m.x || 0, m.y || 0, m.z || 0);
      if (m.ry) M = matMul(M, matRotY(m.ry));
      if (m.rx) M = matMul(M, matRotX(m.rx));
      M = matMul(M, matScale(m.sx || 1, m.sy || 1, m.sz || 1));
      gl.uniformMatrix4fv(U.uModel, false, M);
      gl.uniform3fv(U.uColor, color);
      gl.uniform1f(U.uGlow, glow || 0);
      gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    };
    // Translucent box (beam / glass): toggles blending for this draw only.
    R.ghostBox = function (m, color, alpha) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      let M = matTranslate(m.x || 0, m.y || 0, m.z || 0);
      if (m.ry) M = matMul(M, matRotY(m.ry));
      if (m.rx) M = matMul(M, matRotX(m.rx));
      M = matMul(M, matScale(m.sx || 1, m.sy || 1, m.sz || 1));
      gl.uniformMatrix4fv(U.uModel, false, M);
      gl.uniform3fv(U.uColor, [color[0] * alpha, color[1] * alpha, color[2] * alpha]);
      gl.uniform1f(U.uGlow, 0.6);
      gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    };
    // World -> screen (CSS pixels, 1280x720). Returns null when behind camera.
    R.project = function (x, y, z) {
      const vp = matMul(R.proj, R.view);
      const p = transformPoint(vp, x, y, z);
      if (p[2] > 1 || p[2] < -1) return null;
      return [(p[0] * 0.5 + 0.5) * 1280, (0.5 - p[1] * 0.5) * 720];
    };
    return R;
  }

  // Deterministic RNG (mulberry32).
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  window.WTW = window.WTW || {};
  window.WTW.gl = { createRenderer, matIdentity, matMul, matTranslate, matScale, matRotY, matRotX, matPerspective, matLookAt, transformPoint, rng };
})();
