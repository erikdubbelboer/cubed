import * as THREE from "three";
import { createGrid } from "./grid.js";
import { createPlayer } from "./player.js";
import { createEnemySystem } from "./enemies.js";
import { createTowerSystem } from "./towers.js";
import { createLevelEditor } from "./levelEditor.js";
import { createUiOverlay } from "./uiOverlay.js";
import { createMultiplayerController } from "./multiplayer.js";
import { GAME_CONFIG } from "./config.js";

const SCENE_CONFIG = GAME_CONFIG.scene;
const LIGHT_CONFIG = GAME_CONFIG.lights;
const UI_CONFIG = GAME_CONFIG.ui;
const MOBILE_UI_CONFIG = UI_CONFIG.mobile ?? {};
const WAVE_CONFIG = GAME_CONFIG.waves;
const TOWER_CONFIG = GAME_CONFIG.towers ?? {};
const TOWER_SELL_CONFIG = TOWER_CONFIG.sell ?? {};
const BLOCK_TOWER_CONFIG = TOWER_CONFIG.types?.block ?? {};
const ECONOMY_CONFIG = GAME_CONFIG.economy ?? {};
const ENEMY_CONFIG = GAME_CONFIG.enemies ?? {};
const PLAYER_CONFIG = GAME_CONFIG.player ?? {};
const TECH_TREE_CONFIG = GAME_CONFIG.techTree ?? {};
const CONFIGURED_GLOBAL_ENEMY_HEALTH_MULTIPLIER = Number.isFinite(Number(ENEMY_CONFIG.healthMultiplier))
  ? Math.max(0.01, Number(ENEMY_CONFIG.healthMultiplier))
  : 1;
const BLOCK_TRANSPARENCY_UPGRADE_OPACITY = Number.isFinite(Number(BLOCK_TOWER_CONFIG.transparencyUpgradeOpacity))
  ? THREE.MathUtils.clamp(Number(BLOCK_TOWER_CONFIG.transparencyUpgradeOpacity), 0.05, 1)
  : 0.2;
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
const RUN_WEAPON_TYPE_SET = new Set(RUN_WEAPON_OPTIONS.map((option) => option.type));
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
const DESKTOP_SELL_HOLD_KEY = "KeyE";
const SELL_HOLD_DURATION_SECONDS = Number.isFinite(Number(TOWER_SELL_CONFIG.holdDurationSeconds))
  ? Math.max(0.15, Number(TOWER_SELL_CONFIG.holdDurationSeconds))
  : 0.9;
const SELL_AIM_MAX_DISTANCE = Number.isFinite(Number(TOWER_SELL_CONFIG.aimMaxDistance))
  ? Math.max(0.5, Number(TOWER_SELL_CONFIG.aimMaxDistance))
  : 7;
const SELL_PLAYER_MAX_DISTANCE = Number.isFinite(Number(TOWER_SELL_CONFIG.playerMaxDistance))
  ? Math.max(0.5, Number(TOWER_SELL_CONFIG.playerMaxDistance))
  : 5;
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
const MULTIPLAYER_GAME_ID = "ed698dfc-1c2f-482e-a733-22339afeeb55";
const MULTIPLAYER_MAX_PLAYERS = 2;
const MULTIPLAYER_HEALTH_SCALE_SOLO = 1;
const MULTIPLAYER_HEALTH_SCALE_COOP = 2;
const MULTIPLAYER_TRANSFORM_SEND_INTERVAL = 1 / 20;
const MULTIPLAYER_PREVIEW_SEND_INTERVAL = 1 / 15;
const MULTIPLAYER_STATE_SYNC_INTERVAL = 0.75;
const MULTIPLAYER_MAX_WEAPON_FX_EVENTS_PER_PACKET = 8;
const MULTIPLAYER_MAX_PENDING_WEAPON_FX_EVENTS = 48;
const MULTIPLAYER_MESSAGE_TYPE = {
  stateSync: "state_sync",
  waveCmd: "wave_cmd",
  speedPauseCmd: "speed_pause_cmd",
  towerPlaceCommit: "tower_place_commit",
  towerSellCommit: "tower_sell_commit",
  techChoiceCommit: "tech_choice_commit",
  weaponChoiceCommit: "weapon_choice_commit",
  enemySpawn: "enemy_spawn",
  enemyDamage: "enemy_damage",
  enemyDeath: "enemy_death",
  hostEnded: "host_ended",
  playerTransform: "player_transform",
  towerPreview: "tower_preview",
};
const MULTIPLAYER_DEBUG = new URLSearchParams(window.location.search).get("mplog") === "1";
const MULTIPLAYER_UNRELIABLE_STATS_LOG_INTERVAL_MS = 3000;
const MAIN_LOOP_MODE_RAF = "raf";
const MAIN_LOOP_MODE_INTERVAL = "interval";
const HIDDEN_COOP_INTERVAL_FPS = 60;
const HIDDEN_COOP_INTERVAL_MS = 1000 / HIDDEN_COOP_INTERVAL_FPS;
const BACKGROUND_KEEPALIVE_FREQUENCY_HZ = 20000;
const BACKGROUND_KEEPALIVE_GAIN = 0.001;
const HOST_LOBBY_TOAST_VISIBLE_MS = 2200;
const HOST_LOBBY_TOAST_FADE_MS = 180;

function mpLog(message, details) {
  if (!MULTIPLAYER_DEBUG) {
    return;
  }
  if (details === undefined) {
    console.log(`[Multiplayer] ${message}`);
    return;
  }
  console.log(`[Multiplayer] ${message}`, details);
}

function mpWarn(message, details) {
  if (!MULTIPLAYER_DEBUG) {
    return;
  }
  if (details === undefined) {
    console.warn(`[Multiplayer] ${message}`);
    return;
  }
  console.warn(`[Multiplayer] ${message}`, details);
}

function roundMultiplayerLogNumber(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const factor = 10 ** Math.max(0, Math.floor(digits));
  return Math.round(numeric * factor) / factor;
}

function summarizePositionForLog(source = {}) {
  if (!source || typeof source !== "object") {
    return null;
  }
  const x = roundMultiplayerLogNumber(source.x, 2);
  const y = roundMultiplayerLogNumber(source.y, 2);
  const z = roundMultiplayerLogNumber(source.z, 2);
  if (x === null || y === null || z === null) {
    return null;
  }
  return { x, y, z };
}

function summarizeTowerPlacementForLog(placement = {}) {
  if (!placement || typeof placement !== "object") {
    return null;
  }
  const summary = {
    towerType: typeof placement.towerType === "string" ? placement.towerType : null,
    cellX: Number.isInteger(placement.cellX) ? placement.cellX : null,
    cellZ: Number.isInteger(placement.cellZ) ? placement.cellZ : null,
  };
  if (Number.isInteger(placement.cellY)) {
    summary.cellY = placement.cellY;
  }
  if (Array.isArray(placement.cells)) {
    summary.cells = placement.cells.length;
  }
  if (placement.anchor && typeof placement.anchor === "object") {
    summary.anchor = summarizePositionForLog(placement.anchor);
  }
  if (typeof placement.anchorKey === "string") {
    summary.anchorKey = placement.anchorKey;
  }
  return summary;
}

function summarizeMultiplayerStateForLog(state = {}) {
  return {
    ready: state.ready === true,
    inLobby: state.inLobby === true,
    isHost: state.isHost === true,
    lobbyCode: typeof state.lobbyCode === "string" ? state.lobbyCode : null,
    localPeerId: typeof state.localPeerId === "string" ? state.localPeerId : null,
    peerCount: Number.isFinite(Number(state.peerCount)) ? Number(state.peerCount) : 0,
    peerIds: Array.isArray(state.peerIds) ? [...state.peerIds] : [],
  };
}

function summarizeMultiplayerPayloadForLog(type, payload = {}) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.stateSync) {
    const snapshot = payload.snapshot && typeof payload.snapshot === "object"
      ? payload.snapshot
      : null;
    return {
      waveState: typeof payload.waveState === "string" ? payload.waveState : null,
      currentWave: Number.isFinite(Number(payload.currentWave)) ? Number(payload.currentWave) : null,
      waveDelay: roundMultiplayerLogNumber(payload.waveDelay, 2),
      queuedWaveNumber: Number.isInteger(payload.queuedWaveNumber) ? payload.queuedWaveNumber : null,
      buildPhaseRemainingSeconds: roundMultiplayerLogNumber(payload.buildPhaseRemainingSeconds, 2),
      paused: payload.paused === true,
      speedMultiplier: roundMultiplayerLogNumber(payload.speedMultiplier, 3),
      playerCount: Number.isFinite(Number(payload.playerCount)) ? Number(payload.playerCount) : null,
      enemyHealthMultiplier: roundMultiplayerLogNumber(payload.enemyHealthMultiplier, 3),
      snapshotTowers: Array.isArray(snapshot?.towers) ? snapshot.towers.length : 0,
      snapshotEnemies: Array.isArray(snapshot?.enemies) ? snapshot.enemies.length : 0,
    };
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.waveCmd) {
    return {
      request: payload.request === true,
      action: typeof payload.action === "string" ? payload.action : null,
      waveNumber: Number.isInteger(payload.waveNumber) ? payload.waveNumber : null,
    };
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.speedPauseCmd) {
    return {
      request: payload.request === true,
      action: typeof payload.action === "string" ? payload.action : null,
      paused: payload.paused === true,
      speedMultiplier: roundMultiplayerLogNumber(payload.speedMultiplier, 3),
    };
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.towerPlaceCommit) {
    return {
      request: payload.request === true,
      rejected: payload.rejected === true,
      requestId: typeof payload.requestId === "string" ? payload.requestId : null,
      ownerId: typeof payload.ownerId === "string" ? payload.ownerId : null,
      placement: summarizeTowerPlacementForLog(payload.placement),
    };
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.towerSellCommit) {
    return {
      request: payload.request === true,
      rejected: payload.rejected === true,
      requestId: typeof payload.requestId === "string" ? payload.requestId : null,
      targetId: typeof payload.targetId === "string" ? payload.targetId : null,
      sellerId: typeof payload.sellerId === "string" ? payload.sellerId : null,
      towerType: typeof payload.towerType === "string" ? payload.towerType : null,
      refundAmount: roundMultiplayerLogNumber(payload.refundAmount, 2),
    };
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.techChoiceCommit) {
    return {
      ownerId: typeof payload.ownerId === "string" ? payload.ownerId : null,
      grantKeys: payload.grants && typeof payload.grants === "object"
        ? Object.keys(payload.grants)
        : [],
    };
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.weaponChoiceCommit) {
    return {
      ownerId: typeof payload.ownerId === "string" ? payload.ownerId : null,
      weaponType: typeof payload.weaponType === "string" ? payload.weaponType : null,
    };
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.enemySpawn) {
    return {
      enemyId: typeof payload.enemyId === "string" ? payload.enemyId : null,
      enemyType: typeof payload.enemyType === "string" ? payload.enemyType : null,
      health: roundMultiplayerLogNumber(payload.health, 2),
      maxHealth: roundMultiplayerLogNumber(payload.maxHealth, 2),
      position: summarizePositionForLog(payload.position),
    };
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.enemyDamage) {
    return {
      request: payload.request === true,
      enemyId: typeof payload.enemyId === "string" ? payload.enemyId : null,
      damage: roundMultiplayerLogNumber(payload.damage, 2),
      health: roundMultiplayerLogNumber(payload.health, 2),
      maxHealth: roundMultiplayerLogNumber(payload.maxHealth, 2),
    };
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.enemyDeath) {
    return {
      enemyId: typeof payload.enemyId === "string" ? payload.enemyId : null,
      cashReward: roundMultiplayerLogNumber(payload.cashReward, 2),
      maxHealth: roundMultiplayerLogNumber(payload.maxHealth, 2),
      dropPosition: summarizePositionForLog(payload.dropPosition),
    };
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.hostEnded) {
    return {};
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.playerTransform) {
    return {
      x: roundMultiplayerLogNumber(payload.x, 2),
      y: roundMultiplayerLogNumber(payload.y, 2),
      z: roundMultiplayerLogNumber(payload.z, 2),
      yaw: roundMultiplayerLogNumber(payload.yaw, 3),
    };
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.towerPreview) {
    return {
      active: payload.active === true,
      valid: payload.valid === true,
      towerType: typeof payload.towerType === "string" ? payload.towerType : null,
      placement: summarizeTowerPlacementForLog(payload.placement),
    };
  }
  return payload;
}
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

function resolveTechNodeGrants(rawNode) {
  const grants = rawNode?.grants && typeof rawNode.grants === "object" ? rawNode.grants : {};
  if (rawNode?.id !== "block_transparency_t1") {
    return grants;
  }
  const towerGrants = grants.tower && typeof grants.tower === "object" ? grants.tower : {};
  const blockGrants = towerGrants.block && typeof towerGrants.block === "object" ? towerGrants.block : {};
  return {
    ...grants,
    tower: {
      ...towerGrants,
      block: {
        ...blockGrants,
        opacitySet: BLOCK_TRANSPARENCY_UPGRADE_OPACITY,
      },
    },
  };
}

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
    grants: resolveTechNodeGrants(rawNode),
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
const initialLobbyQueryCode = (() => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("lobby");
  return typeof code === "string" && code.trim().length > 0
    ? code.trim()
    : null;
})();

const REMOTE_PLAYER_WIDTH = 0.95;
const REMOTE_PLAYER_HEIGHT = 2.05;
const REMOTE_PLAYER_DEPTH = 0.62;
const remotePlayerGeometry = new THREE.BoxGeometry(
  REMOTE_PLAYER_WIDTH,
  REMOTE_PLAYER_HEIGHT,
  REMOTE_PLAYER_DEPTH
);
const remotePlayerMaterial = new THREE.MeshStandardMaterial({
  color: 0x080808,
  roughness: 0.85,
  metalness: 0.05,
});
const remotePlayersByPeerId = new Map();
const pendingLocalWeaponFxEvents = [];
const remoteWeaponProjectileGeometryBySize = new Map();
const remoteWeaponProjectileMaterialByType = new Map();
const remoteWeaponProjectiles = [];
const remoteWeaponBeams = [];
const remoteWeaponVectorA = new THREE.Vector3();
const remoteWeaponVectorB = new THREE.Vector3();
const remoteWeaponVectorC = new THREE.Vector3();
const remoteWeaponYAxis = new THREE.Vector3(0, 1, 0);
const pendingTowerRequestsById = new Map();
let nextTowerRequestId = 1;
const pendingTowerSellRequestsById = new Map();
let nextTowerSellRequestId = 1;
let pendingAutoJoinLobbyCode = initialLobbyQueryCode;
let localMultiplayerPeerId = "local";
let multiplayerTransformTimer = 0;
let multiplayerPreviewTimer = 0;
let multiplayerStateSyncTimer = 0;
let lastBroadcastHostStateSignature = "";
let hasAppliedHostSnapshot = false;
const multiplayerUnreliableStats = {
  lastFlushAtMs: 0,
  rxPlayerTransform: 0,
  rxTowerPreview: 0,
  txPlayerTransform: 0,
  txTowerPreview: 0,
};

