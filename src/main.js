import * as THREE from "three";
import { createGrid } from "./grid.js";
import { createPlayer } from "./player.js";
import { createEnemySystem } from "./enemies.js";
import { createTowerSystem } from "./towers.js";
import { createLevelEditor } from "./levelEditor.js";
import { createUiOverlay } from "./uiOverlay.js";
import { GAME_CONFIG } from "./config.js";

const SCENE_CONFIG = GAME_CONFIG.scene;
const LIGHT_CONFIG = GAME_CONFIG.lights;
const UI_CONFIG = GAME_CONFIG.ui;
const MOBILE_UI_CONFIG = UI_CONFIG.mobile ?? {};
const WAVE_CONFIG = GAME_CONFIG.waves;
const ECONOMY_CONFIG = GAME_CONFIG.economy ?? {};
const ENEMY_CONFIG = GAME_CONFIG.enemies ?? {};
const ENEMY_TYPES = ENEMY_CONFIG.types ?? {};
const CONFIGURED_ROUNDS = Array.isArray(WAVE_CONFIG.rounds) ? WAVE_CONFIG.rounds : [];
const UPGRADE_DEFINITIONS = Array.isArray(GAME_CONFIG.upgrades) ? GAME_CONFIG.upgrades : [];
const FIRST_MENU_FORCED_UPGRADE_ID = "tower_aoe_unlock";
const MOBILE_LOOK_SENSITIVITY_SCALE = Number.isFinite(Number(MOBILE_UI_CONFIG.lookSensitivityScale))
  ? Math.max(0.1, Number(MOBILE_UI_CONFIG.lookSensitivityScale))
  : 1;
const GAME_SPEED_NORMAL = 1;
const GAME_SPEED_FAST = 2;
const DESKTOP_SPEED_TOGGLE_KEY = "KeyF";
const DESKTOP_EDITOR_TOGGLE_KEY = "KeyN";
const DEFAULT_BUILD_PHASE_DURATION_SECONDS = 300;
const BUILD_PHASE_DURATION_SECONDS = Number.isFinite(Number(WAVE_CONFIG.buildPhaseDurationSeconds))
  ? Math.max(0, Number(WAVE_CONFIG.buildPhaseDurationSeconds))
  : DEFAULT_BUILD_PHASE_DURATION_SECONDS;
const DEFAULT_PREVIEW_ENEMY_TYPE = Object.prototype.hasOwnProperty.call(ENEMY_TYPES, "red")
  ? "red"
  : (Object.keys(ENEMY_TYPES)[0] ?? "red");
const DEFAULT_PREVIEW_ENEMY_SIZE = Math.max(
  0.2,
  Number(ENEMY_TYPES[DEFAULT_PREVIEW_ENEMY_TYPE]?.size) || 1
);
const ENEMY_PATH_Y_OFFSET = Number.isFinite(Number(GAME_CONFIG.grid?.enemyPathYOffset))
  ? Number(GAME_CONFIG.grid.enemyPathYOffset)
  : 0;
const ENEMY_BODY_Y_OFFSET = Number.isFinite(Number(ENEMY_CONFIG.bodyYOffset))
  ? Number(ENEMY_CONFIG.bodyYOffset)
  : 0;
const BUILD_PREVIEW_TRAIL_Y_OFFSET = ENEMY_PATH_Y_OFFSET + ENEMY_BODY_Y_OFFSET + (DEFAULT_PREVIEW_ENEMY_SIZE * 0.5);
const BUILD_PREVIEW_TRAIL_COLORS = [
  0x79f0c5,
  0x74b8ff,
  0xffb86f,
  0xd1a6ff,
  0x96f1b0,
  0xff98a4,
];
const BUILD_PREVIEW_ARROW_OPACITY = 0.78;
const BUILD_PREVIEW_ARROW_SPACING_BLOCKS = 2;
const BUILD_PREVIEW_ARROW_SPEED_BLOCKS_PER_SECOND = 1.275;
const BUILD_PREVIEW_ARROW_LENGTH_FROM_CELL = 0.24;
const BUILD_PREVIEW_ARROW_RADIUS_FROM_CELL = 0.07;
const BUILD_PREVIEW_ARROW_VERTICAL_JITTER = 0.06;
const FPS_SAMPLE_WINDOW_SECONDS = 0.35;
const EDITOR_TOOL_ROTATE_INTERVAL_MS = 200;

function normalizeCardinalRotation(rawRotation = 0) {
  const numericRotation = Number(rawRotation);
  if (!Number.isFinite(numericRotation)) {
    return 0;
  }
  const quantized = Math.round(numericRotation / 90) * 90;
  return ((quantized % 360) + 360) % 360;
}

function getDirectionFromCardinalRotation(rotation = 0) {
  const normalized = normalizeCardinalRotation(rotation);
  if (normalized === 90) {
    return { x: 1, z: 0 };
  }
  if (normalized === 180) {
    return { x: 0, z: -1 };
  }
  if (normalized === 270) {
    return { x: -1, z: 0 };
  }
  return { x: 0, z: 1 };
}

