# LUMENBLADE — Second Dawn

An original, complete, compact sword-and-spell browser adventure: **22 connected rooms, seven regions, six Dawn Shards, seven guardians, four spells and two endings**. Full-viewport WebGL2 2.5D landscapes, articulated low-poly characters, responsive platforming, equipment and level choices, shrines, discoverable caches, portals and a synthesized original soundtrack.

This is a **playable release candidate**, not a claim of commercial-production certification or AAA/2026 visual parity. It is a fan-made spiritual-sequel interpretation inspired by Swordigo's genre and feel, **not an official Swordigo sequel and not affiliated with Touch Foo**. All Lumenblade story, world names, geometry and audio are original. The owner's repository name is not the in-game brand.

The complete Emberwake 1.1.0-rc.3 baseline is retained in Git history and remains playable at `assets/legacy.html`, including its original regression suites.

## Play / build

Requires a modern WebGL2 browser. No account, ads, telemetry, runtime CDN or game server. Saves are local to your browser; export a copy before clearing storage.

```sh
npm ci
npm test
npm run check:secrets
npm run build
npm start -- --port 4173 --base /Swordigo-V2/
```

Open `http://127.0.0.1:4173/Swordigo-V2/`. Node 24 is the CI version. Build bundles pinned Three.js with esbuild, then uses the integrity-manifest release builder. Only built runtime files are deployed. Offline shell installs after an online visit and service-worker activation; updates apply after old tabs close/reload. Install support varies by browser.

## Controls

| Action | Keyboard | Standard gamepad |
|---|---|---|
| Move | A/D or arrows | Left stick / D-pad |
| Jump / unlocked double jump | Space/W/up | A |
| Sword / hold-release spin | J | X |
| Aerial downward strike | S + J | Down + X |
| Cast | K | B |
| Select spell | 1–4 / Q | LT cycles |
| Unlocked dash | Shift | RB |
| Rest / speak | E | Y |
| Healing flask | H | LB |
| Map / pause | M / Escape | Back / Start |
| Character | I | Pause menu |
| Menu navigation | Tab / Enter | D-pad up/down, A confirm, B back |

Touch controls appear automatically on touch devices and support independent simultaneous pointers. In Thistlebrook, rest at the glowing shrine and speak to Sela. Follow the eastern paths; amber, blue and violet seals respond to different guardian gifts. Shrines restore health/energy/flasks and establish a checkpoint. Energy regenerates for free. Keep earned level points allocated through Character.

## Saves

Three independent versioned slots, validation, last-readable-save backup, export/import with explicit confirmation, and storage-denied warnings. A new journey asks before replacing a populated slot. Reload restores progress to the current room's safe entrance or its checkpoint, with replenished health; exact position/combat-state snapshots are intentionally not supported. Back up valuable saves outside the browser.

## Verification

```sh
npm test                       # simulation/save + original release contracts
npm run test:lumen:campaign     # input-only complete new campaign
npm run test:campaign           # preserved Emberwake proofs
npm run build
# Start the HTTP preview in another terminal first:
CHROME_BIN=/path/to/chromium npm run test:lumen:browser
CHROME_BIN=/path/to/chromium npm run test:browser -- --no-sandbox
```

`--no-sandbox` is used only for the isolated test container; do not disable a browser sandbox for normal play. New browser tests target the project-prefix HTTP URL by default (`LUMEN_URL` overrides). Legacy browser tests select the preserved legacy entry. `qa/lumen/` contains the campaign proof, completed-save fixture and browser evidence. The completed-save import and visual-fixture traversal are explicitly **not** browser campaign completion proofs. See [QA scope and remaining release gates](docs/QA.md).

## Architecture / planning

- `src/sim`: fixed-60-Hz authoritative game state, no DOM or WebGL.
- `src/content`: connected campaign, enemy types, spell and story definitions.
- `src/render`: Three.js environments, rigs, effects and resource disposal.
- `src/input`, `src/ui`, `src/audio`, `src/save`: separate device/UI/audio/storage layers.
- `docs/plan/`: sourced research, creative bible, systems, architecture, premortem and council decisions.
- `THIRD_PARTY_NOTICES.md`: rendering/build/test dependency licenses.

Parallel subagent startup failed; council roles were reviewed sequentially by one agent. Lore installation was canceled; Git/GitHub remained the source of truth. The supplied technology list is archived as a reference; irrelevant orchestration stacks were not installed.

Owner source remains UNLICENSED. Rights/trademark review, real mobile hardware, Safari, physical controllers, longer-play balance and accessibility review are required before representing this candidate as a commercial production release.
