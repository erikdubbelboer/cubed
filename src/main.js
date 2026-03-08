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
const PLAYER_CONFIG = GAME_CONFIG.player ?? {};
const TECH_TREE_CONFIG = GAME_CONFIG.techTree ?? {};
const ENEMY_TYPES = ENEMY_CONFIG.types ?? {};
const CONFIGURED_ROUNDS = Array.isArray(WAVE_CONFIG.rounds) ? WAVE_CONFIG.rounds : [];
const DEFAULT_RUN_WEAPON_OPTIONS = [
  { type: "machineGun", label: "Machine Gun", iconId: "weapon_machine_gun" },
  { type: "sniper", label: "Sniper", iconId: "weapon_sniper" },
  { type: "bazooka", label: "Bazooka", iconId: "weapon_bazooka" },
];
const RUN_WEAPON_OPTIONS = Array.isArray(PLAYER_CONFIG.weaponSelection?.options)
  ? PLAYER_CONFIG.weaponSelection.options
    .filter((option) => option && typeof option.type === "string" && option.type.length > 0)
    .map((option) => ({
      type: option.type,
      label: typeof option.label === "string" && option.label.length > 0
        ? option.label
        : option.type,
      iconId: typeof option.iconId === "string" && option.iconId.length > 0
        ? option.iconId
        : "weapon_machine_gun",
    }))
  : DEFAULT_RUN_WEAPON_OPTIONS.slice();
const MENU_MODE_TECH_TREE = "tech_tree";
const MENU_MODE_WEAPON_SELECT = "weapon_select";
const TECH_TREE_MENU_TITLE = "Research Tree";
const WEAPON_MENU_TITLE = "Choose Your Weapon";
const WEAPON_MENU_SUBTITLE = "Pick one for this run";
const TECH_TREE_DRAG_THRESHOLD_PX = 8;
const TECH_TREE_TOUCH_LONG_PRESS_MS = 420;
const MOBILE_LOOK_SENSITIVITY_SCALE = Number.isFinite(Number(MOBILE_UI_CONFIG.lookSensitivityScale))
  ? Math.max(0.1, Number(MOBILE_UI_CONFIG.lookSensitivityScale))
  : 1;
const MOBILE_LOOK_ACCELERATION_DISTANCE = Number.isFinite(Number(MOBILE_UI_CONFIG.lookAccelerationDistancePx))
  ? Math.max(8, Number(MOBILE_UI_CONFIG.lookAccelerationDistancePx))
  : 140;
const MOBILE_LOOK_ACCELERATION_MAX_MULTIPLIER = Number.isFinite(Number(MOBILE_UI_CONFIG.lookAccelerationMaxMultiplier))
  ? Math.max(1, Number(MOBILE_UI_CONFIG.lookAccelerationMaxMultiplier))
  : 3.25;
const MOBILE_LOOK_ACCELERATION_EXPONENT = Number.isFinite(Number(MOBILE_UI_CONFIG.lookAccelerationExponent))
  ? Math.max(0.1, Number(MOBILE_UI_CONFIG.lookAccelerationExponent))
  : 1.35;
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
const LEVELING_CONFIG = ECONOMY_CONFIG.leveling ?? {};
const DEFAULT_XP_PER_KILL = 1;
const XP_PER_KILL = Number.isFinite(Number(LEVELING_CONFIG.xpPerKill))
  ? Math.max(0, Number(LEVELING_CONFIG.xpPerKill))
  : DEFAULT_XP_PER_KILL;
const DEFAULT_BASE_XP_TO_LEVEL = 9;
const BASE_XP_TO_LEVEL = Number.isFinite(Number(LEVELING_CONFIG.baseXpToLevel))
  ? Math.max(0.01, Number(LEVELING_CONFIG.baseXpToLevel))
  : DEFAULT_BASE_XP_TO_LEVEL;
const DEFAULT_LEVEL_XP_GROWTH_MULTIPLIER = 1.1;
const LEVEL_XP_GROWTH_MULTIPLIER = Number.isFinite(Number(LEVELING_CONFIG.levelXpGrowthMultiplier))
  ? Math.max(1, Number(LEVELING_CONFIG.levelXpGrowthMultiplier))
  : DEFAULT_LEVEL_XP_GROWTH_MULTIPLIER;
const LEVEL_XP_COMPARE_EPSILON = 1e-6;
const ECONOMY_PICKUP_CONFIG = ECONOMY_CONFIG.pickups ?? {};
const MONEY_DROP_DENOMINATIONS = [1, 10, 100];
const MONEY_DROP_MERGE_TARGET_BY_VALUE = new Map([
  [1, 10],
  [10, 100],
]);
const DEFAULT_MONEY_PICKUP_BASE_RANGE = 1.35;
const MONEY_PICKUP_BASE_RANGE = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.basePickupRange))
  ? Math.max(0.05, Number(ECONOMY_PICKUP_CONFIG.basePickupRange))
  : DEFAULT_MONEY_PICKUP_BASE_RANGE;
const DEFAULT_MONEY_PICKUP_UPGRADE_ADD = 0.5;
const MONEY_PICKUP_UPGRADE_ADD = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.pickupRangeUpgradeAdd))
  ? Number(ECONOMY_PICKUP_CONFIG.pickupRangeUpgradeAdd)
  : DEFAULT_MONEY_PICKUP_UPGRADE_ADD;
const MONEY_DROP_SIZE = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.cubeSize))
  ? Math.max(0.05, Number(ECONOMY_PICKUP_CONFIG.cubeSize))
  : 0.26;
const MONEY_DROP_HALF_SIZE = MONEY_DROP_SIZE * 0.5;
const MONEY_DROP_SPAWN_SPREAD = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.spawnSpread))
  ? Math.max(0, Number(ECONOMY_PICKUP_CONFIG.spawnSpread))
  : 0.45;
const MONEY_DROP_SPAWN_HEIGHT_OFFSET = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.spawnHeightOffset))
  ? Number(ECONOMY_PICKUP_CONFIG.spawnHeightOffset)
  : 0.38;
const MONEY_DROP_RANDOM_HORIZONTAL_SPEED = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.randomHorizontalSpeed))
  ? Math.max(0, Number(ECONOMY_PICKUP_CONFIG.randomHorizontalSpeed))
  : 1.05;
const MONEY_DROP_INITIAL_UPWARD_SPEED = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.spawnUpwardSpeed))
  ? Number(ECONOMY_PICKUP_CONFIG.spawnUpwardSpeed)
  : 1.5;
const MONEY_DROP_GRAVITY = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.gravity))
  ? Math.max(0, Number(ECONOMY_PICKUP_CONFIG.gravity))
  : 16;
const MONEY_DROP_HORIZONTAL_DAMPING = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.horizontalDamping))
  ? clamp(Number(ECONOMY_PICKUP_CONFIG.horizontalDamping), 0, 1)
  : 0.9;
const MONEY_DROP_MERGE_RADIUS = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.mergeRadius))
  ? Math.max(0.01, Number(ECONOMY_PICKUP_CONFIG.mergeRadius))
  : 0.75;
const MONEY_DROP_MERGE_RADIUS_SQ = MONEY_DROP_MERGE_RADIUS * MONEY_DROP_MERGE_RADIUS;
const MONEY_DROP_MERGE_CONVERGE_SPEED = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.mergeConvergeSpeed))
  ? Math.max(0.01, Number(ECONOMY_PICKUP_CONFIG.mergeConvergeSpeed))
  : 7.5;
const MONEY_DROP_MERGE_CONVERGE_ARRIVAL_DISTANCE = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.mergeConvergeArrivalDistance))
  ? Math.max(0.01, Number(ECONOMY_PICKUP_CONFIG.mergeConvergeArrivalDistance))
  : 0.06;
const MONEY_DROP_MERGE_CONVERGE_ARRIVAL_DISTANCE_SQ = MONEY_DROP_MERGE_CONVERGE_ARRIVAL_DISTANCE * MONEY_DROP_MERGE_CONVERGE_ARRIVAL_DISTANCE;
const MONEY_DROP_HOMING_SPEED = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.homingSpeed))
  ? Math.max(0.01, Number(ECONOMY_PICKUP_CONFIG.homingSpeed))
  : 9;
const MONEY_DROP_PICKUP_ARRIVAL_DISTANCE = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.pickupArrivalDistance))
  ? Math.max(0.01, Number(ECONOMY_PICKUP_CONFIG.pickupArrivalDistance))
  : 0.18;