function noteUnreliableMultiplayerTraffic(direction, type) {
  if (direction === "rx") {
    if (type === MULTIPLAYER_MESSAGE_TYPE.playerTransform) {
      multiplayerUnreliableStats.rxPlayerTransform += 1;
      return;
    }
    if (type === MULTIPLAYER_MESSAGE_TYPE.towerPreview) {
      multiplayerUnreliableStats.rxTowerPreview += 1;
    }
    return;
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.playerTransform) {
    multiplayerUnreliableStats.txPlayerTransform += 1;
    return;
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.towerPreview) {
    multiplayerUnreliableStats.txTowerPreview += 1;
  }
}

function flushUnreliableMultiplayerStatsLog(force = false) {
  if (!MULTIPLAYER_DEBUG) {
    return;
  }
  const nowMs = typeof performance?.now === "function" ? performance.now() : Date.now();
  if (!force && (nowMs - multiplayerUnreliableStats.lastFlushAtMs) < MULTIPLAYER_UNRELIABLE_STATS_LOG_INTERVAL_MS) {
    return;
  }
  const {
    rxPlayerTransform,
    rxTowerPreview,
    txPlayerTransform,
    txTowerPreview,
  } = multiplayerUnreliableStats;
  const total = rxPlayerTransform + rxTowerPreview + txPlayerTransform + txTowerPreview;
  multiplayerUnreliableStats.lastFlushAtMs = nowMs;
  multiplayerUnreliableStats.rxPlayerTransform = 0;
  multiplayerUnreliableStats.rxTowerPreview = 0;
  multiplayerUnreliableStats.txPlayerTransform = 0;
  multiplayerUnreliableStats.txTowerPreview = 0;
  if (total <= 0) {
    return;
  }
  mpLog("Unreliable traffic (since last sample)", {
    txPlayerTransform,
    txTowerPreview,
    rxPlayerTransform,
    rxTowerPreview,
  });
}

if (initialLobbyQueryCode) {
  mpLog("Detected lobby code in URL query", { lobbyCode: initialLobbyQueryCode });
}

function getLobbyShareUrl(lobbyCode) {
  const url = new URL(window.location.href);
  if (typeof lobbyCode === "string" && lobbyCode.length > 0) {
    url.searchParams.set("lobby", lobbyCode);
  } else {
    url.searchParams.delete("lobby");
  }
  return url.toString();
}

function createShareOverlayUi() {
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "12px";
  root.style.bottom = "12px";
  root.style.zIndex = "30";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "8px";
  root.style.pointerEvents = "auto";

  const hostToast = document.createElement("div");
  hostToast.style.display = "none";
  hostToast.style.alignSelf = "flex-start";
  hostToast.style.padding = "6px 10px";
  hostToast.style.borderRadius = "999px";
  hostToast.style.border = "1px solid rgba(255,255,255,0.2)";
  hostToast.style.background = "rgba(16,16,16,0.8)";
  hostToast.style.color = "rgba(244,244,244,0.95)";
  hostToast.style.font = "500 12px system-ui, sans-serif";
  hostToast.style.pointerEvents = "none";
  hostToast.style.opacity = "0";
  hostToast.style.transition = `opacity ${HOST_LOBBY_TOAST_FADE_MS}ms ease`;
  hostToast.style.maxWidth = "min(420px, calc(100vw - 24px))";
  root.appendChild(hostToast);

  const shareButton = document.createElement("button");
  shareButton.type = "button";
  shareButton.textContent = "Share";
  shareButton.style.padding = "8px 12px";
  shareButton.style.font = "600 14px system-ui, sans-serif";
  shareButton.style.borderRadius = "8px";
  shareButton.style.border = "1px solid rgba(0,0,0,0.25)";
  shareButton.style.background = "rgba(255,255,255,0.92)";
  shareButton.style.color = "#111";
  shareButton.style.cursor = "pointer";
  root.appendChild(shareButton);

  const panel = document.createElement("div");
  panel.style.display = "none";
  panel.style.alignItems = "center";
  panel.style.gap = "6px";
  panel.style.padding = "8px";
  panel.style.borderRadius = "8px";
  panel.style.background = "rgba(255,255,255,0.95)";
  panel.style.border = "1px solid rgba(0,0,0,0.25)";
  panel.style.maxWidth = "min(640px, calc(100vw - 24px))";

  const linkInput = document.createElement("input");
  linkInput.type = "text";
  linkInput.readOnly = true;
  linkInput.style.flex = "1 1 auto";
  linkInput.style.minWidth = "220px";
  linkInput.style.padding = "6px 8px";
  linkInput.style.borderRadius = "6px";
  linkInput.style.border = "1px solid rgba(0,0,0,0.25)";
  linkInput.style.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  linkInput.addEventListener("focus", () => {
    linkInput.select();
  });
  panel.appendChild(linkInput);

  const nativeShareButton = document.createElement("button");
  nativeShareButton.type = "button";
  nativeShareButton.textContent = "Native Share";
  nativeShareButton.style.padding = "6px 10px";
  nativeShareButton.style.borderRadius = "6px";
  nativeShareButton.style.border = "1px solid rgba(0,0,0,0.25)";
  nativeShareButton.style.background = "rgba(0,0,0,0.06)";
  nativeShareButton.style.color = "#111";
  nativeShareButton.style.cursor = "pointer";
  nativeShareButton.style.display = typeof navigator.share === "function" ? "inline-flex" : "none";
  panel.appendChild(nativeShareButton);
  root.appendChild(panel);
  app.appendChild(root);

  return {
    root,
    hostToast,
    shareButton,
    panel,
    linkInput,
    nativeShareButton,
  };
}

const shareOverlayUi = createShareOverlayUi();
let hostLobbyToastHideTimeoutId = null;
let hostLobbyToastFadeTimeoutId = null;

function clearHostLobbyToastTimers() {
  if (hostLobbyToastHideTimeoutId != null) {
    window.clearTimeout(hostLobbyToastHideTimeoutId);
    hostLobbyToastHideTimeoutId = null;
  }
  if (hostLobbyToastFadeTimeoutId != null) {
    window.clearTimeout(hostLobbyToastFadeTimeoutId);
    hostLobbyToastFadeTimeoutId = null;
  }
}

function hideHostLobbyToast({ immediate = false } = {}) {
  clearHostLobbyToastTimers();
  const toast = shareOverlayUi.hostToast;
  toast.style.opacity = "0";
  if (immediate) {
    toast.style.display = "none";
    return;
  }
  hostLobbyToastFadeTimeoutId = window.setTimeout(() => {
    toast.style.display = "none";
    hostLobbyToastFadeTimeoutId = null;
  }, HOST_LOBBY_TOAST_FADE_MS + 24);
}

function showHostLobbyToast(message) {
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) {
    return;
  }
  clearHostLobbyToastTimers();
  const toast = shareOverlayUi.hostToast;
  toast.textContent = text;
  toast.style.display = "inline-flex";
  toast.style.opacity = "0";
  // Force a reflow so repeated updates still animate opacity.
  void toast.offsetWidth;
  toast.style.opacity = "1";
  hostLobbyToastHideTimeoutId = window.setTimeout(() => {
    toast.style.opacity = "0";
    hostLobbyToastHideTimeoutId = null;
    hostLobbyToastFadeTimeoutId = window.setTimeout(() => {
      toast.style.display = "none";
      hostLobbyToastFadeTimeoutId = null;
    }, HOST_LOBBY_TOAST_FADE_MS + 24);
  }, HOST_LOBBY_TOAST_VISIBLE_MS);
}

const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;

