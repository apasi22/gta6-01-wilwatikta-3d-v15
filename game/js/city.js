// WILWATIKTA 3D — world data: districts, streets, people, cars, missions.
// Everything original: a Javanese harbour city in 1998. No real-world brands.
(function () {
  'use strict';

  const DISTRICTS = [
    { id: 'segara', name: 'PELABUHAN SEGARA', color: [0.24, 0.45, 0.75], dark: [0.16, 0.30, 0.52], x0: -144, z0: -144, x1: -48, z1: 72, desc: 'Pelabuhan & gudang' },
    { id: 'batik', name: 'KAMPUNG BATIK', color: [0.55, 0.38, 0.72], dark: [0.38, 0.26, 0.50], x0: -48, z0: -144, x1: 48, z1: -24, desc: 'Kampung pengrajin' },
    { id: 'emas', name: 'LORONG EMAS', color: [0.85, 0.62, 0.12], dark: [0.60, 0.44, 0.08], x0: 48, z0: -144, x1: 144, z1: 72, desc: 'Kasino & hiburan' },
    { id: 'alun', name: 'ALUN-ALUN', color: [0.30, 0.55, 0.85], dark: [0.20, 0.38, 0.60], x0: -48, z0: -24, x1: 48, z1: 72, desc: 'Pusat kota & WPD' },
    { id: 'kidul', name: 'PANTAI KIDUL', color: [0.12, 0.65, 0.60], dark: [0.08, 0.45, 0.42], x0: -144, z0: 72, x1: 12, z1: 144, desc: 'Pantai & balapan' },
    { id: 'senja', name: 'PASAR SENJA', color: [0.85, 0.42, 0.18], dark: [0.60, 0.30, 0.12], x0: 12, z0: 72, x1: 144, z1: 144, desc: 'Pasar malam' },
  ];

  const STREETS = [
    { name: 'Jl. Batik Tulis', z: -84, horizontal: true },
    { name: 'Jl. Kenanga', z: 12, horizontal: true },
    { name: 'Jl. Segara Anakan', z: 108, horizontal: true },
    { name: 'Jl. Malioboro Kidul', x: -84, horizontal: false },
    { name: 'Jl. Pahlawan', x: 12, horizontal: false },
    { name: 'Jl. Gamelan', x: 108, horizontal: false },
  ];

  const POIS = [
    { name: 'Warehouse', short: 'W', x: -96, z: -96, d: 'segara' },
    { name: 'Docks', short: 'D', x: -108, z: -12, d: 'segara' },
    { name: 'Alun-Alun', short: 'M', x: 0, z: 24, d: 'alun' },
    { name: 'Kantor WPD', short: 'P', x: -12, z: 48, d: 'alun' },
    { name: 'Bengkel Bambang', short: 'G', x: 36, z: 24, d: 'alun' },
    { name: 'Casino', short: 'C', x: 120, z: -12, d: 'emas' },
    { name: 'Showroom', short: 'S', x: 108, z: 84, d: 'senja' },
    { name: 'Pasar Senja', short: 'P', x: 120, z: 120, d: 'senja' },
    { name: 'Safehouse', short: 'S', x: 8, z: 108, d: 'kidul' },
  ];

  const CARS = [
    { name: 'Garuda GT', color: [0.78, 0.10, 0.12], speed: 1.0, price: 1200 },
    { name: 'Kencana S', color: [0.90, 0.75, 0.15], speed: 0.92, price: 900 },
    { name: 'Arjuna', color: [0.15, 0.45, 0.85], speed: 0.85, price: 700 },
    { name: 'Srikandi', color: [0.85, 0.35, 0.55], speed: 0.80, price: 550 },
    { name: 'Gatotkaca', color: [0.25, 0.65, 0.30], speed: 0.72, price: 400 },
    { name: 'Bima', color: [0.75, 0.75, 0.78], speed: 0.66, price: 250 },
  ];

  const CREW = [
    { name: 'SUGENG', role: 'YOU', color: '#f97316', hire: 0, skill: 'Driver' },
    { name: 'AGUS', role: 'DRIVER · GETAWAY', color: '#ec4899', hire: 200, skill: 'Mengemudi' },
    { name: 'WANTO', role: 'INSIDE MAN', color: '#3b82f6', hire: 300, skill: 'Intel WPD' },
    { name: 'BAMBANG', role: 'MECHANIC', color: '#a16207', hire: 250, skill: 'Bengkel' },
    { name: 'RATNA', role: 'HACKER', color: '#14b8a6', hire: 350, skill: 'Radio & CCTV' },
    { name: 'SLAMET', role: 'ENFORCER', color: '#ef4444', hire: 400, skill: 'Otot' },
  ];

  const WEAPONS = [
    { key: '0', name: 'FIST', ammo: '∞', locked: false },
    { key: '1', name: 'PISTOL', ammo: '12/60', locked: false },
    { key: '2', name: 'SMG TAWON', ammo: '32/160', locked: false },
    { key: '3', name: 'SHOTGUN', ammo: 'LOCKED', locked: true },
    { key: '4', name: 'RIFLE', ammo: 'LOCKED', locked: true },
  ];

  const RADIO = [
    { name: 'Gamelan FM 101.1', track: 'Bonang Malam — Gamelan Wilwatikta' },
    { name: 'Radio Wilwatikta 88.4', track: 'Keroncong Senja — Orkes Pantai Kidul' },
    { name: 'Dangdut Pantura 95.7', track: 'Goyang Segara — Dewi Pantura' },
  ];

  const MISSIONS = [
    { name: 'Selamat Datang', pay: 300, text: 'Temui Agus di Alun-Alun. Kenali kotamu.', line: 'Selamat datang di Wilwatikta, Sugeng. Kota ini milik yang berani.' },
    { name: 'Hot Wheels', pay: 450, text: 'Curi Kencana S di Showroom Pasar Senja.', line: 'Mobil itu kunci semua. Jangan sampai WPD lihat.' },
    { name: 'Antar Paket', pay: 400, text: 'Antar paket ke Warehouse Pelabuhan Segara.', line: 'Paketnya jangan dibuka. Serius. Jangan dibuka.' },
    { name: 'Tagihan Pasar', pay: 550, text: 'Tagih utang di Pasar Senja, hati-hati preman.', line: 'Mereka bayar, atau mereka belajar.' },
    { name: 'Mata-Mata', pay: 500, text: 'Ikuti Komisaris Wanto tanpa ketahuan.', line: 'Wanto bukan musuh. Belum. Awasi saja.' },
    { name: 'Balapan Senja', pay: 700, text: 'Kalahkan 3 pembalap di Pantai Kidul.', line: 'Balapannya dari Pantai Kidul. Jangan rem di tikungan.' },
    { name: 'Gudang Segara', pay: 650, text: 'Bersihkan gudang dari musuh di Pelabuhan Segara.', line: 'WPD datang dari utara. Bersihkan gudang, cepat!' },
    { name: 'Kabur dari WPD', pay: 600, text: 'Lepas dari kejaran 2 unit WPD.', line: 'Heli di atas kita! Cari jalan tikus lewat Kampung Batik.' },
    { name: 'Heat Wave', pay: 750, text: 'Bakar gudang saingan di Lorong Emas.', line: 'Lorong Emas terbakar malam ini. Jangan ada saksi.' },
    { name: 'Kencana Hilang', pay: 700, text: 'Temukan Kencana S yang dicuri.', line: 'Mobilku hilang! Cari sampai ketemu, Sugeng.' },
    { name: 'Double Cross', pay: 900, text: 'Jebak pengkhianat di Alun-Alun.', line: 'Ada yang jual kita ke WPD. Kita jebak dia malam ini.' },
    { name: 'The Last Ride', pay: 1200, text: 'Pelarian terakhir ke Pantai Kidul.', line: 'Satu pelarian terakhir. Setelah ini, kita bebas.' },
  ];

  const PALETTES = {
    dusk: { sky: [0.32, 0.16, 0.42], fog: [0.30, 0.18, 0.38], light: [0.9, 0.55, 0.35], ground: [0.20, 0.19, 0.23], road: [0.16, 0.16, 0.19], window: [1.0, 0.85, 0.45] },
    night: { sky: [0.05, 0.06, 0.14], fog: [0.05, 0.06, 0.14], light: [0.45, 0.55, 0.9], ground: [0.09, 0.09, 0.12], road: [0.07, 0.07, 0.10], window: [1.0, 0.9, 0.55] },
    day: { sky: [0.45, 0.70, 0.92], fog: [0.55, 0.72, 0.88], light: [1.0, 0.95, 0.8], ground: [0.25, 0.30, 0.22], road: [0.16, 0.16, 0.18], window: [0.75, 0.85, 0.95] },
  };

  window.WTW = window.WTW || {};
  window.WTW.city = { DISTRICTS, STREETS, POIS, CARS, CREW, WEAPONS, RADIO, MISSIONS, PALETTES };
})();
