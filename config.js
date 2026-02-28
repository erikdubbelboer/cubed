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
  },

  waves: {
    // First wave number shown to player. Typical value: 1.
    initialWave: 1,
    // Delay after clearing a wave before upgrade menu (seconds). Typical range: 0.5-4.
    upgradeDelaySeconds: 2.0,
    // Basic enemies = base + floor(wave * multiplier). Typical base: 1-8, multiplier: 0.5-3.
    basicBaseCount: 4,
    basicPerWave: 1.5,
    // Fast enemies start on/after this wave. Typical range: 2-8.
    fastUnlockWave: 3,
    // Fast enemies = floor(wave * multiplier) after unlock. Typical range: 0.3-2.5.
    fastPerWave: 1.2,
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
    size: 12,
    // World units per cell. Typical range: 2-8.
    cellSize: 4,
    // Base floor world Y level.
    floorY: 0,
    // Path tile thickness in world units. Typical range: 0.1-1.0.
    tileHeight: 0.4,
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

    // Raised terrain block (in grid-cell coordinates).
    altitudeBlock: {
      // Start cell for raised block.
      startX: 1,
      startZ: 4,
      // Block footprint in cells. Typical range: 1-6.
      width: 2,
      depth: 3,
      // Block stack height in cubes/cells. Typical range: 1-5.
      height: 2,
    },

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

    // Hand-authored path coordinates through the grid.
    pathCells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [3, 2],
      [3, 3],
      [2, 3],
      [1, 3],
      [1, 4],
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
      [5, 5],
      [6, 5],
      [6, 6],
      [6, 7],
      [5, 7],
      [4, 7],
      [3, 7],
      [2, 7],
      [2, 8],
      [2, 9],
      [3, 9],
      [4, 9],
      [5, 9],
      [6, 9],
      [7, 9],
      [8, 9],
      [9, 9],
      [10, 9],
    ],
  },

  towers: {
    // Combat tuning.
    // Max beam reach in world units. Typical range: 4-20.
    range: 9,
    // Time between shots in seconds. Typical range: 0.1-2.0.
    fireInterval: 0.75,
    // AoE damage per hit. Typical range: 5-120.
    beamDamage: 20,
    // Beam hit radius in world units. Typical range: 0.1-2.0.
    beamHitRadius: 0.55,

    // Tower collision/build footprint.
    radius: 1.35,
    halfSize: 1.1,
    height: 2.2,
    // Min gap between towers in world units. Typical range: 0-2.
    placementGap: 0.25,
    // Starting tower cap. Typical range: 1-8.
    baseMaxTowers: 1,
    // Path half-width estimate based on cell size. Typical range: 0.35-0.55.
    pathHalfWidthCellScale: 0.47,

    // Upgrade increments.
    maxTowerUpgradeStep: 1,
    damageUpgradeAdd: 0.5,
    fireRateUpgradeMultiplier: 0.75,

    // Beam/muzzle FX geometry.
    beamRadius: 0.055,
    beamRadialSegments: 10,
    muzzleRadius: 0.1,
    muzzleSegments: 10,
    beamColor: 0x7cfff5,
    beamOpacity: 0.95,
    muzzleColor: 0xb8fffa,
    muzzleOpacity: 0.9,

    // Tower body/ring dimensions.
    bodySize: 2.2,
    edgeSize: 2.22,
    bodyCenterY: 1.1,
    ringHalfExtent: 1.16,
    ringThickness: 0.08,
    // Laser emission corners around ring anchor.
    cornerOffsets: [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ],

    // Tower material defaults.
    bodyRoughness: 0.58,
    bodyMetalness: 0.35,
    bodyEmissive: 0x02080d,
    bodyEmissiveIntensity: 0.2,
    edgeColor: 0x91d7ff,
    edgeOpaqueOpacity: 0.5,
    ringRoughness: 0.22,
    ringMetalness: 0.65,
    ringEmissiveIntensity: 0.4,
    ringLightColor: 0x7cfff5,
    ringLightDistance: 4.4,

    // Path highlight overlay.
    rangeHighlightValidColor: 0x7ffaff,
    rangeHighlightInvalidColor: 0xffa4a4,
    rangeHighlightOpacity: 0.34,
    rangeHighlightRenderOrder: 6,

    // Build preview palette.
    previewBodyColor: 0x4d6f8f,
    previewEdgeColor: 0x93ffff,
    previewRingColor: 0x73ebe2,
    previewRingGlow: 0x2ab8bd,
    previewOpacity: 0.55,
    previewInvalidBodyColor: 0xa45a5a,
    previewInvalidEdgeColor: 0xffb0b0,
    previewInvalidRingColor: 0xe08d8d,
    previewInvalidRingGlow: 0x9f3535,

    // Final placed tower palette.
    placedBodyColor: 0x445d79,
    placedRingColor: 0x87f9f0,
    placedRingGlow: 0x31bfc0,

    // Pulse behavior for beam + glow.
    pulseDuration: 0.2,
    pulseExponent: 0.35,
    activeGlowIntensity: 2.2,
    idleGlowIntensity: 0.35,
    // Beam alpha baseline/boost and cap.
    beamBaseOpacity: 0.72,
    beamPulseOpacityBoost: 0.26,
    beamPulseWidthBoost: 0.34,
    beamMaxOpacity: 0.98,
    // Muzzle flash alpha baseline/boost and cap.
    flashBaseOpacity: 0.45,
    flashPulseOpacityBoost: 0.45,
    flashMaxOpacity: 0.95,
    flashBaseScale: 0.82,
    flashPulseScaleBoost: 0.52,
    // Extra ring/light response on pulse.
    ringPulseBoost: 1.2,
    flashLightBaseIntensity: 2.6,
    flashLightPulseBoost: 2.2,

    // Line-of-sight and self-intersection tuning.
    segmentEpsilon: 1e-6,
    beamLengthEpsilon: 1e-5,
    selfBlockMinHalfSize: 0.25,
    selfBlockInset: 0.04,
    selfBlockBaseOffsetY: 0.04,
    selfBlockMinHeight: 0.4,
    selfBlockTopInset: 0.08,
    terrainLosShrinkMax: 0.08,
    terrainLosShrinkPercent: 0.08,
    terrainLosMinHalfSize: 0.2,
    terrainLosVerticalPadding: 0.02,
  },

  enemies: {
    // Shared movement speed before per-type multipliers.
    // Units/second. Typical range: 0.5-8.
    baseSpeed: 2.5,
    // Spawn cadence (seconds). Typical ranges: initial 0-2, interval 0.1-3.
    waveStartSpawnDelay: 1.0,
    spawnInterval: 1.2,
    // "Slow enemies" upgrade multiplier. <1 slows, >1 speeds up. Typical range: 0.4-1.2.
    slowUpgradeMultiplier: 0.8,
    // Fallback portal entry distance = radius * multiplier. Typical range: 1.5-4.
    portalEntryDistanceFromRadius: 2.6,
    // Portal clipping is removed after enemy crosses this radius fraction. Typical range: 0.2-1.
    portalRevealRadiusFactor: 0.45,

    // Body render style.
    bodyEmissiveIntensity: 0.45,
    bodyRoughness: 0.65,
    bodyMetalness: 0.15,
    bodyYOffset: -0.65,

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

    // Enemy archetypes.
    types: {
      basic: {
        // Hit points. Typical range: 20-600.
        health: 100,
        // Multiplier over baseSpeed. Typical range: 0.5-3.
        speedMultiplier: 1,
        // Hit radius for AoE checks. Typical range: 0.2-2.
        radius: 0.9,
        // Visual cube size in world units. Typical range: 0.5-3.
        size: 1.6,
        color: 0x4fb6ff,
        emissive: 0x102a3f,
      },
      fast: {
        health: 60,
        speedMultiplier: 1.8,
        radius: 0.6,
        size: 1.0,
        color: 0xff6f6f,
        emissive: 0x3d1010,
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
      // Camera-to-head clearance used in vertical overlap checks. Typical range: 0-0.5.
      headClearance: 0.2,
      // Tolerance to snap onto tower tops while moving vertically (units).
      towerTopSnapDown: 0.9,
      towerTopSnapUp: 0.22,
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

    weapon: {
      // Shots per second are derived from this cooldown.
      baseFireCooldown: 0.28,
      // Projectile damage before upgrades.
      projectileDamage: 34,
      // Projectile cube size in world units. Typical range: 0.03-0.4.
      projectileSize: 0.1,
      // Projectile material palette.
      projectileColor: 0x74ffd2,
      projectileEmissive: 0x13a479,
      projectileEmissiveIntensity: 0.9,
      projectileRoughness: 0.2,
      projectileMetalness: 0.12,
      // Projectile kinematics.
      projectileSpeed: 45,
      projectileLifetime: 2.4,
      projectileGravity: 0,
      // Hit radius for enemy AoE check.
      projectileHitRadius: 0.36,
      // Spawn offset from barrel in world units.
      spawnForwardOffset: 0.2,
      // Tower hitbox padding for projectile collision. Typical range: 0-0.3.
      towerHitPadding: 0.06,
      // Despawn bounds margins/limits.
      despawnMargin: 4,
      despawnMinY: -3,
      despawnMaxY: 22,
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
    },
  },
};
