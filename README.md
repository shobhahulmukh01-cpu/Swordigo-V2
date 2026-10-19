# EMBERWAKE — The Hollow Crown

## In-place upgrade: 1.2.0-alpha.3

This branch evolves the supplied **Emberwake 1.1.0-rc.3**, rather than replacing it. The original Canvas 2D campaign, Lyra and Aster, Moonroot Vale/Cinderworks/Hollow Spire, painted realm plates, six world-runes, three guardians, mercy/rekindle endings and Echo Gauntlet remain the foundation. `Swordigo-V2` is the repository name, not an official Swordigo sequel or a claim of affiliation with Touch Foo.

**Playable upgrade alpha, not release certification.** This is an incremental continuation of the supplied engine—not a separate game. Changes include:

- Full-viewport desktop/portrait/landscape presentation using the supplied painted artwork and character renderer.
- Twelve optional platforms forming distinct canopy, service-gantry and observatory loops; existing rune/cache routes remain valid.
- Three differentiated guardian patterns: root lanes/locked charge, staged forge waves, and marked light, with shape/label/countdown warnings and recovery windows.
- A derived courier journal, optional-route directions, returning NPC testimony and restored-world details driven by existing V3 discoveries.
- Simulation-owned travel, death-terminal handling, combined-action priorities, expired-projectile authority and hardened persistence/offline update handling.

Both original endings and the Echo Gauntlet remain playable. **The First Unwritten Day** adds four optional rooms—Millpond Irrigation Terraces, Cooling Gallery, Rootcellar Charter Desk and Star Archive—through five bidirectional links. Water Remembers and Summer Coal pay 60/80 embers once per saved journey; Charter/testimony remain optional. Rootbinding, marked-vent Cinderseal and same-scene Dawnstep derive from existing restored-heart facts; basic campaign moves remain available. After either original ending, choose **Continue deliveries** explicitly; the opt-in Archivist Engine and chapter completion never rewrite that ending or its recorded time/deaths.

**Alpha.3 followthrough:** NPCs and Archive records distinguish actual deliveries, read testimony and published Charter, with separate responses to both endings. Optional **Ask Aster for advice** follows the current journey. Valves, vents, desks and archive consoles have functional silhouettes; the Rootcellar is enclosed and the Archivist is a nonhuman device. Committed repairs leave visible planter/hearth/Charter details. Portrait boss information now replaces the objective panel rather than covering Lyra and floor warnings. Saved post-ending continuation returns to its certified chapter anchor; revisiting roads no longer overwrites the original checkpoint or automatically refills vitals.

This is a bounded chapter alpha, not the council's larger ten-room proposal or a measured 20–35-minute expansion. See [chapter acceptance and limitations](docs/correction/CHAPTER-ACCEPTANCE.md). See [QA evidence and remaining gates](docs/QA.md). No numerical “100x” or official Swordigo affiliation is claimed.

## Build and preview

Requires Node >=22 for repository tooling (CI configuration selects Node 24) and a modern JavaScript/Canvas/Web Audio browser for play. Emberwake does not require WebGL2, an account or a runtime CDN. Commands below are instructions, not a claim they were executed for this documentation update:

```sh
npm ci
npm test
npm run check:secrets
npm run test:campaign
npm run test:chapter:earned
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

## V3 compatibility, V4 journeys and recovery

Validated story V3 saves migrate deterministically to an `EW_STORY_V4` single-key envelope containing current journey, one previous journey and a revision. `EW_STORY_V3` and its `.backup` are **frozen fallback bytes**, not actively mirrored; chapter rewards never leak into a legacy save without their delivery facts. Rush remains `EW_RUSH_V3` with its existing backup. Preferences/bindings/browser milestones remain separate.

Exports contain the portable campaign+chapter payload, not an exact fight cache or recursive backups. Imports accept legacy story/rush V3 or the portable chapter payload; unsupported future envelopes fail visibly. Resume restores at a certified room anchor or original beacon. Completed saves open their ending first, never silently start the epilogue. Explicit **Continue deliveries** restores the saved certified chapter anchor when present; a first continuation begins in Moonroot. Door crossings preserve health/magic/flasks and encounter state; only explicit recovery/rest restores resources. A failed delivery write grants neither the reward nor its delivery fact, permitting retry/export. A fresh story can still start when browser storage is completely unavailable, with a visible export warning; no existing live journey may be replaced through that path, and delivery rewards still require a successful save.

Export valuable journeys outside the browser. Imports/new-run replacement first preserve the current journey, validate an isolated Game, write the target, then swap. Conflicting stored revisions fail closed. A corrupt current with a validated previous can be restored only after confirmation bound to the observed stored bytes; cancellation overwrites nothing. A previous save is one rolling recovery point, not an archive. Local JSON backups can intentionally rewind progress and are not anti-cheat provenance. Single-key storage provides atomic visibility, not guaranteed disk durability or a cross-tab compare-and-swap lock. Clearing browser data loses saves; cache repair must never clear journey storage.

## Architecture and archived experiment

- `assets/scripts/worlds.js`, `engine.js`, `core-v11.js`: original campaign, simulation, V3 validation and hardening.
- `client.js`, `controls-v11.js`, `journey-v11.js`, `realm-v11.js`: Canvas/audio/UI, input, persistence/recovery and realm presentation.
- `chapter-data.js`, `chapter-save.js`, `chapter-runtime.js`: optional authored scenes, bounded facts/rewards, V4 envelope and Game-owned scene authority/cache.
- `encounters-v12.js`, `journal-v12.js`, `presentation-v12.js` and `assets/styles/sequel-v12.css`: guardian, derived-story and in-place presentation extensions.
- `docs/correction/`: independent council reviews, decisions and [tool evidence](docs/correction/TOOL-EVIDENCE.md).

Lumenblade is an **optional archived experiment** at `assets/lumen-preview.html`, with source under `src/` and separate `test:lumen:*` commands. It is not the default game, an Emberwake save migration or evidence that Emberwake passes. Three.js/esbuild/Playwright remain development dependencies in the current manifest; Emberwake's primary build does not bundle the Lumenblade runtime. `build:prototype` rewrites prototype outputs and `sw.js`; do not run it as part of an Emberwake release.

Owner content remains UNLICENSED pending owner rights/license decisions. See `ASSETS.md` and `THIRD_PARTY_NOTICES.md`; asset provenance, trademark, accessibility, device and human-play reviews are not certified by this alpha.