const MONEY_DROP_PICKUP_ARRIVAL_DISTANCE_SQ = MONEY_DROP_PICKUP_ARRIVAL_DISTANCE * MONEY_DROP_PICKUP_ARRIVAL_DISTANCE;
const MONEY_DROP_ROUGHNESS = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.roughness))
  ? clamp(Number(ECONOMY_PICKUP_CONFIG.roughness), 0, 1)
  : 0.38;
const MONEY_DROP_METALNESS = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.metalness))
  ? clamp(Number(ECONOMY_PICKUP_CONFIG.metalness), 0, 1)
  : 0.08;
const MONEY_DROP_EMISSIVE_INTENSITY = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.emissiveIntensity))
  ? Math.max(0, Number(ECONOMY_PICKUP_CONFIG.emissiveIntensity))
  : 0.62;
const pickupValueColors = ECONOMY_PICKUP_CONFIG.valueColors ?? {};
const pickupValueEmissives = ECONOMY_PICKUP_CONFIG.valueEmissives ?? {};
const MONEY_DROP_COLOR_BY_VALUE = {
  1: Number.isFinite(Number(pickupValueColors.value1))
    ? Number(pickupValueColors.value1)
    : 0x61ff8e,
  10: Number.isFinite(Number(pickupValueColors.value10))
    ? Number(pickupValueColors.value10)
    : 0x39c35b,
  100: Number.isFinite(Number(pickupValueColors.value100))
    ? Number(pickupValueColors.value100)
    : 0x1f8637,
};
const MONEY_DROP_EMISSIVE_BY_VALUE = {
  1: Number.isFinite(Number(pickupValueEmissives.value1))
    ? Number(pickupValueEmissives.value1)
    : 0x1f6d37,
  10: Number.isFinite(Number(pickupValueEmissives.value10))
    ? Number(pickupValueEmissives.value10)
    : 0x16512a,
  100: Number.isFinite(Number(pickupValueEmissives.value100))
    ? Number(pickupValueEmissives.value100)
    : 0x10371e,
};

const rawTechTreeNodes = Array.isArray(TECH_TREE_CONFIG.nodes) ? TECH_TREE_CONFIG.nodes : [];
const TECH_TREE_NODE_BY_ID = new Map();
const TECH_TREE_NODES = [];
for (const rawNode of rawTechTreeNodes) {
  const id = typeof rawNode?.id === "string" ? rawNode.id.trim() : "";
  if (!id || TECH_TREE_NODE_BY_ID.has(id)) {
    continue;
  }
  const node = {
    id,
    label: typeof rawNode.label === "string" ? rawNode.label : id,
    description: typeof rawNode.description === "string" ? rawNode.description : "",
    iconId: typeof rawNode.iconId === "string" ? rawNode.iconId : "tower_gun",
    parents: Array.isArray(rawNode.parents)
      ? rawNode.parents.filter((parentId) => typeof parentId === "string" && parentId.length > 0)
      : [],
    cost: Math.max(0, Math.floor(Number(rawNode.cost) || 0)),
    startsUnlocked: rawNode.startsUnlocked === true,
    grants: rawNode?.grants && typeof rawNode.grants === "object" ? rawNode.grants : {},
    position: {
      x: Number.isFinite(Number(rawNode?.position?.x)) ? Number(rawNode.position.x) : 0,
      y: Number.isFinite(Number(rawNode?.position?.y)) ? Number(rawNode.position.y) : 0,
    },
  };
  TECH_TREE_NODES.push(node);
  TECH_TREE_NODE_BY_ID.set(node.id, node);
}
const TECH_TREE_ROOT_NODE_ID = (
  typeof TECH_TREE_CONFIG.rootNodeId === "string"
  && TECH_TREE_NODE_BY_ID.has(TECH_TREE_CONFIG.rootNodeId)
)
  ? TECH_TREE_CONFIG.rootNodeId
  : (TECH_TREE_NODES[0]?.id ?? null);
const rawTechTreeEdgeJoints = (
  TECH_TREE_CONFIG.edgeJoints
  && typeof TECH_TREE_CONFIG.edgeJoints === "object"
  && !Array.isArray(TECH_TREE_CONFIG.edgeJoints)
)
  ? TECH_TREE_CONFIG.edgeJoints
  : {};
const TECH_TREE_EDGES = [];
for (const node of TECH_TREE_NODES) {
  for (const parentId of node.parents) {
    if (TECH_TREE_NODE_BY_ID.has(parentId)) {
      const edgeKey = `${parentId}->${node.id}`;
      const rawJointList = rawTechTreeEdgeJoints[edgeKey];
      const joints = Array.isArray(rawJointList)
        ? rawJointList
          .map((joint) => {
            const x = Number(joint?.x);
            const y = Number(joint?.y);
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
              return null;
            }
            return { x, y };
          })
          .filter((joint) => !!joint)
        : [];
      TECH_TREE_EDGES.push({ from: parentId, to: node.id, joints });
    }
  }
}

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
const moneyDropGroup = new THREE.Group();
moneyDropGroup.name = "MoneyDropGroup";
scene.add(moneyDropGroup);
const moneyDropGeometry = new THREE.BoxGeometry(MONEY_DROP_SIZE, MONEY_DROP_SIZE, MONEY_DROP_SIZE);
const moneyDropMaterialsByValue = new Map(
  MONEY_DROP_DENOMINATIONS.map((value) => {
    const material = new THREE.MeshStandardMaterial({
      color: MONEY_DROP_COLOR_BY_VALUE[value],
      emissive: MONEY_DROP_EMISSIVE_BY_VALUE[value],
      emissiveIntensity: MONEY_DROP_EMISSIVE_INTENSITY,
      roughness: MONEY_DROP_ROUGHNESS,
      metalness: MONEY_DROP_METALNESS,
    });
    return [value, material];
  })
);
const activeMoneyDrops = [];
const activeMoneyDropMergeJobs = [];
const moneyDropMergeScratch = [];
const moneyDropTempFeetPosition = new THREE.Vector3();
let nextMoneyDropMergeJobId = 1;
let moneyPickupRangeBonus = 0;

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

function getMoneyDropSurfaceYAtWorld(worldX, worldZ) {
  if (typeof grid?.getBuildSurfaceYAtWorld === "function") {
    const surfaceY = Number(grid.getBuildSurfaceYAtWorld(worldX, worldZ));
    if (Number.isFinite(surfaceY)) {
      return surfaceY;
    }
  }
  const fallbackY = Number(grid?.tileTopY);
  return Number.isFinite(fallbackY) ? fallbackY : 0;
}

function getEffectiveMoneyPickupRange() {
  return Math.max(0.05, MONEY_PICKUP_BASE_RANGE + moneyPickupRangeBonus);
}

function upgradeMoneyPickupRange(addAmount = MONEY_PICKUP_UPGRADE_ADD) {
  const safeAdd = Number(addAmount);
  if (!Number.isFinite(safeAdd) || safeAdd <= 0) {
    return getEffectiveMoneyPickupRange();
  }
  moneyPickupRangeBonus += safeAdd;
  return getEffectiveMoneyPickupRange();
}

function removeMoneyDropEntry(dropEntry) {
  if (!dropEntry || dropEntry.removed) {
    return;
  }
  dropEntry.removed = true;
  dropEntry.mergeJobId = null;
  if (dropEntry.mesh?.parent) {
    dropEntry.mesh.parent.remove(dropEntry.mesh);
  }
  const dropIndex = activeMoneyDrops.indexOf(dropEntry);
  if (dropIndex >= 0) {
    activeMoneyDrops.splice(dropIndex, 1);
  }
}

