# Tech Tree Migration Plan

1. Add `GAME_CONFIG.techTree` nodes with prerequisite graph rooted at `tower_gun_root`.
2. Replace random upgrade menu selection with graph-driven availability in `main.js`.
3. Render the in-game tech tree directly on `uiOverlay` canvas with node connections and availability states.
4. Add player progression nodes gated behind tower branch progression.
5. Add standalone `techtree.html` + `src/techTreeEditor.js` for visual editing and JSON import/export.
6. Validate with syntax checks and production build.
