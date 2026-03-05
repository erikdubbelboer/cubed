# AGENTS.md

## Project Learnings (Do Not Forget)

### Runtime and Structure
- This project is an npm + Vite browser game using native ES modules in source.
- `index.html` loads `/src/main.js`; `three` and `three/addons` resolve from npm dependencies through Vite.
- Source files live in `src/`; `src/main.js` is the orchestration layer for systems (`grid`, `player`, `enemies`, `towers`, `uiOverlay`) and owns wave state, menu state, and economy state.

### Economy System Contract
- Money is owned in `main.js` (`playerMoney`), initialized from `GAME_CONFIG.economy.startingCash`.
- Tower placement spending is delegated to `towers.js` through callbacks passed into `createTowerSystem({ getCurrentMoney, spendMoney })`.
- Enemy kill rewards are emitted from `enemies.js` only on real death (inside `applyDamage` when health reaches 0), via `onEnemyDefeated(cashReward, enemyType)`.
- Enemies that simply reach path end are removed but do not grant money.

### Tower Unlock + Purchase Rules
- Tower availability is unlock-based, not stock-based.
- `towers.js` unlock state comes from `GAME_CONFIG.economy.startingUnlockedTowers`, with a hard fallback that always ensures `laser` is unlocked.
- `GAME_CONFIG.towers.types.<type>.cost` is the purchase price per placement.
- `towerSystem.selectTower(type)` returns `false` if the tower is locked or unaffordable.
- `towerSystem.placeSelectedTower()` spends cash through `spendMoney` and cancels build mode if post-purchase money is insufficient for another of that type.

### Tower Build Teleport FX (Latest)
- Newly placed towers now run a teleport/materialization build effect before becoming combat-active.
- Activation timing contract:
  - Placement spending is immediate.
  - Cell blocking/path reroute (`notifyBlockedCellsChanged` -> enemy reroute) is immediate.
  - Tower attacking is delayed until build FX completes.
- Build FX runtime lives in `towers.js`:
  - `activeBuildEffects[]` tracks in-progress tower materialization.
  - Each tower entry has `isOperational` and `buildFxState`.
  - `updateTowerBuildEffects(deltaSeconds)` advances tower rise/scale/material fade and teleport visuals.
- Build FX config lives in `GAME_CONFIG.towers.buildFx`:
  - `enabled`
  - `durationSeconds`
  - `startScale`
  - `startYOffset`
  - `startOpacity`
  - `teleportRadiusCellScale`
  - `teleportHeightCellScale`
  - `teleportOpacity`
  - `teleportColorA`
  - `teleportColorB`
  - `teleportEdgeColor`
  - `ringMaxScale`
  - `ringThickness`
- `forcePlaceTower(...)` uses the same build FX/activation timing as normal placement.

### Tower Footprint Outline (Latest)
- AOE and Slow tower meshes now include a cube-edge footprint outline sized to the grid build cube (cell-sized), not the inner orb visuals.
- For current tuning (`grid.cellSize = 4`), `footprintOutlineInset: 0.04` yields outlines that are 98% of the grid cube per axis.
- Outline is visual-only; path blocking remains cell-based for enemies and uses existing tower obstacle data for player/tower LOS checks.
- Outline appears in both preview and placed meshes for AOE/Slow.
- Preview validity coloring also updates outline color (`previewGlow` when valid, `previewInvalidGlow` when invalid).
- Tuning keys live in `GAME_CONFIG.towers.types.aoe|slow`:
  - `footprintOutlineInset`
  - `footprintOutlineOpacity`

### Upgrade System Rules
- Upgrades are config-driven (`GAME_CONFIG.upgrades[]`), not hardcoded lists.
- Upgrade availability is gated by:
  - `maxCount` (tracked in `main.js` via `upgradeCountsById`), and
  - unlock collisions (upgrade with `grants.unlockTowerType` is filtered out if already unlocked).
- The first upgrade menu always forces `tower_aoe_unlock` when that upgrade is still available; remaining options are random from the filtered pool.
- If no upgrades are available, `showUpgradeMenu()` must gracefully exit via `finishUpgradeMenuChoice()` instead of leaving the game stuck in `MENU`.
- Menu flow supports two modes:
  - advance to next wave on choice, or
  - resume current `PLAYING/DELAY/BUILD` state (used by pause overlay flow).