function createMoneyDropEntry(value, x, y, z, options = {}) {
  const normalizedValue = Math.max(1, Math.floor(Number(value) || 1));
  const material = moneyDropMaterialsByValue.get(normalizedValue);
  if (!material) {
    return null;
  }

  const mesh = new THREE.Mesh(moneyDropGeometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(x, y, z);
  moneyDropGroup.add(mesh);

  const entry = {
    value: normalizedValue,
    mesh,
    velocity: new THREE.Vector3(0, 0, 0),
    settled: options.settled === true,
    homing: options.homing === true,
    mergeJobId: null,
    removed: false,
  };

  if (entry.homing) {
    entry.settled = false;
    entry.velocity.set(0, 0, 0);
  } else if (entry.settled) {
    const surfaceY = getMoneyDropSurfaceYAtWorld(x, z);
    entry.mesh.position.y = surfaceY + MONEY_DROP_HALF_SIZE;
  } else {
    const launchAngle = Math.random() * Math.PI * 2;
    const launchSpeed = randomBetween(MONEY_DROP_RANDOM_HORIZONTAL_SPEED * 0.4, MONEY_DROP_RANDOM_HORIZONTAL_SPEED);
    entry.velocity.x = Math.cos(launchAngle) * launchSpeed;
    entry.velocity.z = Math.sin(launchAngle) * launchSpeed;
    entry.velocity.y = MONEY_DROP_INITIAL_UPWARD_SPEED + randomBetween(0, MONEY_DROP_INITIAL_UPWARD_SPEED * 0.55);
  }

  activeMoneyDrops.push(entry);
  return entry;
}

function clearMoneyDrops() {
  for (let i = activeMoneyDrops.length - 1; i >= 0; i -= 1) {
    const dropEntry = activeMoneyDrops[i];
    dropEntry.removed = true;
    dropEntry.mergeJobId = null;
    if (dropEntry.mesh?.parent) {
      dropEntry.mesh.parent.remove(dropEntry.mesh);
    }
  }
  activeMoneyDrops.length = 0;
  activeMoneyDropMergeJobs.length = 0;
  nextMoneyDropMergeJobId = 1;
}

function spawnMoneyDrops(cashReward, dropPosition) {
  const rewardValue = Math.max(0, Math.floor(Number(cashReward) || 0));
  if (rewardValue <= 0) {
    return;
  }

  const fallbackPosition = player?.getPosition?.() ?? camera.position;
  const baseX = Number.isFinite(Number(dropPosition?.x))
    ? Number(dropPosition.x)
    : (Number(fallbackPosition?.x) || 0);
  const baseZ = Number.isFinite(Number(dropPosition?.z))
    ? Number(dropPosition.z)
    : (Number(fallbackPosition?.z) || 0);
  const baseSurfaceY = getMoneyDropSurfaceYAtWorld(baseX, baseZ);
  const dropSourceY = Number.isFinite(Number(dropPosition?.y))
    ? Number(dropPosition.y)
    : (baseSurfaceY + MONEY_DROP_HALF_SIZE);
  const minSpawnY = baseSurfaceY + MONEY_DROP_HALF_SIZE;

  for (let i = 0; i < rewardValue; i += 1) {
    const spreadDistance = Math.random() * MONEY_DROP_SPAWN_SPREAD;
    const spreadAngle = Math.random() * Math.PI * 2;
    const dropX = baseX + (Math.cos(spreadAngle) * spreadDistance);
    const dropZ = baseZ + (Math.sin(spreadAngle) * spreadDistance);
    const dropY = Math.max(
      minSpawnY,
      dropSourceY + MONEY_DROP_SPAWN_HEIGHT_OFFSET + randomBetween(0, MONEY_DROP_SIZE * 0.5)
    );
    createMoneyDropEntry(1, dropX, dropY, dropZ);
  }
}

function findSettledMergeCandidateNear(worldX, worldZ, value, maxDistance = MONEY_DROP_MERGE_RADIUS * 2.2) {
  const maxDistanceSq = Math.max(0.0001, maxDistance * maxDistance);
  let bestCandidate = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  for (const candidate of activeMoneyDrops) {
    if (
      !candidate
      || candidate.removed
      || !candidate.settled
      || candidate.homing
      || candidate.mergeJobId !== null
      || candidate.value !== value
    ) {
      continue;
    }
    const dx = candidate.mesh.position.x - worldX;
    const dz = candidate.mesh.position.z - worldZ;
    const distSq = (dx * dx) + (dz * dz);
    if (distSq > maxDistanceSq || distSq >= bestDistanceSq) {
      continue;
    }
    bestDistanceSq = distSq;
    bestCandidate = candidate;
  }
  return bestCandidate;
}

function queueMoneyDropMergeJob(sourceDrops, targetValue, centerX, centerY, centerZ, sourceValue) {
  if (!Array.isArray(sourceDrops) || sourceDrops.length !== 10) {
    return null;
  }
  const mergeJob = {
    id: nextMoneyDropMergeJobId++,
    sourceDrops,
    sourceValue,
    targetValue,
    center: new THREE.Vector3(centerX, centerY, centerZ),
  };
  for (const sourceDrop of sourceDrops) {
    sourceDrop.mergeJobId = mergeJob.id;
    sourceDrop.homing = false;
    sourceDrop.settled = false;
    sourceDrop.velocity.set(0, 0, 0);
  }
  activeMoneyDropMergeJobs.push(mergeJob);
  return mergeJob;
}

function tryMergeFromSettledMoneyDrop(seedDrop) {
  if (
    !seedDrop
    || seedDrop.removed
    || !seedDrop.settled
    || seedDrop.homing
    || seedDrop.mergeJobId !== null
  ) {
    return;
  }

  const nextValue = MONEY_DROP_MERGE_TARGET_BY_VALUE.get(seedDrop.value);
  if (!nextValue) {
    return;
  }

  moneyDropMergeScratch.length = 0;
  for (const candidate of activeMoneyDrops) {
    if (
      !candidate
      || candidate.removed
      || !candidate.settled
      || candidate.homing
      || candidate.mergeJobId !== null
      || candidate.value !== seedDrop.value
    ) {
      continue;
    }
    const dx = candidate.mesh.position.x - seedDrop.mesh.position.x;
    const dz = candidate.mesh.position.z - seedDrop.mesh.position.z;
    const distSq = (dx * dx) + (dz * dz);
    if (distSq <= MONEY_DROP_MERGE_RADIUS_SQ) {
      moneyDropMergeScratch.push({ drop: candidate, distSq });
    }
  }
  if (moneyDropMergeScratch.length < 10) {
    return;
  }

  moneyDropMergeScratch.sort((a, b) => a.distSq - b.distSq);
  const sourceDrops = [];
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  for (let i = 0; i < 10; i += 1) {
    const sourceDrop = moneyDropMergeScratch[i].drop;
    sourceDrops.push(sourceDrop);
    sumX += sourceDrop.mesh.position.x;
    sumY += sourceDrop.mesh.position.y;
    sumZ += sourceDrop.mesh.position.z;
  }

  queueMoneyDropMergeJob(
    sourceDrops,
    nextValue,
    sumX / 10,
    sumY / 10,
    sumZ / 10,
    seedDrop.value
  );
}

function updateMoneyDropMergeJobs(deltaSeconds) {
  if (activeMoneyDropMergeJobs.length === 0) {
    return;
  }
  const safeDelta = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
  const moveStep = MONEY_DROP_MERGE_CONVERGE_SPEED * safeDelta;

  for (let i = activeMoneyDropMergeJobs.length - 1; i >= 0; i -= 1) {
    const mergeJob = activeMoneyDropMergeJobs[i];
    if (!mergeJob || !Array.isArray(mergeJob.sourceDrops) || mergeJob.sourceDrops.length === 0) {
      activeMoneyDropMergeJobs.splice(i, 1);
      continue;
    }

    let allArrived = true;
    for (const sourceDrop of mergeJob.sourceDrops) {
      if (!sourceDrop || sourceDrop.removed) {
        continue;
      }

      const dx = mergeJob.center.x - sourceDrop.mesh.position.x;
      const dy = mergeJob.center.y - sourceDrop.mesh.position.y;
      const dz = mergeJob.center.z - sourceDrop.mesh.position.z;
      const distSq = (dx * dx) + (dy * dy) + (dz * dz);
      if (distSq <= MONEY_DROP_MERGE_CONVERGE_ARRIVAL_DISTANCE_SQ) {
        sourceDrop.mesh.position.copy(mergeJob.center);
        continue;
      }
      allArrived = false;
      if (moveStep <= 0) {
        continue;
      }

      const dist = Math.sqrt(distSq);
      if (dist <= 1e-6) {
        sourceDrop.mesh.position.copy(mergeJob.center);
        continue;
      }
      const moveAmount = Math.min(dist, moveStep);
      const moveScale = moveAmount / dist;
      sourceDrop.mesh.position.x += dx * moveScale;
      sourceDrop.mesh.position.y += dy * moveScale;
      sourceDrop.mesh.position.z += dz * moveScale;
    }

    if (!allArrived) {
      continue;
    }

    activeMoneyDropMergeJobs.splice(i, 1);
    for (const sourceDrop of mergeJob.sourceDrops) {
      if (!sourceDrop || sourceDrop.removed) {
        continue;
      }
      sourceDrop.mergeJobId = null;
      removeMoneyDropEntry(sourceDrop);
    }

    const mergedSurfaceY = getMoneyDropSurfaceYAtWorld(mergeJob.center.x, mergeJob.center.z);
    const mergedDrop = createMoneyDropEntry(
      mergeJob.targetValue,
      mergeJob.center.x,
      mergedSurfaceY + MONEY_DROP_HALF_SIZE,
      mergeJob.center.z,
      { settled: true }
    );
    if (mergedDrop) {
      tryMergeFromSettledMoneyDrop(mergedDrop);
    }

    const nearbyCandidate = findSettledMergeCandidateNear(
      mergeJob.center.x,
      mergeJob.center.z,
      mergeJob.sourceValue
    );
    if (nearbyCandidate) {
      tryMergeFromSettledMoneyDrop(nearbyCandidate);
    }
  }
}

function getPlayerFeetPosition(outPosition) {
  const playerPosition = player?.getPosition?.();
  if (!playerPosition || !outPosition) {
    return false;
  }
  const eyeHeight = Number.isFinite(Number(grid?.eyeHeight))
    ? Number(grid.eyeHeight)
    : 1.7;
  outPosition.set(playerPosition.x, playerPosition.y - eyeHeight, playerPosition.z);
  return true;
}

function updateMoneyDropHomingAndCollection(deltaSeconds) {
  if (!getPlayerFeetPosition(moneyDropTempFeetPosition)) {
    return;
  }
  const pickupRange = getEffectiveMoneyPickupRange();
  const pickupRangeSq = pickupRange * pickupRange;
  const safeDelta = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
  const homingStep = MONEY_DROP_HOMING_SPEED * safeDelta;
  let collectedValue = 0;

  for (let i = activeMoneyDrops.length - 1; i >= 0; i -= 1) {
    const dropEntry = activeMoneyDrops[i];
    if (!dropEntry || dropEntry.removed || dropEntry.mergeJobId !== null) {
      continue;
    }

    const toFeetX = moneyDropTempFeetPosition.x - dropEntry.mesh.position.x;
    const toFeetY = moneyDropTempFeetPosition.y - dropEntry.mesh.position.y;
    const toFeetZ = moneyDropTempFeetPosition.z - dropEntry.mesh.position.z;
    const horizontalDistanceSq = (toFeetX * toFeetX) + (toFeetZ * toFeetZ);

    if (!dropEntry.homing && horizontalDistanceSq <= pickupRangeSq) {
      dropEntry.homing = true;
      dropEntry.settled = false;
      dropEntry.velocity.set(0, 0, 0);
    }
    if (!dropEntry.homing) {
      continue;
    }

    const distanceSq = horizontalDistanceSq + (toFeetY * toFeetY);
    if (distanceSq <= MONEY_DROP_PICKUP_ARRIVAL_DISTANCE_SQ) {
      collectedValue += Math.max(0, dropEntry.value || 0);
      removeMoneyDropEntry(dropEntry);
      continue;
    }

    if (homingStep <= 0) {
      continue;
    }

    const distance = Math.sqrt(distanceSq);
    if (distance <= 1e-6) {
      collectedValue += Math.max(0, dropEntry.value || 0);
      removeMoneyDropEntry(dropEntry);
      continue;
    }
    const moveAmount = Math.min(distance, homingStep);
    const moveScale = moveAmount / distance;
    dropEntry.mesh.position.x += toFeetX * moveScale;
    dropEntry.mesh.position.y += toFeetY * moveScale;
    dropEntry.mesh.position.z += toFeetZ * moveScale;
  }

  if (collectedValue > 0) {
    addMoney(collectedValue);
  }
}

function updateMoneyDrops(deltaSeconds) {
  if (activeMoneyDrops.length === 0) {
    return;
  }

  const safeDelta = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
  const newlySettled = [];

  if (safeDelta > 0) {
    const damping = Math.pow(MONEY_DROP_HORIZONTAL_DAMPING, safeDelta * 60);
    for (const dropEntry of activeMoneyDrops) {
      if (
        !dropEntry
        || dropEntry.removed
        || dropEntry.settled
        || dropEntry.homing
        || dropEntry.mergeJobId !== null
      ) {
        continue;
      }

      dropEntry.velocity.y -= MONEY_DROP_GRAVITY * safeDelta;
      dropEntry.velocity.x *= damping;
      dropEntry.velocity.z *= damping;

      dropEntry.mesh.position.x += dropEntry.velocity.x * safeDelta;
      dropEntry.mesh.position.y += dropEntry.velocity.y * safeDelta;
      dropEntry.mesh.position.z += dropEntry.velocity.z * safeDelta;

      const surfaceY = getMoneyDropSurfaceYAtWorld(dropEntry.mesh.position.x, dropEntry.mesh.position.z);
      const minCenterY = surfaceY + MONEY_DROP_HALF_SIZE;
      if (dropEntry.mesh.position.y <= minCenterY) {
        dropEntry.mesh.position.y = minCenterY;
        dropEntry.velocity.set(0, 0, 0);
        dropEntry.settled = true;
        newlySettled.push(dropEntry);
      }
    }
  }

  for (const settledDrop of newlySettled) {
    if (!settledDrop || settledDrop.removed || !settledDrop.settled) {
      continue;
    }
    tryMergeFromSettledMoneyDrop(settledDrop);
  }

  updateMoneyDropMergeJobs(safeDelta);
  updateMoneyDropHomingAndCollection(safeDelta);
}

function handlePrimaryAction() {
  if (!player) {
    return;
  }
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
      setPrimaryDownState(false);
    }
    return;
  }
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
let currentWeaponOptions = [];
let currentMenuMode = MENU_MODE_TECH_TREE;
let currentMenuTitle = TECH_TREE_MENU_TITLE;
let currentMenuSubtitle = "";
let menuAdvancesWaveOnChoice = true;
let menuResumeWaveState = "PLAYING";
let currentExperience = 0;
let experienceToNextLevel = BASE_XP_TO_LEVEL;
let levelingTechTreeExhausted = false;
let researchedNodeIds = new Set();
let availableResearchPoints = 0;
let techTreePanX = 0;
let techTreePanY = 0;
const techTreeDesktopDrag = {
  active: false,
  fromLocked: false,
  moved: false,
  totalDistance: 0,
  lastX: 0,
  lastY: 0,
};
const techTreeTouchDrag = {
  pointerId: null,
  moved: false,
  totalDistance: 0,
  lastX: 0,
  lastY: 0,
  longPressNodeId: null,
  longPressTriggered: false,
  longPressTimerId: null,
};
const techTreeDesktopHover = {
  nodeId: null,
  x: 0,
  y: 0,
};
let techTreePinnedTooltip = null;
let forceTouchControls = false;
const mobileInput = {
  movePointerId: null,
  lookPointerId: null,
  moveOriginX: 0,
  moveOriginY: 0,
  movePadCenterX: null,
  movePadCenterY: null,
  moveX: 0,
  moveY: 0,
  lookLastX: 0,
  lookLastY: 0,
  lookOriginX: 0,
  lookOriginY: 0,
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

function setPrimaryDownState(isDown) {
  isPrimaryDown = !!isDown;
  if (player && typeof player.setPrimaryHeld === "function") {
    player.setPrimaryHeld(isPrimaryDown);
  }
}

function getActiveMenuOptions() {
  return currentMenuMode === MENU_MODE_WEAPON_SELECT
    ? currentWeaponOptions
    : [];
}

function updateMenuHoverFromVirtualCursor() {
  if (waveState !== "MENU" || currentMenuMode !== MENU_MODE_WEAPON_SELECT) {
    hoveredUpgradeIndex = -1;
    return;
  }
  hoveredUpgradeIndex = uiOverlay.hitTestMenuOption(vCursorX, vCursorY);
}

function getTechNodeById(nodeId) {
  if (typeof nodeId !== "string" || nodeId.length === 0) {
    return null;
  }
  return TECH_TREE_NODE_BY_ID.get(nodeId) ?? null;
}

function isTechNodeResearched(nodeOrId) {
  const nodeId = typeof nodeOrId === "string" ? nodeOrId : nodeOrId?.id;
  if (typeof nodeId !== "string" || nodeId.length === 0) {
    return false;
  }
  return researchedNodeIds.has(nodeId);
}

function areTechNodeParentsResearched(node) {
  if (!node) {
    return false;
  }
  const parentIds = Array.isArray(node.parents) ? node.parents : [];
  for (const parentId of parentIds) {
    if (!isTechNodeResearched(parentId)) {
      return false;
    }
  }
  return true;
}

function isTechNodeUnlockable(node) {
  if (!node || isTechNodeResearched(node)) {
    return false;
  }
  if (!areTechNodeParentsResearched(node)) {
    return false;
  }
  return availableResearchPoints >= Math.max(0, Number(node.cost) || 0);
}

function hasAnyUnlockableTechNode() {
  for (const node of TECH_TREE_NODES) {
    if (isTechNodeUnlockable(node)) {
      return true;
    }
  }
  return false;
}

function hasAnyTechResearchRemaining() {
  for (const node of TECH_TREE_NODES) {
    if (!isTechNodeResearched(node)) {
      return true;
    }
  }
  return false;
}

function applyTechNodeGrants(grants = {}) {
  let appliedAny = false;
  if (towerSystem && typeof towerSystem.applyTechGrants === "function") {
    appliedAny = towerSystem.applyTechGrants(grants) || appliedAny;
  }
  if (player && typeof player.applyTechGrants === "function") {
    appliedAny = player.applyTechGrants(grants) || appliedAny;
  }
  if (enemySystem && typeof enemySystem.applyTechGrants === "function") {
    appliedAny = enemySystem.applyTechGrants(grants) || appliedAny;
  }
  return appliedAny;
}

function getTechTreeMenuSubtitle() {
  const pointLabel = availableResearchPoints === 1 ? "point" : "points";
  return `${availableResearchPoints} research ${pointLabel}`;
}

function buildTechTreeViewState() {
  const nodes = TECH_TREE_NODES.map((node) => {
    const researched = isTechNodeResearched(node);
    const unlockable = isTechNodeUnlockable(node);
    const revealed = researched || unlockable;
    return {
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      cost: node.cost,
      researched,
      unlockable,
      label: revealed ? node.label : "?",
      description: revealed ? node.description : "",
      iconId: revealed ? node.iconId : "",
    };
  });
  return {
    rootNodeId: TECH_TREE_ROOT_NODE_ID,
    points: availableResearchPoints,
    panX: techTreePanX,
    panY: techTreePanY,
    worldToScreenScale: Number.isFinite(Number(TECH_TREE_CONFIG.worldToScreenScale))
      ? Math.max(0.05, Number(TECH_TREE_CONFIG.worldToScreenScale))
      : 0.56,
    nodeDisplaySize: Number.isFinite(Number(TECH_TREE_CONFIG.nodeDisplaySize))
      ? Math.max(24, Number(TECH_TREE_CONFIG.nodeDisplaySize))
      : 64,
    nodeWidth: Number.isFinite(Number(TECH_TREE_CONFIG.nodeWidth))
      ? Math.max(80, Number(TECH_TREE_CONFIG.nodeWidth))
      : 176,
    nodeHeight: Number.isFinite(Number(TECH_TREE_CONFIG.nodeHeight))
      ? Math.max(48, Number(TECH_TREE_CONFIG.nodeHeight))
      : 78,
    nodes,
    edges: TECH_TREE_EDGES,
  };
}

function clearTechTreeTouchLongPressTimer() {
  const timerId = techTreeTouchDrag.longPressTimerId;
  if (timerId == null) {
    return;
  }
  clearTimeout(timerId);
  techTreeTouchDrag.longPressTimerId = null;
}

function clearTechTreeTooltipState() {
  techTreeDesktopHover.nodeId = null;
  techTreeDesktopHover.x = 0;
  techTreeDesktopHover.y = 0;
  techTreePinnedTooltip = null;
}

function updateDesktopTechTreeHover(pointerX, pointerY) {
  if (waveState !== "MENU" || currentMenuMode !== MENU_MODE_TECH_TREE) {
    techTreeDesktopHover.nodeId = null;
    return;
  }
  const nodeInfo = uiOverlay.hitTestTechTreeNodeInfo(pointerX, pointerY);
  if (!nodeInfo?.id) {
    techTreeDesktopHover.nodeId = null;
    return;
  }
  techTreeDesktopHover.nodeId = nodeInfo.id;
  techTreeDesktopHover.x = pointerX;
  techTreeDesktopHover.y = pointerY;
}

function buildTechTreeTooltipForNode(nodeId, pointerX, pointerY) {
  const node = getTechNodeById(nodeId);
  if (!node) {
    return null;
  }
  const researched = isTechNodeResearched(node);
  const unlockable = isTechNodeUnlockable(node);
  const parentsResearched = areTechNodeParentsResearched(node);
  const revealed = researched || unlockable;
  const cost = Math.max(0, Number(node.cost) || 0);

  let status = "";
  if (researched) {
    status = "Researched";
  } else if (unlockable) {
    status = cost > 0 ? `Ready to research (${cost} RP)` : "Ready to research";
  } else if (!parentsResearched) {
    status = "Locked: research parent nodes first";
  } else {
    status = `Need ${cost} RP`;
  }

  return {
    x: pointerX,
    y: pointerY,
    title: revealed ? node.label : "Unknown Tech",
    description: revealed
      ? node.description
      : "Research parent nodes to reveal this tech.",
    status,
  };
}

function buildTechTreeTooltipView(showTouchControls) {
  if (waveState !== "MENU" || currentMenuMode !== MENU_MODE_TECH_TREE) {
    return null;
  }
  if (showTouchControls) {
    if (!techTreePinnedTooltip?.nodeId) {
      return null;
    }
    return buildTechTreeTooltipForNode(
      techTreePinnedTooltip.nodeId,
      techTreePinnedTooltip.x,
      techTreePinnedTooltip.y
    );
  }
  if (!techTreeDesktopHover.nodeId) {
    return null;
  }
  return buildTechTreeTooltipForNode(
    techTreeDesktopHover.nodeId,
    techTreeDesktopHover.x,
    techTreeDesktopHover.y
  );
}

function clearTechTreeDragState() {
  clearTechTreeTouchLongPressTimer();
  techTreeDesktopDrag.active = false;
  techTreeDesktopDrag.fromLocked = false;
  techTreeDesktopDrag.moved = false;
  techTreeDesktopDrag.totalDistance = 0;
  techTreeDesktopDrag.lastX = 0;
  techTreeDesktopDrag.lastY = 0;

  techTreeTouchDrag.pointerId = null;
  techTreeTouchDrag.moved = false;
  techTreeTouchDrag.totalDistance = 0;
  techTreeTouchDrag.lastX = 0;
  techTreeTouchDrag.lastY = 0;
  techTreeTouchDrag.longPressNodeId = null;
  techTreeTouchDrag.longPressTriggered = false;
}

function applyTechTreePanDelta(deltaX, deltaY) {
  const dx = Number(deltaX);
  const dy = Number(deltaY);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
    return;
  }
  techTreePanX += dx;
  techTreePanY += dy;
}

