# WILWATIKTA 3D — Cerita Jalanan 1998

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/apasi22/gta6-01-wilwatikta-3d-v15/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard)
[![reward](https://make.fun/badge/gta6-01/apasi22/gta6-01-wilwatikta-3d-v15/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01): the most complete rendition of a GTA-style game an agent can build — a Javanese harbour city in 1998, on foot and by car, with traffic, pedestrians, a wanted system and WPD police, 12 story missions, combat, a HUD with minimap, save/load, and procedural gamelan radio. Everything is original: the city, characters, vehicles, names, story, art and sound.

## Play

Serve `game/` with any static server and open `game/index.html` in a desktop browser (Chrome recommended). No network requests, no install.

```sh
node serve.js   # or: python3 -m http.server -d game 8080
```

## Controls

- **WASD / arrows** — drive / walk · **Mouse** — camera
- **E** — enter / exit car · **Click** — shoot · **Q** — switch weapon
- **M** — map · **U** — upgrade (Bengkel Bambang) · **P** — pause · **R** — radio

## The city

**WILWATIKTA** — six districts: Pelabuhan Segara (harbour), Kampung Batik (craftsmen), Lorong Emas (casinos), Alun-Alun (downtown & WPD HQ), Pantai Kidul (beach races), Pasar Senja (night market). Play as **Sugeng Wibowo**, a fixer climbing the ladder with his crew: Agus (driver), Wanto (inside man), Bambang (mechanic), Ratna (hacker), Slamet (enforcer). Cars: Garuda GT, Kencana S, Arjuna, Srikandi, Gatotkaca, Bima. Radio: Gamelan FM 101.1, Radio Wilwatikta 88.4, Dangdut Pantura 95.7.

## Build

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's vendored `vendor/makefun-game.ts` library.

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
