import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";

const PLAYER_CONFIG = GAME_CONFIG.player;
const MAX_PITCH = PLAYER_CONFIG.look.maxPitch;
const PLAYER_COLLISION_RADIUS = PLAYER_CONFIG.collision.radius;
const MIN_COLLISION_DISTANCE_SQ = PLAYER_CONFIG.collision.minDistanceSq;
const PLAYER_HEAD_CLEARANCE = PLAYER_CONFIG.collision.headClearance;
const TOWER_TOP_SNAP_DOWN = PLAYER_CONFIG.collision.towerTopSnapDown;
const TOWER_TOP_SNAP_UP = PLAYER_CONFIG.collision.towerTopSnapUp;
const STEP_UP_HEIGHT = PLAYER_CONFIG.collision.stepUpHeight ?? 0;
const SUPPORT_EDGE_EPSILON = PLAYER_CONFIG.collision.supportEdgeEpsilon ?? 0;
const TERRAIN_EDGE_SIDE_COLLISION_GRACE = PLAYER_CONFIG.collision.terrainEdgeSideCollisionGrace ?? 0;

export function createPlayer({
  scene,
  camera,
  domElement,
  eyeHeight,
  getMovementObstacles,
  movementBounds = null,
  getSurfaceYAtWorld = null,
  onPickupRangeTechGrant = null,
  onWeaponVisualEvent = null,
  onMovementAudioEvent = null,
}) {
  const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const controls = new PointerLockControls(camera, domElement);
  controls.pointerSpeed = PLAYER_CONFIG.controls.pointerSpeed;
  let lockRequestPending = false;
  let lockRetryPending = false;
  let lastUnlockTime = -Infinity;

  camera.rotation.order = "YXZ";

  // Hand-held cube weapon
  const gunGroup = new THREE.Group();
  const gunBodyMaterial = new THREE.MeshStandardMaterial({
    color: PLAYER_CONFIG.gun.bodyColor,
    emissive: PLAYER_CONFIG.gun.bodyEmissive,
    emissiveIntensity: PLAYER_CONFIG.gun.bodyEmissiveIntensity,
    roughness: PLAYER_CONFIG.gun.bodyRoughness,
    metalness: PLAYER_CONFIG.gun.bodyMetalness,
  });
  const gunCoreMaterial = new THREE.MeshStandardMaterial({
    color: PLAYER_CONFIG.gun.coreColor,
    emissive: PLAYER_CONFIG.gun.coreEmissive,
    emissiveIntensity: PLAYER_CONFIG.gun.coreEmissiveIntensity,
    roughness: PLAYER_CONFIG.gun.coreRoughness,
    metalness: PLAYER_CONFIG.gun.coreMetalness,
    transparent: true,
    opacity: PLAYER_CONFIG.gun.coreOpacity,
  });

  const gunBody = new THREE.Mesh(
    new THREE.BoxGeometry(PLAYER_CONFIG.gun.bodySize, PLAYER_CONFIG.gun.bodySize, PLAYER_CONFIG.gun.bodySize),
    gunBodyMaterial
  );
  gunBody.castShadow = true;
  gunBody.receiveShadow = true;
  gunGroup.add(gunBody);

  const gunCore = new THREE.Mesh(
    new THREE.BoxGeometry(PLAYER_CONFIG.gun.coreSize, PLAYER_CONFIG.gun.coreSize, PLAYER_CONFIG.gun.coreSize),
    gunCoreMaterial
  );
  gunCore.position.set(0, 0, PLAYER_CONFIG.gun.coreOffsetZ);
  gunGroup.add(gunCore);

  const gunFlashMaterial = new THREE.MeshBasicMaterial({
    color: PLAYER_CONFIG.gun.flashColor,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  gunFlashMaterial.toneMapped = false;
  const gunFlashMesh = new THREE.Mesh(
    new THREE.BoxGeometry(PLAYER_CONFIG.gun.flashSize, PLAYER_CONFIG.gun.flashSize, PLAYER_CONFIG.gun.flashSize),
    gunFlashMaterial
  );
  gunFlashMesh.position.copy(gunCore.position);
  gunGroup.add(gunFlashMesh);

  const gunEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(PLAYER_CONFIG.gun.edgeSize, PLAYER_CONFIG.gun.edgeSize, PLAYER_CONFIG.gun.edgeSize)),
    new THREE.LineBasicMaterial({
      color: PLAYER_CONFIG.gun.edgeColor,
      transparent: true,
      opacity: PLAYER_CONFIG.gun.edgeOpacity,
    })
  );
  gunGroup.add(gunEdges);

  const gunBarrel = new THREE.Object3D();
  gunBarrel.position.set(0, 0, PLAYER_CONFIG.gun.barrelOffsetZ);
  gunGroup.add(gunBarrel);

  const gunLight = new THREE.PointLight(PLAYER_CONFIG.gun.lightColor, 0, PLAYER_CONFIG.gun.lightDistance);
  gunLight.position.set(0, 0, PLAYER_CONFIG.gun.lightOffsetZ);
  gunGroup.add(gunLight);

  const reloadBarWidth = PLAYER_CONFIG.gun.reloadBarWidth;
  const reloadBarHeight = PLAYER_CONFIG.gun.reloadBarHeight;
  const reloadBarDepth = PLAYER_CONFIG.gun.reloadBarDepth;
  const reloadBarPadding = PLAYER_CONFIG.gun.reloadBarPadding;
  const reloadBarFillWidth = Math.max(0.001, reloadBarWidth - (reloadBarPadding * 2));
  const reloadBarFillHeight = Math.max(0.001, reloadBarHeight - (reloadBarPadding * 2));
  const reloadBarFillDepth = Math.max(0.001, reloadBarDepth - (reloadBarPadding * 2));
  const reloadBarTrackDepth = Math.max(0.001, reloadBarFillDepth * 0.22);
  const reloadBarFillVisualDepth = Math.max(0.001, reloadBarFillDepth * 0.16);
  const reloadBarFaceLift = 0.0012;

  const reloadBarGroup = new THREE.Group();
  reloadBarGroup.position.set(
    PLAYER_CONFIG.gun.reloadBarOffsetX,
    PLAYER_CONFIG.gun.reloadBarOffsetY,
    PLAYER_CONFIG.gun.reloadBarOffsetZ
  );

  const reloadBarFrame = new THREE.Mesh(
    new THREE.BoxGeometry(reloadBarWidth, reloadBarHeight, reloadBarDepth),
    new THREE.MeshStandardMaterial({
      color: PLAYER_CONFIG.gun.bodyColor,
      emissive: PLAYER_CONFIG.gun.bodyEmissive,
      emissiveIntensity: PLAYER_CONFIG.gun.bodyEmissiveIntensity * 0.8,
      roughness: PLAYER_CONFIG.gun.bodyRoughness,
      metalness: PLAYER_CONFIG.gun.bodyMetalness,
    })
  );
  reloadBarGroup.add(reloadBarFrame);

  const reloadBarTrack = new THREE.Mesh(
    new THREE.BoxGeometry(reloadBarFillWidth, reloadBarFillHeight, reloadBarTrackDepth),
    new THREE.MeshBasicMaterial({
      color: PLAYER_CONFIG.gun.reloadBarTrackColor,
      transparent: true,
      opacity: PLAYER_CONFIG.gun.reloadBarTrackOpacity,
    })
  );
  reloadBarTrack.material.toneMapped = false;
  reloadBarTrack.position.z = (reloadBarDepth * 0.5) + (reloadBarTrackDepth * 0.5) + reloadBarFaceLift;
  reloadBarGroup.add(reloadBarTrack);

  const reloadBarFillMaterial = new THREE.MeshBasicMaterial({
    color: PLAYER_CONFIG.gun.reloadBarReadyColor,
    transparent: true,
    opacity: 1,
  });
  reloadBarFillMaterial.toneMapped = false;
  const reloadBarFill = new THREE.Mesh(
    new THREE.BoxGeometry(reloadBarFillWidth, reloadBarFillHeight, reloadBarFillVisualDepth),
    reloadBarFillMaterial
  );
  reloadBarFill.position.z = reloadBarTrack.position.z + ((reloadBarTrackDepth + reloadBarFillVisualDepth) * 0.5) + reloadBarFaceLift;
  reloadBarGroup.add(reloadBarFill);
  gunGroup.add(reloadBarGroup);

  const reloadBarReadyColor = new THREE.Color(PLAYER_CONFIG.gun.reloadBarReadyColor);
  const reloadBarReloadColor = new THREE.Color(PLAYER_CONFIG.gun.reloadBarReloadColor);
  const reloadBarCurrentColor = new THREE.Color();

  const gunBasePosition = new THREE.Vector3(
    PLAYER_CONFIG.gun.offsetX,
    PLAYER_CONFIG.gun.offsetY,
    PLAYER_CONFIG.gun.offsetZ
  );
  const gunBaseMobilePortraitPosition = new THREE.Vector3(
    Number.isFinite(Number(PLAYER_CONFIG.gun.mobilePortraitOffsetX))
      ? Number(PLAYER_CONFIG.gun.mobilePortraitOffsetX)
      : gunBasePosition.x * 0.46,
    Number.isFinite(Number(PLAYER_CONFIG.gun.mobilePortraitOffsetY))
      ? Number(PLAYER_CONFIG.gun.mobilePortraitOffsetY)
      : gunBasePosition.y * 0.65,
    Number.isFinite(Number(PLAYER_CONFIG.gun.mobilePortraitOffsetZ))
      ? Number(PLAYER_CONFIG.gun.mobilePortraitOffsetZ)
      : gunBasePosition.z * 0.85
  );
  const gunBaseMobileLandscapePosition = new THREE.Vector3(
    Number.isFinite(Number(PLAYER_CONFIG.gun.mobileLandscapeOffsetX))
      ? Number(PLAYER_CONFIG.gun.mobileLandscapeOffsetX)
      : gunBasePosition.x * 0.8,
    Number.isFinite(Number(PLAYER_CONFIG.gun.mobileLandscapeOffsetY))
      ? Number(PLAYER_CONFIG.gun.mobileLandscapeOffsetY)
      : gunBasePosition.y * 0.9,
    Number.isFinite(Number(PLAYER_CONFIG.gun.mobileLandscapeOffsetZ))
      ? Number(PLAYER_CONFIG.gun.mobileLandscapeOffsetZ)
      : gunBasePosition.z
  );
  const gunMobilePortraitScale = Number.isFinite(Number(PLAYER_CONFIG.gun.mobilePortraitScale))
    ? Math.max(0.4, Number(PLAYER_CONFIG.gun.mobilePortraitScale))
    : 0.85;
  const gunMobileLandscapeScale = Number.isFinite(Number(PLAYER_CONFIG.gun.mobileLandscapeScale))
    ? Math.max(0.4, Number(PLAYER_CONFIG.gun.mobileLandscapeScale))
    : 0.92;
  const desktopReloadBarOffset = new THREE.Vector3(
    Number.isFinite(Number(PLAYER_CONFIG.gun.reloadBarOffsetX))
      ? Number(PLAYER_CONFIG.gun.reloadBarOffsetX)
      : 0,
    Number.isFinite(Number(PLAYER_CONFIG.gun.reloadBarOffsetY))
      ? Number(PLAYER_CONFIG.gun.reloadBarOffsetY)
      : 0.11,
    Number.isFinite(Number(PLAYER_CONFIG.gun.reloadBarOffsetZ))
      ? Number(PLAYER_CONFIG.gun.reloadBarOffsetZ)
      : -0.03
  );
  const mobilePortraitReloadBarOffset = new THREE.Vector3(
    Number.isFinite(Number(PLAYER_CONFIG.gun.mobilePortraitReloadBarOffsetX))
      ? Number(PLAYER_CONFIG.gun.mobilePortraitReloadBarOffsetX)
      : desktopReloadBarOffset.x,
    Number.isFinite(Number(PLAYER_CONFIG.gun.mobilePortraitReloadBarOffsetY))
      ? Number(PLAYER_CONFIG.gun.mobilePortraitReloadBarOffsetY)
      : desktopReloadBarOffset.y,
    Number.isFinite(Number(PLAYER_CONFIG.gun.mobilePortraitReloadBarOffsetZ))
      ? Number(PLAYER_CONFIG.gun.mobilePortraitReloadBarOffsetZ)
      : desktopReloadBarOffset.z
  );
  const mobileLandscapeReloadBarOffset = new THREE.Vector3(
    Number.isFinite(Number(PLAYER_CONFIG.gun.mobileLandscapeReloadBarOffsetX))
      ? Number(PLAYER_CONFIG.gun.mobileLandscapeReloadBarOffsetX)
      : desktopReloadBarOffset.x,
    Number.isFinite(Number(PLAYER_CONFIG.gun.mobileLandscapeReloadBarOffsetY))
      ? Number(PLAYER_CONFIG.gun.mobileLandscapeReloadBarOffsetY)
      : desktopReloadBarOffset.y,
    Number.isFinite(Number(PLAYER_CONFIG.gun.mobileLandscapeReloadBarOffsetZ))
      ? Number(PLAYER_CONFIG.gun.mobileLandscapeReloadBarOffsetZ)
      : desktopReloadBarOffset.z
  );
  let lastWeaponHudLayoutMode = null;
  const gunBobFrequency = PLAYER_CONFIG.gun.bobFrequency;
  const gunBobSpeedForMax = PLAYER_CONFIG.gun.bobSpeedForMax;
  const gunBobSmoothing = PLAYER_CONFIG.gun.bobSmoothing;
  const gunBobXAmplitude = PLAYER_CONFIG.gun.bobXAmplitude;
  const gunBobYAmplitude = PLAYER_CONFIG.gun.bobYAmplitude;
  const gunBobPitchAmplitude = PLAYER_CONFIG.gun.bobPitchAmplitude;
  const gunBobRollAmplitude = PLAYER_CONFIG.gun.bobRollAmplitude;
  let gunBobTime = 0;
  let gunBobAmount = 0;
  const movementStartPosition = new THREE.Vector3();

  const gunFlashDuration = PLAYER_CONFIG.gun.flashDuration;
  let gunFlashTimer = 0;

  function isPortraitViewport() {
    return window.innerHeight >= window.innerWidth;
  }

  function getActiveGunBasePosition() {
    if (!isTouchDevice) {
      return gunBasePosition;
    }
    return isPortraitViewport()
      ? gunBaseMobilePortraitPosition
      : gunBaseMobileLandscapePosition;
  }

  function getActiveGunScale() {
    if (!isTouchDevice) {
      return 1;
    }
    return isPortraitViewport()
      ? gunMobilePortraitScale
      : gunMobileLandscapeScale;
  }

  function getWeaponHudLayoutMode() {
    if (!isTouchDevice) {
      return "desktop";
    }
    return isPortraitViewport() ? "mobile_portrait" : "mobile_landscape";
  }

  function getActiveReloadBarOffset(mode = getWeaponHudLayoutMode()) {
    if (mode === "mobile_portrait") {
      return mobilePortraitReloadBarOffset;
    }
    if (mode === "mobile_landscape") {
      return mobileLandscapeReloadBarOffset;
    }
    return desktopReloadBarOffset;
  }

  // Attach to camera
  gunGroup.position.copy(getActiveGunBasePosition());
  gunGroup.scale.setScalar(getActiveGunScale());
  camera.add(gunGroup);
  scene.add(camera);

  const baseLookNoiseThreshold = Math.max(0, Number(PLAYER_CONFIG.look.lookNoiseThresholdPx) || 0);
  const isFirefoxDesktop = !isTouchDevice && /firefox/i.test(navigator.userAgent);
  const firefoxLookNoiseThreshold = Number(PLAYER_CONFIG.look.firefoxLookNoiseThresholdPx);
  const lookNoiseThreshold = isFirefoxDesktop && Number.isFinite(firefoxLookNoiseThreshold)
    ? Math.max(baseLookNoiseThreshold, Math.max(0, firefoxLookNoiseThreshold))
    : baseLookNoiseThreshold;
  const pointerLockSettleDurationMs = Math.max(
    0,
    Number(PLAYER_CONFIG.look.pointerLockSettleDurationMs) || (isFirefoxDesktop ? 120 : 0)
  );
  const touchLookSensitivity = PLAYER_CONFIG.look.touchSensitivity;
  let yaw = camera.rotation.y;
  let pitch = camera.rotation.x;
  let lookDeltaX = 0;
  let lookDeltaY = 0;
  let suppressLookInputUntil = 0;

  const moveState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  };
  const virtualState = {
    strafe: 0,
    forward: 0,
  };

  const moveSpeed = PLAYER_CONFIG.movement.moveSpeed;
  const sprintMultiplier = PLAYER_CONFIG.movement.sprintMultiplier;
  const gravity = PLAYER_CONFIG.movement.gravity;
  const jumpVelocity = PLAYER_CONFIG.movement.jumpVelocity;
  let verticalVelocity = 0;
  let jumpQueued = false;
  let jumpHeld = false;

  const jetpackMaxFuel = PLAYER_CONFIG.jetpack.maxFuel;
  const jetpackBurnRate = PLAYER_CONFIG.jetpack.burnRate;
  const jetpackGroundRechargeRate = PLAYER_CONFIG.jetpack.groundRechargeRate;
  const jetpackAirRechargeRate = PLAYER_CONFIG.jetpack.airRechargeRate;
  const jetpackAcceleration = PLAYER_CONFIG.jetpack.acceleration;
  const jetpackMaxRiseSpeed = PLAYER_CONFIG.jetpack.maxRiseSpeed;
  let jetpackFuel = jetpackMaxFuel;
  let hasInfiniteJetpackFuel = false;
  let jetpackFuelEfficiencyMultiplier = 1;
  let movementAudioInitialized = false;
  let movementAudioWasGrounded = false;
  let movementAudioJetpackActive = false;

  const sharedWeaponConfig = PLAYER_CONFIG.weapon ?? {};
  const weaponConfigs = PLAYER_CONFIG.weapons ?? {};
  const weaponSelectionOptions = Array.isArray(PLAYER_CONFIG.weaponSelection?.options)
    ? PLAYER_CONFIG.weaponSelection.options
    : [];
  const defaultWeaponType = typeof weaponSelectionOptions[0]?.type === "string"
    ? weaponSelectionOptions[0].type
    : "machineGun";
  const defaultProjectileVisual = {
    color: sharedWeaponConfig.projectileColor,
    emissive: sharedWeaponConfig.projectileEmissive,
    emissiveIntensity: sharedWeaponConfig.projectileEmissiveIntensity,
    roughness: sharedWeaponConfig.projectileRoughness,
    metalness: sharedWeaponConfig.projectileMetalness,
  };
  const projectileVisualByWeapon = {
    machineGun: defaultProjectileVisual,
    bazooka: {
      color: 0xffa565,
      emissive: 0x66240d,
      emissiveIntensity: 1.05,
      roughness: 0.28,
      metalness: 0.08,
    },
  };
  const projectileMaterialByWeapon = new Map();
  const gunVisualThemeByWeapon = {
    machineGun: {
      coreColor: PLAYER_CONFIG.gun.coreColor,
      coreEmissive: PLAYER_CONFIG.gun.coreEmissive,
      flashColor: PLAYER_CONFIG.gun.flashColor,
      lightColor: PLAYER_CONFIG.gun.lightColor,
      reloadReadyColor: PLAYER_CONFIG.gun.reloadBarReadyColor,
      reloadReloadColor: PLAYER_CONFIG.gun.reloadBarReloadColor,
    },
    sniper: {
      coreColor: 0x9bbfff,
      coreEmissive: 0x2d518a,
      flashColor: 0xc9e1ff,
      lightColor: 0x9ec6ff,
      reloadReadyColor: 0x8fc8ff,
      reloadReloadColor: 0x2a5f8e,
    },
    bazooka: {
      coreColor: 0xffa567,
      coreEmissive: 0x7b2d0d,
      flashColor: 0xffd1a8,
      lightColor: 0xffb37a,
      reloadReadyColor: 0xffb16f,
      reloadReloadColor: 0x8f4622,
    },
  };
  const projectileVelocity = new THREE.Vector3();
  const projectileDirection = new THREE.Vector3();
  const projectileEnemyCollisionCenter = new THREE.Vector3();
  const projectileSpawnWorldPos = new THREE.Vector3();
  const projectileImpactWorldPos = new THREE.Vector3();
  const sniperRayOrigin = new THREE.Vector3();
  const sniperRayDirection = new THREE.Vector3();
  const sniperRayPoint = new THREE.Vector3();
  const sniperRaycaster = new THREE.Raycaster();
  const sniperBeamStart = new THREE.Vector3();
  const sniperBeamVector = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const projectiles = [];
  const projectileImpacts = [];
  const sniperBeamEffects = [];
  const bazookaExplosionEffects = [];
  const projectileGeometryBySize = new Map();
  const projectileImpactDuration = PLAYER_CONFIG.projectileImpact.duration;
  const projectileImpactFlashGeometry = new THREE.SphereGeometry(
    PLAYER_CONFIG.projectileImpact.flashRadius,
    PLAYER_CONFIG.projectileImpact.flashSegments,
    PLAYER_CONFIG.projectileImpact.flashSegments
  );
  const projectileImpactRingGeometry = new THREE.RingGeometry(
    PLAYER_CONFIG.projectileImpact.ringInnerRadius,
    PLAYER_CONFIG.projectileImpact.ringOuterRadius,
    PLAYER_CONFIG.projectileImpact.ringSegments
  );
  const bazookaExplosionGeometry = new THREE.SphereGeometry(1, 14, 10);
  const projectileMaxDistanceFromPlayerSq = Math.pow((GAME_CONFIG.grid.cellSize * 20), 2);
  const towerHitPadding = Number.isFinite(Number(sharedWeaponConfig.towerHitPadding))
    ? Math.max(0, Number(sharedWeaponConfig.towerHitPadding))
    : 0.06;
  const sniperRayStepDistance = 0.12;
  const baseCameraFov = Number.isFinite(Number(camera.fov)) ? Number(camera.fov) : 75;
  const defaultSniperZoomFov = 34;
  const defaultSniperBeamColor = 0xaed8ff;
  const defaultBazookaExplosionColor = 0xffbf85;

  let selectedWeaponType = defaultWeaponType;
  let primaryHeld = false;
  let weaponCooldownRemaining = 0;
  let sniperZoomProgress = 0;

  let playerDamageMultiplier = 1;
  let playerFireRateMultiplier = 1;
  let playerMovementSpeedMultiplier = 1;
  const weaponDamageMultiplierByType = new Map();
  const weaponFireIntervalMultiplierByType = new Map();
  const weaponSplashRadiusMultiplierByType = new Map();

  const hasMovementBounds = !!(
    movementBounds
    && Number.isFinite(Number(movementBounds.minX))
    && Number.isFinite(Number(movementBounds.maxX))
    && Number.isFinite(Number(movementBounds.minZ))
    && Number.isFinite(Number(movementBounds.maxZ))
  );
  const clampedBounds = hasMovementBounds
    ? {
      minX: Number(movementBounds.minX),
      maxX: Number(movementBounds.maxX),
      minZ: Number(movementBounds.minZ),
      maxZ: Number(movementBounds.maxZ),
    }
    : null;

  function getProjectileGeometry(size) {
    const safeSize = Math.max(0.01, Number(size) || 0.1);
    const key = safeSize.toFixed(4);
    let geometry = projectileGeometryBySize.get(key);
    if (!geometry) {
      geometry = new THREE.BoxGeometry(safeSize, safeSize, safeSize);
      projectileGeometryBySize.set(key, geometry);
    }
    return geometry;
  }

  function getProjectileMaterialForWeapon(type) {
    const key = typeof type === "string" && type.length > 0
      ? type
      : "machineGun";
    let material = projectileMaterialByWeapon.get(key);
    if (material) {
      return material;
    }

    const visual = projectileVisualByWeapon[key] ?? defaultProjectileVisual;
    material = new THREE.MeshStandardMaterial({
      color: visual.color,
      emissive: visual.emissive,
      emissiveIntensity: visual.emissiveIntensity,
      roughness: visual.roughness,
      metalness: visual.metalness,
    });
    projectileMaterialByWeapon.set(key, material);
    return material;
  }

  function getWeaponConfig(type = selectedWeaponType) {
    if (!type || typeof type !== "string") {
      return null;
    }
    const config = weaponConfigs[type];
    if (!config || typeof config !== "object") {
      return null;
    }
    return config;
  }

  function normalizeWeaponType(type) {
    if (typeof type !== "string") {
      return defaultWeaponType;
    }
    return getWeaponConfig(type) ? type : defaultWeaponType;
  }

  function getWeaponDamageMultiplier(type = selectedWeaponType) {
    const localMultiplier = Number(weaponDamageMultiplierByType.get(type));
    const safeLocalMultiplier = Number.isFinite(localMultiplier) && localMultiplier > 0
      ? localMultiplier
      : 1;
    return Math.max(0, playerDamageMultiplier) * safeLocalMultiplier;
  }

  function getWeaponFireIntervalMultiplier(type = selectedWeaponType) {
    const localMultiplier = Number(weaponFireIntervalMultiplierByType.get(type));
    const safeLocalMultiplier = Number.isFinite(localMultiplier) && localMultiplier > 0
      ? localMultiplier
      : 1;
    return Math.max(0.01, playerFireRateMultiplier * safeLocalMultiplier);
  }

  function getWeaponSplashRadiusMultiplier(type = selectedWeaponType) {
    const localMultiplier = Number(weaponSplashRadiusMultiplierByType.get(type));
    if (!Number.isFinite(localMultiplier) || localMultiplier <= 0) {
      return 1;
    }
    return localMultiplier;
  }

  function getWeaponFireInterval(type = selectedWeaponType) {
    const config = getWeaponConfig(type);
    const baseInterval = Number(config?.fireInterval);
    const safeInterval = Number.isFinite(baseInterval) && baseInterval > 0
      ? baseInterval
      : 0.1;
    return Math.max(0.01, safeInterval * getWeaponFireIntervalMultiplier(type));
  }

  function getWeaponCooldownProgress() {
    const interval = getWeaponFireInterval();
    if (!Number.isFinite(interval) || interval <= 0) {
      return 1;
    }
    if (weaponCooldownRemaining <= 0) {
      return 1;
    }
    return Math.max(0, Math.min(1, 1 - (weaponCooldownRemaining / interval)));
  }

  function upgradePlayerDamage(addAmount = PLAYER_CONFIG.upgrades.damageUpgradeAdd) {
    const amount = Number(addAmount);
    if (!Number.isFinite(amount)) {
      return;
    }
    playerDamageMultiplier += amount;
  }

  function upgradePlayerFireRate(multiplier = PLAYER_CONFIG.upgrades.fireRateUpgradeMultiplier) {
    const rateMultiplier = Number(multiplier);
    if (!Number.isFinite(rateMultiplier) || rateMultiplier <= 0) {
      return;
    }
    playerFireRateMultiplier *= rateMultiplier;
    weaponCooldownRemaining = Math.max(0, weaponCooldownRemaining * rateMultiplier);
  }

  function upgradeJetpackFuelEfficiency(multiplier = 2) {
    const efficiencyMultiplier = Number(multiplier);
    if (!Number.isFinite(efficiencyMultiplier) || efficiencyMultiplier <= 0) {
      return;
    }
    jetpackFuelEfficiencyMultiplier *= efficiencyMultiplier;
  }

  function applyTechGrants(grants = {}) {
    const playerGrants = grants?.player && typeof grants.player === "object"
      ? grants.player
      : grants;
    if (!playerGrants || typeof playerGrants !== "object") {
      return false;
    }

    let appliedAny = false;

    const damageAdd = Number(playerGrants.damageAdd);
    if (Number.isFinite(damageAdd) && damageAdd !== 0) {
      playerDamageMultiplier += damageAdd;
      appliedAny = true;
    }

    const fireIntervalMultiplier = Number(playerGrants.fireIntervalMultiplier);
    if (Number.isFinite(fireIntervalMultiplier) && fireIntervalMultiplier > 0) {
      playerFireRateMultiplier *= fireIntervalMultiplier;
      weaponCooldownRemaining = Math.max(0, weaponCooldownRemaining * fireIntervalMultiplier);
      appliedAny = true;
    }

    const moveSpeedMultiplier = Number(playerGrants.moveSpeedMultiplier);
    if (Number.isFinite(moveSpeedMultiplier) && moveSpeedMultiplier > 0) {
      playerMovementSpeedMultiplier *= moveSpeedMultiplier;
      appliedAny = true;
    }

    const jetpackEfficiencyMultiplier = Number(playerGrants.jetpackEfficiencyMultiplier);
    if (Number.isFinite(jetpackEfficiencyMultiplier) && jetpackEfficiencyMultiplier > 0) {
      jetpackFuelEfficiencyMultiplier *= jetpackEfficiencyMultiplier;
      appliedAny = true;
    }

    const weaponDamageMultipliers = playerGrants.weaponDamageMultipliers;
    if (weaponDamageMultipliers && typeof weaponDamageMultipliers === "object") {
      for (const [weaponType, rawMultiplier] of Object.entries(weaponDamageMultipliers)) {
        if (!getWeaponConfig(weaponType)) {
          continue;
        }
        const multiplier = Number(rawMultiplier);
        if (!Number.isFinite(multiplier) || multiplier <= 0) {
          continue;
        }
        const previous = Number(weaponDamageMultiplierByType.get(weaponType));
        const safePrevious = Number.isFinite(previous) && previous > 0 ? previous : 1;
        weaponDamageMultiplierByType.set(weaponType, safePrevious * multiplier);
        appliedAny = true;
      }
    }

    const weaponFireIntervalMultipliers = playerGrants.weaponFireIntervalMultipliers;
    if (weaponFireIntervalMultipliers && typeof weaponFireIntervalMultipliers === "object") {
      for (const [weaponType, rawMultiplier] of Object.entries(weaponFireIntervalMultipliers)) {
        if (!getWeaponConfig(weaponType)) {
          continue;
        }
        const multiplier = Number(rawMultiplier);
        if (!Number.isFinite(multiplier) || multiplier <= 0) {
          continue;
        }
        const previous = Number(weaponFireIntervalMultiplierByType.get(weaponType));
        const safePrevious = Number.isFinite(previous) && previous > 0 ? previous : 1;
        weaponFireIntervalMultiplierByType.set(weaponType, safePrevious * multiplier);
        weaponCooldownRemaining = Math.max(0, weaponCooldownRemaining * multiplier);
        appliedAny = true;
      }
    }

    const weaponSplashRadiusMultipliers = playerGrants.weaponSplashRadiusMultipliers;
    if (weaponSplashRadiusMultipliers && typeof weaponSplashRadiusMultipliers === "object") {
      for (const [weaponType, rawMultiplier] of Object.entries(weaponSplashRadiusMultipliers)) {
        if (!getWeaponConfig(weaponType)) {
          continue;
        }
        const multiplier = Number(rawMultiplier);
        if (!Number.isFinite(multiplier) || multiplier <= 0) {
          continue;
        }
        const previous = Number(weaponSplashRadiusMultiplierByType.get(weaponType));
        const safePrevious = Number.isFinite(previous) && previous > 0 ? previous : 1;
        weaponSplashRadiusMultiplierByType.set(weaponType, safePrevious * multiplier);
        appliedAny = true;
      }
    }

    const pickupRangeAdd = Number(playerGrants.pickupRangeAdd);
    if (
      Number.isFinite(pickupRangeAdd)
      && pickupRangeAdd !== 0
      && typeof onPickupRangeTechGrant === "function"
    ) {
      onPickupRangeTechGrant(pickupRangeAdd);
      appliedAny = true;
    }

    return appliedAny;
  }

  function setMovementKey(code, isDown) {
    switch (code) {
      case "KeyW":
        moveState.forward = isDown;
        break;
      case "KeyS":
        moveState.backward = isDown;
        break;
      case "KeyA":
        moveState.left = isDown;
        break;
      case "KeyD":
        moveState.right = isDown;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        moveState.sprint = isDown;
        break;
      default:
        break;
    }
  }

  window.addEventListener("keydown", (event) => {
    setMovementKey(event.code, true);
    if (event.code === "Space") {
      event.preventDefault();
      setJumpHeld(true);
    }
  });

  window.addEventListener("keyup", (event) => {
    setMovementKey(event.code, false);
    if (event.code === "Space") {
      setJumpHeld(false);
    }
  });

  controls.addEventListener("lock", () => {
    lockRequestPending = false;
    lockRetryPending = false;
    yaw = camera.rotation.y;
    pitch = camera.rotation.x;
    lookDeltaX = 0;
    lookDeltaY = 0;
    suppressLookInputUntil = performance.now() + pointerLockSettleDurationMs;
  });

  controls.addEventListener("unlock", () => {
    lockRequestPending = false;
    lockRetryPending = false;
    lastUnlockTime = performance.now();
    yaw = camera.rotation.y;
    pitch = camera.rotation.x;
    suppressLookInputUntil = 0;
    setJumpHeld(false);
  });

  function requestPointerLock(attempt = 0) {
    let maybePromise;
    try {
      maybePromise = controls.domElement.requestPointerLock?.();
    } catch (error) {
      lockRequestPending = false;
      if (error?.name !== "SecurityError") {
        console.warn("Pointer lock request failed:", error);
      }
      return;
    }

    if (!maybePromise || typeof maybePromise.then !== "function") {
      return;
    }

    maybePromise.catch((error) => {
      const recentlyUnlocked = performance.now() - lastUnlockTime < PLAYER_CONFIG.controls.lockRetryWindowMs;
      const shouldRetry = error?.name === "SecurityError" && attempt === 0 && recentlyUnlocked;
      if (shouldRetry) {
        lockRetryPending = true;
        requestAnimationFrame(() => {
          lockRetryPending = false;
          if (!lockRequestPending || controls.isLocked) {
            return;
          }
          requestPointerLock(attempt + 1);
        });
        return;
      }

      lockRequestPending = false;
      if (error?.name !== "SecurityError") {
        console.warn("Pointer lock request failed:", error);
      }
    });
  }

  document.addEventListener(
    "pointerlockerror",
    (event) => {
      if (!lockRequestPending) {
        return;
      }

      // Suppress Three.js default console.error for transient relock races;
      // promise rejection handling above already manages retries/failures.
      event.stopImmediatePropagation();
    },
    true
  );

  let isMenuMode = false;
  function setMenuMode(mode) {
    isMenuMode = mode;
    if (isMenuMode) {
      setPrimaryHeld(false);
      stopJetpackAudio();
    }
    primaryReleasedSinceLastUpdate = false;
  }

  // Filter tiny pointer-lock movement noise that can cause idle camera drift.
  document.addEventListener(
    "mousemove",
    (event) => {
      if (!controls.isLocked) {
        return;
      }
      if (isMenuMode) {
        event.stopImmediatePropagation();
        return;
      }
      if (performance.now() < suppressLookInputUntil) {
        event.stopImmediatePropagation();
        return;
      }
      const movementX = Number(event.movementX) || 0;
      const movementY = Number(event.movementY) || 0;
      if (
        Math.abs(movementX) <= lookNoiseThreshold &&
        Math.abs(movementY) <= lookNoiseThreshold
      ) {
        event.stopImmediatePropagation();
      }
    },
    true
  );

  camera.position.y = eyeHeight;

  function addLookInput(deltaX, deltaY) {
    lookDeltaX += deltaX;
    lookDeltaY += deltaY;
  }

  function setVirtualMove(strafe, forward) {
    virtualState.strafe = Math.max(-1, Math.min(1, strafe));
    virtualState.forward = Math.max(-1, Math.min(1, forward));
  }

  function jump() {
    jumpQueued = true;
  }

  function setJumpHeld(isHeld) {
    const nextHeld = !!isHeld;
    if (nextHeld && !jumpHeld) {
      jump();
    }
    jumpHeld = nextHeld;
  }

  function getJetpackFuelRatio() {
    if (hasInfiniteJetpackFuel) {
      return 1;
    }
    return Math.max(0, Math.min(1, jetpackFuel / jetpackMaxFuel));
  }

  function getJetpackFuelPercent() {
    return Math.round(getJetpackFuelRatio() * 100);
  }

  function disableJetpackFuelConsumption() {
    hasInfiniteJetpackFuel = true;
    jetpackFuel = jetpackMaxFuel;
  }

  function applyWeaponHudLayout() {
    const mode = getWeaponHudLayoutMode();
    const activeReloadOffset = getActiveReloadBarOffset(mode);
    const reloadBarLengthScale = mode === "desktop" ? 1 : 0.5;

    reloadBarGroup.position.copy(activeReloadOffset);
    reloadBarFrame.scale.x = reloadBarLengthScale;
    reloadBarTrack.scale.x = reloadBarLengthScale;
    reloadBarFrame.position.x = (-reloadBarWidth * (1 - reloadBarLengthScale)) * 0.5;
    reloadBarTrack.position.x = (-reloadBarFillWidth * (1 - reloadBarLengthScale)) * 0.5;
    lastWeaponHudLayoutMode = mode;
  }

  function updateReloadBar(progress) {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const reloadBarLengthScale = getWeaponHudLayoutMode() === "desktop" ? 1 : 0.5;
    const fillScale = Math.max(0.001, clampedProgress * reloadBarLengthScale);
    reloadBarFill.scale.x = fillScale;
    reloadBarFill.position.x = (-reloadBarFillWidth * (1 - fillScale)) * 0.5;

    reloadBarCurrentColor.lerpColors(reloadBarReloadColor, reloadBarReadyColor, clampedProgress);
    reloadBarFillMaterial.color.copy(reloadBarCurrentColor);
    reloadBarFillMaterial.opacity = 0.45 + (clampedProgress * 0.55);
  }

  applyWeaponHudLayout();
  updateReloadBar(1);
  applyWeaponVisualTheme(selectedWeaponType);

  function updateGunVisuals(deltaSeconds, movementSpeed) {
    applyWeaponHudLayout();
    gunFlashTimer = Math.max(0, gunFlashTimer - deltaSeconds);
    const flash = gunFlashTimer > 0 ? (gunFlashTimer / gunFlashDuration) : 0;
    const flashBoost = flash > 0 ? Math.pow(flash, PLAYER_CONFIG.gun.flashExponent) : 0;

    gunBodyMaterial.emissiveIntensity = PLAYER_CONFIG.gun.bodyEmissiveIntensity + flashBoost * PLAYER_CONFIG.gun.bodyFlashBoost;
    gunCoreMaterial.emissiveIntensity = PLAYER_CONFIG.gun.coreEmissiveIntensity + flashBoost * PLAYER_CONFIG.gun.coreFlashBoost;
    gunCoreMaterial.opacity = PLAYER_CONFIG.gun.coreOpacity + flashBoost * PLAYER_CONFIG.gun.coreOpacityBoost;
    gunCore.scale.setScalar(1 + flashBoost * PLAYER_CONFIG.gun.coreScaleBoost);
    gunFlashMaterial.opacity = flashBoost * PLAYER_CONFIG.gun.flashOpacityBoost;
    gunFlashMesh.scale.setScalar(1 + flashBoost * PLAYER_CONFIG.gun.flashScaleBoost);
    gunLight.intensity = flashBoost * PLAYER_CONFIG.gun.lightFlashBoost;

    updateReloadBar(getWeaponCooldownProgress());

    const speedRatio = Math.min(1, movementSpeed / gunBobSpeedForMax);
    const bobBlend = Math.min(1, deltaSeconds * gunBobSmoothing);
    gunBobAmount += (speedRatio - gunBobAmount) * bobBlend;

    if (movementSpeed > 0.001) {
      const phaseSpeed = gunBobFrequency * (0.45 + (speedRatio * 0.9));
      gunBobTime += deltaSeconds * phaseSpeed * Math.PI * 2;
    }

    const bobX = Math.sin(gunBobTime * 0.5) * gunBobXAmplitude * gunBobAmount;
    const bobY = Math.sin(gunBobTime) * gunBobYAmplitude * gunBobAmount;
    const bobPitch = Math.sin(gunBobTime) * gunBobPitchAmplitude * gunBobAmount;
    const bobRoll = Math.cos(gunBobTime * 0.5) * gunBobRollAmplitude * gunBobAmount;
    const activeGunBase = getActiveGunBasePosition();
    gunGroup.scale.setScalar(getActiveGunScale());
    gunGroup.position.set(
      activeGunBase.x + bobX,
      activeGunBase.y + bobY,
      activeGunBase.z
    );
    gunGroup.rotation.set(bobPitch, 0, bobRoll);
  }

  let primaryReleasedSinceLastUpdate = false;

  function applyWeaponVisualTheme(type = selectedWeaponType) {
    const theme = gunVisualThemeByWeapon[type] ?? gunVisualThemeByWeapon.machineGun;
    if (!theme) {
      return;
    }
    gunCoreMaterial.color.set(theme.coreColor);
    gunCoreMaterial.emissive.set(theme.coreEmissive);
    gunFlashMaterial.color.set(theme.flashColor);
    gunLight.color.set(theme.lightColor);
    reloadBarReadyColor.set(theme.reloadReadyColor);
    reloadBarReloadColor.set(theme.reloadReloadColor);
  }

  function setWeaponType(type) {
    selectedWeaponType = normalizeWeaponType(type);
    primaryHeld = false;
    primaryReleasedSinceLastUpdate = false;
    weaponCooldownRemaining = 0;
    if (selectedWeaponType !== "sniper") {
      sniperZoomProgress = 0;
    }
    applyWeaponVisualTheme(selectedWeaponType);
    updateReloadBar(getWeaponCooldownProgress());
    return selectedWeaponType;
  }

  function getWeaponType() {
    return selectedWeaponType;
  }

  function setPrimaryHeld(isHeld) {
    const nextHeld = !!isHeld;
    if (primaryHeld === nextHeld) {
      return;
    }
    if (primaryHeld && !nextHeld) {
      primaryReleasedSinceLastUpdate = true;
    }
    primaryHeld = nextHeld;
  }

  function emitWeaponVisualEvent(event) {
    if (typeof onWeaponVisualEvent !== "function" || !event || typeof event !== "object") {
      return;
    }
    onWeaponVisualEvent(event);
  }

  function getMovementAudioPosition() {
    return {
      x: Number(camera.position.x) || 0,
      y: Number(camera.position.y) || 0,
      z: Number(camera.position.z) || 0,
    };
  }

  function emitMovementAudioEvent(event) {
    if (typeof onMovementAudioEvent !== "function" || !event || typeof event !== "object") {
      return;
    }
    onMovementAudioEvent(event);
  }

  function stopJetpackAudio() {
    if (!movementAudioJetpackActive) {
      return;
    }
    movementAudioJetpackActive = false;
    emitMovementAudioEvent({
      kind: "jetpack_stop",
      position: getMovementAudioPosition(),
    });
  }

  function resetMovementAudioState() {
    stopJetpackAudio();
    movementAudioInitialized = false;
    movementAudioWasGrounded = false;
  }

  function spawnProjectileFromWeaponType(type) {
    const config = getWeaponConfig(type);
    if (!config) {
      return false;
    }

    camera.getWorldDirection(projectileDirection).normalize();
    gunBarrel.getWorldPosition(projectileSpawnWorldPos);
    projectileSpawnWorldPos.addScaledVector(
      projectileDirection,
      Number.isFinite(Number(sharedWeaponConfig.spawnForwardOffset))
        ? Number(sharedWeaponConfig.spawnForwardOffset)
        : 0.2
    );

    const projectileMesh = new THREE.Mesh(
      getProjectileGeometry(config.projectileSize),
      getProjectileMaterialForWeapon(type)
    );
    projectileMesh.position.copy(projectileSpawnWorldPos);
    scene.add(projectileMesh);

    const projectileSpeed = Math.max(0.01, Number(config.projectileSpeed) || 10);
    const projectileLifetime = Math.max(0.01, Number(config.projectileLifetime) || 0.5);
    const projectileGravity = Math.max(0, Number(config.projectileGravity) || 0);
    const splashRadius = Math.max(0, Number(config.splashRadius) || 0) * getWeaponSplashRadiusMultiplier(type);
    const explosionDuration = Math.max(0.01, Number(config.explosionDuration) || 0.22);
    const projectileSize = Math.max(0.05, Number(config.projectileSize) || 0.2);
    projectileVelocity.copy(projectileDirection).multiplyScalar(projectileSpeed);
    projectiles.push({
      kind: type,
      mesh: projectileMesh,
      velocity: projectileVelocity.clone(),
      life: projectileLifetime,
      damage: Math.max(0, Number(config.damage) || 0) * getWeaponDamageMultiplier(type),
      hitRadius: Math.max(0, Number(config.projectileHitRadius) || 0.1),
      gravity: projectileGravity,
      splashRadius,
      explosionDuration,
    });

    gunFlashTimer = gunFlashDuration;
    emitWeaponVisualEvent({
      kind: "projectile",
      weaponType: type,
      origin: {
        x: projectileSpawnWorldPos.x,
        y: projectileSpawnWorldPos.y,
        z: projectileSpawnWorldPos.z,
      },
      direction: {
        x: projectileDirection.x,
        y: projectileDirection.y,
        z: projectileDirection.z,
      },
      speed: projectileSpeed,
      lifetime: projectileLifetime,
      gravity: projectileGravity,
      projectileSize,
      splashRadius,
      explosionDuration,
    });
    return true;
  }

  function fireMachineGun() {
    if (weaponCooldownRemaining > 0) {
      return false;
    }
    if (!spawnProjectileFromWeaponType("machineGun")) {
      return false;
    }
    weaponCooldownRemaining = getWeaponFireInterval("machineGun");
    return true;
  }

  function fireBazooka() {
    if (weaponCooldownRemaining > 0) {
      return false;
    }
    if (!spawnProjectileFromWeaponType("bazooka")) {
      return false;
    }
    weaponCooldownRemaining = getWeaponFireInterval("bazooka");
    return true;
  }

  function getCombatObstacles() {
    return typeof getMovementObstacles === "function"
      ? (Array.isArray(getMovementObstacles()) ? getMovementObstacles() : [])
      : [];
  }

  function getSurfaceCollisionYAtWorld(worldX, worldZ) {
    if (typeof getSurfaceYAtWorld !== "function") {
      return null;
    }
    const surfaceY = Number(getSurfaceYAtWorld(worldX, worldZ));
    return Number.isFinite(surfaceY) ? surfaceY : null;
  }

  function pointHitsRampObstacle(position, obstacle, padding) {
    const obstaclePos = obstacle?.position ?? obstacle?.mesh?.position;
    const obstacleBaseY = Number(obstacle?.baseY ?? 0);
    const obstacleHeight = Number(obstacle?.height);
    const obstacleDirection = obstacle?.direction;
    const obstacleHalfSizeX = Number(obstacle?.halfSizeX ?? obstacle?.halfSize);
    const obstacleHalfSizeZ = Number(obstacle?.halfSizeZ ?? obstacle?.halfSize);

    if (
      !obstaclePos
      || !Number.isFinite(obstacleBaseY)
      || !Number.isFinite(obstacleHeight)
      || obstacleHeight <= 0
      || !obstacleDirection
      || !Number.isFinite(obstacleHalfSizeX)
      || !Number.isFinite(obstacleHalfSizeZ)
    ) {
      return false;
    }

    const dirXRaw = Number(obstacleDirection.x);
    const dirZRaw = Number(obstacleDirection.z);
    const dirLength = Math.hypot(dirXRaw, dirZRaw);
    if (dirLength <= MIN_COLLISION_DISTANCE_SQ) {
      return false;
    }

    const dirX = dirXRaw / dirLength;
    const dirZ = dirZRaw / dirLength;
    const rightX = -dirZ;
    const rightZ = dirX;
    const rampRunsMostlyAlongX = Math.abs(dirX) >= Math.abs(dirZ);
    const rampAlongHalf = rampRunsMostlyAlongX ? obstacleHalfSizeX : obstacleHalfSizeZ;
    const rampAcrossHalf = rampRunsMostlyAlongX ? obstacleHalfSizeZ : obstacleHalfSizeX;
    if (
      !Number.isFinite(rampAlongHalf)
      || !Number.isFinite(rampAcrossHalf)
      || rampAlongHalf <= 0
      || rampAcrossHalf <= 0
    ) {
      return false;
    }

    const lowCenterX = obstaclePos.x - (dirX * rampAlongHalf * 0.5);
    const lowCenterZ = obstaclePos.z - (dirZ * rampAlongHalf * 0.5);
    const deltaX = position.x - lowCenterX;
    const deltaZ = position.z - lowCenterZ;
    const along = (deltaX * dirX) + (deltaZ * dirZ);
    const across = (deltaX * rightX) + (deltaZ * rightZ);
    const alongMin = -rampAcrossHalf;
    const alongMax = rampAlongHalf + rampAcrossHalf;

    if (along < (alongMin - padding) || along > (alongMax + padding)) {
      return false;
    }
    if (Math.abs(across) > (rampAcrossHalf + padding)) {
      return false;
    }

    const alongT = THREE.MathUtils.clamp(
      (along - alongMin) / Math.max(1e-6, alongMax - alongMin),
      0,
      1
    );
    const rampSurfaceY = obstacleBaseY + (obstacleHeight * alongT);
    return position.y >= (obstacleBaseY - padding) && position.y <= (rampSurfaceY + padding);
  }

  function pointHitsCylinderObstacle(position, obstacle, padding) {
    const obstaclePos = obstacle?.position ?? obstacle?.mesh?.position;
    const obstacleBaseY = Number(obstacle?.baseY ?? 0);
    const obstacleHeight = Number(obstacle?.height);
    const obstacleRadius = Number(obstacle?.radius);
    if (
      !obstaclePos
      || !Number.isFinite(obstacleBaseY)
      || !Number.isFinite(obstacleHeight)
      || obstacleHeight <= 0
      || !Number.isFinite(obstacleRadius)
      || obstacleRadius <= 0
    ) {
      return false;
    }

    if (position.y < (obstacleBaseY - padding) || position.y > (obstacleBaseY + obstacleHeight + padding)) {
      return false;
    }

    const dx = position.x - obstaclePos.x;
    const dz = position.z - obstaclePos.z;
    const maxDistance = obstacleRadius + padding;
    return ((dx * dx) + (dz * dz)) <= (maxDistance * maxDistance);
  }

  function pointHitsObstacle(position, obstacles, padding = towerHitPadding) {
    for (const obstacle of obstacles) {
      if (obstacle?.kind === "ramp") {
        if (pointHitsRampObstacle(position, obstacle, padding)) {
          return true;
        }
        continue;
      }

      if (obstacle?.kind === "cylinder") {
        if (pointHitsCylinderObstacle(position, obstacle, padding)) {
          return true;
        }
        continue;
      }

      const obstaclePos = obstacle?.mesh?.position ?? obstacle?.position;
      const halfSizeX = Number.isFinite(Number(obstacle?.halfSizeX))
        ? Number(obstacle.halfSizeX)
        : Number(obstacle?.halfSize);
      const halfSizeZ = Number.isFinite(Number(obstacle?.halfSizeZ))
        ? Number(obstacle.halfSizeZ)
        : Number(obstacle?.halfSize);
      const height = obstacle?.height;
      const baseY = obstacle?.baseY ?? 0;
      if (
        !obstaclePos
        || !Number.isFinite(halfSizeX)
        || !Number.isFinite(halfSizeZ)
        || typeof height !== "number"
      ) {
        continue;
      }

      const minX = obstaclePos.x - halfSizeX - padding;
      const maxX = obstaclePos.x + halfSizeX + padding;
      const minY = baseY - padding;
      const maxY = baseY + height + padding;
      const minZ = obstaclePos.z - halfSizeZ - padding;
      const maxZ = obstaclePos.z + halfSizeZ + padding;

      if (
        position.x >= minX
        && position.x <= maxX
        && position.y >= minY
        && position.y <= maxY
        && position.z >= minZ
        && position.z <= maxZ
      ) {
        return true;
      }
    }
    return false;
  }

  function spawnSniperBeamEffect(startPosition, endPosition, config) {
    sniperBeamVector.copy(endPosition).sub(startPosition);
    const length = Math.max(0.01, sniperBeamVector.length());
    const beamWidth = Math.max(0.02, Number(config?.beamWidth) || 0.09);
    const beamDuration = Math.max(0.01, Number(config?.beamDuration) || 0.08);

    const beamGeometry = new THREE.CylinderGeometry(
      beamWidth * 0.5,
      beamWidth * 0.5,
      length,
      8,
      1,
      true
    );
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: Number.isFinite(Number(config?.beamColor))
        ? Number(config.beamColor)
        : defaultSniperBeamColor,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    beamMaterial.toneMapped = false;
    const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
    beamMesh.position.copy(startPosition).addScaledVector(sniperBeamVector, 0.5);
    beamMesh.quaternion.setFromUnitVectors(yAxis, sniperBeamVector.normalize());
    scene.add(beamMesh);
    sniperBeamEffects.push({
      mesh: beamMesh,
      material: beamMaterial,
      life: beamDuration,
      maxLife: beamDuration,
    });
  }

  function spawnBazookaExplosion(position, splashRadius, durationSeconds) {
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: defaultBazookaExplosionColor,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    explosionMaterial.toneMapped = false;
    const explosionMesh = new THREE.Mesh(bazookaExplosionGeometry, explosionMaterial);
    explosionMesh.position.copy(position);
    scene.add(explosionMesh);
    bazookaExplosionEffects.push({
      mesh: explosionMesh,
      material: explosionMaterial,
      life: durationSeconds,
      maxLife: durationSeconds,
      splashRadius: Math.max(0.1, splashRadius),
    });
  }

  function getSniperBlockerDistance(obstacles, maxRange) {
    for (let distance = 0; distance <= maxRange; distance += sniperRayStepDistance) {
      sniperRayPoint.copy(sniperRayOrigin).addScaledVector(sniperRayDirection, distance);
      if (pointHitsObstacle(sniperRayPoint, obstacles, towerHitPadding)) {
        return distance;
      }
    }
    return maxRange;
  }

  function isEnemyBodyRaycastHit(intersection, enemyMesh) {
    const hitObject = intersection?.object;
    if (!hitObject || hitObject.isMesh !== true) {
      return false;
    }
    if (hitObject.geometry?.type !== "BoxGeometry") {
      return false;
    }
    return hitObject.parent?.parent === enemyMesh;
  }

  function findSniperRaycastTarget(enemies, maxDistance) {
    sniperRaycaster.near = 0;
    sniperRaycaster.far = Math.max(0.01, maxDistance);
    sniperRaycaster.set(sniperRayOrigin, sniperRayDirection);

    let bestEnemyMesh = null;
    let bestDistance = maxDistance;

    for (const enemyMesh of enemies) {
      if (!enemyMesh) {
        continue;
      }
      enemyMesh.updateWorldMatrix(true, true);
      const intersections = sniperRaycaster.intersectObject(enemyMesh, true);
      if (!Array.isArray(intersections) || intersections.length === 0) {
        continue;
      }
      for (const intersection of intersections) {
        if (!isEnemyBodyRaycastHit(intersection, enemyMesh)) {
          continue;
        }
        const distance = Number(intersection.distance);
        if (!Number.isFinite(distance) || distance < 0 || distance > maxDistance) {
          break;
        }
        if (distance < bestDistance) {
          bestDistance = distance;
          bestEnemyMesh = enemyMesh;
        }
        break;
      }
    }

    return {
      enemyMesh: bestEnemyMesh,
      distance: bestDistance,
    };
  }

  function fireSniper(enemySystem) {
    const config = getWeaponConfig("sniper");
    if (!config || weaponCooldownRemaining > 0) {
      return false;
    }

    camera.getWorldPosition(sniperRayOrigin);
    camera.getWorldDirection(sniperRayDirection).normalize();
    const maxRange = Math.max(0.1, Number(config.maxRange) || 140);
    const obstacles = getCombatObstacles();
    const enemies = enemySystem && typeof enemySystem.getDamageableEnemies === "function"
      ? enemySystem.getDamageableEnemies()
      : [];
    const blockerDistance = getSniperBlockerDistance(obstacles, maxRange);
    const raycastHit = findSniperRaycastTarget(enemies, blockerDistance);
    const hitEnemyMesh = raycastHit.enemyMesh;
    const hitDistance = Number.isFinite(raycastHit.distance)
      ? Math.min(blockerDistance, Math.max(0.01, raycastHit.distance))
      : blockerDistance;

    if (
      hitEnemyMesh
      && enemySystem
      && typeof enemySystem.applyDamageToEnemyMesh === "function"
    ) {
      enemySystem.applyDamageToEnemyMesh(
        hitEnemyMesh,
        Math.max(0, Number(config.damage) || 0) * getWeaponDamageMultiplier("sniper")
      );
    }

    gunBarrel.getWorldPosition(sniperBeamStart);
    projectileImpactWorldPos.copy(sniperRayOrigin).addScaledVector(
      sniperRayDirection,
      Math.max(0.01, hitDistance)
    );
    spawnSniperBeamEffect(sniperBeamStart, projectileImpactWorldPos, config);
    emitWeaponVisualEvent({
      kind: "sniper_beam",
      weaponType: "sniper",
      start: {
        x: sniperBeamStart.x,
        y: sniperBeamStart.y,
        z: sniperBeamStart.z,
      },
      end: {
        x: projectileImpactWorldPos.x,
        y: projectileImpactWorldPos.y,
        z: projectileImpactWorldPos.z,
      },
      duration: Math.max(0.01, Number(config?.beamDuration) || 0.08),
      beamWidth: Math.max(0.02, Number(config?.beamWidth) || 0.09),
    });
    gunFlashTimer = gunFlashDuration;
    weaponCooldownRemaining = getWeaponFireInterval("sniper");
    return true;
  }

  function removeProjectile(index) {
    scene.remove(projectiles[index].mesh);
    projectiles.splice(index, 1);
  }

  function spawnProjectileImpact(position) {
    const root = new THREE.Group();
    root.position.copy(position);

    const flashMaterial = new THREE.MeshBasicMaterial({
      color: PLAYER_CONFIG.projectileImpact.flashColor,
      transparent: true,
      opacity: PLAYER_CONFIG.projectileImpact.flashOpacity,
      depthWrite: false,
    });
    flashMaterial.toneMapped = false;
    const flash = new THREE.Mesh(projectileImpactFlashGeometry, flashMaterial);
    root.add(flash);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: PLAYER_CONFIG.projectileImpact.ringColor,
      transparent: true,
      opacity: PLAYER_CONFIG.projectileImpact.ringOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    ringMaterial.toneMapped = false;
    const ring = new THREE.Mesh(projectileImpactRingGeometry, ringMaterial);
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = PLAYER_CONFIG.projectileImpact.ringYOffset;
    root.add(ring);

    scene.add(root);
    projectileImpacts.push({
      root,
      flash,
      ring,
      life: projectileImpactDuration,
      maxLife: projectileImpactDuration,
    });
  }

  function updateProjectileImpacts(deltaSeconds) {
    for (let i = projectileImpacts.length - 1; i >= 0; i -= 1) {
      const impact = projectileImpacts[i];
      impact.life -= deltaSeconds;
      const t = Math.max(0, impact.life / impact.maxLife);
      const invT = 1 - t;

      impact.flash.material.opacity = PLAYER_CONFIG.projectileImpact.flashOpacity * t;
      impact.ring.material.opacity = PLAYER_CONFIG.projectileImpact.ringOpacity * t;
      impact.flash.scale.setScalar(1 + invT * PLAYER_CONFIG.projectileImpact.flashExpand);
      impact.ring.scale.setScalar(1 + invT * PLAYER_CONFIG.projectileImpact.ringExpand);

      if (impact.life <= 0) {
        scene.remove(impact.root);
        impact.flash.material.dispose();
        impact.ring.material.dispose();
        projectileImpacts.splice(i, 1);
      }
    }
  }

  function updateSniperBeamEffects(deltaSeconds) {
    for (let i = sniperBeamEffects.length - 1; i >= 0; i -= 1) {
      const beamEffect = sniperBeamEffects[i];
      beamEffect.life -= deltaSeconds;
      const t = Math.max(0, beamEffect.life / beamEffect.maxLife);
      beamEffect.material.opacity = 0.9 * t;
      if (beamEffect.life <= 0) {
        scene.remove(beamEffect.mesh);
        beamEffect.mesh.geometry.dispose();
        beamEffect.material.dispose();
        sniperBeamEffects.splice(i, 1);
      }
    }
  }

  function updateBazookaExplosionEffects(deltaSeconds) {
    for (let i = bazookaExplosionEffects.length - 1; i >= 0; i -= 1) {
      const explosion = bazookaExplosionEffects[i];
      explosion.life -= deltaSeconds;
      const t = Math.max(0, explosion.life / explosion.maxLife);
      const invT = 1 - t;
      const scale = explosion.splashRadius * (0.2 + invT * 0.8);
      explosion.mesh.scale.setScalar(Math.max(0.01, scale));
      explosion.material.opacity = 0.72 * t;
      if (explosion.life <= 0) {
        scene.remove(explosion.mesh);
        explosion.material.dispose();
        bazookaExplosionEffects.splice(i, 1);
      }
    }
  }

  function findProjectileEnemyHit(projectile, enemySystem, enemies) {
    if (!enemySystem || !Array.isArray(enemies) || enemies.length === 0) {
      return null;
    }

    let closestEnemyMesh = null;
    let closestDistSq = Number.POSITIVE_INFINITY;

    for (const enemyMesh of enemies) {
      if (!enemyMesh || !enemyMesh.position) {
        continue;
      }

      const hitRadius = Math.max(0, Number(projectile.hitRadius) || 0);
      const enemyRadius = Number(enemyMesh.userData?.hitSphereRadius);
      const enemyHalfSize = Number(enemyMesh.userData?.bodyHalfSize);
      const collisionRadius = Number.isFinite(enemyHalfSize)
        ? enemyHalfSize
        : (Number.isFinite(enemyRadius) ? enemyRadius : 0);
      projectileEnemyCollisionCenter.copy(enemyMesh.position);
      const centerOffsetY = enemyMesh.userData?.bodyCenterOffsetY;
      if (typeof centerOffsetY === "number") {
        projectileEnemyCollisionCenter.y += centerOffsetY;
      }
      const maxHitDistance = collisionRadius + hitRadius;
      const distSq = projectileEnemyCollisionCenter.distanceToSquared(projectile.mesh.position);
      let intersects = false;
      if (typeof enemySystem.isPointNearEnemyMesh === "function") {
        intersects = enemySystem.isPointNearEnemyMesh(
          enemyMesh,
          projectile.mesh.position,
          hitRadius
        );
      } else {
        intersects = distSq <= maxHitDistance * maxHitDistance;
      }
      if (!intersects) {
        continue;
      }

      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closestEnemyMesh = enemyMesh;
      }
    }

    return closestEnemyMesh;
  }

  function updateProjectiles(deltaSeconds, enemySystem) {
    const obstacles = getCombatObstacles();
    const enemies = enemySystem && typeof enemySystem.getDamageableEnemies === "function"
      ? enemySystem.getDamageableEnemies()
      : [];

    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = projectiles[i];
      projectile.velocity.y -= Math.max(0, Number(projectile.gravity) || 0) * deltaSeconds;
      projectile.mesh.position.addScaledVector(projectile.velocity, deltaSeconds);
      projectile.life -= deltaSeconds;

      const hitEnemyMesh = findProjectileEnemyHit(projectile, enemySystem, enemies);
      const hitObstacle = pointHitsObstacle(projectile.mesh.position, obstacles, towerHitPadding);
      const surfaceY = getSurfaceCollisionYAtWorld(projectile.mesh.position.x, projectile.mesh.position.z);
      const hitGround = Number.isFinite(surfaceY) && projectile.mesh.position.y <= surfaceY;
      const tooFarFromPlayer =
        projectile.mesh.position.distanceToSquared(camera.position) > projectileMaxDistanceFromPlayerSq;

      if (projectile.kind === "bazooka") {
        const shouldExplode = !!hitEnemyMesh || hitObstacle || hitGround || projectile.life <= 0;
        if (shouldExplode) {
          projectileImpactWorldPos.copy(projectile.mesh.position);
          if (hitGround && Number.isFinite(surfaceY)) {
            projectileImpactWorldPos.y = surfaceY;
          }
          spawnProjectileImpact(projectileImpactWorldPos);
          spawnBazookaExplosion(
            projectileImpactWorldPos,
            Math.max(0.1, Number(projectile.splashRadius) || 0.1),
            Math.max(0.01, Number(projectile.explosionDuration) || 0.22)
          );
          if (enemySystem && typeof enemySystem.applyDamageAtPoint === "function") {
            enemySystem.applyDamageAtPoint(
              projectileImpactWorldPos,
              Math.max(0, Number(projectile.splashRadius) || 0),
              Math.max(0, Number(projectile.damage) || 0)
            );
          }
          removeProjectile(i);
          continue;
        }
        if (tooFarFromPlayer) {
          removeProjectile(i);
        }
        continue;
      }

      if (hitGround) {
        projectileImpactWorldPos.copy(projectile.mesh.position);
        if (Number.isFinite(surfaceY)) {
          projectileImpactWorldPos.y = surfaceY;
        }
        spawnProjectileImpact(projectileImpactWorldPos);
        removeProjectile(i);
        continue;
      }

      if (hitEnemyMesh) {
        if (
          enemySystem
          && typeof enemySystem.applyDamageToEnemyMesh === "function"
        ) {
          enemySystem.applyDamageToEnemyMesh(hitEnemyMesh, Math.max(0, Number(projectile.damage) || 0));
        }
        spawnProjectileImpact(projectile.mesh.position);
        removeProjectile(i);
        continue;
      }

      if (hitObstacle) {
        spawnProjectileImpact(projectile.mesh.position);
        removeProjectile(i);
        continue;
      }

      if (projectile.life <= 0 || tooFarFromPlayer) {
        removeProjectile(i);
      }
    }
  }

  function updateSniperZoom(deltaSeconds) {
    const sniperConfig = getWeaponConfig("sniper");
    if (!sniperConfig) {
      if (Math.abs(camera.fov - baseCameraFov) > 1e-4) {
        camera.fov = baseCameraFov;
        camera.updateProjectionMatrix();
      }
      return;
    }

    const zoomInSpeed = Math.max(0.1, Number(sniperConfig.zoomInSpeed) || 10);
    const zoomOutSpeed = Math.max(0.1, Number(sniperConfig.zoomOutSpeed) || 8);
    const shouldZoomIn = selectedWeaponType === "sniper" && primaryHeld && !isMenuMode;
    const delta = shouldZoomIn ? (zoomInSpeed * deltaSeconds) : (-zoomOutSpeed * deltaSeconds);
    sniperZoomProgress = Math.max(0, Math.min(1, sniperZoomProgress + delta));

    const targetZoomFov = Math.max(1, Number(sniperConfig.zoomFov) || defaultSniperZoomFov);
    const targetFov = THREE.MathUtils.lerp(baseCameraFov, targetZoomFov, sniperZoomProgress);
    if (Math.abs(camera.fov - targetFov) > 1e-4) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }
  }

  function updateWeaponFiring(deltaSeconds, enemySystem) {
    weaponCooldownRemaining = Math.max(0, weaponCooldownRemaining - Math.max(0, deltaSeconds));

    if (selectedWeaponType === "sniper") {
      if (primaryReleasedSinceLastUpdate && !isMenuMode) {
        fireSniper(enemySystem);
      }
      primaryReleasedSinceLastUpdate = false;
      return;
    }

    primaryReleasedSinceLastUpdate = false;
    if (!primaryHeld || isMenuMode) {
      return;
    }

    if (weaponCooldownRemaining > 0) {
      return;
    }

    if (selectedWeaponType === "machineGun") {
      fireMachineGun();
      return;
    }
    if (selectedWeaponType === "bazooka") {
      fireBazooka();
    }
  }

  function updateLook() {
    if (controls.isLocked) {
      yaw = camera.rotation.y;
      pitch = camera.rotation.x;
      return;
    }

    if (lookDeltaX === 0 && lookDeltaY === 0) {
      return;
    }

    yaw -= lookDeltaX * touchLookSensitivity;
    pitch -= lookDeltaY * touchLookSensitivity;
    pitch = Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitch));
    camera.rotation.set(pitch, yaw, 0);
    lookDeltaX = 0;
    lookDeltaY = 0;
  }

  function updateMovement(deltaSeconds) {
    const movementObstacles = typeof getMovementObstacles === "function"
      ? (Array.isArray(getMovementObstacles()) ? getMovementObstacles() : [])
      : [];
    const obstacles = movementObstacles.filter(
      (obstacle) => obstacle?.collidesWithPlayer !== false
    );

    function getSupportCameraYAtPosition(x, z, currentCameraY) {
      let supportY = eyeHeight;
      const feetY = currentCameraY - eyeHeight;

      for (const obstacle of obstacles) {
        if (obstacle?.kind === "ramp" && typeof obstacle.getSurfaceYAtWorld === "function") {
          const rampSurfaceY = obstacle.getSurfaceYAtWorld(x, z);
          if (!Number.isFinite(rampSurfaceY)) {
            continue;
          }
          const nearRampSurface = feetY >= (rampSurfaceY - TOWER_TOP_SNAP_DOWN)
            && feetY <= (rampSurfaceY + TOWER_TOP_SNAP_UP);
          if (nearRampSurface) {
            supportY = Math.max(supportY, rampSurfaceY + eyeHeight);
          }
          continue;
        }

        const obstaclePos = obstacle?.mesh?.position ?? obstacle?.position;
        if (obstacle?.kind === "cylinder") {
          if (obstacle?.supportsPlayer === false) {
            continue;
          }

          const obstacleRadius = Number(obstacle?.radius);
          const obstacleHeight = Number(obstacle?.height);
          const obstacleBaseY = obstacle?.baseY ?? 0;
          if (
            !obstaclePos
            || !Number.isFinite(obstacleRadius)
            || obstacleRadius <= 0
            || !Number.isFinite(obstacleHeight)
            || obstacleHeight <= 0
          ) {
            continue;
          }

          const topY = obstacleBaseY + obstacleHeight;
          const dx = x - obstaclePos.x;
          const dz = z - obstaclePos.z;
          const withinTop = ((dx * dx) + (dz * dz))
            <= Math.pow(obstacleRadius + SUPPORT_EDGE_EPSILON, 2);
          const nearTop = feetY >= (topY - TOWER_TOP_SNAP_DOWN) && feetY <= (topY + TOWER_TOP_SNAP_UP);
          if (withinTop && nearTop) {
            supportY = Math.max(supportY, topY + eyeHeight);
          }
          continue;
        }

        const obstacleHalfSizeX = Number.isFinite(Number(obstacle?.halfSizeX))
          ? Number(obstacle.halfSizeX)
          : Number(obstacle?.halfSize);
        const obstacleHalfSizeZ = Number.isFinite(Number(obstacle?.halfSizeZ))
          ? Number(obstacle.halfSizeZ)
          : Number(obstacle?.halfSize);
        const obstacleHeight = obstacle?.height;
        const obstacleBaseY = obstacle?.baseY ?? 0;
        if (
          !obstaclePos
          || !Number.isFinite(obstacleHalfSizeX)
          || !Number.isFinite(obstacleHalfSizeZ)
          || typeof obstacleHeight !== "number"
        ) {
          continue;
        }

        const topY = obstacleBaseY + obstacleHeight;
        const insetRatio = Number.isFinite(obstacle?.topInsetFromRadius)
          ? obstacle.topInsetFromRadius
          : PLAYER_CONFIG.collision.towerTopInsetFromRadius;
        const supportHalfX = Math.max(0, obstacleHalfSizeX - PLAYER_COLLISION_RADIUS * insetRatio);
        const supportHalfZ = Math.max(0, obstacleHalfSizeZ - PLAYER_COLLISION_RADIUS * insetRatio);
        const withinTopX = Math.abs(x - obstaclePos.x)
          <= (supportHalfX + SUPPORT_EDGE_EPSILON);
        const withinTopZ = Math.abs(z - obstaclePos.z)
          <= (supportHalfZ + SUPPORT_EDGE_EPSILON);
        const nearTop = feetY >= (topY - TOWER_TOP_SNAP_DOWN) && feetY <= (topY + TOWER_TOP_SNAP_UP);
        if (withinTopX && withinTopZ && nearTop) {
          supportY = Math.max(supportY, topY + eyeHeight);
        }
      }

      return supportY;
    }

    const keyboardForward = Number(moveState.forward) - Number(moveState.backward);
    const keyboardStrafe = Number(moveState.right) - Number(moveState.left);
    const usingVirtual =
      Math.abs(virtualState.forward) > PLAYER_CONFIG.movement.virtualDeadzone
      || Math.abs(virtualState.strafe) > PLAYER_CONFIG.movement.virtualDeadzone;
    const canMove = controls.isLocked || usingVirtual;

    if (canMove) {
      const forwardAxis = (controls.isLocked ? keyboardForward : 0) + virtualState.forward;
      const strafeAxis = (controls.isLocked ? keyboardStrafe : 0) + virtualState.strafe;
      const length = Math.hypot(forwardAxis, strafeAxis);
      const activeMoveSpeed = moveSpeed
        * playerMovementSpeedMultiplier
        * (controls.isLocked && moveState.sprint ? sprintMultiplier : 1);

      if (length > 0) {
        controls.moveForward((forwardAxis / length) * activeMoveSpeed * deltaSeconds);
        controls.moveRight((strafeAxis / length) * activeMoveSpeed * deltaSeconds);
      }
    }

    const currentSupportY = getSupportCameraYAtPosition(camera.position.x, camera.position.z, camera.position.y);
    const isGrounded = camera.position.y <= currentSupportY + PLAYER_CONFIG.movement.groundedEpsilon;
    if (!movementAudioInitialized) {
      movementAudioInitialized = true;
      movementAudioWasGrounded = isGrounded;
    }
    if (jumpQueued && isGrounded) {
      verticalVelocity = jumpVelocity;
      movementAudioWasGrounded = false;
      emitMovementAudioEvent({
        kind: "jump",
        position: getMovementAudioPosition(),
      });
    }
    jumpQueued = false;

    const isTryingJetpack = jumpHeld && !isGrounded;
    const usingJetpack = isTryingJetpack && (hasInfiniteJetpackFuel || jetpackFuel > 0);
    if (usingJetpack && !movementAudioJetpackActive) {
      movementAudioJetpackActive = true;
      emitMovementAudioEvent({
        kind: "jetpack_start",
        position: getMovementAudioPosition(),
      });
    } else if (!usingJetpack && movementAudioJetpackActive) {
      stopJetpackAudio();
    }
    if (usingJetpack) {
      if (hasInfiniteJetpackFuel) {
        jetpackFuel = jetpackMaxFuel;
      } else {
        const burnRate = jetpackBurnRate / Math.max(1e-6, jetpackFuelEfficiencyMultiplier);
        jetpackFuel = Math.max(0, jetpackFuel - burnRate * deltaSeconds);
      }
      verticalVelocity = Math.min(
        jetpackMaxRiseSpeed,
        verticalVelocity + jetpackAcceleration * deltaSeconds
      );
    } else if (!isTryingJetpack) {
      if (hasInfiniteJetpackFuel) {
        jetpackFuel = jetpackMaxFuel;
      } else {
        const rechargeRate = isGrounded ? jetpackGroundRechargeRate : jetpackAirRechargeRate;
        jetpackFuel = Math.min(jetpackMaxFuel, jetpackFuel + rechargeRate * deltaSeconds);
      }
    }

    verticalVelocity -= gravity * deltaSeconds;
    const verticalVelocityBeforeGroundClamp = verticalVelocity;
    camera.position.y += verticalVelocity * deltaSeconds;

    const supportAfterVertical = getSupportCameraYAtPosition(camera.position.x, camera.position.z, camera.position.y);
    let landingImpactSpeed = 0;
    let landedThisFrame = false;
    if (camera.position.y < supportAfterVertical) {
      landedThisFrame = !movementAudioWasGrounded && verticalVelocityBeforeGroundClamp < -1.15;
      landingImpactSpeed = Math.abs(verticalVelocityBeforeGroundClamp);
      camera.position.y = supportAfterVertical;
      verticalVelocity = 0;
    }

    if (obstacles.length > 0) {
      for (let pass = 0; pass < PLAYER_CONFIG.movement.collisionPasses; pass += 1) {
        for (const obstacle of obstacles) {
          if (obstacle?.kind === "ramp") {
            const obstaclePos = obstacle?.position;
            const obstacleBaseY = Number(obstacle?.baseY ?? 0);
            const obstacleHeight = Number(obstacle?.height);
            const obstacleDirection = obstacle?.direction;
            const obstacleHalfSizeX = Number(obstacle?.halfSizeX ?? obstacle?.halfSize);
            const obstacleHalfSizeZ = Number(obstacle?.halfSizeZ ?? obstacle?.halfSize);

            if (
              !obstaclePos
              || !Number.isFinite(obstacleHeight)
              || obstacleHeight <= 0
              || !Number.isFinite(obstacleHalfSizeX)
              || !Number.isFinite(obstacleHalfSizeZ)
              || !obstacleDirection
            ) {
              continue;
            }

            const dirXRaw = Number(obstacleDirection.x);
            const dirZRaw = Number(obstacleDirection.z);
            const dirLength = Math.hypot(dirXRaw, dirZRaw);
            if (dirLength <= PLAYER_CONFIG.collision.minDistanceSq) {
              continue;
            }
            const dirX = dirXRaw / dirLength;
            const dirZ = dirZRaw / dirLength;
            const rightX = -dirZ;
            const rightZ = dirX;
            const rampRunsMostlyAlongX = Math.abs(dirX) >= Math.abs(dirZ);
            const rampAlongHalf = rampRunsMostlyAlongX ? obstacleHalfSizeX : obstacleHalfSizeZ;
            const rampAcrossHalf = rampRunsMostlyAlongX ? obstacleHalfSizeZ : obstacleHalfSizeX;
            if (
              !Number.isFinite(rampAlongHalf)
              || !Number.isFinite(rampAcrossHalf)
              || rampAlongHalf <= 0
              || rampAcrossHalf <= 0
            ) {
              continue;
            }

            const lowCenterX = obstaclePos.x - (dirX * rampAlongHalf * 0.5);
            const lowCenterZ = obstaclePos.z - (dirZ * rampAlongHalf * 0.5);
            const deltaX = camera.position.x - lowCenterX;
            const deltaZ = camera.position.z - lowCenterZ;
            const along = (deltaX * dirX) + (deltaZ * dirZ);
            const across = (deltaX * rightX) + (deltaZ * rightZ);
            const alongMin = -rampAcrossHalf;
            const alongMax = rampAlongHalf + rampAcrossHalf;
            if (along < alongMin || along > alongMax) {
              continue;
            }

            const playerFeetY = camera.position.y - eyeHeight;
            const playerHeadY = camera.position.y + PLAYER_HEAD_CLEARANCE;
            const alongT = THREE.MathUtils.clamp(
              (along - alongMin) / Math.max(1e-6, alongMax - alongMin),
              0,
              1
            );
            const sideTopY = obstacleBaseY + (obstacleHeight * alongT);
            const verticalOverlap = playerHeadY > obstacleBaseY
              && playerFeetY < (sideTopY - SUPPORT_EDGE_EPSILON);
            if (!verticalOverlap) {
              continue;
            }

            const previousDeltaX = movementStartPosition.x - lowCenterX;
            const previousDeltaZ = movementStartPosition.z - lowCenterZ;
            const previousAcross = (previousDeltaX * rightX) + (previousDeltaZ * rightZ);
            let sideSign = across >= 0 ? 1 : -1;
            let pushDistance = 0;

            if (Math.abs(across) > rampAcrossHalf) {
              const sideDistance = Math.abs(across) - rampAcrossHalf;
              if (sideDistance >= PLAYER_COLLISION_RADIUS) {
                continue;
              }
              pushDistance = PLAYER_COLLISION_RADIUS - sideDistance;
            } else {
              const crossedFromOutsideThisFrame = Math.abs(previousAcross) > (rampAcrossHalf + 1e-5);
              if (!crossedFromOutsideThisFrame) {
                continue;
              }
              sideSign = previousAcross >= 0 ? 1 : -1;
              const targetAcross = sideSign * (rampAcrossHalf + PLAYER_COLLISION_RADIUS);
              pushDistance = Math.abs(targetAcross - across);
              if (pushDistance <= 0) {
                continue;
              }
            }

            camera.position.x += rightX * sideSign * pushDistance;
            camera.position.z += rightZ * sideSign * pushDistance;
            continue;
          }

          const obstaclePos = obstacle?.mesh?.position ?? obstacle?.position;
          if (obstacle?.kind === "cylinder") {
            const obstacleRadius = Number(obstacle?.radius);
            const obstacleHeight = Number(obstacle?.height);
            const obstacleBaseY = obstacle?.baseY ?? 0;

            if (
              !obstaclePos
              || !Number.isFinite(obstacleRadius)
              || obstacleRadius <= 0
              || !Number.isFinite(obstacleHeight)
              || obstacleHeight <= 0
            ) {
              continue;
            }

            const playerFeetY = camera.position.y - eyeHeight;
            const playerHeadY = camera.position.y + PLAYER_HEAD_CLEARANCE;
            const obstacleTopY = obstacleBaseY + obstacleHeight;
            const verticalOverlap = playerHeadY > obstacleBaseY && playerFeetY < obstacleTopY;
            if (!verticalOverlap) {
              continue;
            }

            const dx = camera.position.x - obstaclePos.x;
            const dz = camera.position.z - obstaclePos.z;
            const minDistance = PLAYER_COLLISION_RADIUS + obstacleRadius;
            const distSq = (dx * dx) + (dz * dz);
            if (distSq >= (minDistance * minDistance)) {
              continue;
            }

            if (distSq <= MIN_COLLISION_DISTANCE_SQ) {
              const prevDx = movementStartPosition.x - obstaclePos.x;
              const prevDz = movementStartPosition.z - obstaclePos.z;
              const prevDistSq = (prevDx * prevDx) + (prevDz * prevDz);
              if (prevDistSq > MIN_COLLISION_DISTANCE_SQ) {
                const prevDist = Math.sqrt(prevDistSq);
                camera.position.x = obstaclePos.x + (prevDx / prevDist) * minDistance;
                camera.position.z = obstaclePos.z + (prevDz / prevDist) * minDistance;
              } else {
                camera.position.x += minDistance;
              }
              continue;
            }

            const dist = Math.sqrt(distSq);
            const push = (minDistance - dist) / dist;
            camera.position.x += dx * push;
            camera.position.z += dz * push;
            continue;
          }

          const obstacleHalfSizeX = Number.isFinite(Number(obstacle?.halfSizeX))
            ? Number(obstacle.halfSizeX)
            : Number(obstacle?.halfSize);
          const obstacleHalfSizeZ = Number.isFinite(Number(obstacle?.halfSizeZ))
            ? Number(obstacle.halfSizeZ)
            : Number(obstacle?.halfSize);
          const obstacleHeight = obstacle?.height;
          const obstacleBaseY = obstacle?.baseY ?? 0;

          if (
            obstaclePos
            && Number.isFinite(obstacleHalfSizeX)
            && Number.isFinite(obstacleHalfSizeZ)
            && typeof obstacleHeight === "number"
          ) {
            const playerFeetY = camera.position.y - eyeHeight;
            const playerHeadY = camera.position.y + PLAYER_HEAD_CLEARANCE;
            const obstacleTopY = obstacleBaseY + obstacleHeight;
            const isTerrainTopObstacle = Number.isFinite(obstacle?.topInsetFromRadius)
              && obstacle.topInsetFromRadius <= 0;
            const sideCollisionTopY = isTerrainTopObstacle
              ? Math.max(
                obstacleBaseY + SUPPORT_EDGE_EPSILON,
                obstacleTopY - TERRAIN_EDGE_SIDE_COLLISION_GRACE
              )
              : obstacleTopY;
            const verticalOverlap = playerHeadY > obstacleBaseY && playerFeetY < sideCollisionTopY;
            if (!verticalOverlap) {
              continue;
            }

            const expandedHalfX = obstacleHalfSizeX + PLAYER_COLLISION_RADIUS;
            const expandedHalfZ = obstacleHalfSizeZ + PLAYER_COLLISION_RADIUS;
            const localX = camera.position.x - obstaclePos.x;
            const localZ = camera.position.z - obstaclePos.z;
            if (Math.abs(localX) >= expandedHalfX || Math.abs(localZ) >= expandedHalfZ) {
              continue;
            }

            const stepUpDelta = obstacleTopY - playerFeetY;
            const canStepUp = isTerrainTopObstacle
              && stepUpDelta > 0
              && stepUpDelta <= STEP_UP_HEIGHT;
            if (canStepUp) {
              camera.position.y = obstacleTopY + eyeHeight;
              if (verticalVelocity < 0) {
                verticalVelocity = 0;
              }
              continue;
            }

            const penetrationX = expandedHalfX - Math.abs(localX);
            const penetrationZ = expandedHalfZ - Math.abs(localZ);
            if (penetrationX < penetrationZ) {
              const dirX = localX >= 0 ? 1 : -1;
              camera.position.x += dirX * penetrationX;
            } else {
              const dirZ = localZ >= 0 ? 1 : -1;
              camera.position.z += dirZ * penetrationZ;
            }
            continue;
          }

          const obstacleRadius = obstacle?.radius;
          if (!obstaclePos || typeof obstacleRadius !== "number") {
            continue;
          }

          const dx = camera.position.x - obstaclePos.x;
          const dz = camera.position.z - obstaclePos.z;
          const minDistance = PLAYER_COLLISION_RADIUS + obstacleRadius;
          const distSq = (dx * dx) + (dz * dz);
          if (distSq >= minDistance * minDistance) {
            continue;
          }

          if (distSq <= MIN_COLLISION_DISTANCE_SQ) {
            camera.position.x += minDistance;
            continue;
          }

          const dist = Math.sqrt(distSq);
          const push = (minDistance - dist) / dist;
          camera.position.x += dx * push;
          camera.position.z += dz * push;
        }
      }

      const supportAfterCollision = getSupportCameraYAtPosition(camera.position.x, camera.position.z, camera.position.y);
      if (camera.position.y < supportAfterCollision) {
        camera.position.y = supportAfterCollision;
        verticalVelocity = 0;
      }
    }

    if (clampedBounds) {
      const minX = Math.min(
        clampedBounds.minX + PLAYER_COLLISION_RADIUS,
        clampedBounds.maxX - PLAYER_COLLISION_RADIUS
      );
      const maxX = Math.max(
        clampedBounds.minX + PLAYER_COLLISION_RADIUS,
        clampedBounds.maxX - PLAYER_COLLISION_RADIUS
      );
      const minZ = Math.min(
        clampedBounds.minZ + PLAYER_COLLISION_RADIUS,
        clampedBounds.maxZ - PLAYER_COLLISION_RADIUS
      );
      const maxZ = Math.max(
        clampedBounds.minZ + PLAYER_COLLISION_RADIUS,
        clampedBounds.maxZ - PLAYER_COLLISION_RADIUS
      );
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, minX, maxX);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, minZ, maxZ);
    }

    const finalSupportY = getSupportCameraYAtPosition(camera.position.x, camera.position.z, camera.position.y);
    const isGroundedAfterMovement = camera.position.y <= finalSupportY + PLAYER_CONFIG.movement.groundedEpsilon;
    if (landedThisFrame && isGroundedAfterMovement) {
      emitMovementAudioEvent({
        kind: "land",
        position: getMovementAudioPosition(),
        impactSpeed: landingImpactSpeed,
      });
    }
    movementAudioWasGrounded = isGroundedAfterMovement;
  }

  function update(deltaSeconds, enemySystem) {
    updateLook();
    movementStartPosition.copy(camera.position);
    updateMovement(deltaSeconds);
    updateWeaponFiring(deltaSeconds, enemySystem);
    updateSniperZoom(deltaSeconds);
    const movementSpeed = deltaSeconds > 0
      ? movementStartPosition.distanceTo(camera.position) / deltaSeconds
      : 0;
    updateGunVisuals(deltaSeconds, movementSpeed);
    updateProjectiles(deltaSeconds, enemySystem);
    updateProjectileImpacts(deltaSeconds);
    updateSniperBeamEffects(deltaSeconds);
    updateBazookaExplosionEffects(deltaSeconds);
  }

  function resetMovement() {
    moveState.forward = false;
    moveState.backward = false;
    moveState.left = false;
    moveState.right = false;
    moveState.sprint = false;
    virtualState.forward = 0;
    virtualState.strafe = 0;
    jumpQueued = false;
    resetMovementAudioState();
    setJumpHeld(false);
  }

  function clearActiveProjectilesAndImpacts() {
    for (const projectile of projectiles) {
      if (projectile?.mesh?.parent) {
        scene.remove(projectile.mesh);
      }
    }
    projectiles.length = 0;

    for (const impact of projectileImpacts) {
      if (impact?.root?.parent) {
        scene.remove(impact.root);
      }
      impact?.flash?.material?.dispose?.();
      impact?.ring?.material?.dispose?.();
    }
    projectileImpacts.length = 0;

    for (const beamEffect of sniperBeamEffects) {
      if (beamEffect?.mesh?.parent) {
        scene.remove(beamEffect.mesh);
      }
      beamEffect?.mesh?.geometry?.dispose?.();
      beamEffect?.material?.dispose?.();
    }
    sniperBeamEffects.length = 0;

    for (const explosion of bazookaExplosionEffects) {
      if (explosion?.mesh?.parent) {
        scene.remove(explosion.mesh);
      }
      explosion?.material?.dispose?.();
    }
    bazookaExplosionEffects.length = 0;
  }

  function resetRunState() {
    resetMovement();
    setMenuMode(false);
    setPrimaryHeld(false);

    verticalVelocity = 0;
    gunFlashTimer = 0;
    hasInfiniteJetpackFuel = false;
    jetpackFuelEfficiencyMultiplier = 1;
    jetpackFuel = jetpackMaxFuel;

    playerDamageMultiplier = 1;
    playerFireRateMultiplier = 1;
    playerMovementSpeedMultiplier = 1;
    weaponDamageMultiplierByType.clear();
    weaponFireIntervalMultiplierByType.clear();
    weaponSplashRadiusMultiplierByType.clear();
    selectedWeaponType = defaultWeaponType;
    primaryHeld = false;
    primaryReleasedSinceLastUpdate = false;
    weaponCooldownRemaining = 0;
    sniperZoomProgress = 0;
    camera.fov = baseCameraFov;
    camera.updateProjectionMatrix();

    clearActiveProjectilesAndImpacts();
    applyWeaponVisualTheme(selectedWeaponType);
    updateReloadBar(1);
  }

  function getPosition() {
    return camera.position;
  }

  return {
    controls,
    update,
    jump,
    requestPointerLock() {
      if (isTouchDevice || controls.isLocked || lockRequestPending) {
        return false;
      }
      if (document.pointerLockElement === controls.domElement) {
        return true;
      }
      lockRequestPending = true;
      lockRetryPending = false;
      requestPointerLock(0);
      return true;
    },
    setPrimaryHeld,
    setWeaponType,
    getWeaponType,
    addLookInput,
    setVirtualMove,
    setJumpHeld,
    resetMovement,
    resetRunState,
    getPosition,
    getJetpackFuelRatio,
    getJetpackFuelPercent,
    applyTechGrants,
    upgradePlayerDamage,
    upgradePlayerFireRate,
    upgradeJetpackFuelEfficiency,
    setMenuMode,
    disableJetpackFuelConsumption,
  };
}