- Between-wave flow now includes a build phase:
  - `PLAYING -> DELAY -> MENU -> BUILD -> PLAYING(next wave)`.
  - Build phase duration is config-driven via `GAME_CONFIG.waves.buildPhaseDurationSeconds` (default 300s).
  - Session start now enters `BUILD` before wave 1 begins.
  - `Start Wave` HUD action can skip the remaining build timer.
- New grant wiring reminder:
  - Add grant data in `GAME_CONFIG.upgrades[]`.
  - Wire grant handling in `main.js:applyUpgradeGrants()`.
  - Implement the target method on `player`, `towerSystem`, or `enemySystem`.
  - Add a matching icon in `uiOverlay.js` (or fallback icon is shown).

### Player Weapon Contract (Latest)
- Player weapon is charge-based (not cooldown-per-shot):
  - `player.weapon.baseMaxCharges` sets cap.
  - `player.weapon.startingCharges` sets initial charge count (currently starts at `1`).
  - Charges regenerate one at a time based on `currentFireCooldown`.
- Burst firing has an explicit per-shot delay while holding fire:
  - `player.weapon.burstShotDelay` is enforced through `shotDelayRemaining`.
  - This prevents multiple charges from firing on consecutive frames.
  - Fire-rate upgrades scale both recharge interval and burst delay.
- `player_weapon_charge_capacity` multiplies max charges and immediately refills to the new cap.
- Weapon charge HUD placement contract:
  - Desktop: full-length reload bar with charge dots above the bar.
  - Mobile: half-length reload bar, still anchored from the same left side so it does not drift into the weapon.
  - Mobile dot ordering must grow leftward from the first dot (toward screen-left), not into the gun mesh.
  - Dot count rebuilds when max charges change.

### Projectile Hit + Pierce Contract
- Projectile hit logic is single-target-per-contact (not radial splash):
  - It checks damageable enemy meshes and applies damage to one closest valid target at contact.
- Collision shape rule (latest, overrides older sphere assumptions):
  - Enemy contact should be validated against the cube body volume, not only center-distance to `mesh.position`.
  - Prefer `enemySystem.isPointNearEnemyMesh(enemyMesh, point, radius)` for projectile contact checks.
  - Treat `enemyMesh.userData.bodyHalfSize` as primary cube size; `hitSphereRadius` is legacy/fallback.
- Per-projectile anti-duplicate hit tracking is mandatory:
  - Each projectile stores hit enemy mesh UUIDs.
  - A projectile can never damage the same enemy twice.
- Pierce behavior:
  - `remainingPierceHits` starts from weapon pierce stat.
  - Each enemy contact consumes one pierce allowance.
  - When allowance is exhausted, projectile despawns on next enemy hit.
- Tower/environment collision still immediately despawns the projectile.
- New upgrade: `player_weapon_pierce` adds `+1` pierce via `grants.weaponPierceAdd`.

### Enemy Offset + Hitbox Alignment (Latest)
- Stacking visuals:
  - Enemies move along a centerline path state (`pathCenter` / `pathForward`) but render with a small lateral offset (`pathOffsetLateral`) so stacked cubes do not perfectly overlap.
  - Keep offset application in `setEnemyWorldPosition(...)` and movement-to-render sync in `updateEnemyTransformFromPath(...)`.
- Visual/collision alignment:
  - Enemy body center is `mesh.position + bodyCenterOffsetY`; use this for center-based distance checks and aiming.
  - Point/radius damage for towers should go through enemy-system body-aware checks (`applyDamageAtPoint` now uses cube-body distance), not naive sphere checks.
  - Cube collision extents should respect `visualRoot.scale` so hit pulses still align with what is rendered.
- Cross-system consistency:
  - `player.js`, `towers.js`, and `enemies.js` must agree on enemy hit geometry; if one side changes hit shape, update all three together.