function getViewportMetrics() {
  const appRect = app?.getBoundingClientRect?.() ?? null;
  const rawWidth = Number.isFinite(Number(appRect?.width)) && Number(appRect.width) > 0
    ? Number(appRect.width)
    : (
      Number.isFinite(Number(document.documentElement?.clientWidth))
        ? Number(document.documentElement.clientWidth)
        : Number(window.innerWidth)
    );
  const rawHeight = Number.isFinite(Number(appRect?.height)) && Number(appRect.height) > 0
    ? Number(appRect.height)
    : (
      Number.isFinite(Number(document.documentElement?.clientHeight))
        ? Number(document.documentElement.clientHeight)
        : Number(window.innerHeight)
    );
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
let viewportSyncSettleTimeoutId = null;

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
renderer.setSize(viewportWidth, viewportHeight, false);
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
  mount: app,
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
let multiplayerController;

function getMultiplayerState() {
  if (!multiplayerController || typeof multiplayerController.getState !== "function") {
    return {
      ready: false,
      inLobby: false,
      isHost: false,
      lobbyCode: null,
      localPeerId: localMultiplayerPeerId,
      peerCount: 0,
      peerIds: [],
    };
  }
  const state = multiplayerController.getState();
  if (typeof state?.localPeerId === "string" && state.localPeerId.length > 0) {
    localMultiplayerPeerId = state.localPeerId;
  }
  return {
    ...state,
    localPeerId: localMultiplayerPeerId,
  };
}

function isMultiplayerLobbyActive() {
  return !!getMultiplayerState().inLobby;
}

function isMultiplayerHost() {
  const state = getMultiplayerState();
  return !!state.inLobby && !!state.isHost;
}

function isMultiplayerGuest() {
  const state = getMultiplayerState();
  return !!state.inLobby && !state.isHost;
}

function isMultiplayerWithPeer() {
  const state = getMultiplayerState();
  return !!state.inLobby && Number(state.peerCount) > 0;
}

function getConnectedPlayerCount() {
  const state = getMultiplayerState();
  if (!state.inLobby) {
    return 1;
  }
  return Math.max(1, Math.min(MULTIPLAYER_MAX_PLAYERS, 1 + Math.max(0, state.peerCount || 0)));
}

function getEnemyHealthMultiplierForCurrentPlayerCount() {
  const multiplayerHealthScale = getConnectedPlayerCount() >= 2
    ? MULTIPLAYER_HEALTH_SCALE_COOP
    : MULTIPLAYER_HEALTH_SCALE_SOLO;
  return CONFIGURED_GLOBAL_ENEMY_HEALTH_MULTIPLIER * multiplayerHealthScale;
}

function shouldHostControlSimulation() {
  if (!isMultiplayerLobbyActive()) {
    return true;
  }
  return isMultiplayerHost();
}

function disposeRemotePlayerEntry(peerId) {
  const entry = remotePlayersByPeerId.get(peerId);
  if (!entry) {
    return;
  }
  if (entry.mesh?.parent) {
    entry.mesh.parent.remove(entry.mesh);
  }
  remotePlayersByPeerId.delete(peerId);
  mpLog("Removed remote player mesh", { peerId, remainingRemotePlayers: remotePlayersByPeerId.size });
}

function clearAllRemotePlayers() {
  for (const peerId of remotePlayersByPeerId.keys()) {
    disposeRemotePlayerEntry(peerId);
  }
}

function ensureRemotePlayerEntry(peerId) {
  if (typeof peerId !== "string" || peerId.length === 0) {
    return null;
  }
  let entry = remotePlayersByPeerId.get(peerId);
  if (entry?.mesh) {
    return entry;
  }
  const mesh = new THREE.Mesh(remotePlayerGeometry, remotePlayerMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.visible = true;
  scene.add(mesh);
  entry = {
    mesh,
    lastUpdateAt: 0,
  };
  remotePlayersByPeerId.set(peerId, entry);
  mpLog("Created remote player mesh", { peerId, remotePlayers: remotePlayersByPeerId.size });
  return entry;
}

function applyRemotePlayerTransform(peerId, transform = {}) {
  const entry = ensureRemotePlayerEntry(peerId);
  if (!entry?.mesh) {
    return false;
  }
  const px = Number(transform?.x);
  const py = Number(transform?.y);
  const pz = Number(transform?.z);
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) {
    return false;
  }
  const eyeHeight = Math.max(0.4, Number(grid?.eyeHeight) || 1.7);
  entry.mesh.position.set(px, py - eyeHeight + (REMOTE_PLAYER_HEIGHT * 0.5), pz);
  const yaw = Number(transform?.yaw);
  if (Number.isFinite(yaw)) {
    entry.mesh.rotation.y = yaw;
  }
  entry.lastUpdateAt = (typeof performance?.now === "function" ? performance.now() : Date.now());
  return true;
}

function normalizeWeaponTypeForMultiplayerFx(rawType) {
  const safeType = typeof rawType === "string" ? rawType : "";
  if (RUN_WEAPON_TYPE_SET.has(safeType)) {
    return safeType;
  }
  if (RUN_WEAPON_TYPE_SET.has("machineGun")) {
    return "machineGun";
  }
  const [firstType] = RUN_WEAPON_TYPE_SET;
  return typeof firstType === "string" ? firstType : "machineGun";
}

function sanitizeMultiplayerWeaponFxEvent(rawEvent) {
  if (!rawEvent || typeof rawEvent !== "object") {
    return null;
  }
  const kind = typeof rawEvent.kind === "string" ? rawEvent.kind : "";

  if (kind === "projectile") {
    const ox = Number(rawEvent?.origin?.x);
    const oy = Number(rawEvent?.origin?.y);
    const oz = Number(rawEvent?.origin?.z);
    const dx = Number(rawEvent?.direction?.x);
    const dy = Number(rawEvent?.direction?.y);
    const dz = Number(rawEvent?.direction?.z);
    if (
      !Number.isFinite(ox)
      || !Number.isFinite(oy)
      || !Number.isFinite(oz)
      || !Number.isFinite(dx)
      || !Number.isFinite(dy)
      || !Number.isFinite(dz)
    ) {
      return null;
    }
    const directionLength = Math.hypot(dx, dy, dz);
    if (directionLength <= 1e-5) {
      return null;
    }
    return {
      kind: "projectile",
      weaponType: normalizeWeaponTypeForMultiplayerFx(rawEvent.weaponType),
      origin: { x: ox, y: oy, z: oz },
      direction: {
        x: dx / directionLength,
        y: dy / directionLength,
        z: dz / directionLength,
      },
      speed: THREE.MathUtils.clamp(Number(rawEvent.speed) || 0, 0.01, 240),
      lifetime: THREE.MathUtils.clamp(Number(rawEvent.lifetime) || 0, 0.03, 4),
      gravity: THREE.MathUtils.clamp(Number(rawEvent.gravity) || 0, 0, 220),
      projectileSize: THREE.MathUtils.clamp(Number(rawEvent.projectileSize) || 0.2, 0.05, 2),
    };
  }

  if (kind === "sniper_beam") {
    const sx = Number(rawEvent?.start?.x);
    const sy = Number(rawEvent?.start?.y);
    const sz = Number(rawEvent?.start?.z);
    const ex = Number(rawEvent?.end?.x);
    const ey = Number(rawEvent?.end?.y);
    const ez = Number(rawEvent?.end?.z);
    if (
      !Number.isFinite(sx)
      || !Number.isFinite(sy)
      || !Number.isFinite(sz)
      || !Number.isFinite(ex)
      || !Number.isFinite(ey)
      || !Number.isFinite(ez)
    ) {
      return null;
    }
    return {
      kind: "sniper_beam",
      weaponType: "sniper",
      start: { x: sx, y: sy, z: sz },
      end: { x: ex, y: ey, z: ez },
      duration: THREE.MathUtils.clamp(Number(rawEvent.duration) || 0.08, 0.02, 0.35),
      beamWidth: THREE.MathUtils.clamp(Number(rawEvent.beamWidth) || 0.09, 0.02, 0.45),
    };
  }

  return null;
}

function queueLocalWeaponFxEvent(rawEvent) {
  const normalizedEvent = sanitizeMultiplayerWeaponFxEvent(rawEvent);
  if (!normalizedEvent) {
    return;
  }
  pendingLocalWeaponFxEvents.push(normalizedEvent);
  const overflow = pendingLocalWeaponFxEvents.length - MULTIPLAYER_MAX_PENDING_WEAPON_FX_EVENTS;
  if (overflow > 0) {
    pendingLocalWeaponFxEvents.splice(0, overflow);
  }
}

function drainPendingLocalWeaponFxEvents() {
  if (pendingLocalWeaponFxEvents.length <= 0) {
    return null;
  }
  const maxCount = Math.max(1, MULTIPLAYER_MAX_WEAPON_FX_EVENTS_PER_PACKET);
  return pendingLocalWeaponFxEvents.splice(0, maxCount);
}

function getRemoteWeaponProjectileGeometry(size) {
  const safeSize = THREE.MathUtils.clamp(Number(size) || 0.2, 0.05, 2);
  const key = safeSize.toFixed(3);
  let geometry = remoteWeaponProjectileGeometryBySize.get(key);
  if (!geometry) {
    geometry = new THREE.BoxGeometry(safeSize, safeSize, safeSize);
    remoteWeaponProjectileGeometryBySize.set(key, geometry);
  }
  return geometry;
}

function getRemoteWeaponProjectileMaterial(weaponType) {
  const normalizedType = normalizeWeaponTypeForMultiplayerFx(weaponType);
  let material = remoteWeaponProjectileMaterialByType.get(normalizedType);
  if (material) {
    return material;
  }
  const sharedWeaponConfig = PLAYER_CONFIG.weapon ?? {};
  const weaponConfig = (PLAYER_CONFIG.weapons ?? {})[normalizedType] ?? {};
  const defaultColor = Number.isFinite(Number(sharedWeaponConfig.projectileColor))
    ? Number(sharedWeaponConfig.projectileColor)
    : 0xd4d8e0;
  const defaultEmissive = Number.isFinite(Number(sharedWeaponConfig.projectileEmissive))
    ? Number(sharedWeaponConfig.projectileEmissive)
    : 0x202020;
  material = new THREE.MeshStandardMaterial({
    color: Number.isFinite(Number(weaponConfig.projectileColor))
      ? Number(weaponConfig.projectileColor)
      : defaultColor,
    emissive: Number.isFinite(Number(weaponConfig.projectileEmissive))
      ? Number(weaponConfig.projectileEmissive)
      : defaultEmissive,
    emissiveIntensity: Number.isFinite(Number(weaponConfig.projectileEmissiveIntensity))
      ? Number(weaponConfig.projectileEmissiveIntensity)
      : (Number.isFinite(Number(sharedWeaponConfig.projectileEmissiveIntensity))
        ? Number(sharedWeaponConfig.projectileEmissiveIntensity)
        : 0.7),
    roughness: Number.isFinite(Number(weaponConfig.projectileRoughness))
      ? Number(weaponConfig.projectileRoughness)
      : (Number.isFinite(Number(sharedWeaponConfig.projectileRoughness))
        ? Number(sharedWeaponConfig.projectileRoughness)
        : 0.35),
    metalness: Number.isFinite(Number(weaponConfig.projectileMetalness))
      ? Number(weaponConfig.projectileMetalness)
      : (Number.isFinite(Number(sharedWeaponConfig.projectileMetalness))
        ? Number(sharedWeaponConfig.projectileMetalness)
        : 0.2),
  });
  remoteWeaponProjectileMaterialByType.set(normalizedType, material);
  return material;
}

function disposeRemoteWeaponProjectileEntry(entry) {
  if (entry?.mesh?.parent) {
    entry.mesh.parent.remove(entry.mesh);
  }
}

function disposeRemoteWeaponBeamEntry(entry) {
  if (entry?.mesh?.parent) {
    entry.mesh.parent.remove(entry.mesh);
  }
  entry?.mesh?.geometry?.dispose?.();
  entry?.material?.dispose?.();
}

function clearRemoteWeaponEffectsForPeer(peerId) {
  if (typeof peerId !== "string" || peerId.length <= 0) {
    return;
  }
  for (let i = remoteWeaponProjectiles.length - 1; i >= 0; i -= 1) {
    if (remoteWeaponProjectiles[i].ownerPeerId !== peerId) {
      continue;
    }
    disposeRemoteWeaponProjectileEntry(remoteWeaponProjectiles[i]);
    remoteWeaponProjectiles.splice(i, 1);
  }
  for (let i = remoteWeaponBeams.length - 1; i >= 0; i -= 1) {
    if (remoteWeaponBeams[i].ownerPeerId !== peerId) {
      continue;
    }
    disposeRemoteWeaponBeamEntry(remoteWeaponBeams[i]);
    remoteWeaponBeams.splice(i, 1);
  }
}

function clearAllRemoteWeaponEffects() {
  pendingLocalWeaponFxEvents.length = 0;
  for (let i = remoteWeaponProjectiles.length - 1; i >= 0; i -= 1) {
    disposeRemoteWeaponProjectileEntry(remoteWeaponProjectiles[i]);
  }
  remoteWeaponProjectiles.length = 0;
  for (let i = remoteWeaponBeams.length - 1; i >= 0; i -= 1) {
    disposeRemoteWeaponBeamEntry(remoteWeaponBeams[i]);
  }
  remoteWeaponBeams.length = 0;
}

function spawnRemoteWeaponProjectile(ownerPeerId, event) {
  const projectileMesh = new THREE.Mesh(
    getRemoteWeaponProjectileGeometry(event.projectileSize),
    getRemoteWeaponProjectileMaterial(event.weaponType)
  );
  projectileMesh.castShadow = true;
  projectileMesh.receiveShadow = true;
  projectileMesh.position.set(event.origin.x, event.origin.y, event.origin.z);
  scene.add(projectileMesh);

  remoteWeaponVectorA.set(event.direction.x, event.direction.y, event.direction.z);
  remoteWeaponVectorA.multiplyScalar(event.speed);
  remoteWeaponProjectiles.push({
    ownerPeerId,
    weaponType: event.weaponType,
    mesh: projectileMesh,
    velocity: remoteWeaponVectorA.clone(),
    gravity: event.gravity,
    life: event.lifetime,
  });
}

function spawnRemoteWeaponBeam(ownerPeerId, event) {
  remoteWeaponVectorA.set(event.start.x, event.start.y, event.start.z);
  remoteWeaponVectorB.set(event.end.x, event.end.y, event.end.z);
  remoteWeaponVectorC.copy(remoteWeaponVectorB).sub(remoteWeaponVectorA);
  const beamLength = Math.max(0.01, remoteWeaponVectorC.length());
  if (!Number.isFinite(beamLength) || beamLength <= 0.01) {
    return;
  }
  const sniperConfig = (PLAYER_CONFIG.weapons ?? {}).sniper ?? {};
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: Number.isFinite(Number(sniperConfig.beamColor))
      ? Number(sniperConfig.beamColor)
      : 0x9ec7ff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  beamMaterial.toneMapped = false;
  const beamGeometry = new THREE.CylinderGeometry(
    event.beamWidth * 0.5,
    event.beamWidth * 0.5,
    beamLength,
    8,
    1,
    true
  );
  const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
  beamMesh.position.copy(remoteWeaponVectorA).addScaledVector(remoteWeaponVectorC, 0.5);
  beamMesh.quaternion.setFromUnitVectors(remoteWeaponYAxis, remoteWeaponVectorC.normalize());
  scene.add(beamMesh);
  remoteWeaponBeams.push({
    ownerPeerId,
    mesh: beamMesh,
    material: beamMaterial,
    life: event.duration,
    maxLife: event.duration,
  });
}

function spawnRemoteWeaponEffect(ownerPeerId, rawEvent) {
  const event = sanitizeMultiplayerWeaponFxEvent(rawEvent);
  if (!event) {
    return;
  }
  if (event.kind === "projectile") {
    spawnRemoteWeaponProjectile(ownerPeerId, event);
    return;
  }
  if (event.kind === "sniper_beam") {
    spawnRemoteWeaponBeam(ownerPeerId, event);
  }
}

function updateRemoteWeaponEffects(deltaSeconds) {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return;
  }

  for (let i = remoteWeaponProjectiles.length - 1; i >= 0; i -= 1) {
    const projectile = remoteWeaponProjectiles[i];
    projectile.velocity.y -= projectile.gravity * deltaSeconds;
    projectile.mesh.position.addScaledVector(projectile.velocity, deltaSeconds);
    projectile.life -= deltaSeconds;
    if (projectile.life > 0) {
      continue;
    }
    disposeRemoteWeaponProjectileEntry(projectile);
    remoteWeaponProjectiles.splice(i, 1);
  }

  for (let i = remoteWeaponBeams.length - 1; i >= 0; i -= 1) {
    const beam = remoteWeaponBeams[i];
    beam.life -= deltaSeconds;
    const remaining = Math.max(0, beam.life / Math.max(0.0001, beam.maxLife));
    beam.material.opacity = 0.9 * remaining;
    if (beam.life > 0) {
      continue;
    }
    disposeRemoteWeaponBeamEntry(beam);
    remoteWeaponBeams.splice(i, 1);
  }
}

function initializeMultiplayerController() {
  if (multiplayerController) {
    return multiplayerController;
  }
  mpLog("Initializing multiplayer controller", {
    gameId: MULTIPLAYER_GAME_ID,
    maxPlayers: MULTIPLAYER_MAX_PLAYERS,
  });
  multiplayerController = createMultiplayerController({
    gameId: MULTIPLAYER_GAME_ID,
    debug: MULTIPLAYER_DEBUG,
    onReady: () => {
      handleMultiplayerReady();
    },
    onLobby: () => {
      handleMultiplayerLobbyChanged();
    },
    onLeft: () => {
      handleMultiplayerLeftLobby();
    },
    onPeerConnected: (peer) => {
      handleMultiplayerPeerConnected(peer);
    },
    onPeerDisconnected: (peer) => {
      handleMultiplayerPeerDisconnected(peer);
    },
    onReliableMessage: (peer, type, payload) => {
      handleMultiplayerReliableMessage(peer, type, payload);
    },
    onUnreliableMessage: (peer, type, payload) => {
      handleMultiplayerUnreliableMessage(peer, type, payload);
    },
    onError: (error) => {
      mpWarn("Network error", error);
    },
  });
  return multiplayerController;
}

initializeMultiplayerController();
mpLog("Multiplayer logging active", {
  enabled: MULTIPLAYER_DEBUG,
  disableHint: `${window.location.pathname}?mplog=0`,
});

function updateShareOverlayFromLobbyState() {
  const state = getMultiplayerState();
  const showShareControls = !state.inLobby || (state.isHost && Number(state.peerCount) <= 0);
  shareOverlayUi.shareButton.style.display = showShareControls ? "inline-flex" : "none";
  if (!state.inLobby || !state.isHost) {
    hideHostLobbyToast({ immediate: true });
  }
  if (!showShareControls) {
    shareOverlayUi.panel.style.display = "none";
    shareOverlayUi.linkInput.value = "";
    mpLog("Share overlay hidden by lobby state", summarizeMultiplayerStateForLog(state));
    return;
  }
  if (!state.inLobby || !state.lobbyCode) {
    shareOverlayUi.panel.style.display = "none";
    shareOverlayUi.linkInput.value = "";
    mpLog("Share overlay reset (no lobby code)");
    return;
  }
  const shareUrl = getLobbyShareUrl(state.lobbyCode);
  shareOverlayUi.linkInput.value = shareUrl;
  mpLog("Share overlay updated", { lobbyCode: state.lobbyCode, shareUrl });
}

async function ensureLobbyForSharing() {
  const state = getMultiplayerState();
  mpLog("Ensuring lobby for share", summarizeMultiplayerStateForLog(state));
  if (state.inLobby && state.lobbyCode) {
    updateShareOverlayFromLobbyState();
    return true;
  }
  if (!state.ready || !multiplayerController) {
    mpWarn("Cannot create share lobby yet (network not ready)");
    return false;
  }
  try {
    mpLog("Creating lobby from Share button");
    await multiplayerController.createLobby({
      public: false,
      maxPlayers: MULTIPLAYER_MAX_PLAYERS,
    });
    updateShareOverlayFromLobbyState();
    mpLog("Share lobby created");
    return true;
  } catch (error) {
    mpWarn("Failed to create share lobby", error);
    return false;
  }
}