const EDITOR_TOOL_INVENTORY = [
  {
    type: "eraser",
    label: "Eraser",
    iconId: "editor_eraser",
    hotkey: "1",
  },
  {
    type: "wall",
    label: "Wall",
    iconId: "editor_wall",
    hotkey: "2",
  },
  {
    type: "spawn",
    label: "Enemy Start",
    iconId: "editor_spawn",
    hotkey: "3",
  },
  {
    type: "end",
    label: "Enemy End",
    iconId: "editor_end",
    hotkey: "4",
  },
  {
    type: "ramp",
    label: "Ramp",
    iconId: "editor_ramp",
    hotkey: "5",
  },
  {
    type: "playerSpawn",
    label: "Player Start",
    iconId: "editor_player_spawn",
    hotkey: "6",
  },
];

const app = document.getElementById("app");

const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;

function getViewportMetrics() {
  const visualViewport = window.visualViewport;
  const rawWidth = Number.isFinite(Number(visualViewport?.width))
    ? Number(visualViewport.width)
    : Number(window.innerWidth);
  const rawHeight = Number.isFinite(Number(visualViewport?.height))
    ? Number(visualViewport.height)
    : Number(window.innerHeight);
  const width = Math.max(1, Math.floor(rawWidth));
  const height = Math.max(1, Math.floor(rawHeight));
  const rawPixelRatio = Number(window.devicePixelRatio);
  const pixelRatio = clamp(
    Number.isFinite(rawPixelRatio) ? rawPixelRatio : 1,
    1,
    SCENE_CONFIG.maxPixelRatio
  );
  return {
    width,
    height,
    pixelRatio,
    isPortrait: height >= width,
  };
}

const initialViewportMetrics = getViewportMetrics();
let viewportWidth = initialViewportMetrics.width;
let viewportHeight = initialViewportMetrics.height;
let viewportPixelRatio = initialViewportMetrics.pixelRatio;
let viewportIsPortrait = initialViewportMetrics.isPortrait;
let viewportSyncFrameId = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(SCENE_CONFIG.backgroundColor);
scene.fog = new THREE.Fog(
  SCENE_CONFIG.fogColor,
  SCENE_CONFIG.fogNear,
  SCENE_CONFIG.fogFar
);