### Laser Beam Target/Loss Behavior (Latest)
- Laser targeting should prefer damageable enemies (`getDamageableEnemies`) so dying/non-damageable enemies are dropped immediately.
- On target loss/death, laser beam visuals should fade out quickly (config: `towers.types.laser.beamFadeOutDuration`) instead of hard-disappearing.
- Laser impact placement should anchor to cube body size first (`bodyHalfSize`) to keep beam endpoint visually on/near cube surface.

### UI Data Contract
- `uiOverlay.setState(...)` expects `money` from `main.js` for cash HUD.
- Tower tray entries are affordability-driven:
  - `towerInventory[]` items should include `type`, `label`, `iconId`, `hotkey`, `affordable`, `cost`, and `remaining`.
  - In current behavior, `remaining` is effectively an affordability sentinel (`1`/`0`), not inventory stock.
- Tower tray visual contract (latest):
  - Tray buttons no longer render tower name text (icon-only + cost badge + optional hotkey badge).
  - Tower icons are centered in slot buttons and intentionally larger for quick recognition.
  - On mobile portrait, tray is a vertical column under the top-right money panel.
- If changing tray semantics, update both `towers.js:getTowerInventory()` and `uiOverlay.js:normalizeTowerInventory()` together.

### Config Expectations
- Economy tuning lives in:
  - `GAME_CONFIG.economy.startingCash`
  - `GAME_CONFIG.economy.startingUnlockedTowers`
  - `GAME_CONFIG.towers.types.<type>.cost`
  - `GAME_CONFIG.enemies.types.<enemy>.cashReward`
- Enemy reward fallback behavior exists in code: if `cashReward` is absent/non-numeric, it falls back to enemy max health.
- Mobile control tuning lives in `GAME_CONFIG.ui.mobile` (button sizes, edge margins, move-stick activation scale, look-zone padding, look sensitivity).
- Gun/HUD mobile offsets and scale tuning live in `GAME_CONFIG.player.gun.*mobile*` fields (weapon transform + reload bar offsets).

### Mobile Controls + Touch Routing (Latest, Override)
- Desktop mouse listeners are explicitly gated by `!isTouchDevice`; keep desktop and touch paths separate.
- Touch gameplay uses pointer events on `renderer.domElement` (`pointerdown/move/up/cancel`) with `passive: false`.
- Pointer routing priority on touch down:
  - upgrade menu card hit-test
  - tower tray hit-test
  - touch action buttons (`primary`, `jump`, `cancel`)
  - move-stick activation circle
  - look pointer claim (only if not in blocked UI rects / look-zone top exclusion)
- Build-mode primary behavior must not leak into weapon fire:
  - action-button tap in build mode schedules placement confirm only (`pendingBuildConfirm`)
  - suppress hold-to-fire until that touch is released (`suppressPrimaryFireUntilRelease`)
  - outside build mode, primary supports hold-to-fire.
- `resetMobileInputState()` must clear move/look pointer ids, pressed buttons, and jump hold on pause/blur/focus transitions.
- `player.setJumpHeld(bool)` is the mobile-safe jump/jetpack input path; rising edge triggers one jump, hold powers jetpack.

### Viewport Resize Handling (Latest)
- Viewport sync is centralized in `main.js` via `getViewportMetrics()` + `applyViewportMetrics()` + `scheduleViewportSync()`.
- Metrics prefer `window.visualViewport.width/height` when available, with fallback to `window.innerWidth/innerHeight`.
- Resize events are coalesced to one update per animation frame:
  - `window.resize`
  - `window.orientationchange`
  - `window.visualViewport.resize` (when supported)
- `applyViewportMetrics()` updates camera aspect/projection, renderer size, renderer pixel ratio, UI overlay size, and virtual cursor clamps.
- Mobile/touch input reset on resize is orientation-bucket based (portrait vs landscape) and only runs when touch controls are active (`isTouchDevice || forceTouchControls`), avoiding resets on minor viewport shifts (e.g. browser chrome show/hide).

### HUD + Menu Layout Contracts (Latest, Override)
- Money HUD (top-right) shows only `$amount` now; the `"Cash"` label was removed and the panel is sized tighter.
- Wave counter HUD now renders as a compact `Wave N` panel directly below the top-right money panel.
- Wave counter value contract:
  - during `BUILD`, show the queued/upcoming wave number.
  - outside `BUILD`, show the active/current wave number.