function beginDesktopTechTreeDrag(startX, startY, fromLocked = false) {
  techTreeDesktopDrag.active = true;
  techTreeDesktopDrag.fromLocked = !!fromLocked;
  techTreeDesktopDrag.moved = false;
  techTreeDesktopDrag.totalDistance = 0;
  techTreeDesktopDrag.lastX = startX;
  techTreeDesktopDrag.lastY = startY;
}

function updateDesktopTechTreeDragWithDelta(deltaX, deltaY) {
  if (!techTreeDesktopDrag.active) {
    return;
  }
  const dx = Number(deltaX) || 0;
  const dy = Number(deltaY) || 0;
  if (dx === 0 && dy === 0) {
    return;
  }
  applyTechTreePanDelta(dx, dy);
  techTreeDesktopDrag.totalDistance += Math.hypot(dx, dy);
  if (techTreeDesktopDrag.totalDistance >= TECH_TREE_DRAG_THRESHOLD_PX) {
    techTreeDesktopDrag.moved = true;
  }
}

function updateDesktopTechTreeDragTo(nextX, nextY) {
  if (!techTreeDesktopDrag.active) {
    return;
  }
  const dx = nextX - techTreeDesktopDrag.lastX;
  const dy = nextY - techTreeDesktopDrag.lastY;
  techTreeDesktopDrag.lastX = nextX;
  techTreeDesktopDrag.lastY = nextY;
  updateDesktopTechTreeDragWithDelta(dx, dy);
}

