import TECH_TREE_DATA from "./techtree.json";

export const GAME_CONFIG = {
  scene: {
    // Camera field-of-view in degrees. Typical range: 60-95.
    cameraFov: 75,
    // Near/far clip planes. Typical ranges: near 0.05-0.5, far 150-1000.
    cameraNear: 0.1,
    cameraFar: 500,
    // Spawn camera offset from the back map edge (world units). Typical range: 1-8.
    cameraStartOffsetZ: 3,

    // Renderer quality cap for high-DPI displays. Typical range: 1-2.5.
    maxPixelRatio: 2,
    // Global scene exposure. Typical range: 0.8-1.5.
    toneMappingExposure: 1.15,

    // Scene background/fog color. Any hex color.
    backgroundColor: 0xffffff,
    fogColor: 0xffffff,
    // Fog start/end distance in world units. Typical ranges: near 10-40, far 60-220.
    fogNear: 20,
    fogFar: 120,
  },

  lights: {
    ambient: {
      // Flat fill light intensity. Typical range: 0.2-1.3.
      intensity: 0.95,
      color: 0xffffff,
    },
    hemisphere: {
      // Sky/ground hemispheric light. Typical intensity range: 0.1-1.0.
      intensity: 0.55,
      skyColor: 0xffffff,
      groundColor: 0xffffff,
    },
    directional: {
      // Main sun key light intensity. Typical range: 0.2-1.5.
      intensity: 0.85,
      color: 0xffffff,
      // Sun position in world units.
      positionX: 18,
      positionY: 28,
      positionZ: 14,
      // Shadow map resolution. Typical values: 1024, 2048, 4096.
      shadowMapSize: 2048,
      // Directional shadow camera volume in world units.
      shadowNear: 1,
      shadowFar: 120,
      shadowLeft: -46,
      shadowRight: 46,
      shadowTop: 46,
      shadowBottom: -46,
      // Shadow acne fix. Typical range: 0.0-0.03.
      shadowNormalBias: 0.015,
    },
  },

  ui: {
    // Virtual thumbstick radius in pixels. Typical range: 30-80.
    movePadRadiusPx: 45,
    // Number of upgrade options shown per wave-clear menu. Typical range: 2-5.
    upgradesShown: 3,
    mobile: {
      // Primary action button size in pixels.
      actionButtonSizePx: 96,
      // Jump/jetpack button size in pixels.
      jumpButtonSizePx: 78,
      // Build-cancel button size in pixels.
      cancelButtonSizePx: 56,
      // Distance from screen edges in pixels.
      edgeMarginPx: 18,
      // Bottom offset for controls in pixels.
      controlBottomOffsetPx: 26,
      // Additional upward offset for the move joystick center in pixels.
      movePadVerticalOffsetPx: 104,
      // Multiplier applied to move stick activation radius.
      moveStickActivationScale: 1.45,
      // Top padding for look input zone in pixels.
      lookZoneTopPaddingPx: 108,
      // Multiplier applied to touch look deltas.
      lookSensitivityScale: 1,
      // Distance from look-touch start (px) to reach max acceleration.
      lookAccelerationDistancePx: 140,
      // Max multiplier for look sensitivity at far drag distances.
      lookAccelerationMaxMultiplier: 3.25,
      // Curve exponent for look acceleration (higher => slower early ramp).
      lookAccelerationExponent: 1.35,
    },
  },

  audio: {
    // Master gain at the midpoint of the menu volume slider.
    // Slider mapping: 0% => 0 gain, 50% => baseMasterVolume, 100% => baseMasterVolume * 2.
    baseMasterVolume: 1,
  },

  economy: {
    // Starting cash at game start (BTD6-style opening economy).
    startingCash: 50,
    // Tower types available before any unlock upgrades are chosen.
    startingUnlockedTowers: ["gun"],
    // Kill-based XP leveling for upgrade picks.
    leveling: {
      // XP granted for each enemy kill.
      xpPerKill: 1,
      // XP required for the first level-up.
      baseXpToLevel: 17.1,
      // Multiplier applied to each subsequent XP requirement.
      levelXpGrowthMultiplier: 1.1,
    },
    // Enemy reward pickups (physical cash cubes).
    pickups: {
      // Horizontal pickup radius around the player (world units).
      basePickupRange: 3,
      // Additive pickup radius granted by the pickup-range upgrade.
      pickupRangeUpgradeAdd: 1,
      // Cube visual size in world units.
      cubeSize: 0.26,
      // Initial spawn scatter in the XZ plane.
      spawnSpread: 0.45,
      // Vertical spawn lift above the enemy defeat position.
      spawnHeightOffset: 0.38,
      // Launch tuning for drop burst motion.
      randomHorizontalSpeed: 1.05,
      spawnUpwardSpeed: 1.5,
      // Basic drop physics.
      gravity: 16,
      horizontalDamping: 0.9,
      // Homing speed toward player feet once a cube is in pickup range.
      homingSpeed: 9,
      // Cube is only collected once within this distance from player feet.
      pickupArrivalDistance: 0.18,
      // Proximity required to auto-merge equal-value settled cubes.
      mergeRadius: 1.5,
      // Speed used when merge candidates move toward their shared combine center.
      mergeConvergeSpeed: 3,
      // Merge candidates are considered "arrived" within this center distance.
      mergeConvergeArrivalDistance: 0.06,
      // Denomination tint map (darker for larger values).
      valueColors: {
        value1: 0x61ff8e,
        value10: 0x39c35b,
        value100: 0x1f8637,
      },
      valueEmissives: {
        value1: 0x1f6d37,
        value10: 0x16512a,
        value100: 0x10371e,
      },
      emissiveIntensity: 0.62,
      roughness: 0.38,
      metalness: 0.08,
    },
  },

  techTree: TECH_TREE_DATA,
  waves: {
    // First wave number shown to player. Typical value: 1.
    initialWave: 1,
    // Delay after clearing a wave before build phase starts (seconds). Typical range: 0.5-4.
    upgradeDelaySeconds: 2.0,
    // Build phase duration after each wave clear (seconds). Typical range: 30-600.
    buildPhaseDurationSeconds: 300,
    // Behavior once the configured rounds are exhausted.
    // "stay_on_last": keep replaying the final configured round.
    afterLastRound: "stay_on_last",
    // Explicit round definitions. Each round is an array of spawn segments.
    // Segment shape: { type, count, start, end } where time is in seconds.
    rounds: [
      [
        { type: "red", count: 20, start: 0.00, end: 17.51 },
      ],
      [
        { type: "red", count: 35, start: 0.00, end: 19.00 },
      ],
      [
        { type: "red", count: 10, start: 0.00, end: 5.10 },
        { type: "blue", count: 5, start: 5.70, end: 7.95 },
        { type: "red", count: 15, start: 9.71, end: 16.71 },
      ],
      [
        { type: "red", count: 25, start: 0.00, end: 12.00 },
        { type: "blue", count: 18, start: 7.90, end: 10.40 },
        { type: "red", count: 10, start: 14.51, end: 17.31 },
      ],
      [
        { type: "blue", count: 12, start: 0.00, end: 5.14 },
        { type: "red", count: 5, start: 5.70, end: 7.98 },
        { type: "blue", count: 15, start: 8.60, end: 16.50 },
      ],
      [
        { type: "green", count: 4, start: 0.00, end: 1.71 },
        { type: "red", count: 15, start: 5.33, end: 10.33 },
        { type: "blue", count: 15, start: 10.80, end: 18.70 },
      ],
      [
        { type: "blue", count: 10, start: 0.00, end: 5.14 },
        { type: "green", count: 5, start: 5.70, end: 10.65 },
        { type: "red", count: 20, start: 11.81, end: 22.65 },
        { type: "blue", count: 10, start: 22.81, end: 26.80 },
      ],
      [
        { type: "blue", count: 20, start: 0.00, end: 10.84 },
        { type: "green", count: 2, start: 11.42, end: 11.99 },
        { type: "red", count: 10, start: 14.03, end: 16.00 },
        { type: "green", count: 12, start: 18.27, end: 28.87 },
      ],
      [
        { type: "green", count: 30, start: 0.00, end: 18.95 },
      ],
      [
        { type: "blue", count: 60, start: 0.00, end: 35.00 },
        { type: "blue", count: 20, start: 35.00, end: 44.00 },
        { type: "blue", count: 22, start: 44.00, end: 47.99 },
      ],
      [
        { type: "yellow", count: 3, start: 0.00, end: 1.00 },
        { type: "green", count: 12, start: 4.47, end: 10.75 },
        { type: "blue", count: 10, start: 10.87, end: 14.67 },
        { type: "red", count: 10, start: 14.59, end: 19.16 },
      ],
      [
        { type: "green", count: 10, start: 0.00, end: 5.13 },
        { type: "blue", count: 15, start: 5.70, end: 11.77 },
        { type: "yellow", count: 5, start: 14.27, end: 17.39 },
      ],
      [
        { type: "blue", count: 50, start: 0.00, end: 30.00 },
        { type: "green", count: 23, start: 2.21, end: 32.21 },
      ],
      [
        { type: "red", count: 18, start: 0.00, end: 9.71 },
        { type: "blue", count: 5, start: 2.85, end: 3.97 },
        { type: "green", count: 5, start: 5.71, end: 6.83 },
        { type: "yellow", count: 4, start: 8.56, end: 9.51 },
        { type: "red", count: 31, start: 9.50, end: 26.63 },
        { type: "blue", count: 10, start: 15.96, end: 17.34 },
        { type: "green", count: 5, start: 19.84, end: 21.22 },
        { type: "yellow", count: 5, start: 23.71, end: 25.26 },
      ],
      [
        { type: "red", count: 20, start: 0.00, end: 25.00 },
        { type: "blue", count: 15, start: 2.78, end: 22.78 },
        { type: "green", count: 12, start: 5.68, end: 20.68 },
        { type: "yellow", count: 10, start: 8.87, end: 20.87 },
        { type: "pink", count: 5, start: 17.55, end: 20.55 },
      ],
      [
        { type: "green", count: 20, start: 0.00, end: 10.85 },
        { type: "green", count: 20, start: 0.20, end: 11.05 },
        { type: "yellow", count: 8, start: 14.59, end: 16.02 },
      ],
      [
        { type: "r-yellow", count: 12, start: 0.00, end: 5.00 },
      ],
      [
        { type: "green", count: 60, start: 0.00, end: 25.00 },
        { type: "green", count: 20, start: 25.00, end: 26.82 },
      ],
      [
        { type: "pink", count: 15, start: 0.00, end: 8.46 },
        { type: "black", count: 15, start: 9.96, end: 19.02 },
        { type: "pink", count: 15, start: 20.52, end: 28.25 },
      ],
      [
        { type: "yellow", count: 25, start: 0.00, end: 15.00 },
        { type: "white", count: 10, start: 18.37, end: 23.37 },
      ],
      [
        { type: "yellow", count: 25, start: 0.00, end: 10.54 },
        { type: "pink", count: 20, start: 12.44, end: 20.09 },
        { type: "black", count: 8, start: 21.42, end: 27.26 },
      ],
      [
        { type: "yellow", count: 35, start: 0.00, end: 13.20 },
        { type: "yellow", count: 30, start: 15.66, end: 21.00 },
        { type: "black", count: 2, start: 23.80, end: 25.00 },
      ],
      [
        { type: "black", count: 10, start: 0.00, end: 1.00 },
        { type: "pink", count: 20, start: 2.22, end: 4.42 },
        { type: "black", count: 20, start: 5.64, end: 9.32 },
        { type: "pink", count: 40, start: 10.79, end: 15.05 },
        { type: "black", count: 10, start: 17.60, end: 18.62 },
        { type: "pink", count: 20, start: 19.86, end: 22.06 },
        { type: "black", count: 20, start: 23.29, end: 26.97 },
        { type: "pink", count: 20, start: 28.44, end: 30.35 },
      ],
      [
        { type: "white", count: 20, start: 0.00, end: 29.05 },
        { type: "purple", count: 10, start: 1.43, end: 29.05 },
      ],
      [
        { type: "zebra", count: 12, start: 0.00, end: 1.20 },
        { type: "pink", count: 20, start: 2.65, end: 4.85 },
        { type: "black", count: 20, start: 6.32, end: 9.27 },
        { type: "pink", count: 20, start: 11.47, end: 13.42 },
        { type: "black", count: 20, start: 15.37, end: 18.32 },
      ],
      [
        { type: "lead", count: 15, start: 0.00, end: 6.00 },
        { type: "black", count: 10, start: 7.90, end: 11.17 },
        { type: "lead", count: 7, start: 11.20, end: 19.69 },
      ],
      [
        { type: "zebra", count: 8, start: 0.00, end: 7.00 },
        { type: "lead", count: 8, start: 9.32, end: 15.32 },
      ],
      [
        { type: "lead", count: 6, start: 0.00, end: 5.00 },
      ],
      [
        { type: "zebra", count: 15, start: 0.00, end: 13.45 },
        { type: "zebra", count: 15, start: 15.09, end: 26.00 },
        { type: "rainbow", count: 10, start: 27.19, end: 35.09 },
      ],
      [
        { type: "black", count: 10, start: 0.00, end: 18.42 },
        { type: "black", count: 10, start: 0.00, end: 20.42 },
        { type: "black", count: 10, start: 3.52, end: 24.42 },
        { type: "black", count: 10, start: 4.52, end: 24.42 },
        { type: "zebra", count: 10, start: 7.00, end: 25.42 },
        { type: "zebra", count: 10, start: 9.00, end: 25.42 },
        { type: "rainbow", count: 10, start: 14.00, end: 25.42 },
      ],
      [
        { type: "zebra", count: 25, start: 0.00, end: 9.42 },
        { type: "rainbow", count: 15, start: 10.72, end: 22.44 },
      ],
      [
        { type: "rainbow", count: 10, start: 0.00, end: 17.00 },
        { type: "ceramic", count: 5, start: 21.00, end: 25.00 },
      ],
      [
        { type: "ceramic", count: 10, start: 0.00, end: 30.00 },
        { type: "ceramic", count: 10, start: 2.00, end: 28.00 },
      ],
      [
        { type: "lead", count: 25, start: 0.00, end: 22.70 },
        { type: "zebra", count: 10, start: 1.48, end: 7.57 },
        { type: "purple", count: 20, start: 16.98, end: 22.70 },
      ],
      [
        { type: "zebra", count: 30, start: 0.00, end: 30.00 },
        { type: "ceramic", count: 10, start: 2.00, end: 28.00 },
      ],
      [
        { type: "ceramic", count: 10, start: 0.00, end: 30.00 },
        { type: "rainbow", count: 10, start: 1.00, end: 29.00 },
        { type: "zebra", count: 10, start: 2.00, end: 28.00 },
      ],
      [
        { type: "rainbow", count: 20, start: 0.00, end: 28.00 },
        { type: "ceramic", count: 10, start: 2.00, end: 26.00 },
      ],
      [
        { type: "ceramic", count: 10, start: 0.00, end: 28.00 },
        { type: "zebra", count: 20, start: 1.00, end: 27.00 },
        { type: "purple", count: 20, start: 2.00, end: 26.00 },
      ],
      [
        { type: "ceramic", count: 15, start: 0.00, end: 26.00 },
        { type: "rainbow", count: 15, start: 2.00, end: 24.00 },
      ],
    ],
  },

  portal: {
    // Portal width/height as multiplier of the largest enemy size. Typical range: 1.1-2.2.
    faceSizeFromLargestEnemy: 1.5,
    // Portal depth in world units. Typical range: 0.05-0.6.
    thickness: 0.22,
    // Vertical offset from path surface in world units. Typical range: 0-0.2.
    yOffset: 0.02,
    // Spawn entry distance as portal-size multiplier. Typical range: 0.4-1.8.
    entryDistanceFromFaceSize: 0.8,

    // Portal shader colors/opacity.
    colorA: 0x3dcfff,
    colorB: 0x2042ff,
    edgeColor: 0x7bf7ff,
    // Overall portal alpha multiplier. Typical range: 0.3-0.95.
    opacity: 0.78,
  },

  grid: {
    // Number of cells per side. Typical range: 8-24.
    size: 36,
    // World units per cell. Typical range: 2-8.
    cellSize: 4,
    // Base floor world Y level.
    floorY: 0,
    // Path tile thickness in world units. Typical range: 0.1-1.0.
    tileHeight: 0.2,
    // Enemy center height above path surface. Typical range: 0.2-1.4.
    enemyPathYOffset: 0.65,
    // Player eye height returned from grid. Typical range: 1.4-2.1.
    eyeHeight: 1.7,

    // Platform under the grid.
    platformHeight: 1.0,
    // Extra width/depth around grid in world units. Typical range: 0-6.
    platformPadding: 2,
    // How far platform sits below floor surface. Typical range: 0-0.5.
    platformSink: 0.08,

    // Infinite floor plane size in world units. Typical range: 500-5000.
    farFloorSize: 2400,

    // Path tile scale within each cell (1.0 fills cell). Typical range: 0.7-1.0.
    pathTileScale: 0.94,
    // Move bounds inset from edge as cell-size fraction. Typical range: 0.3-0.6.
    moveInsetCellScale: 0.5,
    // Visual-only holodeck-style boundary wall reveal.
    boundaryWall: {
      // Master toggle for boundary wall rendering.
      enabled: true,
      // Grid line color.
      color: 0x3dcfff,
      // Maximum wall opacity when very close to a boundary.
      maxOpacity: 0.12,
      // Start fading in when player is within this many world units of a boundary.
      revealDistance: 5,
      // Distance where the wall reaches max opacity.
      fullOpacityDistance: 1,
      // Diameter of the circular reveal patch on each wall.
      diameter: 10,
      // Soft edge width of the circular reveal in world units.
      patchFeather: 0.9,
      // Distance between grid lines.
      lineSpacing: 0.9,
      // Thickness of each hologrid line in world units.
      lineThickness: 0.05,
      // Small inward shift from level bounds to avoid z-fighting with edges.
      inset: 0.02,
      // Vertical offset from floor.
      baseYOffset: 0,
    },

    // Extra non-path empty space outside the configured level bounds.
    // Number of outside rings in cell units. Set 0 to disable.
    outerEmptySpaceRings: 1,

    // Vertical wall-climb path tiles.
    wallPathTileSizeScale: 0.76,
    wallPathTileThicknessScale: 0.5,
    // How far climb detour points sit away from wall. Typical range: 0.4-2.2.
    wallClimbPathOffset: 1.25,
    // Visual offset for wall-path tiles from wall face. Typical range: 0.2-1.0.
    wallPathVisualOffsetScale: 0.65,

    // Raised cube shading variation.
    checkerLightnessOffset: 0.03,
    altitudeHue: 0.57,
    altitudeSaturation: 0.22,
    altitudeBaseLightness: 0.3,
    altitudePerLevelLightnessStep: 0.05,

    // Far floor material.
    farFloorColor: 0xffffff,
    farFloorEmissive: 0xffffff,
    farFloorEmissiveIntensity: 0.24,
    farFloorRoughness: 1.0,
    farFloorMetalness: 0.0,

    // Platform material.
    platformColor: 0xffffff,
    platformEmissive: 0xffffff,
    platformEmissiveIntensity: 0.2,
    platformRoughness: 0.98,
    platformMetalness: 0.0,

    // Raised block cube material.
    altitudeEmissiveScale: 0.28,
    altitudeEmissiveIntensity: 0.18,
    altitudeRoughness: 0.72,
    altitudeMetalness: 0.12,

    // Path tile materials.
    pathTileColor: 0xe9d5ab,
    pathTileRoughness: 0.64,
    pathTileMetalness: 0.08,
    wallPathTileColor: 0xe9d5ab,
    wallPathTileEmissive: 0x6b4c27,
    wallPathTileEmissiveIntensity: 0.16,
    wallPathTileRoughness: 0.66,
    wallPathTileMetalness: 0.05,

    // Precision tolerances used in path/raycast math.
    pathHeightEpsilon: 1e-5,
    rayParallelEpsilon: 1e-6,

    // Sparse level layout entries.
    // Schema: { type, position: { x, y, z }, rotation }
    // type: wall | spawn | end | playerSpawn | ramp
    // rotation for ramps is low->high direction:
    // 0 => +Z, 90 => +X, 180 => -Z, 270 => -X.
    levelObjects: [
      {"type":"wall","position":{"x":16,"y":0,"z":12},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":12},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":13},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":13},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":14},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":14},"rotation":0},
      {"type":"wall","position":{"x":14,"y":0,"z":15},"rotation":0},
      {"type":"wall","position":{"x":15,"y":0,"z":15},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":15},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":15},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":18},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":19},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":22},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":22},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":23},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":23},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":11},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":10},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":9},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":8},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":7},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":5},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":6},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":4},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":3},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":2},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":1},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":0},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":20},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":24},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":25},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":26},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":27},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":28},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":29},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":30},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":31},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":32},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":33},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":34},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":35},"rotation":0},
      {"type":"wall","position":{"x":17,"y":1,"z":19},"rotation":0},
      {"type":"wall","position":{"x":17,"y":1,"z":22},"rotation":0},
      {"type":"wall","position":{"x":16,"y":1,"z":22},"rotation":0},
      {"type":"wall","position":{"x":17,"y":1,"z":23},"rotation":0},
      {"type":"wall","position":{"x":16,"y":1,"z":23},"rotation":0},
      {"type":"wall","position":{"x":17,"y":3,"z":22},"rotation":0},
      {"type":"wall","position":{"x":16,"y":3,"z":22},"rotation":0},
      {"type":"wall","position":{"x":17,"y":3,"z":23},"rotation":0},
      {"type":"wall","position":{"x":16,"y":3,"z":23},"rotation":0},
      {"type":"wall","position":{"x":16,"y":4,"z":22},"rotation":0},
      {"type":"wall","position":{"x":16,"y":4,"z":23},"rotation":0},
      {"type":"wall","position":{"x":17,"y":4,"z":22},"rotation":0},
      {"type":"wall","position":{"x":17,"y":4,"z":23},"rotation":0},
      {"type":"wall","position":{"x":17,"y":0,"z":17},"rotation":0},
      {"type":"wall","position":{"x":16,"y":0,"z":19},"rotation":0},
      {"type":"wall","position":{"x":15,"y":0,"z":19},"rotation":0},
      {"type":"wall","position":{"x":18,"y":0,"z":19},"rotation":0},
      {"type":"wall","position":{"x":19,"y":0,"z":19},"rotation":0},
      {"type":"wall","position":{"x":16,"y":1,"z":19},"rotation":0},
      {"type":"wall","position":{"x":18,"y":1,"z":19},"rotation":0},
      {"type":"playerSpawn","position":{"x":12,"y":0,"z":17},"rotation":90},
      {"type":"end","position":{"x":15,"y":0,"z":13},"rotation":0},
      {"type":"spawn","position":{"x":21,"y":0,"z":15},"rotation":0},
      {"type":"spawn","position":{"x":21,"y":0,"z":21},"rotation":0},
      {"type":"ramp","position":{"x":15,"y":0,"z":18},"rotation":90},
      {"type":"ramp","position":{"x":19,"y":0,"z":18},"rotation":270},
      {"type":"ramp","position":{"x":15,"y":0,"z":20},"rotation":90},
      {"type":"ramp","position":{"x":19,"y":0,"z":20},"rotation":270},
      {"type":"ramp","position":{"x":19,"y":0,"z":17},"rotation":270},
      {"type":"ramp","position":{"x":15,"y":0,"z":17},"rotation":90},
    ],
  },

  towers: {
    // Shared tower placement and progression tuning.
    // Min gap between towers in world units. Typical range: 0-2.
    placementGap: 0.25,
    // Path half-width estimate based on cell size. Typical range: 0.35-0.55.
    pathHalfWidthCellScale: 0.47,

    // Upgrade increments.
    maxTowerUpgradeStep: 1,
    damageUpgradeAdd: 0.5,
    fireRateUpgradeMultiplier: 0.75,

    // Line-of-sight and self-intersection tuning.
    segmentEpsilon: 1e-6,
    selfBlockMinHalfSize: 0.25,
    selfBlockInset: 0.04,
    selfBlockBaseOffsetY: 0.04,
    selfBlockMinHeight: 0.4,
    selfBlockTopInset: 0.08,
    terrainLosShrinkMax: 0.08,
    terrainLosShrinkPercent: 0.08,
    terrainLosMinHalfSize: 0.2,
    terrainLosVerticalPadding: 0.02,

    // Tower placement teleport/materialization FX.
    buildFx: {
      enabled: true,
      durationSeconds: 0.75,
      startScale: 0.72,
      startYOffset: -0.45,
      startOpacity: 0,
      teleportRadiusCellScale: 0.44,
      teleportHeightCellScale: 1.45,
      teleportOpacity: 0.82,
      teleportColorA: 0x38cfff,
      teleportColorB: 0x1f46ff,
      teleportEdgeColor: 0x92faff,
      ringMaxScale: 1.85,
      ringThickness: 0.16,
    },

    types: {
      gun: {
        // Cash required to place one gun tower. Typical range: 150-350.
        cost: 40,

        // Gun combat tuning.
        // Max firing reach in world units. Typical range: 4-20.
        range: 9,
        // Time between shots in seconds. Typical range: 0.1-2.0.
        fireInterval: 0.48,
        // Projectile hit damage. Typical range: 0.5-8.
        projectileDamage: 1,
        // Projectile speed in world units per second.
        projectileSpeed: 24,
        // Projectile max life in seconds.
        projectileLifetime: 1.15,
        // Projectile cube size in world units.
        projectileSize: 0.22,
        // Projectile hit radius in world units.
        projectileHitRadius: 0.32,
        // Turret yaw tracking speed in radians/sec.
        turretTurnSpeed: 9.5,

        // Gun collision/build footprint.
        // Footprint is fixed to 1x2 cells (depth on +Z/-Z axis) and non-rotatable.
        footprintCellsX: 1,
        footprintCellsZ: 2,
        footprintInset: 0.06,
        // Used for LOS and movement/projectile obstacle volume checks.
        halfSizeX: 1.96,
        halfSizeZ: 3.92,
        height: 2.2,

        // Tower body/turret dimensions.
        baseHeight: 1.0,
        turretHeight: 0.75,
        turretWidth: 1.25,
        barrelLength: 1.25,
        barrelHeight: 0.18,
        barrelWidth: 0.22,
        muzzleOffsetY: 0.18,
        muzzleOffsetForward: 0.95,

        // Tower material defaults.
        baseRoughness: 0.56,
        baseMetalness: 0.32,
        turretRoughness: 0.46,
        turretMetalness: 0.38,
        baseEmissive: 0x071120,
        baseEmissiveIntensity: 0.25,
        turretEmissive: 0x0f2c52,
        turretEmissiveIntensity: 0.32,
        muzzleFlashDuration: 0.08,
        muzzleFlashColor: 0x9fdcff,
        muzzleFlashOpacity: 0.92,
        muzzleFlashSize: 0.26,

        // Path highlight overlay.
        rangeHighlightValidColor: 0x7ffaff,
        rangeHighlightInvalidColor: 0xffa4a4,
        rangeHighlightOpacity: 0.34,
        rangeHighlightRenderOrder: 6,

        // Build preview palette.
        previewBaseColor: 0x4d6f8f,
        previewTurretColor: 0x6ea6d9,
        previewGlow: 0x78d9ff,
        previewOpacity: 0.55,
        previewInvalidBaseColor: 0xa45a5a,
        previewInvalidTurretColor: 0xd88f8f,
        previewInvalidGlow: 0x9f3535,

        // Final placed tower palette.
        placedBaseColor: 0x445d79,
        placedTurretColor: 0x81b4e3,
        placedGlow: 0xff7a38,

        // Projectile visual defaults.
        projectileColor: 0xff8a4f,
        projectileEmissive: 0xff5a1f,
        projectileEmissiveIntensity: 0.72,
        projectileRoughness: 0.25,
        projectileMetalness: 0.18,
      },

      block: {
        // Cash required to place one build block.
        cost: 10,

        // Block collision/build footprint.
        halfSize: 1.6,
        height: 4,
        roughness: 0.76,
        metalness: 0.12,

        // Block build preview + placed palette.
        previewColor: 0x69818a,
        previewAccentColor: 0xb9d7df,
        previewGlow: 0x7ad6de,
        previewOpacity: 0.55,
        previewInvalidColor: 0xb67373,
        previewInvalidAccentColor: 0xd09b9b,
        previewInvalidGlow: 0xa04343,
        placedColor: 0x4a5e67,
        placedAccentColor: 0xa5cad3,
        placedGlow: 0x5bc4d0,
        placedOpacity: 1,
        // Final material opacity for owned blocks after the transparency tech.
        transparencyUpgradeOpacity: 0.5,
      },

      aoe: {
        // Cash required to place one AOE tower. Typical range: 350-700.
        cost: 50,

        // AOE combat tuning.
        // Short-range pulse radius in world units. Typical range: 2.5-8.
        range: 6,
        // Time to emit one pulse while charging (seconds). Typical range: 0.4-2.5.
        pulseInterval: 1.12,
        // Damage dealt once per enemy per pulse. Typical range: 8-120.
        pulseDamage: 1,
        // Duration of pulse expansion from 0 -> max range (seconds). Typical range: 0.1-0.6.
        pulseDuration: 0.24,
        // Thickness used for wavefront hit tests in world units. Typical range: 0.05-0.5.
        shellThickness: 0.16,

        // AOE collision/build footprint.
        radius: 1.1,
        halfSize: 0.9,
        height: 2.0,

        // AOE visuals.
        // Uniform scale for AOE mesh visuals (core/spikes/aura + hover height), while
        // keeping build footprint/path blocking as the same 1x1 cell.
        // Typical range: 0.5-2.5.
        visualScale: 2,
        coreRadius: 0.82,
        auraRadius: 1.02,
        auraOpacity: 0.38,
        // Inset and alpha for the cube-edge footprint outline (visual only).
        footprintOutlineInset: 0.04,
        footprintOutlineOpacity: 0.42,
        hoverBaseY: 1.05,
        bobAmplitude: 0.14,
        bobFrequency: 3.4,
        idleColor: 0x5d9bc8,
        chargeColor: 0xb9fff4,
        emissiveIdle: 0x1a2d45,
        emissiveCharge: 0x4ce5d8,
        lightDistance: 4.4,

        // AOE build preview + placed palette.
        previewColor: 0x79aed6,
        previewGlow: 0x6ce7df,
        previewOpacity: 0.55,
        previewInvalidColor: 0xb67373,
        previewInvalidGlow: 0xa04343,
        placedColor: 0x5386ad,
        placedGlow: 0x58ccff,

        // AOE pulse visual.
        pulseColor: 0x67d8ff,
        pulseOpacity: 0.74,
        pulseSegments: 20,
      },

      slow: {
        // Cash required to place one Slow tower.
        cost: 30,

        // Slow combat tuning.
        range: 7.5,
        fireInterval: 1.1,
        slowMultiplier: 0.6,
        slowDuration: 1.6,
        fieldDuration: 1.6,

        // Slow collision/build footprint.
        radius: 1.2,
        halfSize: 0.95,
        height: 2.1,

        // Slow visuals.
        // Uniform scale for the slow tower mesh visuals (prism + rings).
        // Does not change build-cell occupancy.
        // Typical range: 0.8-2.2.
        visualScale: 1.9,
        bodyRadius: 0.62,
        bodyHeight: 1.45,
        // Inset and alpha for the cube-edge footprint outline (visual only).
        footprintOutlineInset: 0.04,
        footprintOutlineOpacity: 0.42,
        hoverBaseY: 1.05,
        bobAmplitude: 0.14,
        bobFrequency: 3.4,
        lightDistance: 4.4,
        bodyColor: 0x8ec9ff,
        bodyEmissive: 0x2a78b8,
        emissiveIntensity: 0.85,
        bandColor: 0xcde9ff,
        bandOpacity: 0.66,
        fieldColor: 0x72c9ff,
        fieldOpacity: 0.42,

        // Slow build preview + placed palette.
        previewColor: 0x9ad2ff,
        previewGlow: 0x64b9ff,
        previewOpacity: 0.55,
        previewInvalidColor: 0xb67373,
        previewInvalidGlow: 0xa04343,
        placedColor: 0x7ab8f0,
        placedGlow: 0x9d6bff,
      },

      laserSniper: {
        cost: 65,
        range: 10000,
        fireInterval: 2.0,
        beamDamage: 6,
        beamDuration: 0.09,
        beamWidth: 0.12,
        halfSize: 0.95,
        height: 2.4,
        baseRadius: 0.9,
        spineHeight: 1.35,
        dishRadius: 0.56,
        previewColor: 0x8fb4ff,
        previewGlow: 0x7ec6ff,
        previewOpacity: 0.55,
        previewInvalidColor: 0xb67373,
        previewInvalidGlow: 0xa04343,
        placedColor: 0x6f93d8,
        placedGlow: 0x87ff5d,
        beamColor: 0x9cff66,
        beamOpacity: 0.88,
      },

      mortar: {
        cost: 70,
        range: 12,
        fireInterval: 1.9,
        splashDamage: 2.5,
        splashRadius: 2.4,
        projectileSize: 0.34,
        projectileLaunchSpeed: 11,
        projectileLaunchArcY: 33,
        projectileGravity: 60,
        projectileLifetime: 2.5,
        halfSize: 1.05,
        height: 2.15,
        baseRadius: 0.98,
        barrelLength: 1.2,
        barrelRadius: 0.2,
        previewColor: 0xb4c4d9,
        previewGlow: 0xa9d2ff,
        previewOpacity: 0.55,
        previewInvalidColor: 0xb67373,
        previewInvalidGlow: 0xa04343,
        placedColor: 0x8ea2bb,
        placedGlow: 0x5bf5df,
        projectileColor: 0x83f4e6,
        projectileEmissive: 0x1f8f84,
        explosionColor: 0x89fff5,
        explosionOpacity: 0.72,
        explosionDuration: 0.22,
      },

      tesla: {
        cost: 60,
        range: 8,
        fireInterval: 0.95,
        damage: 1.2,
        chainCount: 3,
        chainRange: 6,
        boltDuration: 0.15,
        halfSize: 0.92,
        height: 2.25,
        coreHeight: 1.42,
        ringRadius: 0.56,
        previewColor: 0xc9d4ff,
        previewGlow: 0x8db6ff,
        previewOpacity: 0.55,
        previewInvalidColor: 0xb67373,
        previewInvalidGlow: 0xa04343,
        placedColor: 0x8c9fda,
        placedGlow: 0xff61c5,
        boltColor: 0xff79d0,
        boltOpacity: 0.9,
      },

      spikes: {
        cost: 35,
        range: 2,
        cycleInterval: 1.25,
        activeDuration: 0.32,
        spikeDamage: 1.4,
        hitRadius: 1.7,
        halfSize: 0.98,
        height: 0.8,
        spikeCount: 12,
        spikeHeight: 0.95,
        previewColor: 0xb9c4c9,
        previewGlow: 0x9fd7d0,
        previewOpacity: 0.55,
        previewInvalidColor: 0xb67373,
        previewInvalidGlow: 0xa04343,
        placedColor: 0x8f9ea6,
        placedGlow: 0x84c5b5,
      },

      plasma: {
        cost: 55,
        range: 4,
        fireInterval: 0.4,
        damage: 1,
        halfSizeX: 1.35,
        halfSizeZ: 1.35,
        height: 2.65,
        bodyWidth: 2.6,
        bodyHeight: 2.6,
        bodyDepth: 0.22,
        flameLength: 3.1,
        flameWidth: 3.45,
        flameHeight: 3.45,
        flameOpacity: 0.62,
        particleCount: 20,
        particleSize: 0.085,
        previewColor: 0x8ee8ff,
        previewGlow: 0x80f0ff,
        previewOpacity: 0.55,
        previewInvalidColor: 0xb67373,
        previewInvalidGlow: 0xa04343,
        placedColor: 0x74c6d9,
        placedGlow: 0x69ddff,
      },

      buff: {
        cost: 80,
        range: 6.5,
        damageBonusPerTower: 0.25,
        fireRateBonusPerTower: 0.2,
        halfSize: 0.9,
        height: 2.1,
        coreRadius: 0.68,
        haloRadius: 0.98,
        haloOpacity: 0.42,
        auraOpacity: 0.17,
        auraPulseSpeed: 2,
        previewColor: 0xffdd99,
        previewGlow: 0xffce72,
        previewOpacity: 0.55,
        previewInvalidColor: 0xb67373,
        previewInvalidGlow: 0xa04343,
        placedColor: 0xd7b772,
        placedGlow: 0xffd978,
        auraColor: 0xffd17a,
      },
    },
  },

  enemies: {
    // Shared movement speed before per-type multipliers.
    // Units/second. Typical range: 0.5-8.
    baseSpeed: 2.5,
    // Global scalar applied to all enemy archetype health before mode-specific scaling.
    // Typical range: 0.1-10.
    healthMultiplier: 2,
    // Spawn cadence (seconds). Typical ranges: initial 0-2, interval 0.1-3.
    waveStartSpawnDelay: 1.0,
    spawnInterval: 1.2,
    // "Slow enemies" upgrade multiplier. <1 slows, >1 speeds up. Typical range: 0.4-1.2.
    slowUpgradeMultiplier: 0.8,
    // Number of route variants cached per spawn.
    pathVariantCount: 6,
    // Max number of adaptive variant build attempts per spawn after route-0 is ready.
    pathCandidatePoolSize: 24,
    // Penalizes overlap when selecting route variants (higher => more diverse).
    pathOverlapPenalty: 0.45,
    // Max main-thread milliseconds spent per frame building extra route variants.
    pathVariantBuildBudgetMs: 1.0,
    // Fallback portal entry distance = radius * multiplier. Typical range: 1.5-4.
    portalEntryDistanceFromRadius: 2.6,
    // Portal clipping is removed after enemy crosses this radius fraction. Typical range: 0.2-1.
    portalRevealRadiusFactor: 0.45,

    // Body render style.
    bodyEmissiveIntensity: 0.45,
    bodyRoughness: 0.65,
    bodyMetalness: 0.15,
    bodyYOffset: -0.65,
    // Visual hover gap above terrain/ramp surfaces.
    hoverHeight: 0.4,

    // Brief pulse response when taking damage.
    hitPulseDuration: 0.2,
    hitPulseExponent: 0.4,
    hitPulseEmissiveBoost: 1.6,
    hitPulseScaleBoost: 0.11,
    hitPulseColor: 0xd2fff9,
    hitPulseColorMix: 0.5,
    hitPulseFrequency: 32,
    hitPulseStackAdd: 0.85,

    // Health bar layout.
    healthBarBgMinWidth: 1.2,
    healthBarWidthFromEnemySize: 1.5,
    healthBarFgMinWidth: 1.0,
    healthBarFgInset: 0.2,
    healthBarBgHeight: 0.28,
    healthBarFgHeight: 0.16,
    healthBarBgColor: 0x1f2835,
    healthBarBgOpacity: 0.9,
    healthBarFgColor: 0x6bf4ad,
    healthBarBgRenderOrder: 20,
    healthBarFgRenderOrder: 21,
    healthBarFgOffsetZ: 0.01,
    healthBarYOffsetFromEnemySize: 0.75,
    healthBarYOffset: 0.35,
    healthBarMinScaleX: 0.001,
    healthBarHueAtFullHealth: 0.28,
    healthBarSaturation: 0.85,
    healthBarLightness: 0.55,

    // Death dissolve FX.
    dissolveDuration: 0.65,
    dissolveEdgeWidth: 0.16,
    dissolveNoiseScale: 5.4,
    dissolveEdgeColor: 0xff7f2a,
    dissolveEmissiveMix: 0.6,
    dissolveSinkSpeed: 0.35,
    dissolveRollSpeed: 0.9,

    // Movement/facing precision tolerances.
    directionEpsilon: 1e-6,
    lookAtEpsilon: 1e-4,
    // Small lateral spread so stacked enemies do not perfectly overlap.
    // Applied perpendicular to the current path direction.
    stackOffsetMin: 0.06,
    stackOffsetMax: 0.18,

    // Enemy archetypes.
    types: {
      // cashReward defaults to health/layers for BTD6-like per-pop cash pacing.
      red: {
        health: 1,
        cashReward: 1,
        speedMultiplier: 1.0,
        radius: 0.7,
        size: 1.05,
        color: 0xff3a30,
        emissive: 0x4a0e0b,
      },
      blue: {
        health: 2,
        cashReward: 2,
        speedMultiplier: 1.4,
        radius: 0.72,
        size: 1.08,
        color: 0x2f66ff,
        emissive: 0x10214a,
      },
      green: {
        health: 3,
        cashReward: 3,
        speedMultiplier: 1.8,
        radius: 0.75,
        size: 1.12,
        color: 0x2fbf3b,
        emissive: 0x103b15,
      },
      yellow: {
        health: 4,
        cashReward: 4,
        speedMultiplier: 3.2,
        radius: 0.78,
        size: 1.15,
        color: 0xffdf38,
        emissive: 0x4a3f0a,
      },
      pink: {
        health: 5,
        cashReward: 5,
        speedMultiplier: 3.5,
        radius: 0.8,
        size: 1.18,
        color: 0xff76cf,
        emissive: 0x4a173a,
      },
      black: {
        health: 11,
        cashReward: 11,
        speedMultiplier: 1.8,
        radius: 0.86,
        size: 1.24,
        color: 0x18181b,
        emissive: 0x2f2f34,
      },
      white: {
        health: 11,
        cashReward: 11,
        speedMultiplier: 2.0,
        radius: 0.86,
        size: 1.24,
        color: 0xf5f7ff,
        emissive: 0x38445a,
      },
      purple: {
        health: 11,
        cashReward: 11,
        speedMultiplier: 3.0,
        radius: 0.86,
        size: 1.24,
        color: 0x8b5cf6,
        emissive: 0x261349,
      },
      lead: {
        health: 23,
        cashReward: 23,
        speedMultiplier: 1.0,
        radius: 0.9,
        size: 1.3,
        color: 0x6e7681,
        emissive: 0x2e3239,
      },
      zebra: {
        health: 23,
        cashReward: 23,
        speedMultiplier: 1.8,
        radius: 0.92,
        size: 1.33,
        color: 0xd4dae2,
        emissive: 0x2a2e36,
      },
      rainbow: {
        health: 47,
        cashReward: 47,
        speedMultiplier: 2.2,
        radius: 0.97,
        size: 1.42,
        color: 0xff8f2e,
        emissive: 0x4a2910,
      },
      ceramic: {
        health: 104,
        cashReward: 104,
        speedMultiplier: 2.8,
        radius: 1.02,
        size: 1.52,
        color: 0xa86b32,
        emissive: 0x3f2410,
      },
    },
  },

  player: {
    look: {
      // Max look pitch from horizontal (radians). Typical range: PI/2 - [0.01..0.2].
      maxPitch: (Math.PI * 0.5) - 0.05,
      // Ignore tiny pointer jitter below this pixel delta. Typical range: 0-2.
      lookNoiseThresholdPx: 1,
      // Touch look sensitivity (radians per input pixel). Typical range: 0.001-0.006.
      touchSensitivity: 0.0022,
    },

    controls: {
      // Pointer-lock turn speed multiplier. Typical range: 0.2-1.5.
      pointerSpeed: 0.75,
      // Retry pointer-lock for this long after unlock (ms). Typical range: 0-500.
      lockRetryWindowMs: 250,
    },

    movement: {
      // Horizontal movement speed in units/second. Typical range: 2-12.
      moveSpeed: 6,
      // Sprint multiplier. Typical range: 1.1-3.
      sprintMultiplier: 1.6,
      // Downward acceleration units/second^2. Typical range: 5-40.
      gravity: 24,
      // Jump impulse velocity. Typical range: 3-18.
      jumpVelocity: 10.8,
      // Stick deadzone for virtual controls. Typical range: 0-0.2.
      virtualDeadzone: 0.01,
      // Grounded tolerance in world units. Typical range: 0-0.02.
      groundedEpsilon: 0.001,
      // Collision solving passes. Typical range: 1-4.
      collisionPasses: 2,
    },

    collision: {
      // Horizontal player collision radius in world units. Typical range: 0.2-1.2.
      radius: 0.55,
      // Small-value threshold to avoid divide-by-zero in collision solve.
      minDistanceSq: 1e-6,
      // Extra tolerance for top support checks to avoid seam misses on boundaries.
      supportEdgeEpsilon: 1e-4,
      // Ignore terrain side push for this depth below the top edge to smooth step-off.
      terrainEdgeSideCollisionGrace: 0.12,
      // Camera-to-head clearance used in vertical overlap checks. Typical range: 0-0.5.
      headClearance: 0.2,
      // Tolerance to snap onto tower tops while moving vertically (units).
      towerTopSnapDown: 0.9,
      towerTopSnapUp: 0.22,
      // Max ledge height (units) that can be stepped up without jumping.
      stepUpHeight: 0.35,
      // Shrink top landing area by radius * ratio to avoid edge snagging. Typical range: 0-0.4.
      towerTopInsetFromRadius: 0.1,
    },

    jetpack: {
      // Total fuel seconds when held continuously. Typical range: 1-12.
      maxFuel: 4.5,
      // Fuel consumed per second while active. Typical range: 0.2-4.
      burnRate: 1,
      // Recharge rates per second. Typical range: 0.05-2.
      groundRechargeRate: 0.42,
      airRechargeRate: 0.14,
      // Upward acceleration and max rise speed.
      acceleration: 32,
      maxRiseSpeed: 8.2,
    },

    upgrades: {
      // Additive player damage buff per upgrade.
      damageUpgradeAdd: 0.5,
      // Multiplicative fire interval factor (<1 is faster).
      fireRateUpgradeMultiplier: 0.75,
    },

    weaponSelection: {
      options: [
        { type: "machineGun", label: "Machine Gun", iconId: "weapon_machine_gun" },
        { type: "sniper", label: "Sniper", iconId: "weapon_sniper" },
        { type: "bazooka", label: "Bazooka", iconId: "weapon_bazooka" },
      ],
    },

    weapons: {
      machineGun: {
        damage: 0.2,
        fireInterval: 0.09,
        projectileSize: 0.08,
        projectileSpeed: 50,
        projectileLifetime: 1.5,
        projectileHitRadius: 0.22,
        projectileGravity: 0,
      },
      sniper: {
        damage: 6,
        fireInterval: 1.25,
        maxRange: 140,
        zoomFov: 34,
        zoomInSpeed: 10,
        zoomOutSpeed: 8,
        beamDuration: 0.08,
        beamWidth: 0.09,
      },
      bazooka: {
        damage: 5,
        fireInterval: 1.8,
        projectileSize: 0.22,
        projectileSpeed: 24,
        projectileLifetime: 2.2,
        projectileHitRadius: 0.22,
        projectileGravity: 0,
        splashRadius: 2.7,
        explosionDuration: 0.22,
      },
    },

    weapon: {
      // Shared projectile material palette.
      projectileColor: 0x74ffd2,
      projectileEmissive: 0x13a479,
      projectileEmissiveIntensity: 0.9,
      projectileRoughness: 0.2,
      projectileMetalness: 0.12,
      // Spawn offset from barrel in world units.
      spawnForwardOffset: 0.2,
      // Tower hitbox padding for projectile collision. Typical range: 0-0.3.
      towerHitPadding: 0.06,
    },

    projectileImpact: {
      // Impact FX lifespan in seconds.
      duration: 0.16,
      flashColor: 0x9bffe0,
      flashOpacity: 0.9,
      ringColor: 0xb8fff2,
      ringOpacity: 0.82,
      // Impact mesh sizes.
      flashRadius: 0.06,
      flashSegments: 8,
      ringInnerRadius: 0.02,
      ringOuterRadius: 0.08,
      ringSegments: 16,
      ringYOffset: 0.01,
      // Animation scaling over impact lifetime.
      flashExpand: 1.2,
      ringExpand: 2.0,
    },

    gun: {
      // Handheld weapon placement relative to camera.
      offsetX: 0.35,
      offsetY: -0.3,
      offsetZ: -0.42,
      // Mobile-first gun offsets. Portrait is tuned to keep reload bar/charges visible.
      mobilePortraitOffsetX: 0.26,
      mobilePortraitOffsetY: -0.34,
      mobilePortraitOffsetZ: -0.56,
      mobilePortraitScale: 0.78,
      mobileLandscapeOffsetX: 0.3,
      mobileLandscapeOffsetY: -0.29,
      mobileLandscapeOffsetZ: -0.48,
      mobileLandscapeScale: 0.9,
      barrelOffsetZ: -0.17,
      lightOffsetZ: -0.14,

      // Body/core dimensions in world units.
      bodySize: 0.24,
      coreSize: 0.12,
      flashSize: 0.22,
      edgeSize: 0.25,
      coreOffsetZ: -0.1,

      // Material palette.
      bodyColor: 0x2f3d4c,
      bodyEmissive: 0x06121c,
      bodyEmissiveIntensity: 0.35,
      bodyRoughness: 0.35,
      bodyMetalness: 0.65,

      coreColor: 0x74ffd2,
      coreEmissive: 0x1abf93,
      coreEmissiveIntensity: 0.65,
      coreRoughness: 0.22,
      coreMetalness: 0.25,
      coreOpacity: 0.8,

      flashColor: 0x8efff6,
      edgeColor: 0xa6f8ff,
      edgeOpacity: 0.8,
      lightColor: 0x8efff6,
      lightDistance: 1.8,

      // Flash animation.
      flashDuration: 0.4,
      flashExponent: 0.3,
      bodyFlashBoost: 2.2,
      coreFlashBoost: 5.8,
      coreOpacityBoost: 0.2,
      coreScaleBoost: 0.34,
      flashOpacityBoost: 0.26,
      flashScaleBoost: 0.22,
      lightFlashBoost: 6.8,

      // 3D reload meter mounted directly on the gun.
      // Desktop offset keeps reload meter above the weapon.
      reloadBarOffsetX: 0,
      reloadBarOffsetY: 0.11,
      reloadBarOffsetZ: -0.03,
      // Mobile offsets place reload meter on the left side of the weapon.
      mobilePortraitReloadBarOffsetX: -0.1,
      mobilePortraitReloadBarOffsetY: 0.07,
      mobilePortraitReloadBarOffsetZ: 0.01,
      mobileLandscapeReloadBarOffsetX: -0.09,
      mobileLandscapeReloadBarOffsetY: 0.085,
      mobileLandscapeReloadBarOffsetZ: -0.005,
      reloadBarWidth: 0.17,
      reloadBarHeight: 0.03,
      reloadBarDepth: 0.03,
      reloadBarPadding: 0.004,
      reloadBarTrackColor: 0x0f1822,
      reloadBarTrackOpacity: 0.9,
      reloadBarReloadColor: 0x2a4f57,
      reloadBarReadyColor: 0x8dffd8,
      reloadBarEmissiveIntensity: 0.65,

      // Weapon sway while moving (walk + air movement).
      bobFrequency: 2.8,
      bobSpeedForMax: 6.8,
      bobSmoothing: 10,
      bobXAmplitude: 0.01,
      bobYAmplitude: 0.02,
      bobPitchAmplitude: 0.035,
      bobRollAmplitude: 0.05,
    },
  },
};
