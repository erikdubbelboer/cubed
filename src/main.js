import * as THREE from "three";
import { createGrid } from "./grid.js";
import { createPlayer } from "./player.js";
import { createEnemySystem, getLargestEnemySize } from "./enemies.js";
import { createTowerSystem } from "./towers.js";
import { createUiOverlay } from "./uiOverlay.js";
import { GAME_CONFIG } from "./config.js";

const SCENE_CONFIG = GAME_CONFIG.scene;
const LIGHT_CONFIG = GAME_CONFIG.lights;
const PORTAL_CONFIG = GAME_CONFIG.portal;
const UI_CONFIG = GAME_CONFIG.ui;
const MOBILE_UI_CONFIG = UI_CONFIG.mobile ?? {};
const WAVE_CONFIG = GAME_CONFIG.waves;
const ECONOMY_CONFIG = GAME_CONFIG.economy ?? {};
const CONFIGURED_ROUNDS = Array.isArray(WAVE_CONFIG.rounds) ? WAVE_CONFIG.rounds : [];
const UPGRADE_DEFINITIONS = Array.isArray(GAME_CONFIG.upgrades) ? GAME_CONFIG.upgrades : [];
const FIRST_MENU_FORCED_UPGRADE_ID = "tower_aoe_unlock";
const MOBILE_LOOK_SENSITIVITY_SCALE = Number.isFinite(Number(MOBILE_UI_CONFIG.lookSensitivityScale))
  ? Math.max(0.1, Number(MOBILE_UI_CONFIG.lookSensitivityScale))
  : 1;
const GAME_SPEED_NORMAL = 1;
const GAME_SPEED_FAST = 2;
const DESKTOP_SPEED_TOGGLE_KEY = "KeyF";

const app = document.getElementById("app");

const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;

const scene = new THREE.Scene();
scene.background = new THREE.Color(SCENE_CONFIG.backgroundColor);
scene.fog = new THREE.Fog(
  SCENE_CONFIG.fogColor,
  SCENE_CONFIG.fogNear,
  SCENE_CONFIG.fogFar
);

let gameTime = 0;