function finishTechTreeMenuChoice() {
  currentWeaponOptions = [];
  hoveredUpgradeIndex = -1;
  clearTechTreeTooltipState();
  currentMenuMode = MENU_MODE_TECH_TREE;
  currentMenuTitle = TECH_TREE_MENU_TITLE;
  currentMenuSubtitle = getTechTreeMenuSubtitle();
  player.setMenuMode(false);
  setPrimaryDownState(false);
  resetMobileInputState();
  clearTechTreeDragState();
  if (menuAdvancesWaveOnChoice) {
    startBuildPhase(currentWave + 1);
  } else {
    waveState = menuResumeWaveState;
    syncBuildPhasePathPreviewVisibility();
  }
  menuAdvancesWaveOnChoice = true;
  menuResumeWaveState = "PLAYING";
}

function applyTechTreeNodeChoice(nodeId) {
  const node = getTechNodeById(nodeId);
  if (!node || !isTechNodeUnlockable(node)) {
    return false;
  }
  const cost = Math.max(0, Number(node.cost) || 0);
  if (availableResearchPoints < cost) {
    return false;
  }
  availableResearchPoints -= cost;
  researchedNodeIds.add(node.id);
  applyTechNodeGrants(node.grants);
  if (!hasAnyTechResearchRemaining()) {
    levelingTechTreeExhausted = true;
    currentExperience = experienceToNextLevel;
  }
  currentMenuSubtitle = getTechTreeMenuSubtitle();
  if (waveState === "MENU" && currentMenuMode === MENU_MODE_TECH_TREE) {
    finishTechTreeMenuChoice();
  }
  return true;
}