const camera = new THREE.PerspectiveCamera(
  SCENE_CONFIG.cameraFov,
  viewportWidth / viewportHeight,
  SCENE_CONFIG.cameraNear,
  SCENE_CONFIG.cameraFar
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(viewportWidth, viewportHeight);
renderer.setPixelRatio(viewportPixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
renderer.toneMappingExposure = SCENE_CONFIG.toneMappingExposure;
renderer.autoClear = false;
app.appendChild(renderer.domElement);

const uiOverlay = createUiOverlay({
  width: viewportWidth,
  height: viewportHeight,
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

let grid = createGrid(scene);
function placeCameraAtPlayerSpawn(targetGrid = grid) {
  const hasPlayerSpawnCell = !!(
    targetGrid?.playerSpawnCell
    && Number.isInteger(targetGrid.playerSpawnCell.x)
    && Number.isInteger(targetGrid.playerSpawnCell.z)
    && Number.isInteger(targetGrid.playerSpawnCell.y)
  );
  if (hasPlayerSpawnCell && typeof targetGrid.cellToWorldCenter === "function") {
    const markerY = (Number(targetGrid.tileTopY) || 0) + (targetGrid.playerSpawnCell.y * (Number(targetGrid.cellSize) || 1));
    const spawnCenter = targetGrid.cellToWorldCenter(
      targetGrid.playerSpawnCell.x,
      targetGrid.playerSpawnCell.z,
      markerY
    );
    camera.position.set(spawnCenter.x, markerY + targetGrid.eyeHeight, spawnCenter.z);
    const facingDirection = getDirectionFromCardinalRotation(targetGrid.playerSpawnRotation);
    camera.lookAt(
      spawnCenter.x + facingDirection.x,
      markerY + targetGrid.eyeHeight,
      spawnCenter.z + facingDirection.z
    );
  } else {
    camera.position.set(0, targetGrid.eyeHeight, targetGrid.moveBounds.maxZ - SCENE_CONFIG.cameraStartOffsetZ);
    camera.lookAt(0, targetGrid.eyeHeight, 0);
  }
}
placeCameraAtPlayerSpawn(grid);

const buildPhasePathPreviewGroup = new THREE.Group();
buildPhasePathPreviewGroup.visible = false;
buildPhasePathPreviewGroup.name = "BuildPathPreviewGroup";
scene.add(buildPhasePathPreviewGroup);
const buildPhasePathPreviewArrowGeometry = new THREE.ConeGeometry(1, 1, 4);
buildPhasePathPreviewArrowGeometry.rotateX(Math.PI * 0.5);
const buildPhasePathPreviewArrowForwardAxis = new THREE.Vector3(0, 0, 1);
const buildPhasePathPreviewTrails = [];

let player;
let enemySystem;
let towerSystem;
let levelEditor;
let lastEditorToolRotateAtMs = -Infinity;

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

function isGameplayWaveState(state) {
  return state === "PLAYING" || state === "DELAY" || state === "BUILD";
}

function getIsGameplayActiveForPoki() {
  return !isPaused && isGameplayWaveState(waveState);
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
  if (waveState === "EDITOR") {
    const didMutateLevel = levelEditor?.applyPrimaryAction?.();
    if (didMutateLevel) {
      rebuildEditorGridFromCurrentModel();
    }
    return;
  }
  if (towerSystem?.isBuildMode()) {
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
  if (buttonId === "next_wave") {
    if (waveState === "BUILD") {
      return startQueuedWaveNow();
    }
    return false;
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
let vCursorX = viewportWidth / 2;
let vCursorY = viewportHeight / 2;
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
    startBuildPhase(currentWave + 1);
  } else {
    waveState = menuResumeWaveState;
    syncBuildPhasePathPreviewVisibility();
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

function clearBuildPhasePathPreview() {
  for (const trail of buildPhasePathPreviewTrails) {
    trail?.material?.dispose?.();
  }
  buildPhasePathPreviewTrails.length = 0;
  while (buildPhasePathPreviewGroup.children.length > 0) {
    const effectRoot = buildPhasePathPreviewGroup.children[buildPhasePathPreviewGroup.children.length - 1];
    buildPhasePathPreviewGroup.remove(effectRoot);
  }
}

function randomBetween(min, max) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : safeMin;
  if (safeMax <= safeMin) {
    return safeMin;
  }
  return safeMin + (Math.random() * (safeMax - safeMin));
}

function createBuildPhasePreviewRoute(routeCells) {
  const points = [];
  for (const cell of routeCells) {
    const cellX = Number.parseInt(cell?.x, 10);
    const cellZ = Number.parseInt(cell?.z, 10);
    if (!Number.isInteger(cellX) || !Number.isInteger(cellZ)) {
      continue;
    }
    const center = grid.cellToWorldCenter(cellX, cellZ);
    if (!center) {
      continue;
    }
    const surfaceY = typeof grid.getCellSurfaceY === "function"
      ? grid.getCellSurfaceY(cellX, cellZ)
      : center.y;
    points.push(new THREE.Vector3(
      center.x,
      surfaceY + BUILD_PREVIEW_TRAIL_Y_OFFSET,
      center.z
    ));
  }

  if (points.length < 2) {
    return null;
  }

  const segmentLengths = [];
  let totalLength = 0;
  for (let i = 1; i < points.length; i += 1) {
    const segmentLength = points[i - 1].distanceTo(points[i]);
    segmentLengths.push(segmentLength);
    totalLength += segmentLength;
  }

  if (!Number.isFinite(totalLength) || totalLength <= 0.0001) {
    return null;
  }

  return {
    points,
    segmentLengths,
    totalLength,
  };
}

function sampleBuildPhasePreviewRoutePoint(route, distanceAlongRoute, out) {
  if (!route || route.points.length < 2 || route.segmentLengths.length < 1) {
    if (route?.points?.length > 0) {
      out.copy(route.points[0]);
    } else {
      out.set(0, 0, 0);
    }
    return out;
  }

  const routeLength = route.totalLength;
  if (!Number.isFinite(routeLength) || routeLength <= 0.0001) {
    out.copy(route.points[0]);
    return out;
  }

  let remaining = distanceAlongRoute;
  if (remaining <= 0) {
    out.copy(route.points[0]);
    return out;
  }
  if (remaining >= routeLength) {
    out.copy(route.points[route.points.length - 1]);
    return out;
  }
  let segmentIndex = 0;
  while (
    segmentIndex < route.segmentLengths.length - 1
    && remaining > route.segmentLengths[segmentIndex]
  ) {
    remaining -= route.segmentLengths[segmentIndex];
    segmentIndex += 1;
  }

  const start = route.points[segmentIndex];
  const end = route.points[segmentIndex + 1];
  const segmentLength = route.segmentLengths[segmentIndex] || 1;
  const t = segmentLength <= 0.0001 ? 0 : (remaining / segmentLength);
  out.lerpVectors(start, end, t);
  return out;
}

const buildPreviewTempHead = new THREE.Vector3();
const buildPreviewTempTail = new THREE.Vector3();
const buildPreviewTempDir = new THREE.Vector3();
const buildPreviewTempQuaternion = new THREE.Quaternion();

function updateBuildPhasePreviewTrail(trail, deltaSeconds) {
  if (!trail || !trail.route || !Array.isArray(trail.arrows)) {
    return;
  }

  const routeLength = Number(trail.route.totalLength) || 0;
  if (routeLength <= 0.0001) {
    return;
  }

  const maxDistance = routeLength + trail.spacing;
  for (const arrow of trail.arrows) {
    if (!arrow?.mesh) {
      continue;
    }

    arrow.distance += trail.speed * deltaSeconds;
    while (arrow.distance > maxDistance) {
      arrow.distance -= maxDistance;
    }

    if (arrow.distance < 0 || arrow.distance > routeLength) {
      arrow.mesh.visible = false;
      continue;
    }

    sampleBuildPhasePreviewRoutePoint(trail.route, arrow.distance, buildPreviewTempHead);
    sampleBuildPhasePreviewRoutePoint(trail.route, arrow.distance + trail.lookAheadDistance, buildPreviewTempTail);

    buildPreviewTempDir.copy(buildPreviewTempTail).sub(buildPreviewTempHead);
    buildPreviewTempDir.y = 0;
    if (buildPreviewTempDir.lengthSq() <= 0.000001) {
      buildPreviewTempDir.set(0, 0, 1);
    }
    buildPreviewTempDir.normalize();
    buildPreviewTempQuaternion.setFromUnitVectors(buildPhasePathPreviewArrowForwardAxis, buildPreviewTempDir);

    arrow.mesh.visible = true;
    arrow.mesh.position.copy(buildPreviewTempHead);
    arrow.mesh.position.y += arrow.verticalOffset;
    arrow.mesh.quaternion.copy(buildPreviewTempQuaternion);
  }
}

function syncBuildPhasePathPreviewVisibility() {
  buildPhasePathPreviewGroup.visible = (waveState === "BUILD" || waveState === "EDITOR")
    && buildPhasePathPreviewTrails.length > 0;
}

function rebuildPathPreviewFromRoutes(previewRoutes) {
  clearBuildPhasePathPreview();
  if (!Array.isArray(previewRoutes) || previewRoutes.length === 0) {
    syncBuildPhasePathPreviewVisibility();
    return;
  }

  const bestRouteBySpawn = new Map();
  for (const route of previewRoutes) {
    const spawnIndex = Number.isFinite(Number(route?.spawnIndex))
      ? Number(route.spawnIndex)
      : 0;
    const routeIndex = Number.isFinite(Number(route?.routeIndex))
      ? Number(route.routeIndex)
      : Number.POSITIVE_INFINITY;
    const existing = bestRouteBySpawn.get(spawnIndex);
    if (!existing || routeIndex < existing.routeIndex) {
      bestRouteBySpawn.set(spawnIndex, { route, routeIndex });
    }
  }

  const sortedBestRoutes = Array.from(bestRouteBySpawn.entries())
    .sort((a, b) => a[0] - b[0])
    .map((entry) => entry[1].route);

  const cellSize = Math.max(0.1, Number(grid.cellSize) || 1);
  const arrowSpacing = Math.max(0.4, cellSize * BUILD_PREVIEW_ARROW_SPACING_BLOCKS);
  const arrowLength = Math.max(0.18, cellSize * BUILD_PREVIEW_ARROW_LENGTH_FROM_CELL);
  const arrowRadius = Math.max(0.04, cellSize * BUILD_PREVIEW_ARROW_RADIUS_FROM_CELL);
  const arrowSpeed = Math.max(0.2, cellSize * BUILD_PREVIEW_ARROW_SPEED_BLOCKS_PER_SECOND);
  const lookAheadDistance = Math.max(0.12, arrowLength * 0.8);

  for (const route of sortedBestRoutes) {
    const routeCells = Array.isArray(route?.cells) ? route.cells : [];
    if (routeCells.length < 2) {
      continue;
    }
    const routeData = createBuildPhasePreviewRoute(routeCells);
    if (!routeData) {
      continue;
    }

    const spawnIndex = Number.isFinite(Number(route?.spawnIndex))
      ? Number(route.spawnIndex)
      : 0;
    const colorHex = BUILD_PREVIEW_TRAIL_COLORS[
      ((Math.floor(spawnIndex) % BUILD_PREVIEW_TRAIL_COLORS.length) + BUILD_PREVIEW_TRAIL_COLORS.length)
      % BUILD_PREVIEW_TRAIL_COLORS.length
    ];

    const material = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: BUILD_PREVIEW_ARROW_OPACITY,
      depthWrite: false,
    });
    material.toneMapped = false;

    const routeRoot = new THREE.Group();
    const arrowCount = Math.max(1, Math.floor(routeData.totalLength / arrowSpacing) + 1);
    const arrows = [];
    for (let i = 0; i < arrowCount; i += 1) {
      const arrowMesh = new THREE.Mesh(buildPhasePathPreviewArrowGeometry, material);
      arrowMesh.castShadow = false;
      arrowMesh.receiveShadow = false;
      arrowMesh.frustumCulled = false;
      arrowMesh.visible = false;
      arrowMesh.scale.set(arrowRadius, arrowRadius, arrowLength);
      routeRoot.add(arrowMesh);

      arrows.push({
        mesh: arrowMesh,
        distance: i * arrowSpacing,
        verticalOffset: randomBetween(
          -cellSize * BUILD_PREVIEW_ARROW_VERTICAL_JITTER,
          cellSize * BUILD_PREVIEW_ARROW_VERTICAL_JITTER
        ),
      });
    }

    const trail = {
      root: routeRoot,
      material,
      route: routeData,
      arrows,
      spacing: arrowSpacing,
      speed: arrowSpeed,
      lookAheadDistance,
    };
    updateBuildPhasePreviewTrail(trail, 0);
    buildPhasePathPreviewGroup.add(routeRoot);
    buildPhasePathPreviewTrails.push(trail);
  }

  syncBuildPhasePathPreviewVisibility();
}

function rebuildBuildPhasePathPreview() {
  if (!enemySystem || typeof enemySystem.getRoutePreviewPaths !== "function") {
    clearBuildPhasePathPreview();
    syncBuildPhasePathPreviewVisibility();
    return;
  }
  rebuildPathPreviewFromRoutes(enemySystem.getRoutePreviewPaths());
}

function rebuildEditorPathPreview() {
  if (waveState !== "EDITOR") {
    return;
  }
  let previewEnemySystem = null;
  try {
    previewEnemySystem = createEnemySystem(scene, grid);
    const previewRoutes = typeof previewEnemySystem.getRoutePreviewPaths === "function"
      ? previewEnemySystem.getRoutePreviewPaths()
      : [];
    rebuildPathPreviewFromRoutes(previewRoutes);
  } catch (error) {
    clearBuildPhasePathPreview();
    syncBuildPhasePathPreviewVisibility();
  } finally {
    previewEnemySystem?.dispose?.();
  }
}

function updateBuildPhasePathPreview(deltaSeconds) {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0 || buildPhasePathPreviewTrails.length === 0) {
    return;
  }
  for (const trail of buildPhasePathPreviewTrails) {
    updateBuildPhasePreviewTrail(trail, deltaSeconds);
  }
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

  const inGameplayState = isGameplayWaveState(waveState);
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
      vCursorX = Math.max(0, Math.min(viewportWidth, vCursorX));
      vCursorY = Math.max(0, Math.min(viewportHeight, vCursorY));
      updateMenuHoverFromVirtualCursor();
    }
  }, true);

  window.addEventListener("wheel", (event) => {
    if (waveState !== "EDITOR" || !levelEditor) {
      return;
    }
    const selectedTool = levelEditor.getSelectedTool?.();
    if (selectedTool !== "ramp" && selectedTool !== "playerSpawn") {
      return;
    }
    if (event.deltaY === 0) {
      return;
    }
    const nowMs = typeof performance?.now === "function" ? performance.now() : Date.now();
    if ((nowMs - lastEditorToolRotateAtMs) < EDITOR_TOOL_ROTATE_INTERVAL_MS) {
      event.preventDefault();
      return;
    }
    lastEditorToolRotateAtMs = nowMs;
    const direction = event.deltaY > 0 ? 1 : -1;
    let didRotate = false;
    if (typeof levelEditor.rotateSelectedTool === "function") {
      didRotate = levelEditor.rotateSelectedTool(direction) != null;
    } else if (selectedTool === "ramp") {
      didRotate = typeof levelEditor.rotateRamp?.(direction) === "number";
    } else if (selectedTool === "playerSpawn") {
      didRotate = typeof levelEditor.rotatePlayerSpawn?.(direction) === "number";
    }
    if (didRotate && typeof levelEditor.update === "function") {
      levelEditor.update();
    }
    event.preventDefault();
  }, { passive: false });

  window.addEventListener("mousedown", (event) => {
    if (!player) {
      return;
    }

    if (event.button === 0) {
      suppressNextDesktopCanvasClick = false;
      if (!player.controls.isLocked) {
        const pointer = getCanvasPointerPosition(event);
        const hudButton = uiOverlay.hitTestHudButton(pointer.x, pointer.y);
        if (hudButton && handleHudButtonAction(hudButton)) {
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

    if (waveState === "EDITOR") {
      if (event.button !== 0 || !player.controls.isLocked) {
        return;
      }
      const didMutateLevel = levelEditor?.applyPrimaryAction?.();
      if (didMutateLevel) {
        rebuildEditorGridFromCurrentModel();
      }
      return;
    }

    if (event.button === 2 && towerSystem) {
      towerSystem.selectTower("laser");
      return;
    }

    if (event.button !== 0) {
      return;
    }

    if (!player.controls.isLocked) {
      return;
    }

    if (towerSystem?.isBuildMode()) {
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
  if (!player) return;

  if (event.code === DESKTOP_EDITOR_TOGGLE_KEY && !event.repeat && !isTouchDevice) {
    if (waveState === "EDITOR") {
      exitEditorMode();
    } else {
      enterEditorMode();
    }
    return;
  }

  if (waveState === "EDITOR") {
    if (event.code.startsWith("Digit")) {
      const rawDigit = Number(event.code.slice(5));
      if (!Number.isNaN(rawDigit)) {
        levelEditor?.selectToolByDigit?.(rawDigit);
      }
      return;
    }
    if (event.code === "Enter") {
      const didMutateLevel = levelEditor?.applyPrimaryAction?.();
      if (didMutateLevel) {
        rebuildEditorGridFromCurrentModel();
      }
    }
    return;
  }

  if (event.code === "KeyK" && !event.repeat) {
    if (waveState === "MENU") {
      showUpgradeMenu({
        advanceWaveOnChoice: menuAdvancesWaveOnChoice,
        resumeWaveState: menuResumeWaveState,
      });
      return;
    }
    const resumeWaveState = normalizeMenuResumeWaveState(waveState);
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
    if (waveState === "BUILD") {
      startQueuedWaveNow();
    } else {
      toggleGameSpeed();
    }
    return;
  }

  if (waveState === "MENU") {
    if (event.code === "Digit1" || event.code === "Digit2" || event.code === "Digit3") {
      const optionIndex = Number(event.code.slice(-1)) - 1;
      applyUpgradeChoice(optionIndex);
    }
    return;
  }

  if (event.code === "Escape" && towerSystem?.isBuildMode()) {
    towerSystem.cancelPlacement();
    return;
  }

  if (event.code.startsWith("Digit") && towerSystem) {
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
    towerSystem?.cancelPlacement?.();
    return;
  }

  if (event.code === "Enter" && towerSystem?.isBuildMode()) {
    towerSystem.placeSelectedTower();
  }
});

let waveState = "PLAYING";
let currentWave = WAVE_CONFIG.initialWave;
let waveDelay = 0;
let queuedWaveNumber = null;
let buildPhaseRemainingSeconds = 0;
let fpsDisplay = 0;
let fpsSampleTime = 0;
let fpsSampleFrames = 0;

function resetRunStateForNewLevel() {
  player?.resetRunState?.();
  playerMoney = startingCash;
  currentWave = WAVE_CONFIG.initialWave;
  waveDelay = 0;
  queuedWaveNumber = null;
  buildPhaseRemainingSeconds = 0;
  currentUpgradeOptions = [];
  hoveredUpgradeIndex = -1;
  menuAdvancesWaveOnChoice = true;
  menuResumeWaveState = "PLAYING";
  hasShownFirstUpgradeMenu = false;
  upgradeCountsById.clear();
  isPrimaryDown = false;
  gameSpeedMultiplier = GAME_SPEED_NORMAL;
}

function disposeCombatSystems() {
  if (towerSystem && typeof towerSystem.dispose === "function") {
    towerSystem.dispose();
  }
  if (enemySystem && typeof enemySystem.dispose === "function") {
    enemySystem.dispose();
  }
  towerSystem = null;
  enemySystem = null;
}

function createEnemySystemForCurrentGrid() {
  return createEnemySystem(scene, grid, {
    onEnemyDefeated: (cashReward) => {
      addMoney(cashReward);
    },
  });
}

function createTowerSystemForCurrentGrid() {
  return createTowerSystem({
    scene,
    camera,
    grid,
    getCurrentMoney: () => playerMoney,
    spendMoney: (amount) => trySpendMoney(amount),
    canBlockCell: (cellX, cellZ) => {
      if (!enemySystem || typeof enemySystem.canBlockCell !== "function") {
        return true;
      }
      return enemySystem.canBlockCell(cellX, cellZ);
    },
    getBlockedRevision: () => {
      if (!enemySystem || typeof enemySystem.getBlockedRevision !== "function") {
        return 0;
      }
      return enemySystem.getBlockedRevision();
    },
    onBlockedCellsChanged: (blockedCells) => {
      if (!enemySystem || typeof enemySystem.setBlockedCells !== "function") {
        return true;
      }
      const didUpdate = enemySystem.setBlockedCells(blockedCells);
      if (didUpdate && waveState === "BUILD") {
        rebuildBuildPhasePathPreview();
      } else if (didUpdate && waveState === "EDITOR") {
        rebuildEditorPathPreview();
      }
      return didUpdate;
    },
  });
}

function recreateGameplaySystems() {
  disposeCombatSystems();
  enemySystem = createEnemySystemForCurrentGrid();
  towerSystem = createTowerSystemForCurrentGrid();
  enemySystem.setBlockedCells(towerSystem.getBlockedCells());
}

function replaceGrid(nextLevelObjects, options = {}) {
  const {
    allowIncompleteMarkers = false,
    editorMode = false,
  } = options;
  const nextGrid = createGrid(scene, {
    levelObjects: nextLevelObjects,
    allowIncompleteMarkers,
    editorMode,
  });
  if (grid && typeof grid.dispose === "function") {
    grid.dispose();
  }
  grid = nextGrid;
  if (levelEditor) {
    levelEditor.setGrid(grid);
  }
}

function getCurrentLevelObjectsSnapshot() {
  if (waveState === "EDITOR" && levelEditor && typeof levelEditor.getLevelObjects === "function") {
    return levelEditor.getLevelObjects();
  }
  if (grid && typeof grid.getLevelObjects === "function") {
    return grid.getLevelObjects();
  }
  return [];
}

function rebuildEditorGridFromCurrentModel() {
  const levelObjects = levelEditor?.getLevelObjects?.() ?? [];
  replaceGrid(levelObjects, {
    allowIncompleteMarkers: true,
    editorMode: true,
  });
  rebuildEditorPathPreview();
}

function enterEditorMode() {
  if (isTouchDevice) {
    return false;
  }
  if (waveState === "EDITOR") {
    return true;
  }

  if (waveState === "MENU") {
    player.setMenuMode(false);
    currentUpgradeOptions = [];
    hoveredUpgradeIndex = -1;
  }
  if (towerSystem?.isBuildMode()) {
    towerSystem.cancelPlacement();
  }

  const levelObjects = getCurrentLevelObjectsSnapshot();
  disposeCombatSystems();

  if (levelEditor) {
    levelEditor.dispose();
    levelEditor = null;
  }

  replaceGrid(levelObjects, {
    allowIncompleteMarkers: true,
    editorMode: true,
  });
  levelEditor = createLevelEditor({
    scene,
    camera,
    grid,
    initialLevelObjects: levelObjects,
  });

  waveState = "EDITOR";
  queuedWaveNumber = null;
  buildPhaseRemainingSeconds = 0;
  resetMobileInputState();
  clearBuildPhasePathPreview();
  rebuildEditorPathPreview();
  return true;
}

function validateEditorLevelPlayable() {
  try {
    const validationEnemySystem = createEnemySystem(scene, grid);
    validationEnemySystem.dispose?.();
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error,
    };
  }
}

function exitEditorMode() {
  if (waveState !== "EDITOR") {
    return false;
  }
  const validation = validateEditorLevelPlayable();
  if (!validation.valid) {
    const reason = validation.error instanceof Error
      ? validation.error.message
      : String(validation.error);
    console.warn(`[LevelEditor] Level is not playable yet: ${reason}`);
    rebuildEditorPathPreview();
    return false;
  }

  const levelObjects = levelEditor?.getLevelObjects?.() ?? [];
  levelEditor?.dispose?.();
  levelEditor = null;

  replaceGrid(levelObjects, {
    allowIncompleteMarkers: false,
    editorMode: false,
  });
  recreateGameplaySystems();

  resetRunStateForNewLevel();
  placeCameraAtPlayerSpawn(grid);
  startBuildPhase(WAVE_CONFIG.initialWave);
  return true;
}

function normalizeMenuResumeWaveState(state) {
  if (state === "DELAY" || state === "BUILD") {
    return state;
  }
  return "PLAYING";
}

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

function startBuildPhase(nextWave) {
  queuedWaveNumber = Math.max(1, Math.floor(Number(nextWave) || (currentWave + 1)));
  buildPhaseRemainingSeconds = BUILD_PHASE_DURATION_SECONDS;
  waveState = "BUILD";
  rebuildBuildPhasePathPreview();
  syncBuildPhasePathPreviewVisibility();
  if (buildPhaseRemainingSeconds <= 0) {
    startQueuedWaveNow();
  }
}

function startQueuedWaveNow() {
  if (!Number.isInteger(queuedWaveNumber) || queuedWaveNumber < 1) {
    return false;
  }
  const nextWave = queuedWaveNumber;
  queuedWaveNumber = null;
  buildPhaseRemainingSeconds = 0;
  clearBuildPhasePathPreview();
  syncBuildPhasePathPreviewVisibility();
  startWave(nextWave);
  return true;
}

function startWave(wave) {
  if (!enemySystem) {
    return;
  }
  currentWave = wave;
  waveState = "PLAYING";
  queuedWaveNumber = null;
  buildPhaseRemainingSeconds = 0;
  clearBuildPhasePathPreview();
  syncBuildPhasePathPreviewVisibility();

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
  menuResumeWaveState = normalizeMenuResumeWaveState(resumeWaveState);

  player.setMenuMode(true);
  resetMobileInputState();
  vCursorX = viewportWidth * 0.5;
  vCursorY = viewportHeight * 0.5;

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
  if (rawDeltaSeconds > 0 && Number.isFinite(rawDeltaSeconds)) {
    fpsSampleTime += rawDeltaSeconds;
    fpsSampleFrames += 1;
    if (fpsSampleTime >= FPS_SAMPLE_WINDOW_SECONDS) {
      fpsDisplay = fpsSampleFrames / fpsSampleTime;
      fpsSampleTime = 0;
      fpsSampleFrames = 0;
    }
  }

  if (!isPaused) {
    if (waveState === "PLAYING") {
      if (enemySystem && enemySystem.isWaveClear()) {
        waveState = "DELAY";
        waveDelay = WAVE_CONFIG.upgradeDelaySeconds;
      }
    } else if (waveState === "DELAY") {
      waveDelay -= simulationDeltaSeconds;
      if (waveDelay <= 0) {
        waveState = "MENU";
        showUpgradeMenu();
      }
    } else if (waveState === "BUILD") {
      buildPhaseRemainingSeconds = Math.max(0, buildPhaseRemainingSeconds - rawDeltaSeconds);
      if (buildPhaseRemainingSeconds <= 0) {
        startQueuedWaveNow();
      }
      updateBuildPhasePathPreview(rawDeltaSeconds);
    } else if (waveState === "EDITOR") {
      levelEditor?.update?.();
      updateBuildPhasePathPreview(rawDeltaSeconds);
    }

    if (isGameplayWaveState(waveState)) {
      applyMobileGameplayInput();
      if (isPrimaryDown) {
        handlePrimaryAction();
      }
      player.update(simulationDeltaSeconds, enemySystem);
      enemySystem?.update?.(simulationDeltaSeconds, camera);
      towerSystem?.update?.(simulationDeltaSeconds, enemySystem);
    } else if (waveState === "EDITOR") {
      player.update(simulationDeltaSeconds, enemySystem);
    }
  }

  if (typeof grid.updateBoundaryWallVisual === "function") {
    grid.updateBoundaryWallVisual(camera.position);
  }

  syncBuildPhasePathPreviewVisibility();
  syncPokiGameplayState();

  const towerInventory = waveState === "EDITOR"
    ? EDITOR_TOOL_INVENTORY.map((entry) => ({
      ...entry,
      affordable: true,
      remaining: 1,
      cost: 0,
    }))
    : (towerSystem
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
    : []);
  const hudWaveNumber = Math.max(
    1,
    Math.floor(
      (
        waveState === "BUILD"
          && Number.isInteger(queuedWaveNumber)
          && queuedWaveNumber > 0
      )
        ? queuedWaveNumber
        : (currentWave || 1)
    )
  );
  const showTouchControls = isTouchDevice || forceTouchControls;
  const touchPortrait = viewportIsPortrait;

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
    waveNumber: hudWaveNumber,
    towerInventory,
    selectedTowerType: waveState === "EDITOR"
      ? (levelEditor?.getSelectedTool?.() ?? null)
      : (towerSystem ? towerSystem.getSelectedTowerType() : null),
    buildMode: waveState === "EDITOR" ? false : (towerSystem ? towerSystem.isBuildMode() : false),
    showKeyboardHints: !showTouchControls,
    showTouchControls,
    showPauseButton: showTouchControls && waveState !== "BUILD" && waveState !== "EDITOR",
    showSpeedButton: waveState !== "BUILD" && waveState !== "EDITOR",
    buildPhaseActive: waveState === "BUILD",
    buildPhaseRemainingSeconds,
    showNextWaveButton: waveState === "BUILD",
    paused: isPaused,
    speedMultiplier: gameSpeedMultiplier,
    fps: fpsDisplay,
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
  player = createPlayer({
    scene,
    camera,
    domElement: renderer.domElement,
    eyeHeight: grid.eyeHeight,
    movementBounds: grid.levelBounds ?? grid.moveBounds,
    getMovementObstacles: () => {
      const terrainObstacles = Array.isArray(grid.heightObstacles) ? grid.heightObstacles : [];
      const rampObstacles = Array.isArray(grid.rampObstacles) ? grid.rampObstacles : [];
      const endpointObstacles = Array.isArray(grid.endpointObstacles) ? grid.endpointObstacles : [];
      const towerObstacles = towerSystem ? towerSystem.getMovementObstacles() : [];
      const staticObstacles = [...terrainObstacles, ...rampObstacles, ...endpointObstacles];
      if (staticObstacles.length === 0) {
        return towerObstacles;
      }
      if (towerObstacles.length === 0) {
        return staticObstacles;
      }
      return [...staticObstacles, ...towerObstacles];
    },
  });
  recreateGameplaySystems();

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
      if (player) player.controls.getObject().position.set(x, grid.eyeHeight, z);
    },
    placeBasicTower: (x, z) => {
      if (towerSystem) return towerSystem.forcePlaceTower(x, z, "laser");
      return false;
    },
    spawnEnemy: (type = "red") => {
      if (enemySystem) {
        return enemySystem.forceSpawnEnemy(type, 0);
      }
      return false;
    },
    addMoney: (amount = 100) => {
      addMoney(amount);
    },
    getMoney: () => playerMoney,
    getPathfindingPerf: () => {
      if (!enemySystem || typeof enemySystem.getPathfindingPerfStats !== "function") {
        return null;
      }
      return enemySystem.getPathfindingPerfStats();
    },
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

  window.exportLevel = () => {
    if (waveState === "EDITOR" && levelEditor && typeof levelEditor.getExportPayload === "function") {
      return levelEditor.getExportPayload();
    }
    return {
      levelObjects: typeof grid?.getLevelObjects === "function" ? grid.getLevelObjects() : [],
    };
  };

  startBuildPhase(WAVE_CONFIG.initialWave);
  reportPokiGameLoadingFinished();
  animate();
}

initGame();

function applyViewportMetrics(nextViewportMetrics = getViewportMetrics()) {
  const previousOrientation = viewportIsPortrait;
  viewportWidth = Math.max(1, Math.floor(nextViewportMetrics.width));
  viewportHeight = Math.max(1, Math.floor(nextViewportMetrics.height));
  viewportPixelRatio = clamp(nextViewportMetrics.pixelRatio, 1, SCENE_CONFIG.maxPixelRatio);
  viewportIsPortrait = !!nextViewportMetrics.isPortrait;

  camera.aspect = viewportWidth / viewportHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(viewportPixelRatio);
  renderer.setSize(viewportWidth, viewportHeight);
  uiOverlay.resize(viewportWidth, viewportHeight);
  vCursorX = clamp(vCursorX, 0, viewportWidth);
  vCursorY = clamp(vCursorY, 0, viewportHeight);

  const didOrientationBucketChange = previousOrientation !== viewportIsPortrait;
  const touchControlsActive = isTouchDevice || forceTouchControls;
  if (didOrientationBucketChange && touchControlsActive) {
    resetMobileInputState();
  }
}

function scheduleViewportSync() {
  if (viewportSyncFrameId != null) {
    return;
  }
  viewportSyncFrameId = window.requestAnimationFrame(() => {
    viewportSyncFrameId = null;
    applyViewportMetrics(getViewportMetrics());
  });
}

window.addEventListener("resize", scheduleViewportSync);
window.addEventListener("orientationchange", scheduleViewportSync);
if (window.visualViewport && typeof window.visualViewport.addEventListener === "function") {
  window.visualViewport.addEventListener("resize", scheduleViewportSync);
}