shareOverlayUi.shareButton.addEventListener("click", async () => {
  mpLog("Share button clicked");
  const didEnsureLobby = await ensureLobbyForSharing();
  if (!didEnsureLobby) {
    mpWarn("Share click could not ensure lobby");
    return;
  }
  updateShareOverlayFromLobbyState();
  if (shareOverlayUi.linkInput.value) {
    shareOverlayUi.panel.style.display = "flex";
    shareOverlayUi.linkInput.focus();
    shareOverlayUi.linkInput.select();
    mpLog("Share panel shown", { url: shareOverlayUi.linkInput.value });
  }
});

shareOverlayUi.nativeShareButton.addEventListener("click", async () => {
  mpLog("Native share button clicked");
  const didEnsureLobby = await ensureLobbyForSharing();
  if (!didEnsureLobby || typeof navigator.share !== "function") {
    mpWarn("Native share unavailable or lobby missing");
    return;
  }
  const url = shareOverlayUi.linkInput.value;
  if (!url) {
    mpWarn("Native share skipped (empty URL)");
    return;
  }
  try {
    await navigator.share({ url });
    mpLog("Native share invoked", { url });
  } catch (_error) {
    // Ignore cancel errors.
    mpLog("Native share canceled");
  }
});

const clock = new THREE.Clock();
let isPaused = false;
let manualPauseRequested = false;
let gameSpeedMultiplier = GAME_SPEED_NORMAL;
let mainLoopStarted = false;
let mainLoopMode = MAIN_LOOP_MODE_RAF;
let mainLoopRafId = null;
let mainLoopIntervalId = null;
let hasGlobalUserGesture = false;
let backgroundAudioContext = null;
let backgroundAudioGainNode = null;
let backgroundKeepAliveOscillatorA = null;
let backgroundKeepAliveOscillatorB = null;
let backgroundKeepAliveRunning = false;
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

function isBackgroundKeepAliveRequired() {
  return isMultiplayerWithPeer();
}

function ensureBackgroundAudioContext() {
  if (backgroundAudioContext) {
    return backgroundAudioContext;
  }
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (typeof AudioContextCtor !== "function") {
    return null;
  }
  try {
    backgroundAudioContext = new AudioContextCtor();
  } catch (error) {
    mpWarn("Failed to create background audio context", error);
    backgroundAudioContext = null;
  }
  return backgroundAudioContext;
}

function ensureBackgroundAudioGainNode(audioContext) {
  if (!audioContext) {
    return null;
  }
  if (backgroundAudioGainNode) {
    return backgroundAudioGainNode;
  }
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(BACKGROUND_KEEPALIVE_GAIN, audioContext.currentTime);
  gainNode.connect(audioContext.destination);
  backgroundAudioGainNode = gainNode;
  return backgroundAudioGainNode;
}

function stopBackgroundKeepAliveOscillators() {
  const oscillators = [backgroundKeepAliveOscillatorA, backgroundKeepAliveOscillatorB];
  for (const oscillator of oscillators) {
    if (!oscillator) {
      continue;
    }
    try {
      oscillator.stop();
    } catch {
      // Ignore stop races if already stopped.
    }
    try {
      oscillator.disconnect();
    } catch {
      // Ignore disconnect races during teardown.
    }
  }
  backgroundKeepAliveOscillatorA = null;
  backgroundKeepAliveOscillatorB = null;
  backgroundKeepAliveRunning = false;
}

function startBackgroundKeepAliveOscillators(audioContext) {
  if (!audioContext || backgroundKeepAliveRunning) {
    return;
  }
  const gainNode = ensureBackgroundAudioGainNode(audioContext);
  if (!gainNode) {
    return;
  }
  const oscillatorA = audioContext.createOscillator();
  oscillatorA.type = "sine";
  oscillatorA.frequency.setValueAtTime(BACKGROUND_KEEPALIVE_FREQUENCY_HZ, audioContext.currentTime);
  oscillatorA.connect(gainNode);
  oscillatorA.start();

  const oscillatorB = audioContext.createOscillator();
  oscillatorB.type = "sine";
  oscillatorB.frequency.setValueAtTime(BACKGROUND_KEEPALIVE_FREQUENCY_HZ, audioContext.currentTime);
  oscillatorB.connect(gainNode);
  oscillatorB.start();

  backgroundKeepAliveOscillatorA = oscillatorA;
  backgroundKeepAliveOscillatorB = oscillatorB;
  backgroundKeepAliveRunning = true;
}

function refreshBackgroundKeepAlive() {
  if (!isBackgroundKeepAliveRequired()) {
    stopBackgroundKeepAliveOscillators();
    return;
  }
  if (!hasGlobalUserGesture) {
    return;
  }
  const audioContext = ensureBackgroundAudioContext();
  if (!audioContext) {
    return;
  }
  if (audioContext.state !== "running") {
    stopBackgroundKeepAliveOscillators();
    return;
  }
  startBackgroundKeepAliveOscillators(audioContext);
}

function unlockBackgroundAudioContextFromGesture() {
  hasGlobalUserGesture = true;
  const audioContext = ensureBackgroundAudioContext();
  if (!audioContext) {
    return;
  }
  const finalize = () => {
    refreshBackgroundKeepAlive();
    refreshMainLoopMode();
  };
  if (audioContext.state === "running") {
    finalize();
    return;
  }
  const resumeResult = typeof audioContext.resume === "function" ? audioContext.resume() : null;
  if (resumeResult && typeof resumeResult.then === "function") {
    resumeResult.then(finalize).catch(() => {});
    return;
  }
  finalize();
}

let fullscreenRequestPending = false;
let fullscreenAutoRequestEnabled = true;
let fullscreenInteractionBound = false;

const FULLSCREEN_INTERACTION_EVENTS = ["pointerup", "touchend", "click"];

function isRunningInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function getFullscreenElement() {
  return document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
}

function getGameFullscreenTarget() {
  if (document.documentElement && typeof document.documentElement.requestFullscreen === "function") {
    return {
      element: document.documentElement,
      request: document.documentElement.requestFullscreen.bind(document.documentElement),
    };
  }
  if (app && typeof app.requestFullscreen === "function") {
    return {
      element: app,
      request: app.requestFullscreen.bind(app),
    };
  }
  if (app && typeof app.webkitRequestFullscreen === "function") {
    return {
      element: app,
      request: app.webkitRequestFullscreen.bind(app),
    };
  }
  return null;
}

function isGameFullscreen() {
  const fullscreenElement = getFullscreenElement();
  if (!fullscreenElement || !app) {
    return false;
  }
  return fullscreenElement === app
    || fullscreenElement === document.documentElement
    || (typeof fullscreenElement.contains === "function" && fullscreenElement.contains(app))
    || (typeof app.contains === "function" && app.contains(fullscreenElement));
}

function requestGameFullscreen() {
  if (isRunningInIframe()) {
    fullscreenAutoRequestEnabled = false;
    return;
  }
  if (!fullscreenAutoRequestEnabled || fullscreenRequestPending || isGameFullscreen()) {
    return;
  }

  const fullscreenTarget = getGameFullscreenTarget();
  if (!fullscreenTarget || typeof fullscreenTarget.request !== "function") {
    fullscreenAutoRequestEnabled = false;
    return;
  }

  let maybePromise;
  fullscreenRequestPending = true;
  try {
    maybePromise = fullscreenTarget.request();
  } catch (error) {
    fullscreenRequestPending = false;
    if (error?.name === "TypeError" || error?.name === "NotSupportedError") {
      fullscreenAutoRequestEnabled = false;
      return;
    }
    if (
      error?.name !== "AbortError"
      && error?.name !== "NotAllowedError"
      && error?.name !== "SecurityError"
    ) {
      console.warn("Fullscreen request failed:", error);
    }
    return;
  }

  if (!maybePromise || typeof maybePromise.then !== "function") {
    fullscreenRequestPending = false;
    return;
  }

  maybePromise.then(() => {
    fullscreenRequestPending = false;
  }).catch((error) => {
    fullscreenRequestPending = false;
    if (error?.name === "TypeError" || error?.name === "NotSupportedError") {
      fullscreenAutoRequestEnabled = false;
      return;
    }
    if (
      error?.name !== "AbortError"
      && error?.name !== "NotAllowedError"
      && error?.name !== "SecurityError"
    ) {
      console.warn("Fullscreen request failed:", error);
    }
  });
}

function handleGameFullscreenInteraction(event) {
  if (event?.isTrusted === false) {
    return;
  }
  if (typeof event?.button === "number" && event.button !== 0) {
    return;
  }
  requestGameFullscreen();
}

function bindGameFullscreenInteraction() {
  if (fullscreenInteractionBound || isRunningInIframe()) {
    if (isRunningInIframe()) {
      fullscreenAutoRequestEnabled = false;
    }
    return;
  }

  for (const eventName of FULLSCREEN_INTERACTION_EVENTS) {
    window.addEventListener(eventName, handleGameFullscreenInteraction, {
      capture: true,
      passive: true,
    });
  }
  fullscreenInteractionBound = true;
}

document.addEventListener("fullscreenchange", () => {
  fullscreenRequestPending = false;
});
document.addEventListener("fullscreenerror", () => {
  fullscreenRequestPending = false;
}, true);
document.addEventListener("webkitfullscreenchange", () => {
  fullscreenRequestPending = false;
});
document.addEventListener("webkitfullscreenerror", () => {
  fullscreenRequestPending = false;
}, true);

function handleGlobalUserInteraction() {
  markPokiUserInteraction();
  unlockBackgroundAudioContextFromGesture();
}

window.addEventListener("pointerdown", handleGlobalUserInteraction, { capture: true, passive: true });
window.addEventListener("click", handleGlobalUserInteraction, { capture: true, passive: true });
initPokiSdkEarly();

function getAutoPauseRequested() {
  if (isMultiplayerWithPeer()) {
    return false;
  }
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
    resetSellHoldState({
      clearDesktopHeld: true,
      clearAwaitRelease: true,
    });
    return;
  }

  clock.getDelta();
}

function refreshPauseState() {
  if (isMultiplayerGuest()) {
    return;
  }
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
    const didPlaceTower = requestTowerPlacementFromLocalPlayer();
    if (didPlaceTower) {
      setPrimaryDownState(false);
    }
    return;
  }
}

function handleHudButtonAction(buttonId) {
  if (buttonId === "pause") {
    requestPauseToggleFromLocalPlayer();
    return true;
  }
  if (buttonId === "speed") {
    requestSpeedToggleFromLocalPlayer();
    return true;
  }
  if (buttonId === "next_wave") {
    if (waveState === "BUILD") {
      return requestStartWaveFromLocalPlayer();
    }
    return false;
  }
  return false;
}

function handleVisibilityOrFocusChange() {
  updatePauseState();
  refreshBackgroundKeepAlive();
  refreshMainLoopMode();
}

document.addEventListener("visibilitychange", handleVisibilityOrFocusChange);
window.addEventListener("blur", handleVisibilityOrFocusChange);
window.addEventListener("focus", handleVisibilityOrFocusChange);
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
    primaryAlt: false,
    jump: false,
    cancel: false,
    sell: false,
  },
  buttonPointerIds: {
    primary: null,
    primaryAlt: null,
    jump: null,
    cancel: null,
    sell: null,
  },
  previousPrimaryPressed: false,
  pendingBuildConfirm: false,
  suppressPrimaryFireUntilRelease: false,
};
const sellHoldState = {
  desktopHeld: false,
  activeTargetId: null,
  elapsedSeconds: 0,
  awaitingRelease: false,
  currentCandidate: null,
};
const sellPromptProjectVector = new THREE.Vector3();

function setPrimaryDownState(isDown) {
  isPrimaryDown = !!isDown;
  if (player && typeof player.setPrimaryHeld === "function") {
    player.setPrimaryHeld(isPrimaryDown);
  }
}

function clearSellHoldProgress() {
  sellHoldState.activeTargetId = null;
  sellHoldState.elapsedSeconds = 0;
}

function resetSellHoldState(options = {}) {
  if (options.clearDesktopHeld === true) {
    sellHoldState.desktopHeld = false;
  }
  if (options.clearAwaitRelease === true) {
    sellHoldState.awaitingRelease = false;
  }
  sellHoldState.currentCandidate = null;
  clearSellHoldProgress();
}

function isSellInputHeld() {
  return !!(sellHoldState.desktopHeld || mobileInput.pressedButtons.sell);
}

function getSellPromptProgressForCandidate(candidate) {
  if (!candidate || sellHoldState.awaitingRelease) {
    return 0;
  }
  if (!isSellInputHeld()) {
    return 0;
  }
  if (sellHoldState.activeTargetId !== candidate.targetId) {
    return 0;
  }
  return clamp(sellHoldState.elapsedSeconds / SELL_HOLD_DURATION_SECONDS, 0, 1);
}

function projectWorldToScreenPoint(worldPosition, outPoint = { x: 0, y: 0 }) {
  if (!worldPosition || !camera) {
    return null;
  }
  sellPromptProjectVector.copy(worldPosition).project(camera);
  if (
    !Number.isFinite(sellPromptProjectVector.x)
    || !Number.isFinite(sellPromptProjectVector.y)
    || !Number.isFinite(sellPromptProjectVector.z)
    || sellPromptProjectVector.z < -1
    || sellPromptProjectVector.z > 1
  ) {
    return null;
  }

  const screenX = (sellPromptProjectVector.x * 0.5 + 0.5) * viewportWidth;
  const screenY = (-sellPromptProjectVector.y * 0.5 + 0.5) * viewportHeight;
  if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) {
    return null;
  }
  outPoint.x = screenX;
  outPoint.y = screenY;
  return outPoint;
}