function markTechTreeExhausted() {
  levelingTechTreeExhausted = true;
  currentExperience = experienceToNextLevel;
}

function tryOpenLevelUpTechTreeMenu() {
  if (
    waveState === "MENU"
    || waveState === "EDITOR"
    || levelingTechTreeExhausted
    || !player
  ) {
    return false;
  }
  if (availableResearchPoints <= 0 || !hasAnyUnlockableTechNode()) {
    return false;
  }
  const resumeWaveState = normalizeMenuResumeWaveState(waveState);
  waveState = "MENU";
  showTechTreeMenu({
    advanceWaveOnChoice: false,
    resumeWaveState,
  });
  return true;
}

function getExperienceRatio() {
  if (levelingTechTreeExhausted) {
    return 1;
  }
  if (!Number.isFinite(experienceToNextLevel) || experienceToNextLevel <= 0) {
    return 1;
  }
  return clamp(currentExperience / experienceToNextLevel, 0, 1);
}

function addExperience(amount) {
  if (levelingTechTreeExhausted) {
    return false;
  }
  const gainAmount = Number(amount);
  if (!Number.isFinite(gainAmount) || gainAmount <= 0) {
    return false;
  }
  currentExperience += gainAmount;
  let leveledUp = false;
  while (
    !levelingTechTreeExhausted
    && currentExperience >= (experienceToNextLevel - LEVEL_XP_COMPARE_EPSILON)
  ) {
    if (!hasAnyTechResearchRemaining()) {
      markTechTreeExhausted();
      break;
    }
    currentExperience = Math.max(0, currentExperience - experienceToNextLevel);
    experienceToNextLevel *= LEVEL_XP_GROWTH_MULTIPLIER;
    availableResearchPoints += 1;
    leveledUp = true;
  }
  if (leveledUp) {
    currentMenuSubtitle = getTechTreeMenuSubtitle();
    return tryOpenLevelUpTechTreeMenu();
  }
  return false;
}

function showWeaponSelectionMenu() {
  if (!player) {
    return false;
  }

  const menuOptions = (RUN_WEAPON_OPTIONS.length > 0 ? RUN_WEAPON_OPTIONS : DEFAULT_RUN_WEAPON_OPTIONS)
    .slice(0, 3)
    .map((option) => ({
      ...option,
      apply: () => {
        player.setWeaponType(option.type);
      },
    }));

  if (menuOptions.length === 0) {
    return false;
  }

  currentWeaponOptions = menuOptions;
  currentMenuMode = MENU_MODE_WEAPON_SELECT;
  currentMenuTitle = WEAPON_MENU_TITLE;
  currentMenuSubtitle = WEAPON_MENU_SUBTITLE;
  hoveredUpgradeIndex = -1;
  clearTechTreeTooltipState();
  setPrimaryDownState(false);
  waveState = "MENU";
  player.setMenuMode(true);
  resetMobileInputState();
  vCursorX = viewportWidth * 0.5;
  vCursorY = viewportHeight * 0.5;
  updateMenuHoverFromVirtualCursor();
  return true;
}

function finishWeaponSelectionChoice() {
  currentWeaponOptions = [];
  hoveredUpgradeIndex = -1;
  clearTechTreeTooltipState();
  currentMenuMode = MENU_MODE_TECH_TREE;
  currentMenuTitle = TECH_TREE_MENU_TITLE;
  currentMenuSubtitle = getTechTreeMenuSubtitle();
  player.setMenuMode(false);
  setPrimaryDownState(false);
  resetMobileInputState();
  clearTechTreeDragState();
  startBuildPhase(WAVE_CONFIG.initialWave);
}

function applyWeaponChoice(index) {
  if (index < 0 || index >= currentWeaponOptions.length) {
    return false;
  }
  const selectedOption = currentWeaponOptions[index];
  if (!selectedOption || typeof selectedOption.apply !== "function") {
    return false;
  }
  selectedOption.apply();
  finishWeaponSelectionChoice();
  return true;
}

function applyMenuChoice(index) {
  if (currentMenuMode === MENU_MODE_WEAPON_SELECT) {
    return applyWeaponChoice(index);
  }
  return false;
}

function showTechTreeMenu(options = {}) {
  const {
    advanceWaveOnChoice = true,
    resumeWaveState = "PLAYING",
  } = options;
  menuAdvancesWaveOnChoice = advanceWaveOnChoice;
  menuResumeWaveState = normalizeMenuResumeWaveState(resumeWaveState);
  currentMenuMode = MENU_MODE_TECH_TREE;
  currentMenuTitle = TECH_TREE_MENU_TITLE;
  currentMenuSubtitle = getTechTreeMenuSubtitle();
  currentWeaponOptions = [];
  hoveredUpgradeIndex = -1;
  clearTechTreeTooltipState();
  setPrimaryDownState(false);
  player.setMenuMode(true);
  resetMobileInputState();
  clearTechTreeDragState();
  vCursorX = viewportWidth * 0.5;
  vCursorY = viewportHeight * 0.5;
}

function finishDesktopTechTreeDragAt(pointerX, pointerY) {
  if (!techTreeDesktopDrag.active) {
    return false;
  }
  const didDrag = techTreeDesktopDrag.moved;
  techTreeDesktopDrag.active = false;
  techTreeDesktopDrag.fromLocked = false;
  techTreeDesktopDrag.moved = false;
  techTreeDesktopDrag.totalDistance = 0;
  if (didDrag) {
    updateDesktopTechTreeHover(pointerX, pointerY);
    return true;
  }
  const nodeId = uiOverlay.hitTestTechTreeNode(pointerX, pointerY);
  if (!nodeId) {
    updateDesktopTechTreeHover(pointerX, pointerY);
    return false;
  }
  clearTechTreeTooltipState();
  return applyTechTreeNodeChoice(nodeId);
}

function beginTouchTechTreeDrag(pointerId, startX, startY, longPressNodeId = null) {
  clearTechTreeTouchLongPressTimer();
  techTreeTouchDrag.pointerId = pointerId;
  techTreeTouchDrag.moved = false;
  techTreeTouchDrag.totalDistance = 0;
  techTreeTouchDrag.lastX = startX;
  techTreeTouchDrag.lastY = startY;
  techTreeTouchDrag.longPressNodeId = typeof longPressNodeId === "string" ? longPressNodeId : null;
  techTreeTouchDrag.longPressTriggered = false;
  if (techTreeTouchDrag.longPressNodeId) {
    techTreeTouchDrag.longPressTimerId = setTimeout(() => {
      if (techTreeTouchDrag.pointerId !== pointerId) {
        return;
      }
      if (techTreeTouchDrag.moved || !techTreeTouchDrag.longPressNodeId) {
        return;
      }
      techTreeTouchDrag.longPressTriggered = true;
      techTreePinnedTooltip = {
        nodeId: techTreeTouchDrag.longPressNodeId,
        x: techTreeTouchDrag.lastX,
        y: techTreeTouchDrag.lastY,
      };
    }, TECH_TREE_TOUCH_LONG_PRESS_MS);
  }
}

function updateTouchTechTreeDrag(pointerId, nextX, nextY) {
  if (techTreeTouchDrag.pointerId !== pointerId) {
    return;
  }
  const dx = nextX - techTreeTouchDrag.lastX;
  const dy = nextY - techTreeTouchDrag.lastY;
  techTreeTouchDrag.lastX = nextX;
  techTreeTouchDrag.lastY = nextY;
  if (techTreeTouchDrag.longPressTriggered && techTreePinnedTooltip) {
    techTreePinnedTooltip.x = nextX;
    techTreePinnedTooltip.y = nextY;
  }
  applyTechTreePanDelta(dx, dy);
  techTreeTouchDrag.totalDistance += Math.hypot(dx, dy);
  if (techTreeTouchDrag.totalDistance >= TECH_TREE_DRAG_THRESHOLD_PX) {
    techTreeTouchDrag.moved = true;
    clearTechTreeTouchLongPressTimer();
    if (techTreeTouchDrag.longPressTriggered) {
      techTreePinnedTooltip = null;
      techTreeTouchDrag.longPressTriggered = false;
    }
  }
}