- Mobile tower tray top anchor is the stacked top-right HUD bottom (money + wave counter), not money-only bottom.
- Desktop build hint text is exactly `Q to cancel`, auto-sized to text, and anchored above the build tray.
- Touch primary action button label/icon swaps by mode:
  - normal gameplay: `Fire`
  - build mode: `Place`
- Upgrade option labels are intentionally short (config labels like `+1 tower dmg`, `x2 charges`) to avoid clipping.
- Upgrade menu in mobile portrait is top-shifted and compacted (padding/card sizes/gaps) so all options fit without overlap.
- Jetpack fuel HUD rules:
  - hide fuel HUD at 100%
  - desktop and mobile portrait use a small vertical side bar on the left side (away from the top-left build timer/FPS stack).
  - touch landscape keeps the compact horizontal top-left bar.
- Build-phase HUD rules:
  - show `Build: mm:ss` timer while `waveState === "BUILD"`.
  - show a `Start Wave` utility button during build phase to launch queued wave immediately.
  - mobile/touch build phase hides the `Pause` HUD button (only `Start Wave` is shown in utility controls).
  - build phase replaces the `1x/2x` speed button with `Start Wave`.
  - desktop `F` key starts the queued wave during build phase (outside build it still toggles speed).
- FPS counter:
  - HUD renders tiny plain `FPS <value>` text at the top-left screen edge.
  - FPS text color is high-contrast black for readability on bright/white levels.
  - FPS uses no panel/border/background and does not reserve touch-blocked UI space.

### Debug Hooks Useful for Iteration
- `window.gameDebug` exposes useful runtime helpers:
  - `addMoney(amount)`, `getMoney()`, `unlockTower(type)`
  - `placeBasicTower(x, z)`, `spawnEnemy(type)`
  - `getPathfindingPerf()` to inspect pathfinding timing/cache counters
  - `setForceTouchControls(bool)` for mobile UI testing on desktop

### Quick Validation Notes
- `node --check` is useful for fast syntax checks on edited files, but it is not a full runtime validation.
- Primary workflow checks are `npm run dev` for local runtime and `npm run build` for production bundling.

### Terrain Collision Seam + Edge Egress (Latest, Override)
- Raised terrain (`grid.heightObstacles`) now carries optional per-obstacle support metadata:
  - `topInsetFromRadius` is supported by player movement checks.
  - Terrain blocks set `topInsetFromRadius: 0` in `grid.js` so adjacent raised cells are continuously walkable with no support seam gap.
- Ramp movement support now comes through `grid.rampObstacles`:
  - Ramps expose `kind: "ramp"` + `getSurfaceYAtWorld(x, z)` for slope support checks.
  - Player uses ramp-specific side-face collision (oriented along/across checks) so ramp vertical sides block movement.
  - Ramp side collision is entry-sensitive (uses previous-frame lateral position) to prevent side tunneling while preserving smooth on-ramp traversal.
- Small ledge auto-step support:
  - `player.collision.stepUpHeight` allows stepping up short lips without jumping (terrain-style obstacles only).
  - Used to smooth ramp-to-top transitions where side collision would otherwise snag.
- Player top-support resolution is now obstacle-aware:
  - In `player.js:getSupportCameraYAtPosition(...)`, support inset uses:
    - obstacle override when `obstacle.topInsetFromRadius` is finite.
    - fallback to `player.collision.towerTopInsetFromRadius` for towers/legacy obstacles.
  - Support bounds include `player.collision.supportEdgeEpsilon` to avoid floating-point boundary misses at block edges.
- Important distinction (do not regress):
  - Top support logic and horizontal side-collision logic are separate.
  - Fixing seam support alone can still create small edge depenetration pops when stepping off terrain lips.
- Terrain step-off smoothing (latest behavior):
  - `player.collision.terrainEdgeSideCollisionGrace` defines a shallow vertical band near terrain tops where side push is ignored for terrain obstacles only.
  - Terrain-only detection is keyed from `topInsetFromRadius <= 0` (current terrain obstacle contract).
  - This keeps tower side collision behavior unchanged while removing the noticeable micro-teleport on terrain edge egress.