const camera = new THREE.PerspectiveCamera(
  SCENE_CONFIG.cameraFov,
  window.innerWidth / window.innerHeight,
  SCENE_CONFIG.cameraNear,
  SCENE_CONFIG.cameraFar
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, SCENE_CONFIG.maxPixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
renderer.toneMappingExposure = SCENE_CONFIG.toneMappingExposure;
renderer.autoClear = false;
app.appendChild(renderer.domElement);

const uiOverlay = createUiOverlay({
  width: window.innerWidth,
  height: window.innerHeight,
  maxPixelRatio: SCENE_CONFIG.maxPixelRatio,
  mobileConfig: {
    movePadRadiusPx: UI_CONFIG.movePadRadiusPx,
    ...MOBILE_UI_CONFIG,
  },
});

const ambientLight = new THREE.AmbientLight(
  LIGHT_CONFIG.ambient.color,
  LIGHT_CONFIG.ambient.intensity
);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(
  LIGHT_CONFIG.hemisphere.skyColor,
  LIGHT_CONFIG.hemisphere.groundColor,
  LIGHT_CONFIG.hemisphere.intensity
);
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(
  LIGHT_CONFIG.directional.color,
  LIGHT_CONFIG.directional.intensity
);
directionalLight.position.set(
  LIGHT_CONFIG.directional.positionX,
  LIGHT_CONFIG.directional.positionY,
  LIGHT_CONFIG.directional.positionZ
);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(
  LIGHT_CONFIG.directional.shadowMapSize,
  LIGHT_CONFIG.directional.shadowMapSize
);
directionalLight.shadow.camera.near = LIGHT_CONFIG.directional.shadowNear;
directionalLight.shadow.camera.far = LIGHT_CONFIG.directional.shadowFar;
directionalLight.shadow.camera.left = LIGHT_CONFIG.directional.shadowLeft;
directionalLight.shadow.camera.right = LIGHT_CONFIG.directional.shadowRight;
directionalLight.shadow.camera.top = LIGHT_CONFIG.directional.shadowTop;
directionalLight.shadow.camera.bottom = LIGHT_CONFIG.directional.shadowBottom;
directionalLight.shadow.normalBias = LIGHT_CONFIG.directional.shadowNormalBias;
scene.add(directionalLight);

const grid = createGrid(scene);
camera.position.set(0, grid.eyeHeight, grid.moveBounds.maxZ - SCENE_CONFIG.cameraStartOffsetZ);
camera.lookAt(0, grid.eyeHeight, 0);

let player;
let enemySystem;
let towerSystem;

const LARGEST_ENEMY_SIZE = getLargestEnemySize();
const PORTAL_FACE_SIZE = LARGEST_ENEMY_SIZE * PORTAL_CONFIG.faceSizeFromLargestEnemy;
const PORTAL_WIDTH = PORTAL_FACE_SIZE;
const PORTAL_HEIGHT = PORTAL_FACE_SIZE;
const PORTAL_THICKNESS = PORTAL_CONFIG.thickness;
const PORTAL_Y_OFFSET = PORTAL_CONFIG.yOffset;
const PORTAL_ENTRY_DISTANCE = PORTAL_FACE_SIZE * PORTAL_CONFIG.entryDistanceFromFaceSize;
const PORTAL_GEOMETRY = new THREE.BoxGeometry(PORTAL_WIDTH, PORTAL_HEIGHT, PORTAL_THICKNESS);

const PORTAL_UNIFORMS = {
  uTime: { value: 0 },
  uColorA: { value: new THREE.Color(PORTAL_CONFIG.colorA) },
  uColorB: { value: new THREE.Color(PORTAL_CONFIG.colorB) },
  uEdgeColor: { value: new THREE.Color(PORTAL_CONFIG.edgeColor) },
  uOpacity: { value: PORTAL_CONFIG.opacity },
};

const PORTAL_MATERIAL = new THREE.ShaderMaterial({
  uniforms: PORTAL_UNIFORMS,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uEdgeColor;
    uniform float uOpacity;
    varying vec2 vUv;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }

    float noise2(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);

      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));

      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
        value += noise2(p) * amplitude;
        p = p * 2.03 + vec2(13.7, 8.4);
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      float radial = length(uv);

      vec2 flowUv = uv * 2.2;
      flowUv += vec2(
        sin(uTime * 0.9 + uv.y * 6.0),
        cos(uTime * 0.75 + uv.x * 7.0)
      ) * 0.22;

      float flowA = fbm(flowUv * 1.65 + vec2(uTime * 0.35, -uTime * 0.24));
      float flowB = fbm(flowUv * 3.2 + vec2(-uTime * 0.55, uTime * 0.43));
      float flow = mix(flowA, flowB, 0.5);

      float innerMask = smoothstep(1.18, 0.05, radial);
      float rimMask = smoothstep(0.63, 1.02, radial);
      float pulse = 0.55 + 0.45 * sin(uTime * 2.4 + radial * 14.0 + flow * 6.0);

      vec3 waterColor = mix(uColorA, uColorB, flow);
      vec3 color = waterColor + uEdgeColor * rimMask * pulse * 0.9;
      float alpha = uOpacity * innerMask * (0.6 + 0.4 * flow);
      alpha += rimMask * 0.2;
      alpha = clamp(alpha, 0.0, 0.92);

      gl_FragColor = vec4(color, alpha);
    }
  `,
});
PORTAL_MATERIAL.toneMapped = false;

const clock = new THREE.Clock();
let isPaused = false;
let manualPauseRequested = false;
let gameSpeedMultiplier = GAME_SPEED_NORMAL;
let suppressNextDesktopCanvasClick = false;
let pokiIntegrationDisabled = false;
let pokiLoadingFinishedReported = false;
let pokiGameplayStateInitialized = false;
let pokiGameplayWasActive = false;
let pokiGameplayReportedActive = false;
let pokiHasUserInteraction = false;
let pokiInitAttempted = false;

function callPokiSdkMethod(methodName) {
  if (pokiIntegrationDisabled) {
    return false;
  }
  const sdk = window.PokiSDK;
  if (!sdk || typeof sdk[methodName] !== "function") {
    return false;
  }
  try {
    sdk[methodName]();
    return true;
  } catch (error) {
    pokiIntegrationDisabled = true;
    console.warn(`[PokiSDK] ${methodName} failed; disabling Poki integration.`, error);
    return false;
  }
}

function reportPokiGameLoadingFinished() {
  if (pokiLoadingFinishedReported) {
    return;
  }
  pokiLoadingFinishedReported = true;
  callPokiSdkMethod("gameLoadingFinished");
}

function initPokiSdkEarly() {
  if (pokiInitAttempted || pokiIntegrationDisabled) {
    return;
  }
  pokiInitAttempted = true;
  const sdk = window.PokiSDK;
  if (!sdk || typeof sdk.init !== "function") {
    return;
  }
  try {
    const initResult = sdk.init();
    if (initResult && typeof initResult.catch === "function") {
      initResult.catch((error) => {
        pokiIntegrationDisabled = true;
        console.warn("[PokiSDK] init failed; disabling Poki integration.", error);
      });
    }
  } catch (error) {
    pokiIntegrationDisabled = true;
    console.warn("[PokiSDK] init failed; disabling Poki integration.", error);
  }
}

function getIsGameplayActiveForPoki() {
  return !isPaused && (waveState === "PLAYING" || waveState === "DELAY");
}

function markPokiUserInteraction() {
  if (pokiHasUserInteraction) {
    return;
  }
  pokiHasUserInteraction = true;
  syncPokiGameplayState();
}

function syncPokiGameplayState() {
  const gameplayActive = getIsGameplayActiveForPoki();
  if (!pokiGameplayStateInitialized) {
    pokiGameplayStateInitialized = true;
    pokiGameplayWasActive = gameplayActive;
  }
  if (gameplayActive !== pokiGameplayWasActive) {
    pokiGameplayWasActive = gameplayActive;
  }
  const shouldReportActive = gameplayActive && pokiHasUserInteraction;
  if (shouldReportActive === pokiGameplayReportedActive) {
    return;
  }
  pokiGameplayReportedActive = shouldReportActive;
  callPokiSdkMethod(shouldReportActive ? "gameplayStart" : "gameplayStop");
}

window.addEventListener("pointerdown", markPokiUserInteraction, { capture: true, passive: true });
window.addEventListener("click", markPokiUserInteraction, { capture: true, passive: true });
initPokiSdkEarly();

function getPathDirection(from, to) {
  const direction = to.clone().sub(from);
  direction.y = 0;
  if (direction.lengthSq() < 1e-6) {
    return new THREE.Vector3(0, 0, 1);
  }
  return direction.normalize();
}

function placePathEndpointGate(position, facingDirection) {
  const gate = new THREE.Mesh(PORTAL_GEOMETRY, PORTAL_MATERIAL);
  gate.castShadow = false;
  gate.receiveShadow = true;
  const portalForward = facingDirection.clone();
  portalForward.y = 0;
  if (portalForward.lengthSq() < 1e-6) {
    portalForward.set(0, 0, 1);
  } else {
    portalForward.normalize();
  }
  const derivedPathSurfaceY = Number.isFinite(position.y)
    ? position.y - GAME_CONFIG.grid.enemyPathYOffset
    : (grid.pathTileTopY ?? grid.tileTopY ?? 0);
  const pathSurfaceY = typeof grid.getBuildSurfaceYAtWorld === "function"
    ? grid.getBuildSurfaceYAtWorld(position.x, position.z)
    : derivedPathSurfaceY;
  gate.position.set(position.x, pathSurfaceY + PORTAL_HEIGHT * 0.5 + PORTAL_Y_OFFSET, position.z);
  const lookTarget = gate.position.clone().add(portalForward);
  gate.lookAt(lookTarget);
  scene.add(gate);

  const portalPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    portalForward,
    new THREE.Vector3(position.x, pathSurfaceY, position.z)
  );

  return {
    mesh: gate,
    position: gate.position.clone(),
    forward: portalForward.clone(),
    plane: portalPlane,
    entryDistance: PORTAL_ENTRY_DISTANCE,
  };
}

function placePathGates() {
  const points = grid.pathWaypoints;
  if (!Array.isArray(points) || points.length < 2) {
    return null;
  }

  const spawnPoint = points[0];
  const spawnFacing = getPathDirection(points[0], points[1]);
  const spawnPortal = placePathEndpointGate(spawnPoint, spawnFacing);

  const endPoint = points[points.length - 1];
  const endFacing = getPathDirection(points[points.length - 2], points[points.length - 1]);
  placePathEndpointGate(endPoint, endFacing);

  return spawnPortal;
}

function getAutoPauseRequested() {
  const isLocked = !!document.pointerLockElement;
  return document.hidden || !document.hasFocus() || (!isTouchDevice && !isLocked);
}

function applyPausedState(nextPaused) {
  if (nextPaused === isPaused) {
    return;
  }

  isPaused = nextPaused;
  if (isPaused) {
    if (player) {
      player.resetMovement();
    }
    resetMobileInputState();
    return;
  }

  clock.getDelta();
}

function refreshPauseState() {
  applyPausedState(manualPauseRequested || getAutoPauseRequested());
}

function updatePauseState() {
  // Use a small timeout to ensure Three.js has updated the internal isLocked state
  // and browser has updated pointerLockElement.
  setTimeout(refreshPauseState, 0);
}

function toggleManualPause() {
  manualPauseRequested = !manualPauseRequested;
  refreshPauseState();
}

function toggleGameSpeed() {
  gameSpeedMultiplier = gameSpeedMultiplier >= GAME_SPEED_FAST
    ? GAME_SPEED_NORMAL
    : GAME_SPEED_FAST;
  return gameSpeedMultiplier;
}

// Listeners for player lock moved into initGame after player is created

const DEFAULT_STARTING_CASH = 650;
const startingCash = Number.isFinite(Number(ECONOMY_CONFIG.startingCash))
  ? Math.max(0, Math.floor(Number(ECONOMY_CONFIG.startingCash)))
  : DEFAULT_STARTING_CASH;
let playerMoney = startingCash;

function addMoney(amount) {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  if (value <= 0) {
    return 0;
  }
  playerMoney += value;
  return playerMoney;
}

function trySpendMoney(amount) {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  if (value <= 0) {
    return true;
  }
  if (playerMoney < value) {
    return false;
  }
  playerMoney -= value;
  return true;
}

function handlePrimaryAction() {
  if (towerSystem.isBuildMode()) {
    const didPlaceTower = towerSystem.placeSelectedTower();
    if (didPlaceTower) {
      isPrimaryDown = false;
    }
    return;
  }
  player.tryShoot();
}

function handleHudButtonAction(buttonId) {
  if (buttonId === "pause") {
    toggleManualPause();
    return true;
  }
  if (buttonId === "speed") {
    toggleGameSpeed();
    return true;
  }
  return false;
}

document.addEventListener("visibilitychange", updatePauseState);
window.addEventListener("blur", updatePauseState);
window.addEventListener("focus", updatePauseState);
updatePauseState();

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

let isPrimaryDown = false;
let vCursorX = window.innerWidth / 2;
let vCursorY = window.innerHeight / 2;
let hoveredUpgradeIndex = -1;
let currentUpgradeOptions = [];
let menuAdvancesWaveOnChoice = true;
let menuResumeWaveState = "PLAYING";
let hasShownFirstUpgradeMenu = false;
let forceTouchControls = false;
const mobileInput = {
  movePointerId: null,
  lookPointerId: null,
  moveOriginX: 0,
  moveOriginY: 0,
  moveX: 0,
  moveY: 0,
  lookLastX: 0,
  lookLastY: 0,
  pressedButtons: {
    primary: false,
    jump: false,
    cancel: false,
  },
  buttonPointerIds: {
    primary: null,
    jump: null,
    cancel: null,
  },
  previousPrimaryPressed: false,
  pendingBuildConfirm: false,
  suppressPrimaryFireUntilRelease: false,
};
const upgradeCountsById = new Map();

function updateMenuHoverFromVirtualCursor() {
  if (waveState !== "MENU") {
    hoveredUpgradeIndex = -1;
    return;
  }
  hoveredUpgradeIndex = uiOverlay.hitTestMenuOption(vCursorX, vCursorY);
}

function getUpgradeCount(id) {
  if (typeof id !== "string" || id.length === 0) {
    return 0;
  }
  return upgradeCountsById.get(id) ?? 0;
}

function incrementUpgradeCount(id) {
  if (typeof id !== "string" || id.length === 0) {
    return;
  }
  upgradeCountsById.set(id, getUpgradeCount(id) + 1);
}

function normalizeMaxUpgradeCount(rawMaxCount) {
  if (rawMaxCount === null || rawMaxCount === undefined) {
    return null;
  }
  const numericMaxCount = Math.floor(Number(rawMaxCount));
  if (!Number.isFinite(numericMaxCount)) {
    return null;
  }
  return Math.max(0, numericMaxCount);
}

function isUpgradeAvailable(definition) {
  if (!definition || typeof definition !== "object") {
    return false;
  }
  if (typeof definition.id !== "string" || definition.id.length === 0) {
    return false;
  }

  const maxCount = normalizeMaxUpgradeCount(definition.maxCount);
  if (maxCount !== null && getUpgradeCount(definition.id) >= maxCount) {
    return false;
  }

  const unlockTowerType = definition.grants?.unlockTowerType;
  if (typeof unlockTowerType === "string" && towerSystem?.isTowerTypeUnlocked(unlockTowerType)) {
    return false;
  }

  return true;
}

function applyUpgradeGrants(grants = {}) {
  let appliedAny = false;

  if (typeof grants.unlockTowerType === "string" && towerSystem) {
    towerSystem.unlockTowerType(grants.unlockTowerType);
    appliedAny = true;
  }

  if (typeof grants.towerDamageAdd === "number" && towerSystem) {
    towerSystem.upgradeTowerDamage(grants.towerDamageAdd);
    appliedAny = true;
  }

  if (typeof grants.playerDamageAdd === "number" && player) {
    player.upgradePlayerDamage(grants.playerDamageAdd);
    appliedAny = true;
  }

  if (typeof grants.enemySpeedMultiplier === "number" && enemySystem) {
    enemySystem.upgradeSlowEnemies(grants.enemySpeedMultiplier);
    appliedAny = true;
  }

  if (typeof grants.towerFireRateMultiplier === "number" && towerSystem) {
    towerSystem.upgradeTowerFireRate(grants.towerFireRateMultiplier);
    appliedAny = true;
  }

  if (typeof grants.playerFireRateMultiplier === "number" && player) {
    player.upgradePlayerFireRate(grants.playerFireRateMultiplier);
    appliedAny = true;
  }

  if (typeof grants.jetpackEfficiencyMultiplier === "number" && player) {
    player.upgradeJetpackFuelEfficiency(grants.jetpackEfficiencyMultiplier);
    appliedAny = true;
  }

  if (typeof grants.weaponMaxChargesMultiplier === "number" && player) {
    player.upgradeWeaponMaxCharges(grants.weaponMaxChargesMultiplier);
    appliedAny = true;
  }

  if (typeof grants.weaponPierceAdd === "number" && player) {
    player.upgradeWeaponPierce(grants.weaponPierceAdd);
    appliedAny = true;
  }

  return appliedAny;
}

function getUpgradePool() {
  return UPGRADE_DEFINITIONS
    .filter((definition) => isUpgradeAvailable(definition))
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      iconId: definition.iconId,
      apply: () => applyUpgradeGrants(definition.grants),
    }));
}

function finishUpgradeMenuChoice() {
  currentUpgradeOptions = [];
  hoveredUpgradeIndex = -1;
  player.setMenuMode(false);
  resetMobileInputState();
  if (menuAdvancesWaveOnChoice) {
    startWave(currentWave + 1);
  } else {
    waveState = menuResumeWaveState;
  }
  menuAdvancesWaveOnChoice = true;
  menuResumeWaveState = "PLAYING";
}

function applyUpgradeChoice(index) {
  if (index < 0 || index >= currentUpgradeOptions.length) {
    return false;
  }

  const selectedUpgrade = currentUpgradeOptions[index];
  if (!selectedUpgrade || typeof selectedUpgrade.apply !== "function") {
    return false;
  }

  selectedUpgrade.apply();
  incrementUpgradeCount(selectedUpgrade.id);
  finishUpgradeMenuChoice();
  return true;
}

function getCanvasPointerPosition(event) {
  const canvasRect = renderer.domElement.getBoundingClientRect();
  const x = clamp(event.clientX - canvasRect.left, 0, canvasRect.width);
  const y = clamp(event.clientY - canvasRect.top, 0, canvasRect.height);
  return { x, y };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isPointInsideRect(x, y, rect) {
  if (!rect || typeof rect !== "object") {
    return false;
  }
  return (
    x >= rect.x
    && x <= rect.x + rect.width
    && y >= rect.y
    && y <= rect.y + rect.height
  );
}

function isPointInsideAnyRect(x, y, rects) {
  if (!Array.isArray(rects)) {
    return false;
  }
  for (const rect of rects) {
    if (isPointInsideRect(x, y, rect)) {
      return true;
    }
  }
  return false;
}

function resetMobileInputState() {
  mobileInput.movePointerId = null;
  mobileInput.lookPointerId = null;
  mobileInput.moveOriginX = 0;
  mobileInput.moveOriginY = 0;
  mobileInput.moveX = 0;
  mobileInput.moveY = 0;
  mobileInput.lookLastX = 0;
  mobileInput.lookLastY = 0;
  mobileInput.pressedButtons.primary = false;
  mobileInput.pressedButtons.jump = false;
  mobileInput.pressedButtons.cancel = false;
  mobileInput.buttonPointerIds.primary = null;
  mobileInput.buttonPointerIds.jump = null;
  mobileInput.buttonPointerIds.cancel = null;
  mobileInput.previousPrimaryPressed = false;
  mobileInput.pendingBuildConfirm = false;
  mobileInput.suppressPrimaryFireUntilRelease = false;
  isPrimaryDown = false;
  if (player) {
    player.setVirtualMove(0, 0);
    if (typeof player.setJumpHeld === "function") {
      player.setJumpHeld(false);
    }
  }
}

function releaseMobileButtonPointer(pointerId) {
  for (const action of ["primary", "jump", "cancel"]) {
    if (mobileInput.buttonPointerIds[action] !== pointerId) {
      continue;
    }
    mobileInput.buttonPointerIds[action] = null;
    mobileInput.pressedButtons[action] = false;
    if (action === "primary") {
      mobileInput.pendingBuildConfirm = false;
      mobileInput.suppressPrimaryFireUntilRelease = false;
    }
    if (action === "jump" && player && typeof player.setJumpHeld === "function") {
      player.setJumpHeld(false);
    }
  }
}

function releaseMobilePointer(pointerId) {
  if (mobileInput.movePointerId === pointerId) {
    mobileInput.movePointerId = null;
    mobileInput.moveX = 0;
    mobileInput.moveY = 0;
  }
  if (mobileInput.lookPointerId === pointerId) {
    mobileInput.lookPointerId = null;
  }
  releaseMobileButtonPointer(pointerId);
}

function updateMobileMoveFromPointer(pointerX, pointerY) {
  const layout = uiOverlay.getTouchControlLayout();
  const movePad = layout?.movePad;
  const activationRadius = Math.max(1, Number(movePad?.activationRadius) || Number(UI_CONFIG.movePadRadiusPx) || 45);
  const dx = pointerX - mobileInput.moveOriginX;
  const dy = pointerY - mobileInput.moveOriginY;
  let normalizedX = dx / activationRadius;
  let normalizedY = dy / activationRadius;
  const magnitude = Math.hypot(normalizedX, normalizedY);
  if (magnitude > 1) {
    normalizedX /= magnitude;
    normalizedY /= magnitude;
  }
  mobileInput.moveX = clamp(normalizedX, -1, 1);
  mobileInput.moveY = clamp(-normalizedY, -1, 1);
}

function applyMobileGameplayInput() {
  if (!isTouchDevice || !player || !towerSystem) {
    return;
  }

  const inGameplayState = waveState === "PLAYING" || waveState === "DELAY";
  if (!inGameplayState || isPaused) {
    player.setVirtualMove(0, 0);
    if (typeof player.setJumpHeld === "function") {
      player.setJumpHeld(false);
    }
    isPrimaryDown = false;
    mobileInput.previousPrimaryPressed = false;
    return;
  }

  player.setVirtualMove(mobileInput.moveX, mobileInput.moveY);
  if (typeof player.setJumpHeld === "function") {
    player.setJumpHeld(mobileInput.pressedButtons.jump);
  }

  const primaryPressed = !!mobileInput.pressedButtons.primary;
  if (towerSystem.isBuildMode()) {
    isPrimaryDown = false;
    if (
      mobileInput.pendingBuildConfirm
      || (primaryPressed && !mobileInput.previousPrimaryPressed)
    ) {
      handlePrimaryAction();
      mobileInput.pendingBuildConfirm = false;
    }
  } else {
    isPrimaryDown = mobileInput.suppressPrimaryFireUntilRelease
      ? false
      : primaryPressed;
    mobileInput.pendingBuildConfirm = false;
  }
  mobileInput.previousPrimaryPressed = primaryPressed;
}

if (!isTouchDevice) {
  renderer.domElement.addEventListener("click", (event) => {
    if (!suppressNextDesktopCanvasClick) {
      return;
    }
    suppressNextDesktopCanvasClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.addEventListener("mousemove", (event) => {
    if (!player) return;
    if (waveState === "MENU" && player.controls.isLocked) {
      vCursorX += event.movementX;
      vCursorY += event.movementY;
      vCursorX = Math.max(0, Math.min(window.innerWidth, vCursorX));
      vCursorY = Math.max(0, Math.min(window.innerHeight, vCursorY));
      updateMenuHoverFromVirtualCursor();
    }
  }, true);

  window.addEventListener("mousedown", (event) => {
    if (!player || !towerSystem) {
      return;
    }

    if (event.button === 0) {
      suppressNextDesktopCanvasClick = false;
      if (!player.controls.isLocked) {
        const pointer = getCanvasPointerPosition(event);
        const hudButton = uiOverlay.hitTestHudButton(pointer.x, pointer.y);
        if (hudButton === "speed") {
          handleHudButtonAction(hudButton);
          suppressNextDesktopCanvasClick = true;
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
      }
    }

    if (isPaused) {
      return;
    }

    if (waveState === "MENU") {
      if (event.button !== 0) {
        return;
      }
      if (player.controls.isLocked) {
        applyUpgradeChoice(uiOverlay.hitTestMenuOption(vCursorX, vCursorY));
        return;
      }
      const pointer = getCanvasPointerPosition(event);
      applyUpgradeChoice(uiOverlay.hitTestMenuOption(pointer.x, pointer.y));
      return;
    }

    if (event.button === 2) {
      towerSystem.selectTower("laser");
      return;
    }

    if (event.button !== 0) {
      return;
    }

    if (!player.controls.isLocked) {
      return;
    }

    if (towerSystem.isBuildMode()) {
      towerSystem.placeSelectedTower();
      return;
    }

    isPrimaryDown = true;
  }, true);

  document.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      isPrimaryDown = false;
    }
  });
}

if (isTouchDevice) {
  const mobilePointerTarget = renderer.domElement;

  function captureTouchPointer(pointerId) {
    if (typeof mobilePointerTarget.setPointerCapture !== "function") {
      return;
    }
    try {
      mobilePointerTarget.setPointerCapture(pointerId);
    } catch (error) {
      // Ignore capture failures from race conditions during cancel/unmount.
    }
  }

  function releaseTouchPointer(pointerId) {
    if (typeof mobilePointerTarget.releasePointerCapture !== "function") {
      return;
    }
    try {
      if (mobilePointerTarget.hasPointerCapture(pointerId)) {
        mobilePointerTarget.releasePointerCapture(pointerId);
      }
    } catch (error) {
      // Ignore release failures from browsers that already dropped capture.
    }
  }

  mobilePointerTarget.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || !player || !towerSystem) {
      return;
    }

    const pointer = getCanvasPointerPosition(event);
    if (waveState === "MENU") {
      const pickedIndex = uiOverlay.hitTestMenuOption(pointer.x, pointer.y);
      if (pickedIndex >= 0) {
        applyUpgradeChoice(pickedIndex);
      }
      event.preventDefault();
      return;
    }

    const touchedHudButton = uiOverlay.hitTestHudButton(pointer.x, pointer.y);
    if (touchedHudButton) {
      handleHudButtonAction(touchedHudButton);
      event.preventDefault();
      return;
    }

    if (isPaused) {
      event.preventDefault();
      return;
    }

    const touchedTowerType = uiOverlay.hitTestTowerSlot(pointer.x, pointer.y);
    if (touchedTowerType) {
      towerSystem.selectTower(touchedTowerType);
      event.preventDefault();
      return;
    }

    const touchedAction = uiOverlay.hitTestTouchAction(pointer.x, pointer.y);
    if (touchedAction) {
      mobileInput.buttonPointerIds[touchedAction] = event.pointerId;
      mobileInput.pressedButtons[touchedAction] = true;
      if (touchedAction === "primary") {
        if (towerSystem.isBuildMode()) {
          mobileInput.pendingBuildConfirm = true;
          mobileInput.suppressPrimaryFireUntilRelease = true;
        } else {
          mobileInput.suppressPrimaryFireUntilRelease = false;
          handlePrimaryAction();
        }
      }
      if (touchedAction === "jump" && player && typeof player.setJumpHeld === "function") {
        player.setJumpHeld(true);
      }
      if (touchedAction === "cancel" && towerSystem.isBuildMode()) {
        towerSystem.cancelPlacement();
        mobileInput.pressedButtons.cancel = false;
        mobileInput.buttonPointerIds.cancel = null;
      }
      captureTouchPointer(event.pointerId);
      event.preventDefault();
      return;
    }

    const touchLayout = uiOverlay.getTouchControlLayout();
    const movePad = touchLayout?.movePad ?? {};
    const movePadActivationRadius = Math.max(
      1,
      Number(movePad.activationRadius) || Number(UI_CONFIG.movePadRadiusPx) || 45
    );
    const dx = pointer.x - (Number(movePad.centerX) || 0);
    const dy = pointer.y - (Number(movePad.centerY) || 0);
    const insideMovePad = (dx * dx) + (dy * dy) <= movePadActivationRadius * movePadActivationRadius;

    if (insideMovePad && mobileInput.movePointerId == null) {
      mobileInput.movePointerId = event.pointerId;
      mobileInput.moveOriginX = pointer.x;
      mobileInput.moveOriginY = pointer.y;
      mobileInput.moveX = 0;
      mobileInput.moveY = 0;
      captureTouchPointer(event.pointerId);
      event.preventDefault();
      return;
    }

    const blockedRects = Array.isArray(touchLayout?.blockedRects) ? touchLayout.blockedRects : [];
    const lookZoneTop = Number.isFinite(Number(touchLayout?.lookZoneTop))
      ? Number(touchLayout.lookZoneTop)
      : 0;
    const blockedForLook = pointer.y <= lookZoneTop || isPointInsideAnyRect(pointer.x, pointer.y, blockedRects);
    if (!blockedForLook && mobileInput.lookPointerId == null) {
      mobileInput.lookPointerId = event.pointerId;
      mobileInput.lookLastX = pointer.x;
      mobileInput.lookLastY = pointer.y;
      captureTouchPointer(event.pointerId);
      event.preventDefault();
    }
  }, { capture: true, passive: false });

  mobilePointerTarget.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "touch" || !player) {
      return;
    }

    const pointer = getCanvasPointerPosition(event);
    if (mobileInput.movePointerId === event.pointerId) {
      updateMobileMoveFromPointer(pointer.x, pointer.y);
      event.preventDefault();
      return;
    }

    if (mobileInput.lookPointerId === event.pointerId) {
      const deltaX = pointer.x - mobileInput.lookLastX;
      const deltaY = pointer.y - mobileInput.lookLastY;
      mobileInput.lookLastX = pointer.x;
      mobileInput.lookLastY = pointer.y;
      if (waveState !== "MENU" && !isPaused) {
        player.addLookInput(deltaX * MOBILE_LOOK_SENSITIVITY_SCALE, deltaY * MOBILE_LOOK_SENSITIVITY_SCALE);
      }
      event.preventDefault();
      return;
    }

    const controlsPointerIds = Object.values(mobileInput.buttonPointerIds);
    if (controlsPointerIds.includes(event.pointerId)) {
      event.preventDefault();
    }
  }, { capture: true, passive: false });

  const finishTouchPointer = (event) => {
    if (event.pointerType !== "touch") {
      return;
    }
    releaseMobilePointer(event.pointerId);
    releaseTouchPointer(event.pointerId);
    event.preventDefault();
  };

  mobilePointerTarget.addEventListener("pointerup", finishTouchPointer, { capture: true, passive: false });
  mobilePointerTarget.addEventListener("pointercancel", finishTouchPointer, { capture: true, passive: false });
}


window.addEventListener("keydown", (event) => {
  if (!player || !towerSystem) return;

  if (event.code === "KeyK" && !event.repeat) {
    if (waveState === "MENU") {
      showUpgradeMenu({
        advanceWaveOnChoice: menuAdvancesWaveOnChoice,
        resumeWaveState: menuResumeWaveState,
      });
      return;
    }
    const resumeWaveState = waveState === "DELAY" ? "DELAY" : "PLAYING";
    waveState = "MENU";
    showUpgradeMenu({
      advanceWaveOnChoice: false,
      resumeWaveState,
    });
    return;
  }

  if (event.code === "KeyL" && !event.repeat) {
    addMoney(1000);
    return;
  }

  if (event.code === "KeyM" && !event.repeat) {
    player.disableJetpackFuelConsumption();
    return;
  }

  if (event.code === DESKTOP_SPEED_TOGGLE_KEY && !event.repeat) {
    toggleGameSpeed();
    return;
  }

  if (waveState === "MENU") {
    if (event.code === "Digit1" || event.code === "Digit2" || event.code === "Digit3") {
      const optionIndex = Number(event.code.slice(-1)) - 1;
      applyUpgradeChoice(optionIndex);
    }
    return;
  }

  if (event.code === "Escape" && towerSystem.isBuildMode()) {
    towerSystem.cancelPlacement();
    return;
  }

  if (event.code.startsWith("Digit")) {
    const rawDigit = Number(event.code.slice(5));
    if (!Number.isNaN(rawDigit)) {
      const slotIndex = rawDigit === 0 ? 9 : rawDigit - 1;
      const towerInventory = towerSystem.getTowerInventory();
      if (slotIndex >= 0 && slotIndex < towerInventory.length) {
        towerSystem.selectTower(towerInventory[slotIndex].type);
        return;
      }
    }
  }

  if (event.code === "KeyQ") {
    towerSystem.cancelPlacement();
    return;
  }

  if (event.code === "Enter" && towerSystem.isBuildMode()) {
    towerSystem.placeSelectedTower();
  }
});

let waveState = "PLAYING";
let currentWave = WAVE_CONFIG.initialWave;
let waveDelay = 0;

function getEffectiveWaveNumber(wave) {
  if (CONFIGURED_ROUNDS.length === 0) {
    return wave;
  }
  if (wave <= CONFIGURED_ROUNDS.length) {
    return wave;
  }
  if (WAVE_CONFIG.afterLastRound === "stay_on_last") {
    return CONFIGURED_ROUNDS.length;
  }
  return wave;
}

function getWaveSegmentsForWave(wave) {
  if (CONFIGURED_ROUNDS.length === 0) {
    return null;
  }
  const effectiveWave = getEffectiveWaveNumber(wave);
  return CONFIGURED_ROUNDS[effectiveWave - 1] ?? [];
}

function startWave(wave) {
  currentWave = wave;
  waveState = "PLAYING";

  const waveSegments = getWaveSegmentsForWave(wave);
  if (Array.isArray(waveSegments)) {
    enemySystem.startWave(waveSegments);
    return;
  }

  // Legacy fallback if explicit rounds are not configured.
  const basicBase = Number(WAVE_CONFIG.basicBaseCount) || 0;
  const basicPerWave = Number(WAVE_CONFIG.basicPerWave) || 0;
  const fastUnlockWave = Number(WAVE_CONFIG.fastUnlockWave) || Number.POSITIVE_INFINITY;
  const fastPerWave = Number(WAVE_CONFIG.fastPerWave) || 0;
  const redCount = basicBase + Math.floor(wave * basicPerWave);
  const blueCount = wave >= fastUnlockWave
    ? Math.floor(wave * fastPerWave)
    : 0;
  enemySystem.startWave({ red: redCount, blue: blueCount });
}

function showUpgradeMenu(options = {}) {
  const {
    advanceWaveOnChoice = true,
    resumeWaveState = "PLAYING",
  } = options;
  menuAdvancesWaveOnChoice = advanceWaveOnChoice;
  menuResumeWaveState = resumeWaveState === "DELAY" ? "DELAY" : "PLAYING";

  player.setMenuMode(true);
  resetMobileInputState();
  vCursorX = window.innerWidth * 0.5;
  vCursorY = window.innerHeight * 0.5;

  const optionCount = Math.max(1, Math.floor(Number(UI_CONFIG.upgradesShown) || 1));
  const upgradePool = getUpgradePool();
  if (upgradePool.length === 0) {
    finishUpgradeMenuChoice();
    return;
  }

  const randomize = (pool) => pool.slice().sort(() => 0.5 - Math.random());

  if (!hasShownFirstUpgradeMenu) {
    const forcedUpgrade = upgradePool.find((upgrade) => upgrade.id === FIRST_MENU_FORCED_UPGRADE_ID);
    if (forcedUpgrade) {
      const randomPool = randomize(upgradePool.filter((upgrade) => upgrade.id !== FIRST_MENU_FORCED_UPGRADE_ID));
      currentUpgradeOptions = [
        forcedUpgrade,
        ...randomPool.slice(0, Math.max(0, optionCount - 1)),
      ];
    } else {
      currentUpgradeOptions = randomize(upgradePool).slice(0, optionCount);
    }
    hasShownFirstUpgradeMenu = true;
  } else {
    currentUpgradeOptions = randomize(upgradePool).slice(0, optionCount);
  }

  hoveredUpgradeIndex = -1;
  updateMenuHoverFromVirtualCursor();
}

function animate() {
  const rawDeltaSeconds = clock.getDelta();
  const simulationDeltaSeconds = rawDeltaSeconds * gameSpeedMultiplier;
  gameTime += simulationDeltaSeconds;
  PORTAL_UNIFORMS.uTime.value = gameTime;

  if (!isPaused) {
    if (waveState === "PLAYING") {
      if (enemySystem.isWaveClear()) {
        waveState = "DELAY";
        waveDelay = WAVE_CONFIG.upgradeDelaySeconds;
      }
    } else if (waveState === "DELAY") {
      waveDelay -= simulationDeltaSeconds;
      if (waveDelay <= 0) {
        waveState = "MENU";
        showUpgradeMenu();
      }
    }

    if (waveState === "PLAYING" || waveState === "DELAY") {
      applyMobileGameplayInput();
      if (isPrimaryDown) {
        handlePrimaryAction();
      }
      player.update(simulationDeltaSeconds, enemySystem);
      enemySystem.update(simulationDeltaSeconds, camera);
      towerSystem.update(simulationDeltaSeconds, enemySystem);
    }
  }
  syncPokiGameplayState();

  const towerInventory = towerSystem
    ? towerSystem.getTowerInventory().map((entry, index) => ({
      ...entry,
      iconId: (
        {
          laser: "tower_laser",
          aoe: "tower_aoe",
          slow: "tower_slow",
        }[entry.type] || "tower_laser"
      ),
      hotkey: String((index + 1) % 10 || 0),
    }))
    : [];
  const showTouchControls = isTouchDevice || forceTouchControls;
  const touchPortrait = window.innerHeight >= window.innerWidth;

  uiOverlay.setState({
    showCrosshair: waveState !== "MENU",
    menuOpen: waveState === "MENU",
    menuOptions: currentUpgradeOptions.map((upgrade) => ({
      label: upgrade.label,
      iconId: upgrade.iconId,
    })),
    hoveredMenuIndex: hoveredUpgradeIndex,
    menuCursorX: vCursorX,
    menuCursorY: vCursorY,
    menuCursorVisible: waveState === "MENU" && !!player?.controls?.isLocked,
    jetpackFuelRatio: player ? player.getJetpackFuelRatio() : 1,
    money: playerMoney,
    towerInventory,
    selectedTowerType: towerSystem ? towerSystem.getSelectedTowerType() : null,
    buildMode: towerSystem ? towerSystem.isBuildMode() : false,
    showKeyboardHints: !showTouchControls,
    showTouchControls,
    showPauseButton: showTouchControls,
    showSpeedButton: true,
    paused: isPaused,
    speedMultiplier: gameSpeedMultiplier,
    touchPortrait,
    moveStickX: mobileInput.moveX,
    moveStickY: mobileInput.moveY,
    pressedActions: mobileInput.pressedButtons,
  });
  uiOverlay.draw();

  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(uiOverlay.scene, uiOverlay.camera);
  requestAnimationFrame(animate);
}

// Start game
function initGame() {
  const spawnPortal = placePathGates();

  player = createPlayer({
    scene,
    camera,
    domElement: renderer.domElement,
    eyeHeight: grid.eyeHeight,
    getMovementObstacles: () => {
      const terrainObstacles = Array.isArray(grid.heightObstacles) ? grid.heightObstacles : [];
      const towerObstacles = towerSystem ? towerSystem.getMovementObstacles() : [];
      if (terrainObstacles.length === 0) {
        return towerObstacles;
      }
      if (towerObstacles.length === 0) {
        return terrainObstacles;
      }
      return [...terrainObstacles, ...towerObstacles];
    },
  });

  enemySystem = createEnemySystem(scene, grid.pathWaypoints, {
    spawnPortal,
    onEnemyDefeated: (cashReward) => {
      addMoney(cashReward);
    },
  });
  towerSystem = createTowerSystem({
    scene,
    camera,
    grid,
    getCurrentMoney: () => playerMoney,
    spendMoney: (amount) => trySpendMoney(amount),
  });

  player.controls.addEventListener("unlock", () => {
    updatePauseState();
    resetMobileInputState();
    if (towerSystem && towerSystem.isBuildMode()) {
      towerSystem.cancelPlacement();
    }
  });
  player.controls.addEventListener("lock", updatePauseState);

  // Debug API to let browser scripts skip UI
  window.gameDebug = {
    setPlayerPos: (x, z) => {
      if (player) player.controls.getObject().position.set(x, player.eyeHeight, z);
    },
    placeBasicTower: (x, z) => {
      if (towerSystem) towerSystem.forcePlaceTower(x, z, "laser");
    },
    spawnEnemy: (type = "red") => {
      if (enemySystem) {
        const spawner = grid.pathWaypoints[0];
        enemySystem.forceSpawnEnemy(type, spawner);
      }
    },
    addMoney: (amount = 100) => {
      addMoney(amount);
    },
    getMoney: () => playerMoney,
    unlockTower: (type) => {
      if (towerSystem) {
        return towerSystem.unlockTowerType(type);
      }
      return false;
    },
    lockControls: () => {
      if (player && player.controls) {
        player.controls.lock();
      }
    },
    setForceTouchControls: (value = true) => {
      forceTouchControls = !!value;
      resetMobileInputState();
      return forceTouchControls;
    },
    getForceTouchControls: () => forceTouchControls,
  };

  startWave(WAVE_CONFIG.initialWave);
  reportPokiGameLoadingFinished();
  animate();
}

initGame();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  uiOverlay.resize(window.innerWidth, window.innerHeight);
  vCursorX = clamp(vCursorX, 0, window.innerWidth);
  vCursorY = clamp(vCursorY, 0, window.innerHeight);
  if (isTouchDevice) {
    resetMobileInputState();
  }
});
