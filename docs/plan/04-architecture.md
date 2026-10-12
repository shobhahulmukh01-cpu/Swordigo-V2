# Architecture and build council

## Decisions
- Three.js 0.186.1 for WebGL2; esbuild bundles pinned dependencies locally. No CDN runtime, remote font or service.
- Pure ESM simulation/content modules are Node-testable and have no DOM/WebGL dependency.
- `src/content` owns room topology/enemies/dialogue; `src/sim` owns authoritative gameplay; `src/render` owns meshes/animation; `src/input`, `src/ui`, `src/audio`, `src/save` remain separate.
- Preserve the entire baseline and its tests. Legacy play is available at `assets/legacy.html`; imported source remains in Git history.
- Extend the existing integrity-manifest build with a prebundle step. Do not weaken its path/secret/tamper checks.
- No multiplayer/backend. GitHub Pages project-prefix compatible relative asset URLs.
- PWA is optional, not a reason to weaken save reliability. Do not cache authenticated requests. Cache only the shipped same-origin files.

## Tools from the supplied list
Playwright for actual Chromium browser tests; Node's built-in tests for deterministic sim and release contracts. esbuild and Three are required rendering/build libraries. Large orchestration frameworks do not improve this small two-CPU environment and are not installed merely to claim usage. The supplied list is a reference, not a promise to validate/install all 200+ repositories. No unavailable listed repository is a build dependency.

## Budget and gates
Target <=6 MB new-game initial assets and 60 fps on mid-range phones. Low quality caps pixel ratio and disables shadows/extra particles. High quality uses restrained shadows. Desktop SwiftShader can validate rendering, not phone GPU speed. Real Android/iOS, physical controller, Safari, long-play balancing, trademark review and accessibility review remain release gates. Never label those untested gates as passed.

## Git workflow
Baseline main import preserved. Planning PR first, implementation PR next, merge only after checks. Pin lockfile; use npm ci in CI. No force push, token in repo or secret in logs. Recommend revoking the already chat-exposed token after publishing. Optional Lore download was canceled; use Git as source of truth.