- Current collision tuning values in config:
  - `supportEdgeEpsilon: 1e-4`
  - `terrainEdgeSideCollisionGrace: 0.12`
  - `stepUpHeight: 0.35`
- If edge feel tuning is needed later:
  - Reduce `terrainEdgeSideCollisionGrace` for stronger edge blocking.
  - Increase it for smoother step-off with less side-pop.

### Dynamic Enemy Pathfinding + Grid Build Blocking (Latest, Override)
- Path-following via `grid.pathWaypoints` was removed.
- Level data is now sparse object JSON in config (`GAME_CONFIG.grid.levelObjects`), not ASCII rows.
  - Entry schema: `{ type, position: { x, y, z }, rotation }`
  - Supported `type`: `wall`, `spawn`, `end`, `playerSpawn`, `ramp` (`path` still allowed as visual-only legacy marker).
  - Ramp rotation contract (low->high): `0 => +Z`, `90 => +X`, `180 => -Z`, `270 => -X`.
  - Ramp anchor position is the **low-end** cell.
- `createGrid(scene)` now exposes marker-centric data:
  - `spawnCells[]`, `endCell`, `playerSpawnCell`
  - `getCellHeight(cellX, cellZ)`, `getCellSurfaceY(cellX, cellZ)`, `isCellInsideLevel(cellX, cellZ)`
  - `isCellBuildable(cellX, cellZ)` returns false for ramp cells.
  - `isRampCell(cellX, cellZ)` / `getRampCellData(cellX, cellZ)` expose ramp occupancy + connectivity metadata.
  - `rampObstacles[]` exposes ramp movement/surface helpers for player collision support.
  - `endpointObstacles[]` exposes spawn/end marker cubes as wall-like collision blocks for player movement/projectile collision only.
  - `worldToCell(...)` / `cellToWorldCenter(...)` still drive build snap + navigation.
- Collision scope contract for endpoints:
  - `main.js:getMovementObstacles()` includes `grid.endpointObstacles` so player movement collides with `spawn`/`end` like terrain blocks.
  - Keep endpoint cubes out of `grid.heightObstacles` so tower LOS/build-surface raycast behavior remains unchanged.
- Enemy movement is now navigation-graph based in `enemies.js`:
  - Cardinal neighbors only (no diagonals), so no corner cutting.
  - Height rule for normal cells: neighbors are traversable only when `getCellHeight` is exactly equal (no wall climbing).
  - Ramp rule: enemies can only enter/exit ramps from valid forward/backward ends, never from ramp sides; they must traverse full ramp cells.
  - Pathfinding performance architecture (latest):
    - A static per-cell navigation graph is prebuilt once (outgoing + incoming adjacency).
    - Blocker validation uses a single reverse distance-field rebuild from `end` (`canBlockCell` simulates one extra blocked node).
    - `canBlockCell` results are memoized per candidate cell and invalidated when blocked revision changes.
    - `setBlockedCells` commits blockers only after one reachability rebuild confirms every spawn is still connected.
  - Route variety is now two-stage:
    - Stage A (sync): route index `0` (shortest) is rebuilt immediately for each spawn.
    - Stage B (async): extra variants are built incrementally each frame under `GAME_CONFIG.enemies.pathVariantBuildBudgetMs`.
    - `GAME_CONFIG.enemies.pathCandidatePoolSize` now acts as per-spawn adaptive variant attempt budget (not Yen candidate pool size).
  - Spawn alternation is round-robin across `spawnCells` per wave (`0,1,0,1...`), reset on `startWave`.
  - Endpoint behavior: enemies despawn only once their full body is inside the end cube volume.
  - Enemies still do **not** collide with each other.
  - Enemy visuals now pitch from front/back bottom contact sampling while preserving yaw facing.
  - Ramp tilt is contact-gated (`frontOnRamp || backOnRamp`) so cubes stay flat until a body end is actually on the ramp.
  - Pitch angle uses `asin(surfaceDelta / bodyLength)` + vertical offset correction so bottoms scrape ramps cleanly through entry/exit transitions.
  - `GAME_CONFIG.enemies.hoverHeight` adds a uniform visual hover gap above both flat and ramp surfaces.
  - Enemy world Y now samples `grid.getBuildSurfaceYAtWorld(x, z)` during movement so body offset above surface stays consistent on ramps/crests and at ramp exits.