function buildSellPromptViewState(showTouchControls) {
  const candidate = sellHoldState.currentCandidate;
  if (!candidate || !candidate.worldAnchor) {
    return {
      visible: false,
      x: 0,
      y: 0,
      progress: 0,
      refund: 0,
      keyHint: "",
    };
  }
  const projected = projectWorldToScreenPoint(candidate.worldAnchor);
  if (!projected) {
    return {
      visible: false,
      x: 0,
      y: 0,
      progress: 0,
      refund: 0,
      keyHint: "",
    };
  }
  return {
    visible: true,
    x: projected.x,
    y: projected.y,
    progress: getSellPromptProgressForCandidate(candidate),
    refund: Math.max(0, Math.floor(Number(candidate.refundAmount) || 0)),
    keyHint: showTouchControls ? "" : `Hold ${DESKTOP_SELL_HOLD_KEY.slice(-1)}`,
  };
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
  mpLog("Applying local tech grants", {
    ownerId: localMultiplayerPeerId,
    grantKeys: grants && typeof grants === "object" ? Object.keys(grants) : [],
  });
  let appliedAny = false;
  if (towerSystem && typeof towerSystem.applyTechGrants === "function") {
    appliedAny = towerSystem.applyTechGrants(grants, { ownerId: localMultiplayerPeerId }) || appliedAny;
  }
  if (player && typeof player.applyTechGrants === "function") {
    appliedAny = player.applyTechGrants(grants) || appliedAny;
  }
  if (enemySystem && shouldHostControlSimulation() && typeof enemySystem.applyTechGrants === "function") {
    appliedAny = enemySystem.applyTechGrants(grants) || appliedAny;
  }
  if (appliedAny && isMultiplayerWithPeer() && multiplayerController) {
    multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.techChoiceCommit, {
      ownerId: localMultiplayerPeerId,
      grants,
    });
    mpLog("Broadcast tech choice commit", {
      ownerId: localMultiplayerPeerId,
      grantKeys: grants && typeof grants === "object" ? Object.keys(grants) : [],
    });
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

function isCoopNonPausingTechMenuActive() {
  return (
    isMultiplayerWithPeer()
    && waveState === "MENU"
    && currentMenuMode === MENU_MODE_TECH_TREE
    && menuAdvancesWaveOnChoice === false
  );
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
  mpLog("Applied local weapon choice", {
    ownerId: localMultiplayerPeerId,
    weaponType: selectedOption.type,
    optionIndex: index,
  });
  if (isMultiplayerWithPeer() && multiplayerController) {
    multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.weaponChoiceCommit, {
      ownerId: localMultiplayerPeerId,
      weaponType: selectedOption.type,
    });
    mpLog("Broadcast weapon choice commit", {
      ownerId: localMultiplayerPeerId,
      weaponType: selectedOption.type,
    });
  }
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
  const rectWidth = Math.max(1, canvasRect.width);
  const rectHeight = Math.max(1, canvasRect.height);
  const localX = clamp(event.clientX - canvasRect.left, 0, rectWidth);
  const localY = clamp(event.clientY - canvasRect.top, 0, rectHeight);
  const x = (localX / rectWidth) * viewportWidth;
  const y = (localY / rectHeight) * viewportHeight;
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
  mobileInput.pressedButtons.primaryAlt = false;
  mobileInput.pressedButtons.jump = false;
  mobileInput.pressedButtons.cancel = false;
  mobileInput.pressedButtons.sell = false;
  mobileInput.buttonPointerIds.primary = null;
  mobileInput.buttonPointerIds.primaryAlt = null;
  mobileInput.buttonPointerIds.jump = null;
  mobileInput.buttonPointerIds.cancel = null;
  mobileInput.buttonPointerIds.sell = null;
  mobileInput.previousPrimaryPressed = false;
  mobileInput.pendingBuildConfirm = false;
  mobileInput.suppressPrimaryFireUntilRelease = false;
  clearTechTreeDragState();
  setPrimaryDownState(false);
  resetSellHoldState({
    clearAwaitRelease: true,
  });
  if (player) {
    player.setVirtualMove(0, 0);
    if (typeof player.setJumpHeld === "function") {
      player.setJumpHeld(false);
    }
  }
}

function releaseMobileButtonPointer(pointerId) {
  for (const action of ["primary", "primaryAlt", "jump", "cancel", "sell"]) {
    if (mobileInput.buttonPointerIds[action] !== pointerId) {
      continue;
    }
    mobileInput.buttonPointerIds[action] = null;
    mobileInput.pressedButtons[action] = false;
    if (action === "primary" || action === "primaryAlt") {
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

  const primaryPressed = !!(mobileInput.pressedButtons.primary || mobileInput.pressedButtons.primaryAlt);
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

function updateSellHoldFromAim(deltaSeconds) {
  if (
    !towerSystem
    || typeof towerSystem.getSellCandidateFromAim !== "function"
    || !player
    || !isGameplayWaveState(waveState)
    || isPaused
  ) {
    resetSellHoldState({
      clearAwaitRelease: true,
    });
    return;
  }

  const candidate = towerSystem.getSellCandidateFromAim({
    playerPosition: player.getPosition(),
    maxAimDistance: SELL_AIM_MAX_DISTANCE,
    maxPlayerDistance: SELL_PLAYER_MAX_DISTANCE,
  });
  sellHoldState.currentCandidate = candidate;
  const inputHeld = isSellInputHeld();
  if (!inputHeld) {
    clearSellHoldProgress();
    sellHoldState.awaitingRelease = false;
    return;
  }
  if (!candidate || typeof candidate.targetId !== "string" || candidate.targetId.length <= 0) {
    clearSellHoldProgress();
    return;
  }

  if (sellHoldState.awaitingRelease) {
    clearSellHoldProgress();
    return;
  }
  if (sellHoldState.activeTargetId !== candidate.targetId) {
    sellHoldState.activeTargetId = candidate.targetId;
    sellHoldState.elapsedSeconds = 0;
  }

  sellHoldState.elapsedSeconds += Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0);
  if (sellHoldState.elapsedSeconds < SELL_HOLD_DURATION_SECONDS) {
    return;
  }

  const didRequestSell = requestTowerSellFromLocalPlayer(candidate);
  sellHoldState.awaitingRelease = true;
  clearSellHoldProgress();
  if (!didRequestSell) {
    mpWarn("Tower sell hold completed but request failed", {
      targetId: candidate.targetId,
      localPeerId: localMultiplayerPeerId,
    });
  }
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
      requestTowerPlacementFromLocalPlayer();
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
      if (touchedAction === "primary" || touchedAction === "primaryAlt") {
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
      requestStartWaveFromLocalPlayer();
    } else {
      requestSpeedToggleFromLocalPlayer();
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

  if (event.code === DESKTOP_SELL_HOLD_KEY) {
    sellHoldState.desktopHeld = true;
    event.preventDefault();
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
    requestTowerPlacementFromLocalPlayer();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === DESKTOP_SELL_HOLD_KEY) {
    sellHoldState.desktopHeld = false;
    return;
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

function getHostPeerIdFromState(state = getMultiplayerState()) {
  if (!state.inLobby) {
    return null;
  }
  if (state.isHost) {
    return state.localPeerId;
  }
  if (Array.isArray(state.peerIds) && state.peerIds.length > 0) {
    return state.peerIds[0];
  }
  return null;
}

function sendReliableToHost(type, payload = {}) {
  if (!multiplayerController) {
    mpWarn("sendReliableToHost failed: controller missing", { type });
    return false;
  }
  const state = getMultiplayerState();
  if (!state.inLobby) {
    mpWarn("sendReliableToHost failed: not in lobby", { type });
    return false;
  }
  if (state.isHost) {
    mpLog("Loopback reliable request to host handler", {
      type,
      payload: summarizeMultiplayerPayloadForLog(type, payload),
    });
    handleMultiplayerReliableMessage(
      { id: state.localPeerId },
      type,
      { ...(payload || {}), request: true }
    );
    return true;
  }
  const hostPeerId = getHostPeerIdFromState(state);
  if (!hostPeerId) {
    mpWarn("sendReliableToHost failed: could not determine host peer", {
      type,
      state: summarizeMultiplayerStateForLog(state),
    });
    return false;
  }
  const sent = multiplayerController.sendReliable(hostPeerId, type, payload);
  mpLog("Sent reliable message to host", {
    hostPeerId,
    type,
    sent,
    payload: summarizeMultiplayerPayloadForLog(type, payload),
  });
  return sent;
}

function applyMultiplayerAuthorityForCurrentSystems() {
  if (towerSystem && typeof towerSystem.setLocalOwnerId === "function") {
    towerSystem.setLocalOwnerId(localMultiplayerPeerId);
  }
  if (!enemySystem) {
    return;
  }
  const hostAuthority = shouldHostControlSimulation();
  if (typeof enemySystem.setDamageEnabled === "function") {
    enemySystem.setDamageEnabled(hostAuthority);
  }
  if (typeof enemySystem.setEnemyHealthMultiplier === "function") {
    enemySystem.setEnemyHealthMultiplier(getEnemyHealthMultiplierForCurrentPlayerCount());
  }
  mpLog("Applied multiplayer authority to systems", {
    hostAuthority,
    localPeerId: localMultiplayerPeerId,
    connectedPlayers: getConnectedPlayerCount(),
    enemyHealthMultiplier: getEnemyHealthMultiplierForCurrentPlayerCount(),
  });
}

function buildHostStatePayload({ includeSnapshot = false } = {}) {
  const payload = {
    waveState,
    currentWave,
    waveDelay,
    queuedWaveNumber,
    buildPhaseRemainingSeconds,
    paused: !!isPaused,
    speedMultiplier: gameSpeedMultiplier,
    playerCount: getConnectedPlayerCount(),
    enemyHealthMultiplier: getEnemyHealthMultiplierForCurrentPlayerCount(),
  };
  if (includeSnapshot) {
    payload.snapshot = {
      towers: towerSystem && typeof towerSystem.getTowerSnapshots === "function"
        ? towerSystem.getTowerSnapshots()
        : [],
      enemies: enemySystem && typeof enemySystem.getActiveEnemySnapshots === "function"
        ? enemySystem.getActiveEnemySnapshots()
        : [],
    };
  }
  return payload;
}

function getHostStateSignature(payload) {
  return JSON.stringify({
    waveState: payload.waveState,
    currentWave: payload.currentWave,
    waveDelay: payload.waveDelay,
    queuedWaveNumber: payload.queuedWaveNumber,
    buildPhaseRemainingSeconds: payload.buildPhaseRemainingSeconds,
    paused: payload.paused,
    speedMultiplier: payload.speedMultiplier,
    playerCount: payload.playerCount,
    enemyHealthMultiplier: payload.enemyHealthMultiplier,
  });
}

function broadcastHostStateSync(force = false) {
  if (!multiplayerController || !isMultiplayerHost()) {
    return false;
  }
  const payload = buildHostStatePayload({ includeSnapshot: false });
  const signature = getHostStateSignature(payload);
  if (!force && signature === lastBroadcastHostStateSignature) {
    mpLog("Skipped host state sync (unchanged)");
    return false;
  }
  lastBroadcastHostStateSignature = signature;
  multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.stateSync, payload);
  mpLog("Broadcast host state sync", {
    force,
    payload: summarizeMultiplayerPayloadForLog(MULTIPLAYER_MESSAGE_TYPE.stateSync, payload),
  });
  return true;
}

function sendHostSnapshotToPeer(peerId) {
  if (!multiplayerController || !isMultiplayerHost() || typeof peerId !== "string" || !peerId) {
    return false;
  }
  const payload = buildHostStatePayload({ includeSnapshot: true });
  const sent = multiplayerController.sendReliable(peerId, MULTIPLAYER_MESSAGE_TYPE.stateSync, payload);
  mpLog("Sent host snapshot to peer", {
    peerId,
    sent,
    payload: summarizeMultiplayerPayloadForLog(MULTIPLAYER_MESSAGE_TYPE.stateSync, payload),
  });
  return sent;
}

function applyHostStateSyncPayload(payload = {}) {
  if (isMultiplayerHost()) {
    mpLog("Ignored host state sync payload because local player is host");
    return;
  }
  mpLog("Applying host state sync payload", summarizeMultiplayerPayloadForLog(MULTIPLAYER_MESSAGE_TYPE.stateSync, payload));
  const normalizedSpeed = Number(payload.speedMultiplier);
  if (Number.isFinite(normalizedSpeed) && normalizedSpeed > 0) {
    gameSpeedMultiplier = normalizedSpeed >= GAME_SPEED_FAST ? GAME_SPEED_FAST : GAME_SPEED_NORMAL;
  }
  applyPausedState(payload.paused === true);
  manualPauseRequested = false;

  if (typeof payload.waveState === "string") {
    waveState = payload.waveState;
  }
  if (player && typeof player.setMenuMode === "function") {
    player.setMenuMode(waveState === "MENU");
  }
  if (Number.isInteger(payload.currentWave) && payload.currentWave > 0) {
    currentWave = payload.currentWave;
  }
  if (Number.isFinite(Number(payload.waveDelay))) {
    waveDelay = Math.max(0, Number(payload.waveDelay));
  }
  queuedWaveNumber = Number.isInteger(payload.queuedWaveNumber) && payload.queuedWaveNumber > 0
    ? payload.queuedWaveNumber
    : null;
  if (Number.isFinite(Number(payload.buildPhaseRemainingSeconds))) {
    buildPhaseRemainingSeconds = Math.max(0, Number(payload.buildPhaseRemainingSeconds));
  }

  if (enemySystem && Number.isFinite(Number(payload.enemyHealthMultiplier))) {
    enemySystem.setEnemyHealthMultiplier(Math.max(0.01, Number(payload.enemyHealthMultiplier)));
  }

  if (payload.snapshot && typeof payload.snapshot === "object") {
    const snapshotTowers = Array.isArray(payload.snapshot.towers) ? payload.snapshot.towers : [];
    const snapshotEnemies = Array.isArray(payload.snapshot.enemies) ? payload.snapshot.enemies : [];
    if (towerSystem) {
      towerSystem.clearAllTowers();
      for (const towerSnapshot of snapshotTowers) {
        towerSystem.placeTowerFromPayload(towerSnapshot, {
          ownerId: towerSnapshot?.ownerId,
          spendCost: false,
          requireUnlocked: false,
          requireAffordable: false,
        });
      }
    }
    if (enemySystem) {
      enemySystem.clearAll();
      for (const enemySnapshot of snapshotEnemies) {
        enemySystem.spawnNetworkEnemy(enemySnapshot);
      }
    }
    hasAppliedHostSnapshot = true;
    mpLog("Applied host snapshot state", {
      towers: snapshotTowers.length,
      enemies: snapshotEnemies.length,
    });
  }

  syncBuildPhasePathPreviewVisibility();
}

function requestPauseToggleFromLocalPlayer() {
  if (!isMultiplayerLobbyActive()) {
    mpLog("Local pause toggle (single-player)");
    toggleManualPause();
    return true;
  }
  if (isMultiplayerHost()) {
    mpLog("Host pause toggle requested locally");
    toggleManualPause();
    multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.speedPauseCmd, {
      request: false,
      action: "set_pause",
      paused: isPaused,
    });
    broadcastHostStateSync(true);
    return true;
  }
  const sent = sendReliableToHost(MULTIPLAYER_MESSAGE_TYPE.speedPauseCmd, {
    request: true,
    action: "toggle_pause",
  });
  mpLog("Guest pause toggle request sent", { sent });
  return sent;
}

function requestSpeedToggleFromLocalPlayer() {
  if (!isMultiplayerLobbyActive()) {
    mpLog("Local speed toggle (single-player)");
    toggleGameSpeed();
    return true;
  }
  if (isMultiplayerHost()) {
    mpLog("Host speed toggle requested locally");
    toggleGameSpeed();
    multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.speedPauseCmd, {
      request: false,
      action: "set_speed",
      speedMultiplier: gameSpeedMultiplier,
    });
    broadcastHostStateSync(true);
    return true;
  }
  const sent = sendReliableToHost(MULTIPLAYER_MESSAGE_TYPE.speedPauseCmd, {
    request: true,
    action: "toggle_speed",
  });
  mpLog("Guest speed toggle request sent", { sent });
  return sent;
}

function requestStartWaveFromLocalPlayer() {
  if (waveState !== "BUILD") {
    mpLog("Start wave ignored (not in build phase)", { waveState });
    return false;
  }
  if (!isMultiplayerLobbyActive()) {
    mpLog("Local start wave (single-player)");
    return startQueuedWaveNow();
  }
  if (isMultiplayerHost()) {
    mpLog("Host start wave requested locally");
    return startQueuedWaveNow();
  }
  const sent = sendReliableToHost(MULTIPLAYER_MESSAGE_TYPE.waveCmd, {
    request: true,
    action: "start_wave",
  });
  mpLog("Guest start wave request sent", { sent });
  return sent;
}

function applyPostPlacementBuildModeAffordability(towerType) {
  if (!towerSystem || typeof towerType !== "string" || towerType.length <= 0) {
    return;
  }
  if (typeof towerSystem.isBuildMode !== "function" || !towerSystem.isBuildMode()) {
    return;
  }
  if (typeof towerSystem.getSelectedTowerType !== "function") {
    return;
  }
  if (towerSystem.getSelectedTowerType() !== towerType) {
    return;
  }
  if (typeof towerSystem.canAffordTower !== "function" || towerSystem.canAffordTower(towerType)) {
    return;
  }
  towerSystem.cancelPlacement?.();
  mpLog("Auto-cancelled build mode after placement (insufficient funds)", {
    towerType,
    money: roundMultiplayerLogNumber(playerMoney, 2),
  });
}

function requestTowerPlacementFromLocalPlayer() {
  if (!towerSystem || !towerSystem.isBuildMode()) {
    mpLog("Tower placement request ignored (not in build mode)");
    return false;
  }
  if (!isMultiplayerLobbyActive()) {
    mpLog("Tower placement attempt (single-player)");
    return towerSystem.placeSelectedTower();
  }

  const previewState = towerSystem.getCurrentPreviewPayload();
  if (!previewState?.active || !previewState?.valid || !previewState?.placement) {
    mpLog("Tower placement request ignored (invalid preview)", {
      previewActive: previewState?.active === true,
      previewValid: previewState?.valid === true,
    });
    return false;
  }
  const placementPayload = {
    ...previewState.placement,
    towerType: previewState.towerType,
    ownerId: localMultiplayerPeerId,
  };

  if (isMultiplayerHost()) {
    mpLog("Host placing tower locally", summarizeTowerPlacementForLog(placementPayload));
    const didPlace = towerSystem.placeSelectedTower();
    if (!didPlace) {
      mpWarn("Host local tower placement failed");
      return false;
    }
    multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.towerPlaceCommit, {
      request: false,
      rejected: false,
      ownerId: localMultiplayerPeerId,
      placement: placementPayload,
    });
    broadcastHostStateSync(true);
    return true;
  }

  if (pendingTowerRequestsById.size > 0) {
    mpWarn("Guest tower request blocked: pending request already exists", {
      pendingCount: pendingTowerRequestsById.size,
    });
    return false;
  }

  const towerCost = towerSystem.getTowerCost(previewState.towerType);
  if (!trySpendMoney(towerCost)) {
    mpWarn("Guest tower request denied: insufficient funds", { towerCost, money: playerMoney });
    return false;
  }
  const requestId = `req_${nextTowerRequestId++}`;
  pendingTowerRequestsById.set(requestId, {
    cost: towerCost,
    towerType: previewState.towerType,
    createdAt: (typeof performance?.now === "function" ? performance.now() : Date.now()),
  });
  const sent = sendReliableToHost(MULTIPLAYER_MESSAGE_TYPE.towerPlaceCommit, {
    request: true,
    requestId,
    ownerId: localMultiplayerPeerId,
    placement: placementPayload,
  });
  mpLog("Guest tower placement request sent", {
    requestId,
    sent,
    cost: towerCost,
    placement: summarizeTowerPlacementForLog(placementPayload),
  });
  if (!sent) {
    pendingTowerRequestsById.delete(requestId);
    addMoney(towerCost);
    mpWarn("Guest tower placement request failed to send; refunded", { requestId, towerCost });
  }
  return sent;
}

function requestTowerSellFromLocalPlayer(candidate) {
  const targetId = typeof candidate?.targetId === "string" ? candidate.targetId : null;
  if (!towerSystem || typeof towerSystem.sellTowerById !== "function" || !targetId) {
    mpLog("Tower sell request ignored (invalid context)", {
      hasTowerSystem: !!towerSystem,
      hasSellApi: typeof towerSystem?.sellTowerById === "function",
      targetId,
    });
    return false;
  }

  if (!isMultiplayerLobbyActive()) {
    const result = towerSystem.sellTowerById(targetId, {
      sellerId: localMultiplayerPeerId,
      applyRefund: true,
    });
    mpLog("Tower sell attempt (single-player)", {
      targetId,
      success: result?.success === true,
      refundAmount: roundMultiplayerLogNumber(result?.refundAmount, 2),
    });
    return result?.success === true;
  }

  if (isMultiplayerHost()) {
    const result = towerSystem.sellTowerById(targetId, {
      sellerId: localMultiplayerPeerId,
      applyRefund: true,
    });
    if (!result?.success) {
      mpWarn("Host local tower sell failed", { targetId });
      return false;
    }
    multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.towerSellCommit, {
      request: false,
      rejected: false,
      targetId: result.targetId,
      towerType: result.towerType,
      sellerId: result.sellerId,
      refundAmount: result.refundAmount,
    });
    broadcastHostStateSync(true);
    return true;
  }

  if (pendingTowerSellRequestsById.size > 0) {
    mpWarn("Guest tower sell request blocked: pending request already exists", {
      pendingCount: pendingTowerSellRequestsById.size,
    });
    return false;
  }

  const requestId = `sell_${nextTowerSellRequestId++}`;
  pendingTowerSellRequestsById.set(requestId, {
    targetId,
    createdAt: (typeof performance?.now === "function" ? performance.now() : Date.now()),
  });
  const sent = sendReliableToHost(MULTIPLAYER_MESSAGE_TYPE.towerSellCommit, {
    request: true,
    requestId,
    targetId,
    sellerId: localMultiplayerPeerId,
  });
  mpLog("Guest tower sell request sent", {
    requestId,
    sent,
    targetId,
  });
  if (!sent) {
    pendingTowerSellRequestsById.delete(requestId);
    mpWarn("Guest tower sell request failed to send", { requestId, targetId });
  }
  return sent;
}

