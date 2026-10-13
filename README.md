# EMBERWAKE — The Hollow Crown

## In-place upgrade: 1.2.0-alpha.1

This branch evolves the supplied **Emberwake 1.1.0-rc.3**, rather than replacing it. The original Canvas 2D campaign, Lyra and Aster, Moonroot Vale/Cinderworks/Hollow Spire, painted realm plates, six world-runes, three guardians, mercy/rekindle endings and Echo Gauntlet remain the foundation. `Swordigo-V2` is the repository name, not an official Swordigo sequel or a claim of affiliation with Touch Foo.

**Playable upgrade alpha, not release certification.** This is an incremental continuation of the supplied engine—not a separate game. Changes include:

- Full-viewport desktop/portrait/landscape presentation using the supplied painted artwork and character renderer.
- Twelve optional platforms forming distinct canopy, service-gantry and observatory loops; existing rune/cache routes remain valid.
- Three differentiated guardian patterns: root lanes/locked charge, staged forge waves, and marked light, with shape/label/countdown warnings and recovery windows.
- A derived courier journal, optional-route directions, returning NPC testimony and restored-world details driven by existing V3 discoveries.
- Simulation-owned travel, death-terminal handling, combined-action priorities, expired-projectile authority and hardened persistence/offline update handling.

Both original endings and the Echo Gauntlet remain playable. Nested side rooms, new persistent inventory/rewards, optional heart abilities and a post-ending chapter are **not implemented**; they require the compatibility work defined in [correction decisions](docs/correction/DECISIONS.md). See [QA evidence and remaining gates](docs/QA.md). No numerical “100x” or official Swordigo affiliation is claimed.

## Build and preview

Requires Node >=22 for repository tooling (CI configuration selects Node 24) and a modern JavaScript/Canvas/Web Audio browser for play. Emberwake does not require WebGL2, an account or a runtime CDN. Commands below are instructions, not a claim they were executed for this documentation update:

```sh
npm ci
npm test
npm run check:secrets
npm run test:campaign
npm run build
npm start -- --port 4173 --base /Swordigo-V2/
```

Open `http://127.0.0.1:4173/Swordigo-V2/`. The build prepares an Emberwake-specific service worker then runs the integrity-manifest builder. Restart the preview after rebuilding; it serves a validated snapshot. Root and project-prefix boot, CSP, complete asset loading and offline/update behavior must pass the gates in [DEPLOYMENT.md](DEPLOYMENT.md). Offline availability depends on successful complete installation; do not assume a first-ever offline visit works.

## Controls

Defaults from the existing Emberwake controls; primary keyboard bindings can be remapped in Settings.

| Action | Keyboard | Standard gamepad |
| --- | --- | --- |
| Move | A/D; left/right arrows | Stick / D-pad |
| Jump / double jump | Space; W/up arrow | A |
| Sword combo | J (X shortcut) | X |
| Lumen bolt | K (C shortcut) | Y |
| Dash | Shift (L shortcut) | B |
| Precision guard | Q | LT |
| Healing flask | R | LB |
| Interact / rest | E | RB |
| Drop through platform | S/down arrow | See in-game prompts |
| Map / journal / pause / fullscreen | M / I / Escape / F | See in-game menu prompts |

Touch controls retain simultaneous-pointer input. Double jump, dash and guard are existing moves, not newly earned Lumenblade abilities. Physical controller and real-device qualification remain pending.

## V3 journeys and recovery

The original version-3 journey format and `EW_STORY_V3` / `EW_RUSH_V3` storage keys remain. Each has one rolling `.backup`; preferences, bindings and milestones retain separate existing keys. No V4 migration or three-slot Lumenblade serializer is introduced.

Export valuable journeys outside the browser. Imports/replacements require the existing confirmation and stale-read safeguards. Resume reconstructs at a checkpoint with replenished resources, not an exact position/fight snapshot. A rolling backup is one prior valid write, not a permanent archive. Storage-denied play must warn; an in-memory journey is not a confirmed durable save. Clearing browser data can lose local progress. Cache repair must never clear journey storage.

## Architecture and archived experiment

- `assets/scripts/worlds.js`, `engine.js`, `core-v11.js`: original campaign, simulation, V3 validation and hardening.
- `client.js`, `controls-v11.js`, `journey-v11.js`, `realm-v11.js`: Canvas/audio/UI, input, persistence/recovery and realm presentation.
- `encounters-v12.js`, `journal-v12.js`, `presentation-v12.js` and `assets/styles/sequel-v12.css`: guardian, derived-story and in-place presentation extensions.
- `docs/correction/`: independent council reviews, decisions and [tool evidence](docs/correction/TOOL-EVIDENCE.md).

Lumenblade is an **optional archived experiment** at `assets/lumen-preview.html`, with source under `src/` and separate `test:lumen:*` commands. It is not the default game, an Emberwake save migration or evidence that Emberwake passes. Three.js/esbuild/Playwright remain development dependencies in the current manifest; Emberwake's primary build does not bundle the Lumenblade runtime. `build:prototype` rewrites prototype outputs and `sw.js`; do not run it as part of an Emberwake release.

Owner content remains UNLICENSED pending owner rights/license decisions. See `ASSETS.md` and `THIRD_PARTY_NOTICES.md`; asset provenance, trademark, accessibility, device and human-play reviews are not certified by this alpha.
