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
  const chargeDotReadyColor = new THREE.Color(PLAYER_CONFIG.gun.reloadBarReadyColor);
  const chargeDotChargingColor = new THREE.Color(PLAYER_CONFIG.gun.reloadBarReloadColor);
  const chargeDotEmptyColor = new THREE.Color(PLAYER_CONFIG.gun.reloadBarTrackColor);
  const chargeDotCurrentColor = new THREE.Color();
  const chargeDotGeometry = new THREE.SphereGeometry(
    Math.max(0.003, reloadBarHeight * 0.26),
    10,
    8
  );
  const chargeDotsGroup = new THREE.Group();
  chargeDotsGroup.position.set(0, reloadBarHeight * 1.45, reloadBarDepth * 0.5);
  reloadBarGroup.add(chargeDotsGroup);
  let chargeDots = [];

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

  const projectileGeometry = new THREE.BoxGeometry(
    PLAYER_CONFIG.weapon.projectileSize,
    PLAYER_CONFIG.weapon.projectileSize,
    PLAYER_CONFIG.weapon.projectileSize
  );
  const projectileMaterial = new THREE.MeshStandardMaterial({
    color: PLAYER_CONFIG.weapon.projectileColor,
    emissive: PLAYER_CONFIG.weapon.projectileEmissive,
    emissiveIntensity: PLAYER_CONFIG.weapon.projectileEmissiveIntensity,
    roughness: PLAYER_CONFIG.weapon.projectileRoughness,
    metalness: PLAYER_CONFIG.weapon.projectileMetalness,
  });
  const projectileVelocity = new THREE.Vector3();
  const projectileDirection = new THREE.Vector3();
  const projectileEnemyCollisionCenter = new THREE.Vector3();
  const projectiles = [];
  const projectileImpacts = [];
  const projectileSpeed = PLAYER_CONFIG.weapon.projectileSpeed;
  const projectileLifetime = PLAYER_CONFIG.weapon.projectileLifetime;
  const projectileDamage = PLAYER_CONFIG.weapon.projectileDamage;
  const projectileHitRadius = PLAYER_CONFIG.weapon.projectileHitRadius;
  const projectileGravity = PLAYER_CONFIG.weapon.projectileGravity;
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
  const projectileMaxDistanceFromPlayerSq = Math.pow((GAME_CONFIG.grid.cellSize * 20), 2);
  const baseFireCooldown = Math.max(0.001, Number(PLAYER_CONFIG.weapon.baseFireCooldown) || 0.001);
  const baseMaxCharges = Math.max(1, Math.floor(Number(PLAYER_CONFIG.weapon.baseMaxCharges) || 1));
  const baseStartingCharges = Math.max(0, Math.floor(Number(PLAYER_CONFIG.weapon.startingCharges) || 1));
  const baseBurstShotDelay = Math.max(0, Number(PLAYER_CONFIG.weapon.burstShotDelay) || 0);
  const baseWeaponPierce = Math.max(0, Math.floor(Number(PLAYER_CONFIG.weapon.basePierce) || 0));

  let currentFireCooldown = baseFireCooldown;
  let maxWeaponCharges = baseMaxCharges;
  let currentWeaponCharges = Math.min(maxWeaponCharges, baseStartingCharges);
  let chargeReloadProgress = 0;
  let shotDelayRemaining = 0;
  let currentBurstShotDelay = Math.max(0, baseBurstShotDelay);
  let weaponPierceCount = baseWeaponPierce;

  let playerDamageMultiplier = 1;
  let playerFireRateMultiplier = 1;

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

    const previousFireCooldown = currentFireCooldown;
    const previousBurstDelay = Math.max(0.0001, currentBurstShotDelay);
    playerFireRateMultiplier *= rateMultiplier;
    currentFireCooldown = Math.max(0.001, baseFireCooldown * playerFireRateMultiplier);
    currentBurstShotDelay = Math.max(0, baseBurstShotDelay * playerFireRateMultiplier);

    if (currentWeaponCharges < maxWeaponCharges && previousFireCooldown > 0) {
      const progressRatio = chargeReloadProgress / previousFireCooldown;
      chargeReloadProgress = Math.max(0, Math.min(currentFireCooldown, progressRatio * currentFireCooldown));
    }

    if (shotDelayRemaining > 0) {
      const shotDelayRatio = shotDelayRemaining / previousBurstDelay;
      shotDelayRemaining = Math.max(0, Math.min(currentBurstShotDelay, shotDelayRatio * currentBurstShotDelay));
    }
  }

  function upgradeJetpackFuelEfficiency(multiplier = 2) {
    const efficiencyMultiplier = Number(multiplier);
    if (!Number.isFinite(efficiencyMultiplier) || efficiencyMultiplier <= 0) {
      return;
    }
    jetpackFuelEfficiencyMultiplier *= efficiencyMultiplier;
  }

  function upgradeWeaponMaxCharges(multiplier = 2) {
    const chargeMultiplier = Number(multiplier);
    if (!Number.isFinite(chargeMultiplier) || chargeMultiplier <= 0) {
      return;
    }

    const nextMaxCharges = Math.max(1, Math.round(maxWeaponCharges * chargeMultiplier));
    if (nextMaxCharges === maxWeaponCharges) {
      return;
    }

    maxWeaponCharges = nextMaxCharges;
    currentWeaponCharges = maxWeaponCharges;
    chargeReloadProgress = 0;
    rebuildChargeDots();
    updateReloadBar(1);
  }

  function upgradeWeaponPierce(addAmount = 1) {
    const pierceAdd = Math.floor(Number(addAmount));
    if (!Number.isFinite(pierceAdd) || pierceAdd <= 0) {
      return;
    }
    weaponPierceCount += pierceAdd;
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

  domElement.addEventListener("click", () => {
    if (isTouchDevice || controls.isLocked || lockRequestPending) {
      return;
    }
    if (document.pointerLockElement === controls.domElement) {
      return;
    }

    lockRequestPending = true;
    lockRetryPending = false;
    requestPointerLock(0);
  });

  let isMenuMode = false;
  function setMenuMode(mode) {
    isMenuMode = mode;
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

  function applyChargeDotLayout(mode = getWeaponHudLayoutMode()) {
    const maxDotsPerRow = 3;
    const dotStep = reloadBarHeight * 0.9;
    const rows = Math.max(1, Math.ceil(maxWeaponCharges / maxDotsPerRow));
    const rowOffsetBase = ((rows - 1) * dotStep) * 0.5;
    const isMobileLayout = mode !== "desktop";

    for (let i = 0; i < chargeDots.length; i += 1) {
      const dot = chargeDots[i];
      if (!dot) {
        continue;
      }
      const col = i % maxDotsPerRow;
      const row = Math.floor(i / maxDotsPerRow);
      const colsInRow = Math.min(maxDotsPerRow, maxWeaponCharges - (row * maxDotsPerRow));
      const x = isMobileLayout
        ? -((col + 1) * dotStep)
        : ((col * dotStep) - (((colsInRow - 1) * dotStep) * 0.5));
      const y = rowOffsetBase - (row * dotStep);
      dot.position.set(x, y, 0);
    }
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
    chargeDotsGroup.position.set(0, reloadBarHeight * 1.45, reloadBarDepth * 0.5);

    if (lastWeaponHudLayoutMode !== mode) {
      lastWeaponHudLayoutMode = mode;
      applyChargeDotLayout(mode);
    }
  }

  function rebuildChargeDots() {
    for (const dot of chargeDots) {
      chargeDotsGroup.remove(dot);
      dot.material.dispose();
    }
    chargeDots = [];

    for (let i = 0; i < maxWeaponCharges; i += 1) {
      const dot = new THREE.Mesh(
        chargeDotGeometry,
        new THREE.MeshBasicMaterial({
          color: PLAYER_CONFIG.gun.reloadBarTrackColor,
          transparent: true,
          opacity: 0.35,
        })
      );
      dot.material.toneMapped = false;
      chargeDotsGroup.add(dot);
      chargeDots.push(dot);
    }
    applyChargeDotLayout();
  }

  function updateChargeDots(reloadProgress) {
    if (chargeDots.length === 0) {
      return;
    }

    const fullCharges = Math.floor(currentWeaponCharges);
    const hasPartial = currentWeaponCharges < maxWeaponCharges;

    for (let i = 0; i < chargeDots.length; i += 1) {
      const dot = chargeDots[i];
      if (i < fullCharges) {
        dot.material.color.copy(chargeDotReadyColor);
        dot.material.opacity = 1;
      } else if (hasPartial && i === fullCharges) {
        chargeDotCurrentColor.lerpColors(
          chargeDotChargingColor,
          chargeDotReadyColor,
          Math.max(0, Math.min(1, reloadProgress))
        );
        dot.material.color.copy(chargeDotCurrentColor);
        dot.material.opacity = 0.45 + (Math.max(0, Math.min(1, reloadProgress)) * 0.55);
      } else {
        dot.material.color.copy(chargeDotEmptyColor);
        dot.material.opacity = 0.28;
      }
    }
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
    updateChargeDots(clampedProgress);
  }

  applyWeaponHudLayout();
  rebuildChargeDots();
  updateReloadBar(currentWeaponCharges >= maxWeaponCharges ? 1 : 0);

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

    const reloadProgress = currentWeaponCharges >= maxWeaponCharges
      ? 1
      : (currentFireCooldown > 0
        ? Math.max(0, Math.min(1, chargeReloadProgress / currentFireCooldown))
        : 1);
    updateReloadBar(reloadProgress);

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

  function tryShoot() {
    if (currentWeaponCharges <= 0 || shotDelayRemaining > 0) {
      return false;
    }

    camera.getWorldDirection(projectileDirection).normalize();
    const spawnWorldPos = new THREE.Vector3();
    gunBarrel.getWorldPosition(spawnWorldPos);

    // Slight offset forward from the visual tip
    spawnWorldPos.addScaledVector(projectileDirection, PLAYER_CONFIG.weapon.spawnForwardOffset);

    const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectileMesh.position.copy(spawnWorldPos);
    scene.add(projectileMesh);

    projectileVelocity.copy(projectileDirection).multiplyScalar(projectileSpeed);
    projectiles.push({
      mesh: projectileMesh,
      velocity: projectileVelocity.clone(),
      life: projectileLifetime,
      damage: projectileDamage * playerDamageMultiplier,
      remainingPierceHits: weaponPierceCount,
      hitEnemyMeshIds: new Set(),
    });

    gunFlashTimer = gunFlashDuration;
    currentWeaponCharges = Math.max(0, currentWeaponCharges - 1);
    shotDelayRemaining = currentBurstShotDelay;
    updateReloadBar(currentWeaponCharges >= maxWeaponCharges ? 1 : 0);
    return true;
  }

  function updateWeaponChargeRecharge(deltaSeconds) {
    if (currentWeaponCharges >= maxWeaponCharges) {
      chargeReloadProgress = 0;
      return;
    }

    chargeReloadProgress += Math.max(0, deltaSeconds);
    while (chargeReloadProgress >= currentFireCooldown && currentWeaponCharges < maxWeaponCharges) {
      chargeReloadProgress -= currentFireCooldown;
      currentWeaponCharges += 1;
    }

    if (currentWeaponCharges >= maxWeaponCharges) {
      currentWeaponCharges = maxWeaponCharges;
      chargeReloadProgress = 0;
    }
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

  function updateProjectiles(deltaSeconds, enemySystem) {
    const obstacles = typeof getMovementObstacles === "function"
      ? (Array.isArray(getMovementObstacles()) ? getMovementObstacles() : [])
      : [];

    function projectileHitsRampObstacle(position, obstacle, padding) {
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

    function projectileHitsTower(position) {
      const towerHitPadding = PLAYER_CONFIG.weapon.towerHitPadding;
      for (const obstacle of obstacles) {
        if (obstacle?.kind === "ramp") {
          if (projectileHitsRampObstacle(position, obstacle, towerHitPadding)) {
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

        const minX = obstaclePos.x - halfSizeX - towerHitPadding;
        const maxX = obstaclePos.x + halfSizeX + towerHitPadding;
        const minY = baseY - towerHitPadding;
        const maxY = baseY + height + towerHitPadding;
        const minZ = obstaclePos.z - halfSizeZ - towerHitPadding;
        const maxZ = obstaclePos.z + halfSizeZ + towerHitPadding;

        if (
          position.x >= minX &&
          position.x <= maxX &&
          position.y >= minY &&
          position.y <= maxY &&
          position.z >= minZ &&
          position.z <= maxZ
        ) {
          return true;
        }
      }
      return false;
    }

    function getProjectileEnemyHit(projectile) {
      if (!enemySystem || typeof enemySystem.getDamageableEnemies !== "function") {
        return null;
      }

      const enemies = enemySystem.getDamageableEnemies();
      if (!Array.isArray(enemies) || enemies.length === 0) {
        return null;
      }

      let closestEnemyMesh = null;
      let closestDistSq = Number.POSITIVE_INFINITY;

      for (const enemyMesh of enemies) {
        if (!enemyMesh || !enemyMesh.position) {
          continue;
        }
        if (projectile.hitEnemyMeshIds.has(enemyMesh.uuid)) {
          continue;
        }

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
        const maxHitDistance = collisionRadius + projectileHitRadius;
        const distSq = projectileEnemyCollisionCenter.distanceToSquared(projectile.mesh.position);
        let intersects = false;
        if (typeof enemySystem.isPointNearEnemyMesh === "function") {
          intersects = enemySystem.isPointNearEnemyMesh(
            enemyMesh,
            projectile.mesh.position,
            projectileHitRadius
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

    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = projectiles[i];
      projectile.velocity.y -= projectileGravity * deltaSeconds;
      projectile.mesh.position.addScaledVector(projectile.velocity, deltaSeconds);
      projectile.life -= deltaSeconds;

      const hitEnemyMesh = getProjectileEnemyHit(projectile);
      let hitEnemy = false;
      if (
        hitEnemyMesh
        && enemySystem
        && typeof enemySystem.applyDamageToEnemyMesh === "function"
      ) {
        hitEnemy = enemySystem.applyDamageToEnemyMesh(hitEnemyMesh, projectile.damage);
      }

      if (hitEnemy && hitEnemyMesh) {
        projectile.hitEnemyMeshIds.add(hitEnemyMesh.uuid);
        spawnProjectileImpact(projectile.mesh.position);
        if (projectile.remainingPierceHits > 0) {
          projectile.remainingPierceHits -= 1;
        } else {
          removeProjectile(i);
          continue;
        }
      }

      const tooFarFromPlayer =
        projectile.mesh.position.distanceToSquared(camera.position) > projectileMaxDistanceFromPlayerSq;

      const hitTower = projectileHitsTower(projectile.mesh.position);

      if (hitTower || projectile.life <= 0 || tooFarFromPlayer) {
        if (hitTower) {
          spawnProjectileImpact(projectile.mesh.position);
        }
        removeProjectile(i);
      }
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
    const obstacles = typeof getMovementObstacles === "function"
      ? (Array.isArray(getMovementObstacles()) ? getMovementObstacles() : [])
      : [];

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
      const activeMoveSpeed = moveSpeed * (controls.isLocked && moveState.sprint ? sprintMultiplier : 1);

      if (length > 0) {
        controls.moveForward((forwardAxis / length) * activeMoveSpeed * deltaSeconds);
        controls.moveRight((strafeAxis / length) * activeMoveSpeed * deltaSeconds);
      }
    }

    const currentSupportY = getSupportCameraYAtPosition(camera.position.x, camera.position.z, camera.position.y);
    const isGrounded = camera.position.y <= currentSupportY + PLAYER_CONFIG.movement.groundedEpsilon;
    if (jumpQueued && isGrounded) {
      verticalVelocity = jumpVelocity;
    }
    jumpQueued = false;

    const isTryingJetpack = jumpHeld && !isGrounded;
    const usingJetpack = isTryingJetpack && (hasInfiniteJetpackFuel || jetpackFuel > 0);
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
    camera.position.y += verticalVelocity * deltaSeconds;

    const supportAfterVertical = getSupportCameraYAtPosition(camera.position.x, camera.position.z, camera.position.y);
    if (camera.position.y < supportAfterVertical) {
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
  }

  function update(deltaSeconds, enemySystem) {
    shotDelayRemaining = Math.max(0, shotDelayRemaining - Math.max(0, deltaSeconds));
    updateLook();
    movementStartPosition.copy(camera.position);
    updateMovement(deltaSeconds);
    updateWeaponChargeRecharge(deltaSeconds);
    const movementSpeed = deltaSeconds > 0
      ? movementStartPosition.distanceTo(camera.position) / deltaSeconds
      : 0;
    updateGunVisuals(deltaSeconds, movementSpeed);
    updateProjectiles(deltaSeconds, enemySystem);
    updateProjectileImpacts(deltaSeconds);
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
  }

  function resetRunState() {
    resetMovement();
    setMenuMode(false);

    verticalVelocity = 0;
    gunFlashTimer = 0;
    hasInfiniteJetpackFuel = false;
    jetpackFuelEfficiencyMultiplier = 1;
    jetpackFuel = jetpackMaxFuel;

    playerDamageMultiplier = 1;
    playerFireRateMultiplier = 1;
    currentFireCooldown = baseFireCooldown;
    currentBurstShotDelay = Math.max(0, baseBurstShotDelay);
    maxWeaponCharges = baseMaxCharges;
    currentWeaponCharges = Math.min(maxWeaponCharges, baseStartingCharges);
    chargeReloadProgress = 0;
    shotDelayRemaining = 0;
    weaponPierceCount = baseWeaponPierce;

    clearActiveProjectilesAndImpacts();
    rebuildChargeDots();
    updateReloadBar(currentWeaponCharges >= maxWeaponCharges ? 1 : 0);
  }

  function getPosition() {
    return camera.position;
  }

  return {
    controls,
    update,
    jump,
    tryShoot,
    addLookInput,
    setVirtualMove,
    setJumpHeld,
    resetMovement,
    resetRunState,
    getPosition,
    getJetpackFuelRatio,
    getJetpackFuelPercent,
    upgradePlayerDamage,
    upgradePlayerFireRate,
    upgradeJetpackFuelEfficiency,
    upgradeWeaponMaxCharges,
    upgradeWeaponPierce,
    setMenuMode,
    disableJetpackFuelConsumption,
  };
}