- Tower placement is grid-snapped in `towers.js`:
  - Preview and placement snap to the hovered cell center.
  - One tower per cell (`cellX/cellZ` stored on tower entries).
  - `S`/`E` cells are reserved and cannot be built on.
  - Ramp cells are non-buildable via `grid.isCellBuildable(...)`.
  - Towers can still be built on raised terrain/wall blocks.
- Path blocking contract between towers and enemies:
  - `enemySystem.canBlockCell(cellX, cellZ)` validates that **every** spawn still has a route to `E`.
  - `enemySystem.setBlockedCells(cells)` applies tower blockers and immediately reroutes active enemies.
  - `enemySystem.getBlockedRevision()` increments when blocked tower cells change.
  - `enemySystem.getRoutePreviewPaths()` exposes current per-spawn route pools for build-phase route-trail rendering.
  - `enemySystem.getPathfindingPerfStats()` exposes timing/cache counters for manual perf checks.
  - `createTowerSystem(...)` now accepts callbacks:
    - `canBlockCell`
    - `getBlockedRevision`
    - `onBlockedCellsChanged`
- Tower build preview path-checking contract (latest):
  - `towers.js` caches path-block validity by `(cellX, cellZ, blockedRevision)` to avoid repeated checks while hovering the same cell.
  - Placement click no longer performs a second redundant `isPlacementValid(...)` pass after `updatePreviewFromCamera()`.
- Reroute mode decision:
  - Active enemies reroute immediately after each blocker change (mid-run, no waiting for next cell).
- Build-phase path preview contract:
  - Route preview visuals render only during `BUILD` as small moving arrow meshes.
  - Preview uses only the single most optimal route per spawn (`routeIndex === 0` from `enemySystem.getRoutePreviewPaths()`).
  - Arrows are spaced by roughly two grid blocks and move start->end at higher speed (1.5x faster than previous arrow tune).
  - Arrows are pre-distributed across each route when build phase starts (no warmup from spawn point only).
  - Arrow height is around enemy cube center height (`enemyPathYOffset + bodyYOffset + size/2`) with slight per-arrow vertical jitter.
  - Preview refreshes when entering build phase and after tower blocker changes during build.
- Level containment:
  - Player movement is clamped to level bounds in `player.js` via `movementBounds`.
  - This acts as an infinite-height invisible wall in X/Z (jetpack cannot bypass map bounds).
  - A visual-only holodeck boundary overlay now exists in `grid.js`:
    - `grid.updateBoundaryWallVisual(playerPosition)` updates a faint transparent grid effect near boundaries.
    - Full perimeter wall grids remain static in world space; only reveal masking changes with player movement.
    - Reveal patch is circular (wall-plane circle), centered from player projection onto each wall.
    - Circle center now tracks the camera/player world position directly on each wall projection (no radius-based center clamping).
    - Only the 4 vertical perimeter walls are rendered (no ceiling/floor shell).
    - Reveal is proximity-based with config-driven fade (`GAME_CONFIG.grid.boundaryWall`); pulse controls were removed.
    - Boundary grid lines are rendered as mesh strips (not `LineSegments`) so `boundaryWall.lineThickness` visibly works across WebGL platforms.
    - Wall visibility uses shader mask uniforms; `diameter` controls circular reveal size and `patchFeather` controls edge softness.
    - Boundary wall visual height is auto-derived from terrain + player vertical mobility (jump/jetpack), not config-driven `height`.
    - Wall material ignores scene fog so `maxOpacity`/color remain readable on bright white scenes.
    - `boundaryWall.color` is config-driven; use high-contrast values against the bright floor/background.
    - Collision/containment remains clamp-only in `player.js`; boundary visuals must not change physics.
  - Enemy routing is level-cell bounded, so enemies cannot leave the level either.

### AGENTS.md

Make sure to update AGENTS.md to reflect any important changes that you need to remember for later.
Not only where things are located and how they work, but also design decissions taken during conversations that aren't directly clear from the code and comments.
