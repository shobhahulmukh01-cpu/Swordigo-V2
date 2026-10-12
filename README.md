# EMBERWAKE: The Hollow Crown — 1.1.0-rc.3

An original browser sword-and-spell platform adventure, developed from the existing Emberwake project for the requested Swordigo-V2 repository. It is not an official Swordigo product. Three realms and guardians, six rune sigils, timed guard/projectile reflection, double jump, spells, dash, shrines, portable journey saves, two story endings and an unlockable gauntlet. Keyboard, touch and standard-layout gamepad support.

## Run locally

The full source export includes `index.html`, `assets/`, all scripts, tests, docs and workflow files. No npm install or third-party runtime dependencies are required. Node >=22 is declared; CI is configured for Node 24. This session executed Node 26.10.0, not Node 22/24.

1. `npm test`
2. `npm run check:secrets`
3. `npm run build`
4. `npm start`
5. Open the loopback URL printed by the server (default port 4173).

To check a project-prefix path: `npm start -- --port 4173 --base /Swordigo-V2/`.

## Reproduce the game verification

`npm run test:campaign` runs engine/save/combat regressions, input-only story and gauntlet completions at fixed 60/120 Hz simulation steps, exact input replays, deterministic repeat, and additional Adventure/Veteran/ending cases. Those rates are simulation steps, not a measured rendering-FPS or human-play-time guarantee. Proofs and summaries are written to `qa/`.

Then run `npm run test:browser` with Python 3.9+ and a local Chromium/Google Chrome executable (`CHROME_BIN` may select it). The browser harness uses actual keyboard/multi-touch, file input/download, reload and Canvas. Controller injection is a standards-shaped test fixture, not physical-controller certification. It consumes the earned completed-save proof from the campaign suite for ending-restore tests; run the campaign first. When no `--base-url` is given, CDP Fetch serves the local exported bytes, not a production TCP server. `--base-url` targets a separately running HTTP server. Only in an isolated, trusted test container with blocked Chromium namespaces may you explicitly add `--no-sandbox`; it is not the default.

`qa/` contains the captured evidence, scope and limitations. A completed-save UI test restores an input-earned campaign final state, rather than changing live player/enemy stats.

## Build and server contracts

Build is a byte-exact copy of `index.html` and `assets/`, with sorted path/size/SHA-256 inventory. It manages only `sourceRoot/dist`; unknown/tampered output is preserved and refused, not silently deleted. Inspect and move it aside manually. `node scripts/build.mjs [sourceRoot]` accepts a source root.

`requestHandler(rootDir, basePath='/')` synchronously returns an HTTP handler; `rootDir` must be a validated built `dist`. GET/HEAD, conditional 304 and project-prefix routes are supported. No SPA fallback or directory listing. The local preview CLI binds only 127.0.0.1 and accepts `--port`, `--base`, `--root`. Source/server caps and refusals are described in SECURITY.md.

## Release status

This is a tested release candidate, not a claimed cross-device commercial-production certification. See DEPLOYMENT.md for authenticated owner publishing and remaining release gates. The code was not pushed, no PR was created, and the workflows/public deployment were not executed in this session. Rights and license decisions remain with the owner; no license has been invented.