function processPendingTowerRequestTimeouts() {
  if (pendingTowerRequestsById.size === 0) {
    return;
  }
  const nowMs = typeof performance?.now === "function" ? performance.now() : Date.now();
  const timeoutMs = 5000;
  for (const [requestId, request] of pendingTowerRequestsById.entries()) {
    if ((nowMs - request.createdAt) < timeoutMs) {
      continue;
    }
    pendingTowerRequestsById.delete(requestId);
    addMoney(request.cost);
    mpWarn("Pending tower request timed out; refunded", {
      requestId,
      cost: request.cost,
      ageMs: roundMultiplayerLogNumber(nowMs - request.createdAt, 0),
    });
  }
}

function processPendingTowerSellRequestTimeouts() {
  if (pendingTowerSellRequestsById.size === 0) {
    return;
  }
  const nowMs = typeof performance?.now === "function" ? performance.now() : Date.now();
  const timeoutMs = 5000;
  for (const [requestId, request] of pendingTowerSellRequestsById.entries()) {
    if ((nowMs - request.createdAt) < timeoutMs) {
      continue;
    }
    pendingTowerSellRequestsById.delete(requestId);
    mpWarn("Pending tower sell request timed out", {
      requestId,
      targetId: request.targetId,
      ageMs: roundMultiplayerLogNumber(nowMs - request.createdAt, 0),
    });
  }
}

function refundAllPendingTowerRequests() {
  if (pendingTowerRequestsById.size === 0) {
    return;
  }
  for (const request of pendingTowerRequestsById.values()) {
    if (Number.isFinite(Number(request?.cost)) && Number(request.cost) > 0) {
      addMoney(request.cost);
    }
  }
  mpLog("Refunded all pending tower requests", { count: pendingTowerRequestsById.size });
  pendingTowerRequestsById.clear();
}

function clearPendingTowerSellRequests() {
  if (pendingTowerSellRequestsById.size <= 0) {
    return;
  }
  mpLog("Cleared pending tower sell requests", { count: pendingTowerSellRequestsById.size });
  pendingTowerSellRequestsById.clear();
}

function handleHostEndedSession() {
  mpWarn("Handling host-ended session");
  flushUnreliableMultiplayerStatsLog(true);
  refundAllPendingTowerRequests();
  clearPendingTowerSellRequests();
  clearAllRemotePlayers();
  clearAllRemoteWeaponEffects();
  towerSystem?.clearAllPeerPreviews?.();
  if (multiplayerController && getMultiplayerState().inLobby) {
    void multiplayerController.leaveLobby();
  }
  applyPausedState(true);
  waveState = "MENU";
  currentMenuMode = MENU_MODE_WEAPON_SELECT;
  currentMenuTitle = "Session Ended";
  currentMenuSubtitle = "Host left the match";
  currentWeaponOptions = [];
  stopBackgroundKeepAliveOscillators();
  refreshBackgroundKeepAlive();
  refreshMainLoopMode();
}

function notifyPeersHostEndedSession() {
  if (!multiplayerController || !isMultiplayerHost() || !isMultiplayerWithPeer()) {
    return;
  }
  mpWarn("Host is notifying peers that session ended");
  multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.hostEnded, {});
}

function handleTowerCommitMessage(peer, payload = {}) {
  const ownerIdFromPayload = typeof payload?.ownerId === "string" && payload.ownerId.length > 0
    ? payload.ownerId
    : null;
  const ownerId = payload?.request === true
    ? (peer?.id || null)
    : (ownerIdFromPayload || peer?.id || null);
  const requestId = typeof payload?.requestId === "string" ? payload.requestId : null;
  const placementPayload = payload?.placement && typeof payload.placement === "object"
    ? payload.placement
    : null;
  mpLog("Handling tower commit message", {
    fromPeerId: peer?.id || null,
    payload: summarizeMultiplayerPayloadForLog(MULTIPLAYER_MESSAGE_TYPE.towerPlaceCommit, payload),
  });

  if (payload?.request === true) {
    if (!isMultiplayerHost() || !placementPayload || !ownerId || !peer?.id) {
      mpWarn("Ignoring tower commit request: invalid host/request context", {
        isHost: isMultiplayerHost(),
        hasPlacement: !!placementPayload,
        ownerId,
        fromPeerId: peer?.id || null,
      });
      return;
    }
    const canPlace = towerSystem?.canPlaceTowerFromPayload?.(placementPayload, {
      requireUnlocked: false,
      requireAffordable: false,
    });
    if (!canPlace) {
      mpWarn("Host rejected tower placement request (validation failed)", {
        requestId,
        ownerId,
        placement: summarizeTowerPlacementForLog(placementPayload),
      });
      multiplayerController.sendReliable(peer.id, MULTIPLAYER_MESSAGE_TYPE.towerPlaceCommit, {
        request: false,
        rejected: true,
        requestId,
      });
      return;
    }
    const didPlace = towerSystem.placeTowerFromPayload(placementPayload, {
      ownerId,
      spendCost: false,
      requireUnlocked: false,
      requireAffordable: false,
    });
    if (!didPlace) {
      mpWarn("Host rejected tower placement request (placement apply failed)", {
        requestId,
        ownerId,
      });
      multiplayerController.sendReliable(peer.id, MULTIPLAYER_MESSAGE_TYPE.towerPlaceCommit, {
        request: false,
        rejected: true,
        requestId,
      });
      return;
    }
    multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.towerPlaceCommit, {
      request: false,
      rejected: false,
      requestId,
      ownerId,
      placement: placementPayload,
    });
    mpLog("Host committed tower placement request", {
      requestId,
      ownerId,
      placement: summarizeTowerPlacementForLog(placementPayload),
    });
    broadcastHostStateSync(true);
    return;
  }

  if (payload?.rejected === true) {
    if (requestId && pendingTowerRequestsById.has(requestId)) {
      const request = pendingTowerRequestsById.get(requestId);
      pendingTowerRequestsById.delete(requestId);
      addMoney(request.cost);
      mpWarn("Tower placement request rejected; refunded", {
        requestId,
        cost: request?.cost,
      });
    }
    return;
  }

  if (!placementPayload || !towerSystem) {
    mpWarn("Ignoring tower placement commit with missing placement/system");
    return;
  }
  const didPlace = towerSystem.placeTowerFromPayload(placementPayload, {
    ownerId,
    spendCost: false,
    requireUnlocked: false,
    requireAffordable: false,
  });
  let resolvedPendingRequest = null;
  if (requestId && pendingTowerRequestsById.has(requestId)) {
    const request = pendingTowerRequestsById.get(requestId);
    resolvedPendingRequest = request;
    pendingTowerRequestsById.delete(requestId);
    if (!didPlace) {
      addMoney(request.cost);
      mpWarn("Tower commit apply failed; refunded pending request", {
        requestId,
        cost: request?.cost,
      });
    }
  }
  if (didPlace && resolvedPendingRequest?.towerType) {
    applyPostPlacementBuildModeAffordability(resolvedPendingRequest.towerType);
  }
  mpLog("Applied tower placement commit", {
    requestId,
    ownerId,
    didPlace,
    placement: summarizeTowerPlacementForLog(placementPayload),
  });
}