function finishTouchTechTreeDrag(pointerId, pointerX, pointerY) {
  if (techTreeTouchDrag.pointerId !== pointerId) {
    return false;
  }
  clearTechTreeTouchLongPressTimer();
  const didDrag = techTreeTouchDrag.moved;
  const didLongPress = techTreeTouchDrag.longPressTriggered;
  techTreeTouchDrag.pointerId = null;
  techTreeTouchDrag.moved = false;
  techTreeTouchDrag.totalDistance = 0;
  techTreeTouchDrag.longPressNodeId = null;
  techTreeTouchDrag.longPressTriggered = false;
  if (didDrag) {
    return true;
  }
  if (didLongPress) {
    return true;
  }
  const nodeId = uiOverlay.hitTestTechTreeNode(pointerX, pointerY);
  if (!nodeId) {
    techTreePinnedTooltip = null;
    return false;
  }
  clearTechTreeTooltipState();
  return applyTechTreeNodeChoice(nodeId);
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
  mobileInput.movePadCenterX = null;
  mobileInput.movePadCenterY = null;
  mobileInput.moveX = 0;
  mobileInput.moveY = 0;
  mobileInput.lookLastX = 0;
  mobileInput.lookLastY = 0;
  mobileInput.lookOriginX = 0;
  mobileInput.lookOriginY = 0;
  mobileInput.pressedButtons.primary = false;
  mobileInput.pressedButtons.jump = false;
  mobileInput.pressedButtons.cancel = false;
  mobileInput.buttonPointerIds.primary = null;
  mobileInput.buttonPointerIds.jump = null;
  mobileInput.buttonPointerIds.cancel = null;
  mobileInput.previousPrimaryPressed = false;
  mobileInput.pendingBuildConfirm = false;
  mobileInput.suppressPrimaryFireUntilRelease = false;
  clearTechTreeDragState();
  setPrimaryDownState(false);
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
      setPrimaryDownState(false);
    }
    if (action === "jump" && player && typeof player.setJumpHeld === "function") {
      player.setJumpHeld(false);
    }
  }
}

function releaseMobilePointer(pointerId) {
  if (mobileInput.movePointerId === pointerId) {
    mobileInput.movePointerId = null;
    mobileInput.movePadCenterX = null;
    mobileInput.movePadCenterY = null;
    mobileInput.moveX = 0;
    mobileInput.moveY = 0;
  }
  if (mobileInput.lookPointerId === pointerId) {
    mobileInput.lookPointerId = null;
    mobileInput.lookOriginX = 0;
    mobileInput.lookOriginY = 0;
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
    setPrimaryDownState(false);
    mobileInput.previousPrimaryPressed = false;
    return;
  }

  player.setVirtualMove(mobileInput.moveX, mobileInput.moveY);
  if (typeof player.setJumpHeld === "function") {
    player.setJumpHeld(mobileInput.pressedButtons.jump);
  }

  const primaryPressed = !!mobileInput.pressedButtons.primary;
  if (towerSystem.isBuildMode()) {
    setPrimaryDownState(false);
    if (
      mobileInput.pendingBuildConfirm
      || (primaryPressed && !mobileInput.previousPrimaryPressed)
    ) {
      handlePrimaryAction();
      mobileInput.pendingBuildConfirm = false;
    }
  } else {
    setPrimaryDownState(
      mobileInput.suppressPrimaryFireUntilRelease
        ? false
        : primaryPressed
    );
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
    if (waveState !== "MENU") {
      techTreeDesktopHover.nodeId = null;
      return;
    }

    if (currentMenuMode === MENU_MODE_TECH_TREE && techTreeDesktopDrag.active) {
      if (techTreeDesktopDrag.fromLocked && player.controls.isLocked) {
        vCursorX += event.movementX;
        vCursorY += event.movementY;
        vCursorX = Math.max(0, Math.min(viewportWidth, vCursorX));
        vCursorY = Math.max(0, Math.min(viewportHeight, vCursorY));
        updateDesktopTechTreeDragWithDelta(event.movementX, event.movementY);
        updateDesktopTechTreeHover(vCursorX, vCursorY);
        return;
      }
      if (!techTreeDesktopDrag.fromLocked && !player.controls.isLocked) {
        const pointer = getCanvasPointerPosition(event);
        updateDesktopTechTreeDragTo(pointer.x, pointer.y);
        updateDesktopTechTreeHover(pointer.x, pointer.y);
        return;
      }
    }

    if (currentMenuMode === MENU_MODE_TECH_TREE) {
      if (player.controls.isLocked) {
        vCursorX += event.movementX;
        vCursorY += event.movementY;
        vCursorX = Math.max(0, Math.min(viewportWidth, vCursorX));
        vCursorY = Math.max(0, Math.min(viewportHeight, vCursorY));
        updateDesktopTechTreeHover(vCursorX, vCursorY);
        return;
      }
      const pointer = getCanvasPointerPosition(event);
      updateDesktopTechTreeHover(pointer.x, pointer.y);
      return;
    }

    if (player.controls.isLocked) {
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
      if (currentMenuMode === MENU_MODE_WEAPON_SELECT) {
        if (player.controls.isLocked) {
          applyMenuChoice(uiOverlay.hitTestMenuOption(vCursorX, vCursorY));
          return;
        }
        const pointer = getCanvasPointerPosition(event);
        applyMenuChoice(uiOverlay.hitTestMenuOption(pointer.x, pointer.y));
        return;
      }

      const pointer = player.controls.isLocked
        ? { x: vCursorX, y: vCursorY }
        : getCanvasPointerPosition(event);
      const panelHit = uiOverlay.hitTestTechTreePanel(pointer.x, pointer.y);
      if (!panelHit) {
        updateDesktopTechTreeHover(pointer.x, pointer.y);
        return;
      }
      updateDesktopTechTreeHover(pointer.x, pointer.y);
      beginDesktopTechTreeDrag(pointer.x, pointer.y, player.controls.isLocked);
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
      towerSystem.selectTower("gun");
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

    setPrimaryDownState(true);
  }, true);

  document.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      if (waveState === "MENU" && currentMenuMode === MENU_MODE_TECH_TREE && player) {
        const pointer = player.controls.isLocked
          ? { x: vCursorX, y: vCursorY }
          : getCanvasPointerPosition(event);
        finishDesktopTechTreeDragAt(pointer.x, pointer.y);
      }
      setPrimaryDownState(false);
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
      if (currentMenuMode === MENU_MODE_WEAPON_SELECT) {
        const pickedIndex = uiOverlay.hitTestMenuOption(pointer.x, pointer.y);
        if (pickedIndex >= 0) {
          applyMenuChoice(pickedIndex);
        }
      } else {
        const panelHit = uiOverlay.hitTestTechTreePanel(pointer.x, pointer.y);
        if (panelHit) {
          const nodeInfo = uiOverlay.hitTestTechTreeNodeInfo(pointer.x, pointer.y);
          beginTouchTechTreeDrag(event.pointerId, pointer.x, pointer.y, nodeInfo?.id ?? null);
          captureTouchPointer(event.pointerId);
        } else {
          techTreePinnedTooltip = null;
        }
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
          setPrimaryDownState(true);
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
    const isLeftSideTouch = pointer.x <= (viewportWidth * 0.5);
    if (isLeftSideTouch && mobileInput.movePointerId == null) {
      mobileInput.movePointerId = event.pointerId;
      mobileInput.moveOriginX = pointer.x;
      mobileInput.moveOriginY = pointer.y;
      mobileInput.movePadCenterX = pointer.x;
      mobileInput.movePadCenterY = pointer.y;
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
    if (!blockedForLook && pointer.x > (viewportWidth * 0.5) && mobileInput.lookPointerId == null) {
      mobileInput.lookPointerId = event.pointerId;
      mobileInput.lookLastX = pointer.x;
      mobileInput.lookLastY = pointer.y;
      mobileInput.lookOriginX = pointer.x;
      mobileInput.lookOriginY = pointer.y;
      captureTouchPointer(event.pointerId);
      event.preventDefault();
    }
  }, { capture: true, passive: false });

  mobilePointerTarget.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "touch" || !player) {
      return;
    }

    const pointer = getCanvasPointerPosition(event);
    if (
      waveState === "MENU"
      && currentMenuMode === MENU_MODE_TECH_TREE
      && techTreeTouchDrag.pointerId === event.pointerId
    ) {
      updateTouchTechTreeDrag(event.pointerId, pointer.x, pointer.y);
      event.preventDefault();
      return;
    }

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
        const lookFromOriginDistance = Math.hypot(
          pointer.x - mobileInput.lookOriginX,
          pointer.y - mobileInput.lookOriginY
        );
        const lookDistanceRatio = clamp(lookFromOriginDistance / MOBILE_LOOK_ACCELERATION_DISTANCE, 0, 1);
        const lookAcceleration = 1
          + ((MOBILE_LOOK_ACCELERATION_MAX_MULTIPLIER - 1)
            * Math.pow(lookDistanceRatio, MOBILE_LOOK_ACCELERATION_EXPONENT));
        const lookScale = MOBILE_LOOK_SENSITIVITY_SCALE * lookAcceleration;
        player.addLookInput(deltaX * lookScale, deltaY * lookScale);
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
    if (
      waveState === "MENU"
      && currentMenuMode === MENU_MODE_TECH_TREE
      && techTreeTouchDrag.pointerId === event.pointerId
    ) {
      const pointer = getCanvasPointerPosition(event);
      finishTouchTechTreeDrag(event.pointerId, pointer.x, pointer.y);
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

  if (event.code === "KeyL" && !event.repeat) {
    addMoney(1000);
    return;
  }

  if (event.code === "KeyM" && !event.repeat) {
    player.disableJetpackFuelConsumption();
    return;
  }

  if (event.code === "KeyK" && !event.repeat) {
    availableResearchPoints += 1;
    if (waveState === "MENU") {
      if (currentMenuMode === MENU_MODE_TECH_TREE) {
        currentMenuSubtitle = getTechTreeMenuSubtitle();
      } else {
        showTechTreeMenu({
          advanceWaveOnChoice: false,
          resumeWaveState: normalizeMenuResumeWaveState(menuResumeWaveState),
        });
      }
      return;
    }
    const resumeWaveState = normalizeMenuResumeWaveState(waveState);
    waveState = "MENU";
    showTechTreeMenu({
      advanceWaveOnChoice: false,
      resumeWaveState,
    });
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
    if (
      currentMenuMode === MENU_MODE_WEAPON_SELECT
      && (event.code === "Digit1" || event.code === "Digit2" || event.code === "Digit3")
    ) {
      const optionIndex = Number(event.code.slice(-1)) - 1;
      applyMenuChoice(optionIndex);
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

function resetTechTreeResearchState() {
  researchedNodeIds = new Set();
  availableResearchPoints = 0;
  techTreePanX = 0;
  techTreePanY = 0;
  levelingTechTreeExhausted = false;

  for (const node of TECH_TREE_NODES) {
    if (node.startsUnlocked !== true) {
      continue;
    }
    if (researchedNodeIds.has(node.id)) {
      continue;
    }
    researchedNodeIds.add(node.id);
    applyTechNodeGrants(node.grants);
  }
  if (TECH_TREE_ROOT_NODE_ID && !researchedNodeIds.has(TECH_TREE_ROOT_NODE_ID)) {
    const rootNode = getTechNodeById(TECH_TREE_ROOT_NODE_ID);
    if (rootNode) {
      researchedNodeIds.add(rootNode.id);
      applyTechNodeGrants(rootNode.grants);
    }
  }

  if (!hasAnyTechResearchRemaining()) {
    levelingTechTreeExhausted = true;
  }
  currentMenuSubtitle = getTechTreeMenuSubtitle();
}

function resetRunStateForNewLevel() {
  player?.resetRunState?.();
  playerMoney = startingCash;
  moneyPickupRangeBonus = 0;
  currentWave = WAVE_CONFIG.initialWave;
  waveDelay = 0;
  queuedWaveNumber = null;
  buildPhaseRemainingSeconds = 0;
  currentWeaponOptions = [];
  currentMenuMode = MENU_MODE_TECH_TREE;
  currentMenuTitle = TECH_TREE_MENU_TITLE;
  currentMenuSubtitle = "";
  hoveredUpgradeIndex = -1;
  menuAdvancesWaveOnChoice = true;
  menuResumeWaveState = "PLAYING";
  currentExperience = 0;
  experienceToNextLevel = BASE_XP_TO_LEVEL;
  levelingTechTreeExhausted = false;
  resetTechTreeResearchState();
  clearTechTreeTooltipState();
  clearTechTreeDragState();
  setPrimaryDownState(false);
  gameSpeedMultiplier = GAME_SPEED_NORMAL;
  clearMoneyDrops();
}

function disposeCombatSystems() {
  clearMoneyDrops();
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
    onEnemyDefeated: (cashReward, _enemyType, dropPosition) => {
      spawnMoneyDrops(cashReward, dropPosition);
      addExperience(XP_PER_KILL);
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
    refundMoney: (amount) => addMoney(amount),
    canBlockCells: (cells) => {
      if (!enemySystem || typeof enemySystem.canBlockCells !== "function") {
        return true;
      }
      return enemySystem.canBlockCells(cells);
    },
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
    currentWeaponOptions = [];
    currentMenuMode = MENU_MODE_TECH_TREE;
    currentMenuTitle = TECH_TREE_MENU_TITLE;
    currentMenuSubtitle = getTechTreeMenuSubtitle();
    hoveredUpgradeIndex = -1;
    clearTechTreeDragState();
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
  showWeaponSelectionMenu();
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
  setPrimaryDownState(false);
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
  setPrimaryDownState(false);
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
        startBuildPhase(currentWave + 1);
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
      player.update(simulationDeltaSeconds, enemySystem);
      enemySystem?.update?.(simulationDeltaSeconds, camera);
      towerSystem?.update?.(simulationDeltaSeconds, enemySystem);
      updateMoneyDrops(simulationDeltaSeconds);
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
          gun: "tower_gun",
          aoe: "tower_aoe",
          slow: "tower_slow",
          laserSniper: "tower_laser_sniper",
          mortar: "tower_mortar",
          tesla: "tower_tesla",
          spikes: "tower_spikes",
          plasma: "tower_plasma",
          buff: "tower_buff",
        }[entry.type] || "tower_gun"
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
  const activeMenuOptions = getActiveMenuOptions();
  if (waveState === "MENU" && currentMenuMode === MENU_MODE_TECH_TREE) {
    currentMenuSubtitle = getTechTreeMenuSubtitle();
  }
  const techTreeView = waveState === "MENU" && currentMenuMode === MENU_MODE_TECH_TREE
    ? buildTechTreeViewState()
    : null;
  const techTreeTooltip = waveState === "MENU" && currentMenuMode === MENU_MODE_TECH_TREE
    ? buildTechTreeTooltipView(showTouchControls)
    : null;

  uiOverlay.setState({
    showCrosshair: waveState !== "MENU",
    menuOpen: waveState === "MENU",
    menuMode: currentMenuMode,
    menuOptions: activeMenuOptions.map((option) => ({
      label: option.label,
      iconId: option.iconId,
    })),
    menuTitle: currentMenuTitle,
    menuSubtitle: currentMenuSubtitle,
    techTreeView,
    techTreeTooltip,
    hoveredMenuIndex: hoveredUpgradeIndex,
    menuCursorX: vCursorX,
    menuCursorY: vCursorY,
    menuCursorVisible: waveState === "MENU" && !!player?.controls?.isLocked,
    jetpackFuelRatio: player ? player.getJetpackFuelRatio() : 1,
    money: playerMoney,
    experienceRatio: getExperienceRatio(),
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
    movePadCenterX: mobileInput.movePadCenterX,
    movePadCenterY: mobileInput.movePadCenterY,
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
    onPickupRangeTechGrant: (addAmount) => {
      upgradeMoneyPickupRange(addAmount);
    },
    movementBounds: grid.levelBounds ?? grid.moveBounds,
    getSurfaceYAtWorld: (worldX, worldZ) => {
      if (typeof grid?.getBuildSurfaceYAtWorld === "function") {
        return grid.getBuildSurfaceYAtWorld(worldX, worldZ);
      }
      return Number(grid?.tileTopY) || 0;
    },
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
      if (towerSystem) return towerSystem.forcePlaceTower(x, z, "gun");
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
    addResearchPoints: (amount = 1) => {
      const value = Math.max(0, Math.floor(Number(amount) || 0));
      availableResearchPoints += value;
      return availableResearchPoints;
    },
    getResearchPoints: () => availableResearchPoints,
    researchNode: (nodeId) => applyTechTreeNodeChoice(nodeId),
    getResearchedNodeIds: () => Array.from(researchedNodeIds.values()),
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
    return typeof grid?.getLevelObjects === "function" ? grid.getLevelObjects() : [];
  };

  resetRunStateForNewLevel();
  showWeaponSelectionMenu();
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