function handleTowerSellCommitMessage(peer, payload = {}) {
  const requestId = typeof payload?.requestId === "string" ? payload.requestId : null;
  const targetId = typeof payload?.targetId === "string" ? payload.targetId : null;
  const refundAmount = Math.max(0, Math.floor(Number(payload?.refundAmount) || 0));
  const sellerIdFromPayload = typeof payload?.sellerId === "string" && payload.sellerId.length > 0
    ? payload.sellerId
    : null;
  const sellerId = payload?.request === true
    ? (peer?.id || sellerIdFromPayload)
    : (sellerIdFromPayload || peer?.id || null);

  mpLog("Handling tower sell commit message", {
    fromPeerId: peer?.id || null,
    payload: summarizeMultiplayerPayloadForLog(MULTIPLAYER_MESSAGE_TYPE.towerSellCommit, payload),
  });

  if (payload?.request === true) {
    if (!isMultiplayerHost() || !peer?.id || !targetId || !towerSystem) {
      mpWarn("Ignoring tower sell request: invalid host/request context", {
        isHost: isMultiplayerHost(),
        hasTowerSystem: !!towerSystem,
        targetId,
        fromPeerId: peer?.id || null,
      });
      return;
    }
    const result = towerSystem.sellTowerById(targetId, {
      sellerId: peer.id,
      applyRefund: false,
    });
    if (!result?.success) {
      mpWarn("Host rejected tower sell request", { requestId, targetId, sellerId: peer.id });
      multiplayerController.sendReliable(peer.id, MULTIPLAYER_MESSAGE_TYPE.towerSellCommit, {
        request: false,
        rejected: true,
        requestId,
      });
      return;
    }
    multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.towerSellCommit, {
      request: false,
      rejected: false,
      requestId,
      targetId: result.targetId,
      towerType: result.towerType,
      sellerId: peer.id,
      refundAmount: result.refundAmount,
    });
    broadcastHostStateSync(true);
    return;
  }

  if (payload?.rejected === true) {
    if (requestId) {
      pendingTowerSellRequestsById.delete(requestId);
    }
    mpWarn("Tower sell request rejected", { requestId, targetId });
    return;
  }

  if (!towerSystem || !targetId) {
    mpWarn("Ignoring tower sell commit with missing target/system", {
      hasTowerSystem: !!towerSystem,
      targetId,
    });
    return;
  }

  const result = towerSystem.sellTowerById(targetId, {
    sellerId,
    applyRefund: false,
  });
  const hadPendingRequest = !!(requestId && pendingTowerSellRequestsById.has(requestId));
  if (requestId) {
    pendingTowerSellRequestsById.delete(requestId);
  }
  if (!result?.success) {
    if (hadPendingRequest && sellerId && sellerId === localMultiplayerPeerId && refundAmount > 0) {
      addMoney(refundAmount);
      mpLog("Tower sell commit arrived after local desync; applied refund without local removal", {
        requestId,
        targetId,
        refundAmount,
      });
      return;
    }
    mpWarn("Tower sell commit apply failed", { requestId, targetId, sellerId });
    return;
  }
  if (sellerId && sellerId === localMultiplayerPeerId && refundAmount > 0) {
    addMoney(refundAmount);
  }
  mpLog("Applied tower sell commit", {
    requestId,
    targetId,
    sellerId,
    refundAmount,
  });
}

function handleMultiplayerReady() {
  const state = getMultiplayerState();
  mpLog("Multiplayer ready", summarizeMultiplayerStateForLog(state));
  if (state.localPeerId) {
    localMultiplayerPeerId = state.localPeerId;
  }
  if (towerSystem?.setLocalOwnerId) {
    towerSystem.setLocalOwnerId(localMultiplayerPeerId);
  }
  if (pendingAutoJoinLobbyCode && !state.inLobby && multiplayerController) {
    const joinCode = pendingAutoJoinLobbyCode;
    pendingAutoJoinLobbyCode = null;
    mpLog("Attempting auto-join from query param", { joinCode });
    void multiplayerController.joinLobby(joinCode).then((didJoin) => {
      if (!didJoin) {
        mpWarn(`Failed to auto-join lobby "${joinCode}".`);
      } else {
        mpLog("Auto-join succeeded", { joinCode });
      }
    }).catch((error) => {
      mpWarn("Auto-join error", error);
    });
  }
}

function handleMultiplayerLobbyChanged() {
  const state = getMultiplayerState();
  mpLog("Lobby state changed", summarizeMultiplayerStateForLog(state));
  if (state.localPeerId) {
    localMultiplayerPeerId = state.localPeerId;
  }
  hasAppliedHostSnapshot = isMultiplayerHost();
  towerSystem?.setLocalOwnerId?.(localMultiplayerPeerId);
  applyMultiplayerAuthorityForCurrentSystems();
  updateShareOverlayFromLobbyState();
  if (isMultiplayerHost()) {
    mpLog("Host entered lobby and is broadcasting initial state sync");
    broadcastHostStateSync(true);
  }
  refreshBackgroundKeepAlive();
  refreshMainLoopMode();
}

function handleMultiplayerLeftLobby() {
  mpLog("Left lobby", summarizeMultiplayerStateForLog(getMultiplayerState()));
  flushUnreliableMultiplayerStatsLog(true);
  clearAllRemotePlayers();
  clearAllRemoteWeaponEffects();
  refundAllPendingTowerRequests();
  clearPendingTowerSellRequests();
  hasAppliedHostSnapshot = false;
  towerSystem?.clearAllPeerPreviews?.();
  applyMultiplayerAuthorityForCurrentSystems();
  updateShareOverlayFromLobbyState();
  refreshBackgroundKeepAlive();
  refreshMainLoopMode();
}

function handleMultiplayerPeerConnected(peer) {
  mpLog("Peer connected", { peerId: peer?.id || null, state: summarizeMultiplayerStateForLog(getMultiplayerState()) });
  const hostNow = isMultiplayerHost();
  if (peer?.id) {
    ensureRemotePlayerEntry(peer.id);
  }
  applyMultiplayerAuthorityForCurrentSystems();
  if (hostNow) {
    updateShareOverlayFromLobbyState();
    showHostLobbyToast("Player joined");
  }
  if (hostNow && isPaused) {
    manualPauseRequested = false;
    applyPausedState(false);
    mpLog("Host auto-unpaused due peer join", { peerId: peer?.id || null });
  }
  if (hostNow && peer?.id) {
    sendHostSnapshotToPeer(peer.id);
    broadcastHostStateSync(true);
  }
  refreshBackgroundKeepAlive();
  refreshMainLoopMode();
}

function handleMultiplayerPeerDisconnected(peer) {
  mpWarn("Peer disconnected", { peerId: peer?.id || null, state: summarizeMultiplayerStateForLog(getMultiplayerState()) });
  const hostNow = isMultiplayerHost();
  if (peer?.id) {
    disposeRemotePlayerEntry(peer.id);
    clearRemoteWeaponEffectsForPeer(peer.id);
    towerSystem?.clearPeerPreview?.(peer.id);
  }
  applyMultiplayerAuthorityForCurrentSystems();
  if (hostNow) {
    updateShareOverlayFromLobbyState();
    showHostLobbyToast("Player left");
  }
  refreshBackgroundKeepAlive();
  refreshMainLoopMode();
  if (hostNow) {
    broadcastHostStateSync(true);
    return;
  }
  if (isMultiplayerLobbyActive() && getMultiplayerState().peerCount <= 0) {
    mpWarn("Guest detected host disconnect; ending session");
    handleHostEndedSession();
  }
}

function handleMultiplayerReliableMessage(peer, type, payload) {
  if (!type) {
    return;
  }
  mpLog("Received reliable message", {
    fromPeerId: peer?.id || null,
    type,
    payload: summarizeMultiplayerPayloadForLog(type, payload),
  });
  if (type === MULTIPLAYER_MESSAGE_TYPE.stateSync) {
    if (!isMultiplayerHost()) {
      applyHostStateSyncPayload(payload);
    }
    return;
  }

  if (type === MULTIPLAYER_MESSAGE_TYPE.waveCmd) {
    if (payload?.request === true) {
      if (!isMultiplayerHost()) {
        mpWarn("Guest received wave request message; ignoring");
        return;
      }
      if (payload.action === "start_wave") {
        mpLog("Host executing requested start_wave from peer", { fromPeerId: peer?.id || null });
        startQueuedWaveNow();
      }
      return;
    }
    if (!isMultiplayerHost() && payload?.action === "start_wave") {
      const incomingWave = Number.isInteger(payload.waveNumber) ? payload.waveNumber : currentWave;
      mpLog("Guest applying host start_wave command", { waveNumber: incomingWave });
      startWave(incomingWave);
    }
    return;
  }

  if (type === MULTIPLAYER_MESSAGE_TYPE.speedPauseCmd) {
    if (payload?.request === true) {
      if (!isMultiplayerHost()) {
        mpWarn("Guest received speed/pause request message; ignoring");
        return;
      }
      if (payload.action === "toggle_pause") {
        mpLog("Host executing requested pause toggle", { fromPeerId: peer?.id || null });
        toggleManualPause();
      } else if (payload.action === "toggle_speed") {
        mpLog("Host executing requested speed toggle", { fromPeerId: peer?.id || null });
        toggleGameSpeed();
      }
      multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.speedPauseCmd, {
        request: false,
        action: "state",
        paused: isPaused,
        speedMultiplier: gameSpeedMultiplier,
      });
      broadcastHostStateSync(true);
      return;
    }
    if (!isMultiplayerHost()) {
      if (payload.action === "set_pause" || payload.action === "state") {
        applyPausedState(payload.paused === true);
      }
      if (payload.action === "set_speed" || payload.action === "state") {
        const nextSpeed = Number(payload.speedMultiplier);
        if (Number.isFinite(nextSpeed) && nextSpeed > 0) {
          gameSpeedMultiplier = nextSpeed >= GAME_SPEED_FAST ? GAME_SPEED_FAST : GAME_SPEED_NORMAL;
        }
      }
      mpLog("Guest applied host speed/pause state", {
        paused: isPaused,
        speedMultiplier: gameSpeedMultiplier,
      });
    }
    return;
  }

  if (type === MULTIPLAYER_MESSAGE_TYPE.towerPlaceCommit) {
    handleTowerCommitMessage(peer, payload);
    return;
  }

  if (type === MULTIPLAYER_MESSAGE_TYPE.towerSellCommit) {
    handleTowerSellCommitMessage(peer, payload);
    return;
  }

  if (type === MULTIPLAYER_MESSAGE_TYPE.techChoiceCommit) {
    const ownerId = typeof payload?.ownerId === "string" ? payload.ownerId : peer?.id;
    const grants = payload?.grants;
    if (ownerId && grants && towerSystem?.applyTechGrants) {
      towerSystem.applyTechGrants(grants, { ownerId });
      mpLog("Applied remote tech grants", {
        ownerId,
        grantKeys: Object.keys(grants),
      });
    }
    return;
  }

  if (type === MULTIPLAYER_MESSAGE_TYPE.weaponChoiceCommit) {
    return;
  }

  if (type === MULTIPLAYER_MESSAGE_TYPE.enemySpawn) {
    if (!shouldHostControlSimulation()) {
      enemySystem?.spawnNetworkEnemy?.(payload);
      mpLog("Guest spawned enemy from host snapshot/event", {
        enemyId: payload?.enemyId || null,
        enemyType: payload?.enemyType || null,
      });
    }
    return;
  }

  if (type === MULTIPLAYER_MESSAGE_TYPE.enemyDamage) {
    if (payload?.request === true) {
      if (isMultiplayerHost()) {
        enemySystem?.applyDamageToEnemyId?.(payload.enemyId, payload.damage);
        mpLog("Host applied damage request", {
          enemyId: payload?.enemyId || null,
          damage: roundMultiplayerLogNumber(payload?.damage, 2),
        });
      }
      return;
    }
    if (!shouldHostControlSimulation()) {
      enemySystem?.setEnemyHealthFromNetwork?.(payload.enemyId, payload.health, payload.maxHealth);
      mpLog("Guest applied enemy damage update", {
        enemyId: payload?.enemyId || null,
        health: roundMultiplayerLogNumber(payload?.health, 2),
        maxHealth: roundMultiplayerLogNumber(payload?.maxHealth, 2),
      });
    }
    return;
  }

  if (type === MULTIPLAYER_MESSAGE_TYPE.enemyDeath) {
    if (!shouldHostControlSimulation()) {
      if (Number(payload?.cashReward) > 0) {
        spawnMoneyDrops(payload.cashReward, payload.dropPosition);
        addExperience(XP_PER_KILL);
      }
      enemySystem?.setEnemyHealthFromNetwork?.(payload.enemyId, 0, payload.maxHealth);
      mpLog("Guest applied enemy death event", {
        enemyId: payload?.enemyId || null,
        cashReward: roundMultiplayerLogNumber(payload?.cashReward, 2),
      });
    }
    return;
  }

  if (type === MULTIPLAYER_MESSAGE_TYPE.hostEnded) {
    if (!isMultiplayerHost()) {
      mpWarn("Received host_ended event");
      handleHostEndedSession();
    }
    return;
  }
  mpWarn("Received unknown reliable message type", { type, fromPeerId: peer?.id || null });
}

function handleMultiplayerUnreliableMessage(peer, type, payload) {
  noteUnreliableMultiplayerTraffic("rx", type);
  if (type === MULTIPLAYER_MESSAGE_TYPE.playerTransform) {
    if (peer?.id) {
      applyRemotePlayerTransform(peer.id, payload);
      const weaponFxEvents = Array.isArray(payload?.weaponFxEvents) ? payload.weaponFxEvents : [];
      const maxEvents = Math.max(1, MULTIPLAYER_MAX_WEAPON_FX_EVENTS_PER_PACKET);
      for (const weaponFxEvent of weaponFxEvents.slice(0, maxEvents)) {
        spawnRemoteWeaponEffect(peer.id, weaponFxEvent);
      }
    }
    return;
  }
  if (type === MULTIPLAYER_MESSAGE_TYPE.towerPreview) {
    if (!peer?.id || !towerSystem) {
      return;
    }
    towerSystem.setPeerPreview(peer.id, payload);
    if (payload?.active !== true) {
      mpLog("Received remote tower preview clear", { peerId: peer.id });
    }
    return;
  }
  mpWarn("Received unknown unreliable message type", { type, fromPeerId: peer?.id || null });
}

function broadcastLocalPlayerTransform() {
  if (!multiplayerController || !isMultiplayerWithPeer() || !player) {
    return;
  }
  const playerPosition = player.getPosition?.();
  if (!playerPosition) {
    return;
  }
  const payload = {
    x: playerPosition.x,
    y: playerPosition.y,
    z: playerPosition.z,
    yaw: camera.rotation.y,
  };
  const weaponFxEvents = drainPendingLocalWeaponFxEvents();
  if (Array.isArray(weaponFxEvents) && weaponFxEvents.length > 0) {
    payload.weaponFxEvents = weaponFxEvents;
  }
  multiplayerController.broadcastUnreliable(MULTIPLAYER_MESSAGE_TYPE.playerTransform, payload);
  noteUnreliableMultiplayerTraffic("tx", MULTIPLAYER_MESSAGE_TYPE.playerTransform);
}

function broadcastLocalTowerPreview() {
  if (!multiplayerController || !isMultiplayerWithPeer() || !towerSystem) {
    return;
  }
  multiplayerController.broadcastUnreliable(
    MULTIPLAYER_MESSAGE_TYPE.towerPreview,
    towerSystem.getCurrentPreviewPayload()
  );
  noteUnreliableMultiplayerTraffic("tx", MULTIPLAYER_MESSAGE_TYPE.towerPreview);
}

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
    onEnemyDefeated: (cashReward, _enemyType, dropPosition, enemyId) => {
      if (!shouldHostControlSimulation()) {
        return;
      }
      spawnMoneyDrops(cashReward, dropPosition);
      addExperience(XP_PER_KILL);
      if (isMultiplayerWithPeer() && multiplayerController) {
        mpLog("Host broadcasting enemy death", {
          enemyId: enemyId || null,
          cashReward: roundMultiplayerLogNumber(cashReward, 2),
          dropPosition: summarizePositionForLog(dropPosition),
        });
        multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.enemyDeath, {
          enemyId,
          cashReward,
          dropPosition: dropPosition
            ? { x: dropPosition.x, y: dropPosition.y, z: dropPosition.z }
            : null,
        });
      }
    },
    onEnemySpawn: (enemySnapshot) => {
      if (shouldHostControlSimulation() && isMultiplayerWithPeer() && multiplayerController) {
        mpLog("Host broadcasting enemy spawn", summarizeMultiplayerPayloadForLog(MULTIPLAYER_MESSAGE_TYPE.enemySpawn, enemySnapshot));
        multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.enemySpawn, enemySnapshot);
      }
    },
    onEnemyDamaged: (damageSnapshot) => {
      if (shouldHostControlSimulation() && isMultiplayerWithPeer() && multiplayerController) {
        mpLog("Host broadcasting enemy damage", summarizeMultiplayerPayloadForLog(MULTIPLAYER_MESSAGE_TYPE.enemyDamage, damageSnapshot));
        multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.enemyDamage, damageSnapshot);
      }
    },
    onDamageRequested: (damageRequest) => {
      if (shouldHostControlSimulation()) {
        mpLog("Host handling local damage request", {
          enemyId: damageRequest?.enemyId || null,
          damage: roundMultiplayerLogNumber(damageRequest?.damage, 2),
        });
        enemySystem?.applyDamageToEnemyId?.(damageRequest?.enemyId, damageRequest?.damage);
        return;
      }
      mpLog("Guest forwarding damage request to host", {
        enemyId: damageRequest?.enemyId || null,
        damage: roundMultiplayerLogNumber(damageRequest?.damage, 2),
      });
      sendReliableToHost(MULTIPLAYER_MESSAGE_TYPE.enemyDamage, {
        request: true,
        enemyId: damageRequest?.enemyId,
        damage: damageRequest?.damage,
      });
    },
    enemyHealthMultiplier: getEnemyHealthMultiplierForCurrentPlayerCount(),
    damageEnabled: shouldHostControlSimulation(),
  });
}

function createTowerSystemForCurrentGrid() {
  return createTowerSystem({
    scene,
    camera,
    grid,
    localOwnerId: localMultiplayerPeerId,
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
  applyMultiplayerAuthorityForCurrentSystems();
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
  mpLog("Entered build phase", {
    queuedWaveNumber,
    buildPhaseRemainingSeconds: roundMultiplayerLogNumber(buildPhaseRemainingSeconds, 2),
  });
  rebuildBuildPhasePathPreview();
  syncBuildPhasePathPreviewVisibility();
  if (isMultiplayerHost() && isMultiplayerWithPeer()) {
    broadcastHostStateSync(true);
  }
  if (buildPhaseRemainingSeconds <= 0) {
    startQueuedWaveNow();
  }
}

function startQueuedWaveNow() {
  if (!Number.isInteger(queuedWaveNumber) || queuedWaveNumber < 1) {
    mpWarn("Cannot start queued wave: invalid queuedWaveNumber", { queuedWaveNumber });
    return false;
  }
  const nextWave = queuedWaveNumber;
  queuedWaveNumber = null;
  buildPhaseRemainingSeconds = 0;
  clearBuildPhasePathPreview();
  syncBuildPhasePathPreviewVisibility();
  startWave(nextWave);
  mpLog("Started queued wave", { waveNumber: nextWave });
  if (isMultiplayerHost() && isMultiplayerWithPeer() && multiplayerController) {
    multiplayerController.broadcastReliable(MULTIPLAYER_MESSAGE_TYPE.waveCmd, {
      request: false,
      action: "start_wave",
      waveNumber: nextWave,
    });
    broadcastHostStateSync(true);
  }
  return true;
}

function startWave(wave) {
  if (!enemySystem) {
    mpWarn("startWave ignored: enemy system missing", { wave });
    return;
  }
  setPrimaryDownState(false);
  currentWave = wave;
  waveState = "PLAYING";
  mpLog("Wave started", {
    wave,
    hostControlsSimulation: shouldHostControlSimulation(),
  });
  queuedWaveNumber = null;
  buildPhaseRemainingSeconds = 0;
  clearBuildPhasePathPreview();
  syncBuildPhasePathPreviewVisibility();

  if (!shouldHostControlSimulation()) {
    return;
  }

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

function runGameFrame({ renderFrame = true } = {}) {
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
    const hostControlsSimulation = shouldHostControlSimulation();
    if (hostControlsSimulation) {
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
    } else if (waveState === "BUILD") {
      updateBuildPhasePathPreview(rawDeltaSeconds);
    }

    const runMenuSimulation = isCoopNonPausingTechMenuActive();
    if (isGameplayWaveState(waveState) || runMenuSimulation) {
      applyMobileGameplayInput();
      player.update(simulationDeltaSeconds, enemySystem);
      enemySystem?.update?.(simulationDeltaSeconds, camera);
      towerSystem?.update?.(simulationDeltaSeconds, enemySystem);
      updateMoneyDrops(simulationDeltaSeconds);
    } else if (waveState === "EDITOR") {
      player.update(simulationDeltaSeconds, enemySystem);
    }

    if (isGameplayWaveState(waveState) || runMenuSimulation || waveState === "EDITOR") {
      updateRemoteWeaponEffects(simulationDeltaSeconds);
    }
  }

  if (renderFrame && typeof grid.updateBoundaryWallVisual === "function") {
    grid.updateBoundaryWallVisual(camera.position);
  }

  syncBuildPhasePathPreviewVisibility();
  syncPokiGameplayState();
  processPendingTowerRequestTimeouts();
  processPendingTowerSellRequestTimeouts();

  if (isMultiplayerWithPeer()) {
    multiplayerTransformTimer += rawDeltaSeconds;
    if (multiplayerTransformTimer >= MULTIPLAYER_TRANSFORM_SEND_INTERVAL) {
      multiplayerTransformTimer = 0;
      broadcastLocalPlayerTransform();
    }
    multiplayerPreviewTimer += rawDeltaSeconds;
    if (multiplayerPreviewTimer >= MULTIPLAYER_PREVIEW_SEND_INTERVAL) {
      multiplayerPreviewTimer = 0;
      broadcastLocalTowerPreview();
    }
  } else {
    multiplayerTransformTimer = 0;
    multiplayerPreviewTimer = 0;
    pendingLocalWeaponFxEvents.length = 0;
  }

  if (isMultiplayerHost() && isMultiplayerWithPeer()) {
    multiplayerStateSyncTimer += rawDeltaSeconds;
    if (multiplayerStateSyncTimer >= MULTIPLAYER_STATE_SYNC_INTERVAL) {
      multiplayerStateSyncTimer = 0;
      broadcastHostStateSync(false);
    }
  } else {
    multiplayerStateSyncTimer = 0;
  }

  flushUnreliableMultiplayerStatsLog(false);
  updateSellHoldFromAim(rawDeltaSeconds);

  if (!renderFrame) {
    return;
  }

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
          block: "tower_block",
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
  const sellPrompt = buildSellPromptViewState(showTouchControls);
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
    sellPrompt,
  });
  uiOverlay.draw();

  renderer.clear();
  renderer.render(scene, camera);
  if (uiOverlay.scene && uiOverlay.camera) {
    renderer.clearDepth();
    renderer.render(uiOverlay.scene, uiOverlay.camera);
  }
}

function shouldUseHiddenIntervalLoop() {
  return document.visibilityState === "hidden" && isMultiplayerWithPeer();
}

function cancelMainLoopRaf() {
  if (mainLoopRafId == null) {
    return;
  }
  window.cancelAnimationFrame(mainLoopRafId);
  mainLoopRafId = null;
}

function cancelMainLoopInterval() {
  if (mainLoopIntervalId == null) {
    return;
  }
  window.clearInterval(mainLoopIntervalId);
  mainLoopIntervalId = null;
}

function scheduleMainLoopRaf() {
  if (!mainLoopStarted || mainLoopMode !== MAIN_LOOP_MODE_RAF || mainLoopRafId != null) {
    return;
  }
  mainLoopRafId = window.requestAnimationFrame(() => {
    mainLoopRafId = null;
    if (!mainLoopStarted || mainLoopMode !== MAIN_LOOP_MODE_RAF) {
      return;
    }
    runGameFrame({ renderFrame: true });
    scheduleMainLoopRaf();
  });
}

function startMainLoopInterval() {
  if (!mainLoopStarted || mainLoopMode !== MAIN_LOOP_MODE_INTERVAL || mainLoopIntervalId != null) {
    return;
  }
  mainLoopIntervalId = window.setInterval(() => {
    if (!mainLoopStarted || mainLoopMode !== MAIN_LOOP_MODE_INTERVAL) {
      return;
    }
    runGameFrame({ renderFrame: false });
  }, HIDDEN_COOP_INTERVAL_MS);
}

function refreshMainLoopMode() {
  const nextMode = shouldUseHiddenIntervalLoop()
    ? MAIN_LOOP_MODE_INTERVAL
    : MAIN_LOOP_MODE_RAF;
  if (mainLoopMode === nextMode) {
    if (nextMode === MAIN_LOOP_MODE_RAF) {
      scheduleMainLoopRaf();
    } else {
      startMainLoopInterval();
    }
    return;
  }

  mainLoopMode = nextMode;
  clock.getDelta();
  if (nextMode === MAIN_LOOP_MODE_INTERVAL) {
    cancelMainLoopRaf();
    startMainLoopInterval();
    return;
  }
  cancelMainLoopInterval();
  scheduleMainLoopRaf();
}

function stopMainLoop() {
  mainLoopStarted = false;
  cancelMainLoopRaf();
  cancelMainLoopInterval();
}

function startMainLoop() {
  if (mainLoopStarted) {
    return;
  }
  mainLoopStarted = true;
  mainLoopMode = shouldUseHiddenIntervalLoop()
    ? MAIN_LOOP_MODE_INTERVAL
    : MAIN_LOOP_MODE_RAF;
  clock.getDelta();
  if (mainLoopMode === MAIN_LOOP_MODE_INTERVAL) {
    startMainLoopInterval();
    return;
  }
  scheduleMainLoopRaf();
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
    onWeaponVisualEvent: (event) => {
      if (!isMultiplayerWithPeer()) {
        return;
      }
      queueLocalWeaponFxEvent(event);
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
  bindGameFullscreenInteraction();

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
  refreshBackgroundKeepAlive();
  startMainLoop();
}

window.addEventListener("beforeunload", () => {
  notifyPeersHostEndedSession();
  stopBackgroundKeepAliveOscillators();
  stopMainLoop();
});

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
  renderer.setSize(viewportWidth, viewportHeight, false);
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
    if (viewportSyncSettleTimeoutId != null) {
      window.clearTimeout(viewportSyncSettleTimeoutId);
    }
    viewportSyncSettleTimeoutId = window.setTimeout(() => {
      viewportSyncSettleTimeoutId = null;
      applyViewportMetrics(getViewportMetrics());
    }, 250);
    return;
  }
  viewportSyncFrameId = window.requestAnimationFrame(() => {
    viewportSyncFrameId = null;
    applyViewportMetrics(getViewportMetrics());
  });
  if (viewportSyncSettleTimeoutId != null) {
    window.clearTimeout(viewportSyncSettleTimeoutId);
  }
  viewportSyncSettleTimeoutId = window.setTimeout(() => {
    viewportSyncSettleTimeoutId = null;
    applyViewportMetrics(getViewportMetrics());
  }, 250);
}

window.addEventListener("resize", scheduleViewportSync);
window.addEventListener("orientationchange", scheduleViewportSync);
if (window.visualViewport && typeof window.visualViewport.addEventListener === "function") {
  window.visualViewport.addEventListener("resize", scheduleViewportSync);
}
