import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";

const TOWER_CONFIG = GAME_CONFIG.towers;
const TOWER_TYPES = TOWER_CONFIG.types;
const GUN_TOWER_CONFIG = TOWER_TYPES.gun;
const AOE_TOWER_CONFIG = TOWER_TYPES.aoe;
const SLOW_TOWER_CONFIG = TOWER_TYPES.slow;

const GUN_RANGE = GUN_TOWER_CONFIG.range;
const GUN_FIRE_INTERVAL = GUN_TOWER_CONFIG.fireInterval;
const GUN_PROJECTILE_DAMAGE = GUN_TOWER_CONFIG.projectileDamage;
const GUN_PROJECTILE_SPEED = GUN_TOWER_CONFIG.projectileSpeed;
const GUN_PROJECTILE_LIFETIME = GUN_TOWER_CONFIG.projectileLifetime;
const GUN_PROJECTILE_SIZE = GUN_TOWER_CONFIG.projectileSize;
const GUN_PROJECTILE_HIT_RADIUS = GUN_TOWER_CONFIG.projectileHitRadius;
const GUN_TOWER_HEIGHT = GUN_TOWER_CONFIG.height;
const GUN_TOWER_HALF_SIZE_X = Number.isFinite(Number(GUN_TOWER_CONFIG.halfSizeX))
  ? Number(GUN_TOWER_CONFIG.halfSizeX)
  : 1.9;
const GUN_TOWER_HALF_SIZE_Z = Number.isFinite(Number(GUN_TOWER_CONFIG.halfSizeZ))
  ? Number(GUN_TOWER_CONFIG.halfSizeZ)
  : 0.95;
const AOE_RANGE = AOE_TOWER_CONFIG.range;
const AOE_PULSE_INTERVAL = AOE_TOWER_CONFIG.pulseInterval;
const AOE_PULSE_DAMAGE = AOE_TOWER_CONFIG.pulseDamage;
const AOE_PULSE_DURATION = AOE_TOWER_CONFIG.pulseDuration;
const AOE_SHELL_THICKNESS = AOE_TOWER_CONFIG.shellThickness;
const AOE_TOWER_HEIGHT = AOE_TOWER_CONFIG.height;
const AOE_HOVER_BASE_Y = AOE_TOWER_CONFIG.hoverBaseY;
const AOE_BOB_AMPLITUDE = AOE_TOWER_CONFIG.bobAmplitude;
const AOE_BOB_FREQUENCY = AOE_TOWER_CONFIG.bobFrequency;
const AOE_VISUAL_SCALE = Number.isFinite(Number(AOE_TOWER_CONFIG.visualScale))
  ? Math.max(0.05, Number(AOE_TOWER_CONFIG.visualScale))
  : 1;
const AOE_TOWER_RADIUS = Number.isFinite(Number(AOE_TOWER_CONFIG.radius))
  ? Math.max(0.05, Number(AOE_TOWER_CONFIG.radius) * AOE_VISUAL_SCALE)
  : (1.1 * AOE_VISUAL_SCALE);
const AOE_TOWER_HALF_SIZE = Number.isFinite(Number(AOE_TOWER_CONFIG.halfSize))
  ? Math.max(0.05, Number(AOE_TOWER_CONFIG.halfSize) * AOE_VISUAL_SCALE)
  : (0.9 * AOE_VISUAL_SCALE);
const SLOW_RANGE = SLOW_TOWER_CONFIG.range;
const SLOW_FIRE_INTERVAL = SLOW_TOWER_CONFIG.fireInterval;
const SLOW_MULTIPLIER = SLOW_TOWER_CONFIG.slowMultiplier;
const SLOW_DURATION = SLOW_TOWER_CONFIG.slowDuration;
const SLOW_FIELD_DURATION = SLOW_TOWER_CONFIG.fieldDuration;
const SLOW_VISUAL_SCALE = Number.isFinite(Number(SLOW_TOWER_CONFIG.visualScale))
  ? Math.max(0.05, Number(SLOW_TOWER_CONFIG.visualScale))
  : 1.9;
const SLOW_BODY_RADIUS = Number.isFinite(Number(SLOW_TOWER_CONFIG.bodyRadius))
  ? Number(SLOW_TOWER_CONFIG.bodyRadius)
  : 0.62;
const SLOW_PEDESTAL_DIAMETER_SCALE = 1.75;
const SLOW_PEDESTAL_RADIUS_TOP = Math.max(0.14, SLOW_BODY_RADIUS * 0.7)
  * SLOW_PEDESTAL_DIAMETER_SCALE;
const SLOW_PEDESTAL_RADIUS_BOTTOM = SLOW_PEDESTAL_RADIUS_TOP * 1.4;
const SLOW_TOWER_RADIUS = Math.max(0.05, SLOW_PEDESTAL_RADIUS_BOTTOM * SLOW_VISUAL_SCALE);
const SLOW_TOWER_HALF_SIZE = SLOW_TOWER_RADIUS;
const SLOW_TOWER_HEIGHT = SLOW_TOWER_CONFIG.height;
const PATH_RANGE_HIGHLIGHT_VALID_COLOR = GUN_TOWER_CONFIG.rangeHighlightValidColor;
const PATH_RANGE_HIGHLIGHT_INVALID_COLOR = GUN_TOWER_CONFIG.rangeHighlightInvalidColor;
const BUILD_FX_CONFIG = TOWER_CONFIG.buildFx ?? {};
const TOWER_TYPE_ORDER = ["gun", "aoe", "slow"];
const TOWER_DISPLAY_NAMES = {
  gun: "Gun Tower",
  aoe: "AOE Tower",
  slow: "Slow Tower",
};

function finiteOr(rawValue, fallback) {
  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

const BUILD_FX_ENABLED = BUILD_FX_CONFIG.enabled !== false;
const BUILD_FX_DURATION = Math.max(0, finiteOr(BUILD_FX_CONFIG.durationSeconds, 0.75));
const BUILD_FX_START_SCALE = THREE.MathUtils.clamp(finiteOr(BUILD_FX_CONFIG.startScale, 0.72), 0.05, 1.5);
const BUILD_FX_START_Y_OFFSET = finiteOr(BUILD_FX_CONFIG.startYOffset, -0.45);
const BUILD_FX_START_OPACITY = THREE.MathUtils.clamp(finiteOr(BUILD_FX_CONFIG.startOpacity, 0), 0, 1);
const BUILD_FX_TELEPORT_RADIUS_CELL_SCALE = Math.max(0.05, finiteOr(BUILD_FX_CONFIG.teleportRadiusCellScale, 0.44));
const BUILD_FX_TELEPORT_HEIGHT_CELL_SCALE = Math.max(0.05, finiteOr(BUILD_FX_CONFIG.teleportHeightCellScale, 1.45));
const BUILD_FX_TELEPORT_OPACITY = THREE.MathUtils.clamp(finiteOr(BUILD_FX_CONFIG.teleportOpacity, 0.82), 0, 1);
const BUILD_FX_TELEPORT_COLOR_A = finiteOr(BUILD_FX_CONFIG.teleportColorA, 0x38cfff);
const BUILD_FX_TELEPORT_COLOR_B = finiteOr(BUILD_FX_CONFIG.teleportColorB, 0x1f46ff);
const BUILD_FX_TELEPORT_EDGE_COLOR = finiteOr(BUILD_FX_CONFIG.teleportEdgeColor, 0x92faff);
const BUILD_FX_RING_MAX_SCALE = Math.max(0.1, finiteOr(BUILD_FX_CONFIG.ringMaxScale, 1.85));
const BUILD_FX_RING_THICKNESS = THREE.MathUtils.clamp(finiteOr(BUILD_FX_CONFIG.ringThickness, 0.16), 0.02, 0.95);
const BUILD_FX_SPARK_COUNT = 12;
const BUILD_FX_SPARK_LIFE_MIN = 0.16;
const BUILD_FX_SPARK_LIFE_MAX = 0.42;
const BUILD_FX_SPARK_DRAG = 4.8;
const BUILD_FX_SPARK_GRAVITY = 7.5;
const BUILD_FX_SPARK_VERTICAL_BOOST = 2.4;

const BUILD_FX_TELEPORT_VERTEX_SHADER = `
  varying vec3 vLocalPos;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  void main() {
    vLocalPos = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const BUILD_FX_TELEPORT_FRAGMENT_SHADER = `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uEdgeColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uProgress;

  varying vec3 vLocalPos;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  float hash31(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }

  void main() {
    float heightMask = clamp(vLocalPos.y + 0.5, 0.0, 1.0);
    float radial = length(vLocalPos.xz);
    float shellMask = smoothstep(1.0, 0.55, radial);
    float sweepMask = smoothstep(uProgress - 0.28, uProgress + 0.04, heightMask);
    float fadeOutMask = 1.0 - smoothstep(0.72, 1.0, uProgress);
    float flowBand = 0.5 + (0.5 * sin((heightMask * 20.0) - (uTime * 12.0) + (radial * 12.0)));
    float sparkleNoise = hash31(floor(vWorldPos * 8.0) + vec3(floor(uTime * 10.0)));
    float sparkle = step(0.92, sparkleNoise);
    float fresnel = pow(
      1.0 - max(0.0, dot(normalize(vWorldNormal), normalize(cameraPosition - vWorldPos))),
      1.8
    );

    vec3 baseColor = mix(uColorA, uColorB, heightMask);
    vec3 edgeGlow = uEdgeColor * (fresnel * 0.7 + sparkle * 0.65 + (1.0 - shellMask) * 0.25);
    vec3 finalColor = baseColor * (0.75 + (flowBand * 0.35)) + edgeGlow;
    float alpha = uOpacity * shellMask * sweepMask * fadeOutMask * (0.68 + (flowBand * 0.32));
    if (alpha <= 0.001) {
      discard;
    }
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export function createTowerSystem({
  scene,
  camera,
  grid,
  getCurrentMoney = null,
  spendMoney = null,
  refundMoney = null,
  canBlockCells = null,
  canBlockCell = null,
  getBlockedRevision = null,
  onBlockedCellsChanged = null,
} = {}) {
  const raycaster = new THREE.Raycaster();
  const aimPoint = new THREE.Vector2(0, 0);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -grid.tileTopY);
  const groundHit = new THREE.Vector3();
  const terrainObstacles = Array.isArray(grid.heightObstacles) ? grid.heightObstacles : [];
  const spawnCells = Array.isArray(grid.spawnCells) ? grid.spawnCells : [];
  const endCell = grid.endCell ?? null;
  const gridCellSize = Math.max(0.01, Number(grid.cellSize) || 0);
  const gridCubeHalfSize = gridCellSize * 0.5;

  const gunProjectileGeometry = new THREE.BoxGeometry(
    GUN_PROJECTILE_SIZE,
    GUN_PROJECTILE_SIZE,
    GUN_PROJECTILE_SIZE
  );
  const gunProjectileMaterial = new THREE.MeshStandardMaterial({
    color: GUN_TOWER_CONFIG.projectileColor,
    emissive: GUN_TOWER_CONFIG.projectileEmissive,
    emissiveIntensity: GUN_TOWER_CONFIG.projectileEmissiveIntensity,
    roughness: GUN_TOWER_CONFIG.projectileRoughness,
    metalness: GUN_TOWER_CONFIG.projectileMetalness,
  });

  const muzzleFlashGeometry = new THREE.SphereGeometry(
    GUN_TOWER_CONFIG.muzzleFlashSize,
    12,
    10
  );
  const muzzleFlashMaterial = new THREE.MeshBasicMaterial({
    color: GUN_TOWER_CONFIG.muzzleFlashColor,
    transparent: true,
    opacity: GUN_TOWER_CONFIG.muzzleFlashOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  muzzleFlashMaterial.toneMapped = false;

  const aoePulseGeometry = new THREE.SphereGeometry(
    1,
    AOE_TOWER_CONFIG.pulseSegments,
    AOE_TOWER_CONFIG.pulseSegments
  );
  const aoePulseMaterial = new THREE.MeshBasicMaterial({
    color: AOE_TOWER_CONFIG.pulseColor,
    transparent: true,
    opacity: AOE_TOWER_CONFIG.pulseOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    wireframe: true,
  });
  aoePulseMaterial.toneMapped = false;

  const aoeSpikeDirections = (() => {
    const dirs = [];
    const sourceGeometry = new THREE.IcosahedronGeometry(1, 0);
    const positions = sourceGeometry.getAttribute("position");
    const seen = new Set();
    for (let i = 0; i < positions.count; i += 1) {
      const dir = new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      ).normalize();
      const key = `${dir.x.toFixed(4)},${dir.y.toFixed(4)},${dir.z.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        dirs.push(dir);
      }
    }
    sourceGeometry.dispose();
    return dirs;
  })();

  const slowFieldGeometry = new THREE.BoxGeometry(grid.cellSize, grid.cellSize, grid.cellSize);
  const slowFieldMaterial = new THREE.MeshBasicMaterial({
    color: SLOW_TOWER_CONFIG.fieldColor,
    transparent: true,
    opacity: SLOW_TOWER_CONFIG.fieldOpacity,
    depthWrite: false,
  });
  slowFieldMaterial.toneMapped = false;

  const buildFxTeleportColumnGeometry = new THREE.CylinderGeometry(1, 1, 1, 22, 1, true);
  const buildFxRingInnerRadius = Math.max(0.01, 1 - BUILD_FX_RING_THICKNESS);
  const buildFxRingGeometry = new THREE.RingGeometry(buildFxRingInnerRadius, 1, 42);
  const buildFxSparkGeometry = new THREE.BoxGeometry(1, 1, 1);
  const buildFxSparkBaseMaterial = new THREE.MeshBasicMaterial({
    color: BUILD_FX_TELEPORT_EDGE_COLOR,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  buildFxSparkBaseMaterial.toneMapped = false;

  const tempVecA = new THREE.Vector3();
  const tempVecB = new THREE.Vector3();
  const tempVecC = new THREE.Vector3();
  const tempVecD = new THREE.Vector3();
  const tempVecE = new THREE.Vector3();
  const tempVecF = new THREE.Vector3();
  const tempVecG = new THREE.Vector3();
  const tempVecH = new THREE.Vector3();
  const tempColorA = new THREE.Color();
  const tempColorB = new THREE.Color();
  const tempQuatA = new THREE.Quaternion();
  const upVector = new THREE.Vector3(0, 1, 0);
  const gunProjectiles = [];
  const gunMuzzleFlashes = [];
  const aoePulseEffects = [];
  const slowFieldEffects = [];
  const activeBuildEffects = [];
  const gunFootprintCellsX = Math.max(1, Math.floor(Number(GUN_TOWER_CONFIG.footprintCellsX) || 1));
  const gunFootprintCellsZ = Math.max(1, Math.floor(Number(GUN_TOWER_CONFIG.footprintCellsZ) || 2));
  const gunFootprintInsetWorld = THREE.MathUtils.clamp(Number(GUN_TOWER_CONFIG.footprintInset) || 0, 0, 0.45) * gridCellSize;
  const defaultGunHalfSizeX = Math.max(0.1, (gridCellSize * gunFootprintCellsX * 0.5) - gunFootprintInsetWorld);
  const defaultGunHalfSizeZ = Math.max(0.1, (gridCellSize * gunFootprintCellsZ * 0.5) - gunFootprintInsetWorld);

  const towerSpecs = {
    gun: {
      type: "gun",
      range: GUN_RANGE,
      radius: Math.max(
        Number.isFinite(Number(GUN_TOWER_CONFIG.halfSizeX)) ? Number(GUN_TOWER_CONFIG.halfSizeX) : defaultGunHalfSizeX,
        Number.isFinite(Number(GUN_TOWER_CONFIG.halfSizeZ)) ? Number(GUN_TOWER_CONFIG.halfSizeZ) : defaultGunHalfSizeZ
      ),
      halfSize: Math.max(
        Number.isFinite(Number(GUN_TOWER_CONFIG.halfSizeX)) ? Number(GUN_TOWER_CONFIG.halfSizeX) : defaultGunHalfSizeX,
        Number.isFinite(Number(GUN_TOWER_CONFIG.halfSizeZ)) ? Number(GUN_TOWER_CONFIG.halfSizeZ) : defaultGunHalfSizeZ
      ),
      halfSizeX: Number.isFinite(Number(GUN_TOWER_CONFIG.halfSizeX))
        ? Number(GUN_TOWER_CONFIG.halfSizeX)
        : defaultGunHalfSizeX,
      halfSizeZ: Number.isFinite(Number(GUN_TOWER_CONFIG.halfSizeZ))
        ? Number(GUN_TOWER_CONFIG.halfSizeZ)
        : defaultGunHalfSizeZ,
      height: GUN_TOWER_HEIGHT,
      footprintCellsX: gunFootprintCellsX,
      footprintCellsZ: gunFootprintCellsZ,
      usesLineOfSight: true,
    },
    aoe: {
      type: "aoe",
      range: AOE_RANGE,
      radius: AOE_TOWER_RADIUS,
      halfSize: AOE_TOWER_HALF_SIZE,
      height: AOE_TOWER_HEIGHT,
      usesLineOfSight: false,
    },
    slow: {
      type: "slow",
      range: SLOW_RANGE,
      radius: SLOW_TOWER_RADIUS,
      halfSize: SLOW_TOWER_HALF_SIZE,
      height: SLOW_TOWER_HEIGHT,
      usesLineOfSight: true,
    },
  };

  let selectedTowerType = null;
  let buildMode = false;
  const towers = [];
  let previewValid = false;
  let previewPlacement = null;
  let previewPathBlockCache = null;
  let suppressPreviewFootprintKey = null;

  const reservedCellKeys = new Set(
    spawnCells.map((cell) => `${cell.x},${cell.z}`)
  );
  if (endCell && Number.isInteger(endCell.x) && Number.isInteger(endCell.z)) {
    reservedCellKeys.add(`${endCell.x},${endCell.z}`);
  }

  let towerDamageMultiplier = 1;
  let towerFireRateMultiplier = 1;

  function makeCellKey(cellX, cellZ) {
    return `${cellX},${cellZ}`;
  }

  function normalizeTowerType(type) {
    if (typeof type !== "string") {
      return null;
    }
    const lowered = type.trim().toLowerCase();
    if (lowered === "emp") {
      return "aoe";
    }
    return lowered;
  }

  function getTowerSpec(type) {
    const normalizedType = normalizeTowerType(type);
    if (!normalizedType) {
      return null;
    }
    return towerSpecs[normalizedType] || null;
  }

  const configuredStartingUnlocks = Array.isArray(GAME_CONFIG.economy?.startingUnlockedTowers)
    ? GAME_CONFIG.economy.startingUnlockedTowers
    : ["gun"];
  const unlockedTowerTypes = new Set();
  for (const rawType of configuredStartingUnlocks) {
    const normalizedType = normalizeTowerType(rawType);
    if (normalizedType && getTowerSpec(normalizedType)) {
      unlockedTowerTypes.add(normalizedType);
    }
  }
  if (!unlockedTowerTypes.has("gun")) {
    unlockedTowerTypes.add("gun");
  }

  function getTowerCost(type) {
    const normalizedType = normalizeTowerType(type);
    if (!normalizedType) {
      return 0;
    }
    const configuredCost = Number(TOWER_TYPES[normalizedType]?.cost);
    if (!Number.isFinite(configuredCost)) {
      return 0;
    }
    return Math.max(0, Math.floor(configuredCost));
  }

  function getPlayerMoney() {
    if (typeof getCurrentMoney !== "function") {
      return Number.POSITIVE_INFINITY;
    }
    const money = Number(getCurrentMoney());
    if (!Number.isFinite(money)) {
      return 0;
    }
    return Math.max(0, Math.floor(money));
  }

  function canAffordTower(type) {
    const cost = getTowerCost(type);
    if (cost <= 0) {
      return true;
    }
    return getPlayerMoney() >= cost;
  }

  function spendTowerCost(type) {
    const cost = getTowerCost(type);
    if (cost <= 0) {
      return true;
    }
    if (typeof spendMoney !== "function") {
      return true;
    }
    return !!spendMoney(cost, type);
  }

  function refundTowerCost(type) {
    const cost = getTowerCost(type);
    if (cost <= 0) {
      return true;
    }
    if (typeof refundMoney === "function") {
      refundMoney(cost, type);
      return true;
    }
    if (typeof spendMoney === "function") {
      spendMoney(-cost, type);
    }
    return true;
  }

  function isReservedCell(cellX, cellZ) {
    return reservedCellKeys.has(makeCellKey(cellX, cellZ));
  }

  function findTowerAtCell(cellX, cellZ) {
    for (const tower of towers) {
      if (Array.isArray(tower.occupiedCells)) {
        for (const cell of tower.occupiedCells) {
          if (cell?.x === cellX && cell?.z === cellZ) {
            return tower;
          }
        }
      } else if (tower.cellX === cellX && tower.cellZ === cellZ) {
        return tower;
      }
    }
    return null;
  }

  function getBlockedCells() {
    const unique = new Map();
    for (const tower of towers) {
      const cells = Array.isArray(tower.occupiedCells)
        ? tower.occupiedCells
        : [{ x: tower.cellX, z: tower.cellZ }];
      for (const cell of cells) {
        if (!Number.isInteger(cell?.x) || !Number.isInteger(cell?.z)) {
          continue;
        }
        unique.set(makeCellKey(cell.x, cell.z), { x: cell.x, z: cell.z });
      }
    }
    return Array.from(unique.values());
  }

  function clearPreviewPathBlockCache() {
    previewPathBlockCache = null;
  }

  function setPreviewSuppressedFootprint(footprintKey) {
    if (typeof footprintKey !== "string" || !footprintKey) {
      suppressPreviewFootprintKey = null;
      return;
    }
    suppressPreviewFootprintKey = footprintKey;
  }

  function getCurrentBlockedRevision() {
    if (typeof getBlockedRevision !== "function") {
      return 0;
    }
    const revision = Number(getBlockedRevision());
    if (!Number.isFinite(revision)) {
      return 0;
    }
    return Math.floor(revision);
  }

  function getFootprintKey(cells) {
    if (!Array.isArray(cells) || cells.length === 0) {
      return "";
    }
    const keys = [];
    for (const cell of cells) {
      if (!Number.isInteger(cell?.x) || !Number.isInteger(cell?.z)) {
        continue;
      }
      keys.push(makeCellKey(cell.x, cell.z));
    }
    keys.sort();
    return keys.join("|");
  }

  function canBlockCellsCached(cells) {
    if (!Array.isArray(cells) || cells.length === 0) {
      return false;
    }
    if (typeof canBlockCells !== "function" && typeof canBlockCell !== "function") {
      return true;
    }
    const footprintKey = getFootprintKey(cells);
    if (!footprintKey) {
      return false;
    }
    const blockedRevision = getCurrentBlockedRevision();
    if (
      previewPathBlockCache
      && previewPathBlockCache.footprintKey === footprintKey
      && previewPathBlockCache.blockedRevision === blockedRevision
    ) {
      return previewPathBlockCache.valid;
    }

    let valid = false;
    if (typeof canBlockCells === "function") {
      valid = !!canBlockCells(cells);
    } else {
      valid = cells.every((cell) => !!canBlockCell(cell.x, cell.z));
    }
    previewPathBlockCache = {
      footprintKey,
      blockedRevision,
      valid,
    };
    return valid;
  }

  function notifyBlockedCellsChanged() {
    clearPreviewPathBlockCache();
    if (typeof onBlockedCellsChanged !== "function") {
      return true;
    }
    return onBlockedCellsChanged(getBlockedCells()) !== false;
  }

  function isTowerTypeUnlocked(type) {
    const normalizedType = normalizeTowerType(type);
    if (!normalizedType) {
      return false;
    }
    return unlockedTowerTypes.has(normalizedType);
  }

  function unlockTowerType(type) {
    const normalizedType = normalizeTowerType(type);
    if (!normalizedType || !getTowerSpec(normalizedType)) {
      return false;
    }
    const wasUnlocked = unlockedTowerTypes.has(normalizedType);
    unlockedTowerTypes.add(normalizedType);
    return !wasUnlocked;
  }

  function getUnlockedTowerTypes() {
    return TOWER_TYPE_ORDER.filter((type) => unlockedTowerTypes.has(type));
  }

  function upgradeTowerDamage(addAmount = TOWER_CONFIG.damageUpgradeAdd) {
    const amount = Number(addAmount);
    if (!Number.isFinite(amount)) {
      return;
    }
    towerDamageMultiplier += amount;
  }

  function upgradeTowerFireRate(multiplier = TOWER_CONFIG.fireRateUpgradeMultiplier) {
    const rateMultiplier = Number(multiplier);
    if (!Number.isFinite(rateMultiplier) || rateMultiplier <= 0) {
      return;
    }
    towerFireRateMultiplier *= rateMultiplier;
  }

  function applyShadowSettings(object) {
    object.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  function createFootprintOutlineMesh({
    halfSizeX,
    halfSizeZ = halfSizeX,
    height,
    inset = 0.08,
    color,
    opacity = 0.42,
  }) {
    const footprintHalfSizeX = Math.max(0.01, Number(halfSizeX) || 0);
    const footprintHalfSizeZ = Math.max(0.01, Number(halfSizeZ) || 0);
    const footprintHeight = Math.max(0.01, Number(height) || 0);
    const insetAmount = Math.max(0, Number(inset) || 0);
    const outlineHalfSizeX = Math.max(0.01, footprintHalfSizeX - insetAmount);
    const outlineHalfSizeZ = Math.max(0.01, footprintHalfSizeZ - insetAmount);
    const outlineHeight = Math.max(0.01, footprintHeight - (insetAmount * 2));
    const outlineColor = Number.isFinite(Number(color))
      ? Number(color)
      : 0xffffff;
    const outlineOpacity = THREE.MathUtils.clamp(Number(opacity) || 0, 0, 1);

    const outlineMaterial = new THREE.LineBasicMaterial({
      color: outlineColor,
      transparent: true,
      opacity: outlineOpacity,
      depthWrite: false,
    });
    outlineMaterial.toneMapped = false;

    const outlineMesh = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(outlineHalfSizeX * 2, outlineHeight, outlineHalfSizeZ * 2)
      ),
      outlineMaterial
    );
    outlineMesh.position.y = footprintHeight * 0.5;
    outlineMesh.userData.footprintOutlineMaterial = outlineMaterial;
    return outlineMesh;
  }

  function createGunTowerMesh({
    baseColor,
    turretColor,
    glowColor,
    opacity = 1,
    transparent = false,
    footprintOutlineColor = glowColor,
  }) {
    const root = new THREE.Group();
    const footprintCellsX = Math.max(1, Math.floor(Number(GUN_TOWER_CONFIG.footprintCellsX) || 1));
    const footprintCellsZ = Math.max(1, Math.floor(Number(GUN_TOWER_CONFIG.footprintCellsZ) || 2));
    const footprintInset = THREE.MathUtils.clamp(Number(GUN_TOWER_CONFIG.footprintInset) || 0, 0, 0.45) * gridCellSize;
    const baseHalfSizeX = Math.max(0.1, (gridCellSize * footprintCellsX * 0.5) - footprintInset);
    const baseHalfSizeZ = Math.max(0.1, (gridCellSize * footprintCellsZ * 0.5) - footprintInset);

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: GUN_TOWER_CONFIG.baseRoughness,
      metalness: GUN_TOWER_CONFIG.baseMetalness,
      opacity,
      transparent,
      emissive: GUN_TOWER_CONFIG.baseEmissive,
      emissiveIntensity: GUN_TOWER_CONFIG.baseEmissiveIntensity,
    });
    const turretMaterial = new THREE.MeshStandardMaterial({
      color: turretColor,
      roughness: GUN_TOWER_CONFIG.turretRoughness,
      metalness: GUN_TOWER_CONFIG.turretMetalness,
      opacity,
      transparent,
      emissive: GUN_TOWER_CONFIG.turretEmissive,
      emissiveIntensity: GUN_TOWER_CONFIG.turretEmissiveIntensity,
    });

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(
        baseHalfSizeX * 2,
        GUN_TOWER_CONFIG.baseHeight,
        baseHalfSizeZ * 2
      ),
      baseMaterial
    );
    base.position.y = GUN_TOWER_CONFIG.baseHeight * 0.5;
    root.add(base);

    const turretYawNode = new THREE.Object3D();
    turretYawNode.position.y = GUN_TOWER_CONFIG.baseHeight + (GUN_TOWER_CONFIG.turretHeight * 0.45);
    root.add(turretYawNode);

    const turret = new THREE.Mesh(
      new THREE.BoxGeometry(
        GUN_TOWER_CONFIG.turretWidth,
        GUN_TOWER_CONFIG.turretHeight,
        GUN_TOWER_CONFIG.turretWidth
      ),
      turretMaterial
    );
    turretYawNode.add(turret);

    const barrel = new THREE.Mesh(
      new THREE.BoxGeometry(
        GUN_TOWER_CONFIG.barrelWidth,
        GUN_TOWER_CONFIG.barrelHeight,
        GUN_TOWER_CONFIG.barrelLength
      ),
      turretMaterial
    );
    barrel.position.set(0, GUN_TOWER_CONFIG.muzzleOffsetY, GUN_TOWER_CONFIG.barrelLength * 0.5);
    turretYawNode.add(barrel);

    const muzzleNode = new THREE.Object3D();
    muzzleNode.position.set(
      0,
      GUN_TOWER_CONFIG.muzzleOffsetY,
      GUN_TOWER_CONFIG.muzzleOffsetForward
    );
    turretYawNode.add(muzzleNode);

    const footprintOutline = createFootprintOutlineMesh({
      halfSizeX: baseHalfSizeX,
      halfSizeZ: baseHalfSizeZ,
      height: gridCellSize,
      inset: Math.min(baseHalfSizeX, baseHalfSizeZ) * 0.02,
      color: footprintOutlineColor,
      opacity: 0.4,
    });
    root.add(footprintOutline);

    root.userData.materials = [baseMaterial, turretMaterial];
    root.userData.gunBaseMaterial = baseMaterial;
    root.userData.gunTurretMaterial = turretMaterial;
    root.userData.footprintOutlineMaterial = footprintOutline.userData.footprintOutlineMaterial;
    root.userData.gunTurretYawNode = turretYawNode;
    root.userData.gunMuzzleNode = muzzleNode;
    root.userData.gunGlowColor = new THREE.Color(glowColor);

    applyShadowSettings(root);
    return root;
  }

  function createAoeTowerMesh({
    coreColor,
    emissiveColor,
    auraColor = emissiveColor,
    opacity = 1,
    transparent = false,
    footprintOutlineColor = emissiveColor,
    footprintOutlineInset = AOE_TOWER_CONFIG.footprintOutlineInset,
    footprintOutlineOpacity = AOE_TOWER_CONFIG.footprintOutlineOpacity,
  }) {
    const root = new THREE.Group();
    const hoverNode = new THREE.Object3D();
    hoverNode.position.y = AOE_HOVER_BASE_Y * AOE_VISUAL_SCALE;
    hoverNode.scale.setScalar(AOE_VISUAL_SCALE);
    root.add(hoverNode);

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: coreColor,
      emissive: emissiveColor,
      emissiveIntensity: 1.0,
      roughness: 0.34,
      metalness: 0.18,
      transparent,
      opacity,
    });
    const coreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(AOE_TOWER_CONFIG.coreRadius, 20, 16),
      coreMaterial
    );
    hoverNode.add(coreMesh);

    const spikeHeight = AOE_TOWER_CONFIG.coreRadius * 0.72;
    const spikeRadius = AOE_TOWER_CONFIG.coreRadius * 0.18;
    const spikeGeometry = new THREE.ConeGeometry(spikeRadius, spikeHeight, 8);
    const spikeMaterial = new THREE.MeshStandardMaterial({
      color: coreColor,
      emissive: emissiveColor,
      emissiveIntensity: 0.9,
      roughness: 0.36,
      metalness: 0.22,
      transparent,
      opacity,
    });
    for (const dir of aoeSpikeDirections) {
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
      spike.position.copy(dir).multiplyScalar(AOE_TOWER_CONFIG.coreRadius + (spikeHeight * 0.15));
      spike.quaternion.setFromUnitVectors(upVector, dir);
      hoverNode.add(spike);
    }

    const auraMaterial = new THREE.MeshBasicMaterial({
      color: auraColor,
      transparent: true,
      opacity: Math.max(0, Math.min(1, AOE_TOWER_CONFIG.auraOpacity * opacity)),
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    auraMaterial.toneMapped = false;
    const auraMesh = new THREE.Mesh(
      new THREE.SphereGeometry(AOE_TOWER_CONFIG.auraRadius, 20, 16),
      auraMaterial
    );
    hoverNode.add(auraMesh);

    const glowLight = new THREE.PointLight(
      emissiveColor,
      0.35,
      AOE_TOWER_CONFIG.lightDistance * AOE_VISUAL_SCALE
    );
    hoverNode.add(glowLight);

    const footprintOutline = createFootprintOutlineMesh({
      halfSizeX: gridCubeHalfSize,
      halfSizeZ: gridCubeHalfSize,
      height: gridCellSize,
      inset: footprintOutlineInset,
      color: footprintOutlineColor,
      opacity: footprintOutlineOpacity,
    });
    root.add(footprintOutline);

    root.userData.materials = [coreMaterial, spikeMaterial, auraMaterial];
    root.userData.aoeCoreMaterial = coreMaterial;
    root.userData.aoeSpikeMaterial = spikeMaterial;
    root.userData.aoeAuraMaterial = auraMaterial;
    root.userData.aoeLight = glowLight;
    root.userData.footprintOutlineMaterial = footprintOutline.userData.footprintOutlineMaterial;
    root.userData.hoverNode = hoverNode;

    applyShadowSettings(root);
    auraMesh.castShadow = false;
    auraMesh.receiveShadow = false;
    return root;
  }

  function createSlowTowerMesh({
    bodyColor = SLOW_TOWER_CONFIG.bodyColor,
    emissiveColor = SLOW_TOWER_CONFIG.bodyEmissive,
    opacity = 1,
    transparent = false,
    footprintOutlineColor = emissiveColor,
    footprintOutlineInset = SLOW_TOWER_CONFIG.footprintOutlineInset,
    footprintOutlineOpacity = SLOW_TOWER_CONFIG.footprintOutlineOpacity,
  }) {
    const root = new THREE.Group();
    const hoverNode = new THREE.Object3D();
    hoverNode.position.y = 0;
    hoverNode.scale.setScalar(SLOW_VISUAL_SCALE);
    root.add(hoverNode);

    const pedestalRadiusTop = SLOW_PEDESTAL_RADIUS_TOP;
    const pedestalRadiusBottom = SLOW_PEDESTAL_RADIUS_BOTTOM;
    const pedestalHeight = Math.max(0.16, SLOW_TOWER_CONFIG.bodyHeight * 0.36);
    const crystalRadius = Math.max(0.2, SLOW_BODY_RADIUS * 0.86);
    const crystalHeight = Math.max(0.5, SLOW_TOWER_CONFIG.bodyHeight * 1.35);
    const crystalCenterY = (pedestalHeight * 0.5) + (crystalHeight * 0.52);
    const ringRadius = Math.max(0.16, crystalRadius * 1.18);
    const ringTube = Math.max(0.02, crystalRadius * 0.11);
    const ringOffsetY = crystalHeight * 0.22;

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: bodyColor,
      emissive: emissiveColor,
      emissiveIntensity: SLOW_TOWER_CONFIG.emissiveIntensity,
      roughness: 0.45,
      metalness: 0.2,
      transparent,
      opacity,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: SLOW_TOWER_CONFIG.bandColor,
      emissive: emissiveColor,
      emissiveIntensity: SLOW_TOWER_CONFIG.emissiveIntensity * 0.72,
      roughness: 0.34,
      metalness: 0.26,
      transparent,
      opacity,
    });

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(
        pedestalRadiusTop,
        pedestalRadiusBottom,
        pedestalHeight,
        14
      ),
      accentMaterial
    );
    pedestal.position.y = pedestalHeight * 0.5;
    hoverNode.add(pedestal);

    const crystalMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(crystalRadius, 0),
      bodyMaterial
    );
    const crystalBaseDiameter = Math.max(0.01, crystalRadius * 2);
    crystalMesh.scale.y = crystalHeight / crystalBaseDiameter;
    crystalMesh.userData.baseScaleY = crystalMesh.scale.y;
    crystalMesh.position.y = crystalCenterY;
    hoverNode.add(crystalMesh);

    const crystalCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(crystalRadius * 0.46, 0),
      accentMaterial
    );
    crystalCore.scale.y = 1.2;
    crystalCore.position.y = crystalCenterY;
    hoverNode.add(crystalCore);

    const bandMaterial = new THREE.MeshBasicMaterial({
      color: SLOW_TOWER_CONFIG.bandColor,
      transparent: true,
      opacity: Math.max(0, Math.min(1, SLOW_TOWER_CONFIG.bandOpacity * opacity)),
      depthWrite: false,
    });
    bandMaterial.toneMapped = false;
    const upperRing = new THREE.Mesh(
      new THREE.TorusGeometry(
        ringRadius,
        ringTube,
        12,
        32
      ),
      bandMaterial
    );
    upperRing.position.y = crystalCenterY + ringOffsetY;
    upperRing.rotation.x = THREE.MathUtils.degToRad(26);
    upperRing.rotation.z = THREE.MathUtils.degToRad(14);
    hoverNode.add(upperRing);

    const lowerRing = new THREE.Mesh(
      new THREE.TorusGeometry(
        ringRadius * 0.92,
        ringTube * 0.95,
        12,
        32
      ),
      bandMaterial
    );
    lowerRing.position.y = crystalCenterY - (ringOffsetY * 0.84);
    lowerRing.rotation.x = THREE.MathUtils.degToRad(-24);
    lowerRing.rotation.z = THREE.MathUtils.degToRad(-18);
    hoverNode.add(lowerRing);

    const glowLight = new THREE.PointLight(
      emissiveColor,
      0.34,
      SLOW_TOWER_CONFIG.lightDistance * SLOW_VISUAL_SCALE
    );
    glowLight.position.y = crystalCenterY;
    hoverNode.add(glowLight);

    const footprintOutline = createFootprintOutlineMesh({
      halfSizeX: gridCubeHalfSize,
      halfSizeZ: gridCubeHalfSize,
      height: gridCellSize,
      inset: footprintOutlineInset,
      color: footprintOutlineColor,
      opacity: footprintOutlineOpacity,
    });
    root.add(footprintOutline);

    root.userData.materials = [bodyMaterial, accentMaterial, bandMaterial];
    root.userData.slowBodyMaterial = bodyMaterial;
    root.userData.slowBandMaterial = bandMaterial;
    root.userData.slowAccentMaterial = accentMaterial;
    root.userData.slowCrystalMesh = crystalMesh;
    root.userData.slowRingUpperMesh = upperRing;
    root.userData.slowRingLowerMesh = lowerRing;
    root.userData.slowLight = glowLight;
    root.userData.footprintOutlineMaterial = footprintOutline.userData.footprintOutlineMaterial;
    root.userData.hoverNode = hoverNode;

    applyShadowSettings(root);
    crystalCore.castShadow = false;
    crystalCore.receiveShadow = false;
    upperRing.castShadow = false;
    upperRing.receiveShadow = false;
    lowerRing.castShadow = false;
    lowerRing.receiveShadow = false;
    return root;
  }

  function createTowerPreviewMesh(type) {
    if (type === "slow") {
      return createSlowTowerMesh({
        bodyColor: SLOW_TOWER_CONFIG.previewColor,
        emissiveColor: SLOW_TOWER_CONFIG.previewGlow,
        opacity: SLOW_TOWER_CONFIG.previewOpacity,
        transparent: true,
        footprintOutlineColor: SLOW_TOWER_CONFIG.previewGlow,
        footprintOutlineInset: SLOW_TOWER_CONFIG.footprintOutlineInset,
        footprintOutlineOpacity: SLOW_TOWER_CONFIG.footprintOutlineOpacity,
      });
    }

    if (type === "aoe") {
      return createAoeTowerMesh({
        coreColor: AOE_TOWER_CONFIG.previewColor,
        emissiveColor: AOE_TOWER_CONFIG.previewGlow,
        auraColor: AOE_TOWER_CONFIG.previewGlow,
        opacity: AOE_TOWER_CONFIG.previewOpacity,
        transparent: true,
        footprintOutlineColor: AOE_TOWER_CONFIG.previewGlow,
        footprintOutlineInset: AOE_TOWER_CONFIG.footprintOutlineInset,
        footprintOutlineOpacity: AOE_TOWER_CONFIG.footprintOutlineOpacity,
      });
    }

    return createGunTowerMesh({
      baseColor: GUN_TOWER_CONFIG.previewBaseColor,
      turretColor: GUN_TOWER_CONFIG.previewTurretColor,
      glowColor: GUN_TOWER_CONFIG.previewGlow,
      opacity: GUN_TOWER_CONFIG.previewOpacity,
      transparent: true,
      footprintOutlineColor: GUN_TOWER_CONFIG.previewGlow,
    });
  }

  function createTowerPlacedMesh(type) {
    if (type === "slow") {
      return createSlowTowerMesh({
        bodyColor: SLOW_TOWER_CONFIG.placedColor,
        emissiveColor: SLOW_TOWER_CONFIG.placedGlow,
        opacity: 1,
        transparent: false,
        footprintOutlineColor: SLOW_TOWER_CONFIG.placedGlow,
        footprintOutlineInset: SLOW_TOWER_CONFIG.footprintOutlineInset,
        footprintOutlineOpacity: SLOW_TOWER_CONFIG.footprintOutlineOpacity,
      });
    }

    if (type === "aoe") {
      return createAoeTowerMesh({
        coreColor: AOE_TOWER_CONFIG.placedColor,
        emissiveColor: AOE_TOWER_CONFIG.placedGlow,
        auraColor: AOE_TOWER_CONFIG.placedGlow,
        opacity: 1,
        transparent: false,
        footprintOutlineColor: AOE_TOWER_CONFIG.placedGlow,
        footprintOutlineInset: AOE_TOWER_CONFIG.footprintOutlineInset,
        footprintOutlineOpacity: AOE_TOWER_CONFIG.footprintOutlineOpacity,
      });
    }

    return createGunTowerMesh({
      baseColor: GUN_TOWER_CONFIG.placedBaseColor,
      turretColor: GUN_TOWER_CONFIG.placedTurretColor,
      glowColor: GUN_TOWER_CONFIG.placedGlow,
      opacity: 1,
      transparent: false,
      footprintOutlineColor: GUN_TOWER_CONFIG.placedGlow,
    });
  }

  function createPathRangeHighlights() {
    const pathTiles = Array.isArray(grid.tiles)
      ? grid.tiles.filter((tile) => tile?.userData?.isPath)
      : [];

    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: PATH_RANGE_HIGHLIGHT_VALID_COLOR,
      transparent: true,
      opacity: GUN_TOWER_CONFIG.rangeHighlightOpacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    highlightMaterial.toneMapped = false;

    const entries = [];
    for (const tile of pathTiles) {
      const marker = new THREE.Mesh(tile.geometry, highlightMaterial);
      marker.position.copy(tile.position);
      marker.quaternion.copy(tile.quaternion);
      marker.scale.copy(tile.scale);
      marker.renderOrder = GUN_TOWER_CONFIG.rangeHighlightRenderOrder;
      marker.visible = false;
      scene.add(marker);

      const centerY = typeof tile?.userData?.pathSurfaceY === "number"
        ? tile.userData.pathSurfaceY
        : tile.position.y;
      entries.push({
        mesh: marker,
        center: new THREE.Vector3(tile.position.x, centerY, tile.position.z),
      });
    }

    return {
      entries,
      material: highlightMaterial,
    };
  }

  function setPathRangeHighlightValidityVisual(isValid) {
    const material = pathRangeHighlights.material;
    if (!material) {
      return;
    }

    material.color.setHex(
      isValid
        ? PATH_RANGE_HIGHLIGHT_VALID_COLOR
        : PATH_RANGE_HIGHLIGHT_INVALID_COLOR
    );
  }

  function hidePathRangeHighlights() {
    for (const entry of pathRangeHighlights.entries) {
      entry.mesh.visible = false;
    }
  }

  function updatePathRangeHighlights(origin) {
    const towerSpec = getTowerSpec(selectedTowerType);
    if (!towerSpec) {
      hidePathRangeHighlights();
      return;
    }

    if (!towerSpec.usesLineOfSight) {
      const rangeSq = towerSpec.range * towerSpec.range;
      for (const entry of pathRangeHighlights.entries) {
        entry.mesh.visible = origin.distanceToSquared(entry.center) <= rangeSq;
      }
      return;
    }

    const previewTowerProbe = {
      mesh: preview,
      range: towerSpec.range,
      halfSize: towerSpec.halfSize,
      halfSizeX: towerSpec.halfSizeX,
      halfSizeZ: towerSpec.halfSizeZ,
      height: towerSpec.height,
      baseY: origin.y,
      towerType: selectedTowerType,
    };

    for (const entry of pathRangeHighlights.entries) {
      entry.mesh.visible = canTowerHitPoint(previewTowerProbe, entry.center);
    }
  }

  function setPreviewValidityVisual(isValid) {
    if (selectedTowerType === "slow") {
      const bodyMaterial = preview.userData.slowBodyMaterial;
      const bandMaterial = preview.userData.slowBandMaterial;
      const accentMaterial = preview.userData.slowAccentMaterial;
      const glowLight = preview.userData.slowLight;
      const footprintOutlineMaterial = preview.userData.footprintOutlineMaterial;
      if (!bodyMaterial || !bandMaterial) {
        return;
      }

      if (isValid) {
        bodyMaterial.color.setHex(SLOW_TOWER_CONFIG.previewColor);
        bodyMaterial.emissive.setHex(SLOW_TOWER_CONFIG.previewGlow);
        bandMaterial.color.setHex(SLOW_TOWER_CONFIG.bandColor);
        if (accentMaterial) {
          accentMaterial.color.setHex(SLOW_TOWER_CONFIG.bandColor);
          accentMaterial.emissive.setHex(SLOW_TOWER_CONFIG.previewGlow);
        }
        if (footprintOutlineMaterial) {
          footprintOutlineMaterial.color.setHex(SLOW_TOWER_CONFIG.previewGlow);
        }
        if (glowLight) {
          glowLight.color.setHex(SLOW_TOWER_CONFIG.previewGlow);
        }
      } else {
        bodyMaterial.color.setHex(SLOW_TOWER_CONFIG.previewInvalidColor);
        bodyMaterial.emissive.setHex(SLOW_TOWER_CONFIG.previewInvalidGlow);
        bandMaterial.color.setHex(SLOW_TOWER_CONFIG.previewInvalidGlow);
        if (accentMaterial) {
          accentMaterial.color.setHex(SLOW_TOWER_CONFIG.previewInvalidColor);
          accentMaterial.emissive.setHex(SLOW_TOWER_CONFIG.previewInvalidGlow);
        }
        if (footprintOutlineMaterial) {
          footprintOutlineMaterial.color.setHex(SLOW_TOWER_CONFIG.previewInvalidGlow);
        }
        if (glowLight) {
          glowLight.color.setHex(SLOW_TOWER_CONFIG.previewInvalidGlow);
        }
      }
      return;
    }

    if (selectedTowerType === "aoe") {
      const coreMaterial = preview.userData.aoeCoreMaterial;
      const auraMaterial = preview.userData.aoeAuraMaterial;
      const spikeMaterial = preview.userData.aoeSpikeMaterial;
      const glowLight = preview.userData.aoeLight;
      const footprintOutlineMaterial = preview.userData.footprintOutlineMaterial;
      if (!coreMaterial || !auraMaterial) {
        return;
      }

      if (isValid) {
        coreMaterial.color.setHex(AOE_TOWER_CONFIG.previewColor);
        coreMaterial.emissive.setHex(AOE_TOWER_CONFIG.previewGlow);
        auraMaterial.color.setHex(AOE_TOWER_CONFIG.previewGlow);
        if (footprintOutlineMaterial) {
          footprintOutlineMaterial.color.setHex(AOE_TOWER_CONFIG.previewGlow);
        }
        if (spikeMaterial) {
          spikeMaterial.color.setHex(AOE_TOWER_CONFIG.previewColor);
          spikeMaterial.emissive.setHex(AOE_TOWER_CONFIG.previewGlow);
        }
        if (glowLight) {
          glowLight.color.setHex(AOE_TOWER_CONFIG.previewGlow);
        }
      } else {
        coreMaterial.color.setHex(AOE_TOWER_CONFIG.previewInvalidColor);
        coreMaterial.emissive.setHex(AOE_TOWER_CONFIG.previewInvalidGlow);
        auraMaterial.color.setHex(AOE_TOWER_CONFIG.previewInvalidGlow);
        if (footprintOutlineMaterial) {
          footprintOutlineMaterial.color.setHex(AOE_TOWER_CONFIG.previewInvalidGlow);
        }
        if (spikeMaterial) {
          spikeMaterial.color.setHex(AOE_TOWER_CONFIG.previewInvalidColor);
          spikeMaterial.emissive.setHex(AOE_TOWER_CONFIG.previewInvalidGlow);
        }
        if (glowLight) {
          glowLight.color.setHex(AOE_TOWER_CONFIG.previewInvalidGlow);
        }
      }
      return;
    }

    const baseMaterial = preview.userData.gunBaseMaterial;
    const turretMaterial = preview.userData.gunTurretMaterial;
    const footprintOutlineMaterial = preview.userData.footprintOutlineMaterial;
    if (!baseMaterial || !turretMaterial) {
      return;
    }

    if (isValid) {
      baseMaterial.color.setHex(GUN_TOWER_CONFIG.previewBaseColor);
      turretMaterial.color.setHex(GUN_TOWER_CONFIG.previewTurretColor);
      turretMaterial.emissive.setHex(GUN_TOWER_CONFIG.previewGlow);
      if (footprintOutlineMaterial) {
        footprintOutlineMaterial.color.setHex(GUN_TOWER_CONFIG.previewGlow);
      }
    } else {
      baseMaterial.color.setHex(GUN_TOWER_CONFIG.previewInvalidBaseColor);
      turretMaterial.color.setHex(GUN_TOWER_CONFIG.previewInvalidTurretColor);
      turretMaterial.emissive.setHex(GUN_TOWER_CONFIG.previewInvalidGlow);
      if (footprintOutlineMaterial) {
        footprintOutlineMaterial.color.setHex(GUN_TOWER_CONFIG.previewInvalidGlow);
      }
    }
  }

  let preview = createTowerPreviewMesh("gun");
  preview.visible = false;
  scene.add(preview);

  const pathRangeHighlights = createPathRangeHighlights();

  function isInsideBuildBounds(position) {
    return (
      position.x >= grid.moveBounds.minX &&
      position.x <= grid.moveBounds.maxX &&
      position.z >= grid.moveBounds.minZ &&
      position.z <= grid.moveBounds.maxZ
    );
  }

  function getCellCenter(cellX, cellZ) {
    return typeof grid.cellToWorldCenter === "function"
      ? grid.cellToWorldCenter(cellX, cellZ)
      : new THREE.Vector3(0, 0, 0);
  }

  function resolvePlacementFromAim(targetCell, hitPoint, towerType) {
    if (!targetCell || !Number.isInteger(targetCell.x) || !Number.isInteger(targetCell.z)) {
      return null;
    }

    const towerSpec = getTowerSpec(towerType);
    if (!towerSpec) {
      return null;
    }

    let occupiedCells = [{ x: targetCell.x, z: targetCell.z }];
    if (
      towerType === "gun"
      && towerSpec.footprintCellsX === 1
      && towerSpec.footprintCellsZ === 2
    ) {
      const targetCenter = getCellCenter(targetCell.x, targetCell.z);
      const placeForward = !hitPoint || hitPoint.z >= targetCenter.z;
      occupiedCells = placeForward
        ? [
          { x: targetCell.x, z: targetCell.z },
          { x: targetCell.x, z: targetCell.z + 1 },
        ]
        : [
          { x: targetCell.x, z: targetCell.z - 1 },
          { x: targetCell.x, z: targetCell.z },
        ];
    }

    const centers = [];
    const surfaceYs = [];
    for (const cell of occupiedCells) {
      const center = getCellCenter(cell.x, cell.z);
      centers.push(center);
      surfaceYs.push(getBuildSurfaceY(center.x, center.z));
    }

    const firstY = surfaceYs[0];
    const sameSurfaceHeight = surfaceYs.every((surfaceY) => Number.isFinite(surfaceY) && Math.abs(surfaceY - firstY) <= 1e-4);
    if (!sameSurfaceHeight) {
      return {
        occupiedCells,
        position: null,
        sameSurfaceHeight: false,
        footprintKey: getFootprintKey(occupiedCells),
      };
    }

    tempVecA.set(0, 0, 0);
    for (const center of centers) {
      tempVecA.add(center);
    }
    tempVecA.multiplyScalar(1 / Math.max(1, centers.length));
    tempVecA.y = firstY;
    return {
      occupiedCells,
      position: tempVecA.clone(),
      sameSurfaceHeight: true,
      footprintKey: getFootprintKey(occupiedCells),
    };
  }

  function isPlacementLocallyValid(placement) {
    if (!placement || !placement.position || !isInsideBuildBounds(placement.position)) {
      return false;
    }
    if (!placement.sameSurfaceHeight) {
      return false;
    }
    if (!Array.isArray(placement.occupiedCells) || placement.occupiedCells.length === 0) {
      return false;
    }
    for (const cell of placement.occupiedCells) {
      if (!Number.isInteger(cell?.x) || !Number.isInteger(cell?.z)) {
        return false;
      }
      if (typeof grid.isCellInsideLevel === "function" && !grid.isCellInsideLevel(cell.x, cell.z)) {
        return false;
      }
      if (typeof grid.isCellBuildable === "function" && !grid.isCellBuildable(cell.x, cell.z)) {
        return false;
      }
      if (isReservedCell(cell.x, cell.z)) {
        return false;
      }
      if (findTowerAtCell(cell.x, cell.z)) {
        return false;
      }
    }
    return true;
  }

  function isPlacementValid(placement) {
    if (!isPlacementLocallyValid(placement)) {
      return false;
    }
    if (!canBlockCellsCached(placement.occupiedCells)) {
      return false;
    }
    return true;
  }

  function getBuildSurfaceY(x, z) {
    if (typeof grid.getBuildSurfaceYAtWorld === "function") {
      return grid.getBuildSurfaceYAtWorld(x, z);
    }
    return grid.tileTopY;
  }

  function selectTower(type = "gun") {
    const normalizedType = normalizeTowerType(type);
    const towerSpec = getTowerSpec(normalizedType);
    if (!towerSpec) {
      return false;
    }
    if (!isTowerTypeUnlocked(normalizedType)) {
      return false;
    }
    if (!canAffordTower(normalizedType)) {
      return false;
    }

    selectedTowerType = normalizedType;
    buildMode = true;

    scene.remove(preview);
    preview = createTowerPreviewMesh(normalizedType);
    scene.add(preview);

    preview.visible = true;
    setPathRangeHighlightValidityVisual(false);
    hidePathRangeHighlights();
    clearPreviewPathBlockCache();
    setPreviewSuppressedFootprint(null);
    previewValid = false;
    previewPlacement = null;
    return true;
  }

  function cancelPlacement() {
    buildMode = false;
    selectedTowerType = null;
    preview.visible = false;
    hidePathRangeHighlights();
    clearPreviewPathBlockCache();
    setPreviewSuppressedFootprint(null);
    previewValid = false;
    previewPlacement = null;
  }

  function updatePreviewFromCamera() {
    const towerSpec = getTowerSpec(selectedTowerType);
    if (
      !buildMode
      || !towerSpec
      || !isTowerTypeUnlocked(selectedTowerType)
    ) {
      preview.visible = false;
      hidePathRangeHighlights();
      previewValid = false;
      previewPlacement = null;
      return;
    }

    raycaster.setFromCamera(aimPoint, camera);
    const hit = typeof grid.raycastBuildSurface === "function"
      ? grid.raycastBuildSurface(raycaster.ray, groundHit)
      : raycaster.ray.intersectPlane(groundPlane, groundHit);
    if (!hit) {
      preview.visible = false;
      hidePathRangeHighlights();
      previewValid = false;
      previewPlacement = null;
      return;
    }

    const targetCell = typeof grid.worldToCell === "function"
      ? grid.worldToCell(groundHit.x, groundHit.z)
      : null;
    if (!targetCell || !Number.isInteger(targetCell.x) || !Number.isInteger(targetCell.z)) {
      preview.visible = false;
      hidePathRangeHighlights();
      previewValid = false;
      previewPlacement = null;
      return;
    }

    const nextPlacement = resolvePlacementFromAim(targetCell, groundHit, selectedTowerType);
    if (!nextPlacement) {
      preview.visible = false;
      hidePathRangeHighlights();
      previewValid = false;
      previewPlacement = null;
      return;
    }

    if (suppressPreviewFootprintKey) {
      if (suppressPreviewFootprintKey === nextPlacement.footprintKey) {
        preview.visible = false;
        hidePathRangeHighlights();
        previewValid = false;
        previewPlacement = null;
        return;
      }
      setPreviewSuppressedFootprint(null);
    }

    preview.visible = true;
    if (nextPlacement.position) {
      preview.position.copy(nextPlacement.position);
    }
    previewPlacement = nextPlacement;
    previewValid = canAffordTower(selectedTowerType)
      && isPlacementValid(nextPlacement);
    setPreviewValidityVisual(previewValid);
    setPathRangeHighlightValidityVisual(previewValid);
    updatePathRangeHighlights(nextPlacement.position || preview.position);
  }

  function createTowerEntry(towerType, towerMesh, basePosition, placement) {
    const towerSpec = getTowerSpec(towerType);
    if (!towerSpec) {
      return null;
    }

    const occupiedCells = Array.isArray(placement?.occupiedCells)
      ? placement.occupiedCells.map((cell) => ({ x: cell.x, z: cell.z }))
      : (placement?.cellX != null && placement?.cellZ != null
        ? [{ x: placement.cellX, z: placement.cellZ }]
        : []);
    const primaryCell = occupiedCells[0] ?? null;

    const entry = {
      mesh: towerMesh,
      cooldown: 0,
      chargeTimer: 0,
      towerType,
      range: towerSpec.range,
      radius: towerSpec.radius,
      halfSize: towerSpec.halfSize,
      halfSizeX: towerSpec.halfSizeX ?? towerSpec.halfSize,
      halfSizeZ: towerSpec.halfSizeZ ?? towerSpec.halfSize,
      height: towerSpec.height,
      baseY: basePosition.y,
      cellX: primaryCell?.x,
      cellZ: primaryCell?.z,
      occupiedCells,
      footprintKey: getFootprintKey(occupiedCells),
      bobClock: Math.random() * Math.PI * 2,
      bobPhase: Math.random() * Math.PI * 2,
      aoeIdleColor: new THREE.Color(AOE_TOWER_CONFIG.idleColor),
      aoeChargeColor: new THREE.Color(AOE_TOWER_CONFIG.chargeColor),
      aoeEmissiveIdle: new THREE.Color(AOE_TOWER_CONFIG.emissiveIdle),
      aoeEmissiveCharge: new THREE.Color(AOE_TOWER_CONFIG.emissiveCharge),
      gunMuzzleFlashTimer: 0,
      slowProcFlash: 0,
      isOperational: true,
      buildFxState: null,
    };

    return entry;
  }

  function easeOutCubic(t) {
    const clamped = THREE.MathUtils.clamp(t, 0, 1);
    const inv = 1 - clamped;
    return 1 - (inv * inv * inv);
  }

  function collectTowerBuildMaterialStates(towerMesh) {
    const states = [];
    if (!towerMesh) {
      return states;
    }

    const seen = new Set();
    towerMesh.traverse((child) => {
      if (!child || !child.material) {
        return;
      }
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!material || seen.has(material)) {
          continue;
        }
        seen.add(material);
        states.push({
          material,
          transparent: material.transparent,
          opacity: typeof material.opacity === "number" ? material.opacity : 1,
          depthWrite: material.depthWrite,
        });

        material.transparent = true;
        if ("depthWrite" in material) {
          material.depthWrite = false;
        }
        material.opacity = (typeof material.opacity === "number" ? material.opacity : 1) * BUILD_FX_START_OPACITY;
        material.needsUpdate = true;
      }
    });

    return states;
  }

  function setTowerBuildMaterialOpacity(materialStates, progress) {
    const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
    const alphaFactor = THREE.MathUtils.lerp(BUILD_FX_START_OPACITY, 1, clampedProgress);
    for (const state of materialStates) {
      if (!state?.material) {
        continue;
      }
      state.material.opacity = state.opacity * alphaFactor;
    }
  }

  function restoreTowerBuildMaterialStates(materialStates) {
    for (const state of materialStates) {
      if (!state?.material) {
        continue;
      }
      state.material.transparent = state.transparent;
      state.material.opacity = state.opacity;
      if ("depthWrite" in state.material) {
        state.material.depthWrite = state.depthWrite;
      }
      state.material.needsUpdate = true;
    }
  }

  function disposeTowerBuildFxState(buildFxState) {
    if (!buildFxState) {
      return;
    }
    if (buildFxState.fxRoot) {
      scene.remove(buildFxState.fxRoot);
    }
    if (buildFxState.teleportColumn?.material) {
      buildFxState.teleportColumn.material.dispose();
    }
    if (buildFxState.ringMesh?.material) {
      buildFxState.ringMesh.material.dispose();
    }
    for (const spark of buildFxState.sparks ?? []) {
      if (spark?.mesh?.material) {
        spark.mesh.material.dispose();
      }
    }
  }

  function startTowerBuildFx(towerEntry) {
    if (!towerEntry?.mesh) {
      return;
    }

    if (towerEntry.buildFxState) {
      restoreTowerBuildMaterialStates(towerEntry.buildFxState.materialStates || []);
      disposeTowerBuildFxState(towerEntry.buildFxState);
      towerEntry.buildFxState = null;
    }
    const existingBuildFxIndex = activeBuildEffects.indexOf(towerEntry);
    if (existingBuildFxIndex >= 0) {
      activeBuildEffects.splice(existingBuildFxIndex, 1);
    }

    if (!BUILD_FX_ENABLED || BUILD_FX_DURATION <= TOWER_CONFIG.segmentEpsilon) {
      towerEntry.isOperational = true;
      towerEntry.buildFxState = null;
      return;
    }

    towerEntry.isOperational = false;

    const initialScale = towerEntry.mesh.scale.clone();
    const endY = Number.isFinite(towerEntry.baseY) ? towerEntry.baseY : towerEntry.mesh.position.y;
    const startY = endY + BUILD_FX_START_Y_OFFSET;
    towerEntry.mesh.position.y = startY;
    towerEntry.mesh.scale.set(
      initialScale.x * BUILD_FX_START_SCALE,
      initialScale.y * BUILD_FX_START_SCALE,
      initialScale.z * BUILD_FX_START_SCALE
    );

    const materialStates = collectTowerBuildMaterialStates(towerEntry.mesh);

    const fxRoot = new THREE.Group();
    fxRoot.position.set(towerEntry.mesh.position.x, endY, towerEntry.mesh.position.z);
    scene.add(fxRoot);

    const teleportHeight = Math.max(0.1, gridCellSize * BUILD_FX_TELEPORT_HEIGHT_CELL_SCALE);
    const teleportRadius = Math.max(0.05, gridCellSize * BUILD_FX_TELEPORT_RADIUS_CELL_SCALE);
    const teleportUniforms = {
      uColorA: { value: new THREE.Color(BUILD_FX_TELEPORT_COLOR_A) },
      uColorB: { value: new THREE.Color(BUILD_FX_TELEPORT_COLOR_B) },
      uEdgeColor: { value: new THREE.Color(BUILD_FX_TELEPORT_EDGE_COLOR) },
      uOpacity: { value: BUILD_FX_TELEPORT_OPACITY },
      uTime: { value: 0 },
      uProgress: { value: 0 },
    };
    const teleportMaterial = new THREE.ShaderMaterial({
      uniforms: teleportUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: BUILD_FX_TELEPORT_VERTEX_SHADER,
      fragmentShader: BUILD_FX_TELEPORT_FRAGMENT_SHADER,
    });
    teleportMaterial.toneMapped = false;
    const teleportColumn = new THREE.Mesh(buildFxTeleportColumnGeometry, teleportMaterial);
    teleportColumn.position.y = teleportHeight * 0.5;
    teleportColumn.scale.set(teleportRadius, teleportHeight, teleportRadius);
    fxRoot.add(teleportColumn);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: BUILD_FX_TELEPORT_EDGE_COLOR,
      transparent: true,
      opacity: BUILD_FX_TELEPORT_OPACITY,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    ringMaterial.toneMapped = false;
    const ringMesh = new THREE.Mesh(buildFxRingGeometry, ringMaterial);
    ringMesh.rotation.x = -Math.PI * 0.5;
    ringMesh.position.y = 0.03;
    ringMesh.scale.setScalar(Math.max(0.1, teleportRadius * 0.36));
    fxRoot.add(ringMesh);

    const sparks = [];
    const sparkSizeBase = Math.max(0.02, gridCellSize * 0.05);
    const sparkSpawnRadius = teleportRadius * 0.88;
    for (let i = 0; i < BUILD_FX_SPARK_COUNT; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radialDistance = Math.sqrt(Math.random()) * sparkSpawnRadius;
      const sparkMaterial = buildFxSparkBaseMaterial.clone();
      const sparkMesh = new THREE.Mesh(buildFxSparkGeometry, sparkMaterial);
      sparkMesh.position.set(
        Math.cos(angle) * radialDistance,
        0.04 + (Math.random() * gridCellSize * 0.24),
        Math.sin(angle) * radialDistance
      );
      const sparkScale = sparkSizeBase * THREE.MathUtils.lerp(0.5, 1.2, Math.random());
      sparkMesh.scale.setScalar(sparkScale);
      fxRoot.add(sparkMesh);

      const life = THREE.MathUtils.lerp(BUILD_FX_SPARK_LIFE_MIN, BUILD_FX_SPARK_LIFE_MAX, Math.random());
      const velocity = new THREE.Vector3(
        Math.cos(angle) * THREE.MathUtils.lerp(0.3, 1.65, Math.random()),
        THREE.MathUtils.lerp(1.1, BUILD_FX_SPARK_VERTICAL_BOOST, Math.random()),
        Math.sin(angle) * THREE.MathUtils.lerp(0.3, 1.65, Math.random())
      );

      sparks.push({
        mesh: sparkMesh,
        velocity,
        life,
        maxLife: life,
        baseOpacity: sparkMaterial.opacity,
        spin: new THREE.Vector3(
          THREE.MathUtils.lerp(-11, 11, Math.random()),
          THREE.MathUtils.lerp(-11, 11, Math.random()),
          THREE.MathUtils.lerp(-11, 11, Math.random())
        ),
      });
    }

    towerEntry.buildFxState = {
      elapsed: 0,
      duration: BUILD_FX_DURATION,
      startY,
      endY,
      initialScale,
      materialStates,
      fxRoot,
      teleportColumn,
      teleportUniforms,
      ringMesh,
      ringScaleMax: Math.max(0.1, teleportRadius * BUILD_FX_RING_MAX_SCALE),
      sparks,
    };

    activeBuildEffects.push(towerEntry);
  }

  function updateTowerBuildEffects(deltaSeconds) {
    if (activeBuildEffects.length === 0) {
      return;
    }

    for (let i = activeBuildEffects.length - 1; i >= 0; i -= 1) {
      const tower = activeBuildEffects[i];
      const buildFxState = tower?.buildFxState;
      if (!tower?.mesh || !buildFxState) {
        if (tower) {
          tower.isOperational = true;
          tower.buildFxState = null;
        }
        activeBuildEffects.splice(i, 1);
        continue;
      }

      buildFxState.elapsed = Math.min(
        buildFxState.duration,
        buildFxState.elapsed + Math.max(0, deltaSeconds)
      );
      const progress = buildFxState.duration <= TOWER_CONFIG.segmentEpsilon
        ? 1
        : (buildFxState.elapsed / buildFxState.duration);
      const easedProgress = easeOutCubic(progress);

      tower.mesh.position.y = THREE.MathUtils.lerp(buildFxState.startY, buildFxState.endY, easedProgress);
      const scaleFactor = THREE.MathUtils.lerp(BUILD_FX_START_SCALE, 1, easedProgress);
      tower.mesh.scale.set(
        buildFxState.initialScale.x * scaleFactor,
        buildFxState.initialScale.y * scaleFactor,
        buildFxState.initialScale.z * scaleFactor
      );
      setTowerBuildMaterialOpacity(buildFxState.materialStates, easedProgress);

      if (buildFxState.teleportUniforms) {
        buildFxState.teleportUniforms.uTime.value = buildFxState.elapsed;
        buildFxState.teleportUniforms.uProgress.value = progress;
        buildFxState.teleportUniforms.uOpacity.value = BUILD_FX_TELEPORT_OPACITY * (1 - (0.18 * progress));
      }

      if (buildFxState.ringMesh?.material) {
        const ringScale = THREE.MathUtils.lerp(
          buildFxState.ringScaleMax * 0.24,
          buildFxState.ringScaleMax,
          progress
        );
        buildFxState.ringMesh.scale.setScalar(ringScale);
        buildFxState.ringMesh.material.opacity = BUILD_FX_TELEPORT_OPACITY * (1 - progress);
      }

      for (let sparkIndex = buildFxState.sparks.length - 1; sparkIndex >= 0; sparkIndex -= 1) {
        const spark = buildFxState.sparks[sparkIndex];
        spark.life -= deltaSeconds;
        if (spark.life <= 0) {
          if (spark.mesh?.parent) {
            spark.mesh.parent.remove(spark.mesh);
          }
          spark.mesh?.material?.dispose?.();
          buildFxState.sparks.splice(sparkIndex, 1);
          continue;
        }

        const sparkT = Math.max(0, spark.life / spark.maxLife);
        spark.mesh.position.addScaledVector(spark.velocity, deltaSeconds);
        spark.velocity.multiplyScalar(Math.max(0, 1 - (BUILD_FX_SPARK_DRAG * deltaSeconds)));
        spark.velocity.y -= BUILD_FX_SPARK_GRAVITY * deltaSeconds;
        spark.mesh.material.opacity = spark.baseOpacity * sparkT * (1 - (0.35 * progress));
        spark.mesh.rotation.x += spark.spin.x * deltaSeconds;
        spark.mesh.rotation.y += spark.spin.y * deltaSeconds;
        spark.mesh.rotation.z += spark.spin.z * deltaSeconds;
      }

      if (progress < 1) {
        continue;
      }

      tower.mesh.position.y = buildFxState.endY;
      tower.mesh.scale.copy(buildFxState.initialScale);
      restoreTowerBuildMaterialStates(buildFxState.materialStates);
      disposeTowerBuildFxState(buildFxState);
      tower.buildFxState = null;
      tower.isOperational = true;
      activeBuildEffects.splice(i, 1);
    }
  }

  function placeSelectedTower() {
    updatePreviewFromCamera();

    if (
      !buildMode
      || !previewValid
      || !selectedTowerType
      || !isTowerTypeUnlocked(selectedTowerType)
      || !previewPlacement
      || !previewPlacement.position
    ) {
      return false;
    }

    const normalizedType = normalizeTowerType(selectedTowerType);
    const resolvedPlacement = {
      occupiedCells: previewPlacement.occupiedCells.map((cell) => ({ x: cell.x, z: cell.z })),
      position: previewPlacement.position.clone(),
      footprintKey: previewPlacement.footprintKey,
    };
    const towerMesh = createTowerPlacedMesh(normalizedType);
    towerMesh.position.copy(resolvedPlacement.position);
    scene.add(towerMesh);

    const towerEntry = createTowerEntry(normalizedType, towerMesh, resolvedPlacement.position, resolvedPlacement);
    if (!towerEntry) {
      scene.remove(towerMesh);
      return false;
    }
    if (!spendTowerCost(normalizedType)) {
      scene.remove(towerMesh);
      return false;
    }
    towers.push(towerEntry);
    startTowerBuildFx(towerEntry);
    const didCommitBlockedCells = notifyBlockedCellsChanged();
    if (!didCommitBlockedCells) {
      const buildEffectIndex = activeBuildEffects.indexOf(towerEntry);
      if (buildEffectIndex >= 0) {
        activeBuildEffects.splice(buildEffectIndex, 1);
      }
      if (towerEntry.buildFxState) {
        restoreTowerBuildMaterialStates(towerEntry.buildFxState.materialStates || []);
        disposeTowerBuildFxState(towerEntry.buildFxState);
        towerEntry.buildFxState = null;
      }
      const towerIndex = towers.indexOf(towerEntry);
      if (towerIndex >= 0) {
        towers.splice(towerIndex, 1);
      }
      scene.remove(towerMesh);
      disposeMeshResources(towerMesh);
      refundTowerCost(normalizedType);
      return false;
    }
    if (!canAffordTower(normalizedType)) {
      cancelPlacement();
    } else if (resolvedPlacement.footprintKey) {
      setPreviewSuppressedFootprint(resolvedPlacement.footprintKey);
      preview.visible = false;
      hidePathRangeHighlights();
      previewValid = false;
      previewPlacement = null;
    }
    return true;
  }

  function segmentIntersectsAabb(start, end, minX, minY, minZ, maxX, maxY, maxZ) {
    let tMin = 0;
    let tMax = 1;

    const dx = end.x - start.x;
    if (Math.abs(dx) < TOWER_CONFIG.segmentEpsilon) {
      if (start.x < minX || start.x > maxX) return false;
    } else {
      const inv = 1 / dx;
      let t1 = (minX - start.x) * inv;
      let t2 = (maxX - start.x) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }

    const dy = end.y - start.y;
    if (Math.abs(dy) < TOWER_CONFIG.segmentEpsilon) {
      if (start.y < minY || start.y > maxY) return false;
    } else {
      const inv = 1 / dy;
      let t1 = (minY - start.y) * inv;
      let t2 = (maxY - start.y) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }

    const dz = end.z - start.z;
    if (Math.abs(dz) < TOWER_CONFIG.segmentEpsilon) {
      if (start.z < minZ || start.z > maxZ) return false;
    } else {
      const inv = 1 / dz;
      let t1 = (minZ - start.z) * inv;
      let t2 = (maxZ - start.z) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }

    return true;
  }

  function getGunMuzzleWorldPosition(tower, out) {
    const muzzleNode = tower?.mesh?.userData?.gunMuzzleNode;
    if (muzzleNode && typeof muzzleNode.getWorldPosition === "function") {
      muzzleNode.getWorldPosition(out);
      return out;
    }
    out.copy(tower.mesh.position);
    out.y += GUN_TOWER_CONFIG.baseHeight + (GUN_TOWER_CONFIG.turretHeight * 0.5);
    return out;
  }

  function lineOfSightBlockedByOtherTower(origin, targetPosition, sourceTower) {
    for (const otherTower of towers) {
      if (otherTower === sourceTower) {
        continue;
      }

      const halfSizeX = Number.isFinite(Number(otherTower.halfSizeX))
        ? Number(otherTower.halfSizeX)
        : Number(otherTower.halfSize ?? GUN_TOWER_HALF_SIZE_X);
      const halfSizeZ = Number.isFinite(Number(otherTower.halfSizeZ))
        ? Number(otherTower.halfSizeZ)
        : Number(otherTower.halfSize ?? GUN_TOWER_HALF_SIZE_Z);
      const baseY = otherTower.baseY ?? grid.tileTopY;
      const topY = baseY + (otherTower.height ?? GUN_TOWER_HEIGHT);
      const minX = otherTower.mesh.position.x - halfSizeX;
      const maxX = otherTower.mesh.position.x + halfSizeX;
      const minZ = otherTower.mesh.position.z - halfSizeZ;
      const maxZ = otherTower.mesh.position.z + halfSizeZ;

      if (
        segmentIntersectsAabb(
          origin,
          targetPosition,
          minX,
          baseY,
          minZ,
          maxX,
          topY,
          maxZ
        )
      ) {
        return true;
      }
    }
    return false;
  }

  function lineOfSightBlockedByTerrain(origin, targetPosition) {
    for (const obstacle of terrainObstacles) {
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

      const shrinkX = Math.min(TOWER_CONFIG.terrainLosShrinkMax, obstacleHalfSizeX * TOWER_CONFIG.terrainLosShrinkPercent);
      const shrinkZ = Math.min(TOWER_CONFIG.terrainLosShrinkMax, obstacleHalfSizeZ * TOWER_CONFIG.terrainLosShrinkPercent);
      const halfSizeX = Math.max(TOWER_CONFIG.terrainLosMinHalfSize, obstacleHalfSizeX - shrinkX);
      const halfSizeZ = Math.max(TOWER_CONFIG.terrainLosMinHalfSize, obstacleHalfSizeZ - shrinkZ);
      const minX = obstaclePos.x - halfSizeX;
      const maxX = obstaclePos.x + halfSizeX;
      const minZ = obstaclePos.z - halfSizeZ;
      const maxZ = obstaclePos.z + halfSizeZ;
      const minY = obstacleBaseY + TOWER_CONFIG.terrainLosVerticalPadding;
      const maxY = obstacleBaseY + obstacleHeight - TOWER_CONFIG.terrainLosVerticalPadding;
      if (maxY <= minY) {
        continue;
      }

      if (
        segmentIntersectsAabb(
          origin,
          targetPosition,
          minX,
          minY,
          minZ,
          maxX,
          maxY,
          maxZ
        )
      ) {
        return true;
      }
    }
    return false;
  }

  function isPointInTowerRange(tower, targetPosition) {
    const towerRange = tower.range ?? GUN_RANGE;
    return tower.mesh.position.distanceToSquared(targetPosition) <= (towerRange * towerRange);
  }

  function hasLineOfSightToPoint(tower, targetPosition) {
    let origin = tempVecC;
    if (tower.towerType === "gun") {
      getGunMuzzleWorldPosition(tower, origin);
    } else {
      const hoverNode = tower.mesh?.userData?.hoverNode;
      if (hoverNode && typeof hoverNode.getWorldPosition === "function") {
        hoverNode.getWorldPosition(origin);
      } else {
        origin.copy(tower.mesh.position);
      }
    }
    return (
      !lineOfSightBlockedByOtherTower(origin, targetPosition, tower) &&
      !lineOfSightBlockedByTerrain(origin, targetPosition)
    );
  }

  function canTowerHitPoint(tower, targetPosition) {
    return isPointInTowerRange(tower, targetPosition) && hasLineOfSightToPoint(tower, targetPosition);
  }

  function findTargetWithLineOfSight(tower, enemySystem, { skipSlowed = false } = {}) {
    if (!enemySystem) {
      return null;
    }
    const towerRange = tower.range ?? GUN_RANGE;
    const maxRangeSq = towerRange * towerRange;
    let bestTarget = null;
    let bestDistSq = maxRangeSq;

    let enemyMeshes = null;
    if (typeof enemySystem.getDamageableEnemies === "function") {
      const damageableMeshes = enemySystem.getDamageableEnemies();
      if (Array.isArray(damageableMeshes)) {
        enemyMeshes = damageableMeshes;
      }
    }
    if (!enemyMeshes && typeof enemySystem.getEnemies === "function") {
      const allEnemyMeshes = enemySystem.getEnemies();
      if (Array.isArray(allEnemyMeshes)) {
        enemyMeshes = allEnemyMeshes;
      }
    }

    if (Array.isArray(enemyMeshes)) {
      for (const enemyMesh of enemyMeshes) {
        if (!enemyMesh || !enemyMesh.visible) {
          continue;
        }
        if (
          skipSlowed
          && typeof enemySystem.isEnemyMeshSlowed === "function"
          && enemySystem.isEnemyMeshSlowed(enemyMesh)
        ) {
          continue;
        }

        tempVecD.copy(enemyMesh.position);
        const aimOffsetY = enemyMesh.userData?.bodyCenterOffsetY;
        if (typeof aimOffsetY === "number") {
          tempVecD.y += aimOffsetY;
        }

        const distSq = tower.mesh.position.distanceToSquared(tempVecD);
        if (distSq > bestDistSq) {
          continue;
        }

        if (!hasLineOfSightToPoint(tower, tempVecD)) {
          continue;
        }

        bestDistSq = distSq;
        bestTarget = {
          mesh: enemyMesh,
          position: enemyMesh.position,
          aimPoint: tempVecD.clone(),
        };
      }
      if (bestTarget) {
        return bestTarget;
      }
    }

    if (!skipSlowed && typeof enemySystem.getTargetInRange === "function") {
      const fallbackTarget = enemySystem.getTargetInRange(tower.mesh.position, towerRange);
      if (fallbackTarget && fallbackTarget.position) {
        const fallbackAimPoint = fallbackTarget.position.clone();
        const fallbackOffsetY = fallbackTarget.mesh?.userData?.bodyCenterOffsetY;
        if (typeof fallbackOffsetY === "number") {
          fallbackAimPoint.y += fallbackOffsetY;
        }
        if (hasLineOfSightToPoint(tower, fallbackAimPoint)) {
          return {
            ...fallbackTarget,
            aimPoint: fallbackAimPoint,
          };
        }
      }
    }

    return null;
  }

  function getDamageableEnemyMeshes(enemySystem) {
    if (!enemySystem) {
      return [];
    }
    if (typeof enemySystem.getDamageableEnemies === "function") {
      const meshes = enemySystem.getDamageableEnemies();
      if (Array.isArray(meshes)) {
        return meshes;
      }
    }

    if (typeof enemySystem.getEnemies === "function") {
      const meshes = enemySystem.getEnemies();
      if (Array.isArray(meshes)) {
        return meshes.filter((mesh) => mesh?.visible);
      }
    }

    return [];
  }

  function getEnemyCollisionCenter(enemyMesh, out) {
    out.copy(enemyMesh.position);
    const centerOffsetY = enemyMesh.userData?.bodyCenterOffsetY;
    if (typeof centerOffsetY === "number") {
      out.y += centerOffsetY;
    }
    return out;
  }

  function hasDamageableEnemyInRange(tower, enemySystem) {
    const range = tower.range ?? AOE_RANGE;
    const rangeSq = range * range;
    for (const enemyMesh of getDamageableEnemyMeshes(enemySystem)) {
      if (!enemyMesh || !enemyMesh.visible) {
        continue;
      }
      if (tower.mesh.position.distanceToSquared(getEnemyCollisionCenter(enemyMesh, tempVecH)) <= rangeSq) {
        return true;
      }
    }
    return false;
  }

  function rotateYawTowards(currentYaw, targetYaw, maxStep) {
    const delta = THREE.MathUtils.euclideanModulo(targetYaw - currentYaw + Math.PI, Math.PI * 2) - Math.PI;
    if (Math.abs(delta) <= maxStep) {
      return targetYaw;
    }
    return currentYaw + Math.sign(delta) * maxStep;
  }

  function spawnGunMuzzleFlash(position) {
    const flash = new THREE.Mesh(muzzleFlashGeometry, muzzleFlashMaterial.clone());
    flash.material.toneMapped = false;
    flash.position.copy(position);
    scene.add(flash);
    gunMuzzleFlashes.push({
      mesh: flash,
      life: Math.max(0.01, Number(GUN_TOWER_CONFIG.muzzleFlashDuration) || 0.08),
      maxLife: Math.max(0.01, Number(GUN_TOWER_CONFIG.muzzleFlashDuration) || 0.08),
    });
  }

  function updateGunMuzzleFlashes(deltaSeconds) {
    for (let i = gunMuzzleFlashes.length - 1; i >= 0; i -= 1) {
      const flash = gunMuzzleFlashes[i];
      flash.life -= deltaSeconds;
      if (flash.life <= 0) {
        scene.remove(flash.mesh);
        flash.mesh.material.dispose();
        gunMuzzleFlashes.splice(i, 1);
        continue;
      }
      const t = Math.max(0, flash.life / flash.maxLife);
      flash.mesh.material.opacity = GUN_TOWER_CONFIG.muzzleFlashOpacity * t;
      const scale = 0.6 + ((1 - t) * 0.5);
      flash.mesh.scale.setScalar(scale);
    }
  }

  function spawnGunProjectile(tower, targetPoint) {
    getGunMuzzleWorldPosition(tower, tempVecA);
    tempVecB.copy(targetPoint).sub(tempVecA);
    if (tempVecB.lengthSq() <= TOWER_CONFIG.segmentEpsilon) {
      return false;
    }
    tempVecB.normalize();

    const projectileMesh = new THREE.Mesh(gunProjectileGeometry, gunProjectileMaterial);
    projectileMesh.position.copy(tempVecA);
    scene.add(projectileMesh);

    gunProjectiles.push({
      mesh: projectileMesh,
      velocity: tempVecB.clone().multiplyScalar(GUN_PROJECTILE_SPEED),
      life: GUN_PROJECTILE_LIFETIME,
      damage: GUN_PROJECTILE_DAMAGE * towerDamageMultiplier,
      hitRadius: GUN_PROJECTILE_HIT_RADIUS,
    });
    spawnGunMuzzleFlash(tempVecA);
    tower.gunMuzzleFlashTimer = Math.max(0, Number(GUN_TOWER_CONFIG.muzzleFlashDuration) || 0.08);
    return true;
  }

  function destroyGunProjectile(projectile) {
    if (!projectile?.mesh) {
      return;
    }
    scene.remove(projectile.mesh);
  }

  function getGunProjectileHit(projectile, enemySystem) {
    const damageableEnemies = getDamageableEnemyMeshes(enemySystem);
    let closest = null;
    let closestDistSq = Number.POSITIVE_INFINITY;
    for (const enemyMesh of damageableEnemies) {
      if (!enemyMesh || !enemyMesh.visible) {
        continue;
      }
      let intersects = false;
      if (typeof enemySystem.isPointNearEnemyMesh === "function") {
        intersects = enemySystem.isPointNearEnemyMesh(enemyMesh, projectile.mesh.position, projectile.hitRadius);
      } else {
        getEnemyCollisionCenter(enemyMesh, tempVecC);
        const bodyRadius = Number(enemyMesh.userData?.hitSphereRadius) || 0;
        const maxDistance = bodyRadius + projectile.hitRadius;
        intersects = tempVecC.distanceToSquared(projectile.mesh.position) <= (maxDistance * maxDistance);
      }
      if (!intersects) {
        continue;
      }

      getEnemyCollisionCenter(enemyMesh, tempVecD);
      const distSq = projectile.mesh.position.distanceToSquared(tempVecD);
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closest = enemyMesh;
      }
    }
    return closest;
  }

  function updateGunProjectiles(deltaSeconds, enemySystem) {
    if (!enemySystem) {
      return;
    }
    for (let i = gunProjectiles.length - 1; i >= 0; i -= 1) {
      const projectile = gunProjectiles[i];
      projectile.mesh.position.addScaledVector(projectile.velocity, deltaSeconds);
      projectile.life -= deltaSeconds;

      const hitEnemyMesh = getGunProjectileHit(projectile, enemySystem);
      if (hitEnemyMesh && typeof enemySystem.applyDamageToEnemyMesh === "function") {
        enemySystem.applyDamageToEnemyMesh(hitEnemyMesh, projectile.damage);
        destroyGunProjectile(projectile);
        gunProjectiles.splice(i, 1);
        continue;
      }

      if (projectile.life <= 0) {
        destroyGunProjectile(projectile);
        gunProjectiles.splice(i, 1);
      }
    }
  }

  function destroyAoePulseEffect(effect) {
    if (!effect?.mesh) {
      return;
    }
    scene.remove(effect.mesh);
    effect.mesh.material.dispose();
  }

  function getAoePulseOrigin(tower, out) {
    const hoverNode = tower.mesh?.userData?.hoverNode;
    if (hoverNode && typeof hoverNode.getWorldPosition === "function") {
      hoverNode.getWorldPosition(out);
      return out;
    }

    out.copy(tower.mesh.position);
    out.y += AOE_HOVER_BASE_Y * AOE_VISUAL_SCALE;
    return out;
  }

  function spawnAoePulse(origin, maxRadius, damage) {
    const mesh = new THREE.Mesh(aoePulseGeometry, aoePulseMaterial.clone());
    mesh.material.toneMapped = false;
    mesh.position.copy(origin);
    mesh.scale.setScalar(0.01);
    scene.add(mesh);

    aoePulseEffects.push({
      mesh,
      origin: origin.clone(),
      elapsed: 0,
      prevRadius: 0,
      currentRadius: 0,
      maxRadius,
      duration: Math.max(TOWER_CONFIG.segmentEpsilon, AOE_PULSE_DURATION),
      damage,
      hitSet: new Set(),
    });
  }

  function doesPulseWaveHitEnemy(pulse, enemyMesh) {
    const enemyRadius = typeof enemyMesh?.userData?.hitSphereRadius === "number"
      ? enemyMesh.userData.hitSphereRadius
      : 0;
    const dist = pulse.origin.distanceTo(getEnemyCollisionCenter(enemyMesh, tempVecH));
    const halfShell = Math.max(0.01, AOE_SHELL_THICKNESS * 0.5);
    const shellMin = Math.max(0, pulse.currentRadius - halfShell);
    const shellMax = pulse.currentRadius + halfShell;

    if ((dist + enemyRadius) < shellMin) {
      return false;
    }
    if ((dist - enemyRadius) > shellMax) {
      return false;
    }
    if ((dist + enemyRadius) < pulse.prevRadius) {
      return false;
    }
    return true;
  }

  function updateAoePulseEffects(deltaSeconds, enemySystem) {
    const damageableEnemies = getDamageableEnemyMeshes(enemySystem);

    for (let i = aoePulseEffects.length - 1; i >= 0; i -= 1) {
      const pulse = aoePulseEffects[i];
      pulse.elapsed += deltaSeconds;
      pulse.prevRadius = pulse.currentRadius;

      const t = Math.min(1, pulse.elapsed / pulse.duration);
      pulse.currentRadius = pulse.maxRadius * t;

      pulse.mesh.scale.setScalar(Math.max(0.01, pulse.currentRadius));
      pulse.mesh.material.opacity = Math.max(0, AOE_TOWER_CONFIG.pulseOpacity * (1 - t));

      for (const enemyMesh of damageableEnemies) {
        if (!enemyMesh || !enemyMesh.visible || pulse.hitSet.has(enemyMesh)) {
          continue;
        }
        if (!doesPulseWaveHitEnemy(pulse, enemyMesh)) {
          continue;
        }

        let hit = false;
        if (typeof enemySystem.applyDamageToEnemyMesh === "function") {
          hit = enemySystem.applyDamageToEnemyMesh(enemyMesh, pulse.damage);
        } else if (typeof enemySystem.applyDamageAtPoint === "function") {
          const enemyRadius = enemyMesh?.userData?.hitSphereRadius ?? 0;
          hit = enemySystem.applyDamageAtPoint(
            getEnemyCollisionCenter(enemyMesh, tempVecH),
            enemyRadius,
            pulse.damage
          );
        }

        if (hit) {
          pulse.hitSet.add(enemyMesh);
        }
      }

      if (t >= 1) {
        destroyAoePulseEffect(pulse);
        aoePulseEffects.splice(i, 1);
      }
    }
  }

  function updateAoeTowerBobbing(tower, deltaSeconds) {
    const hoverNode = tower.mesh?.userData?.hoverNode;
    if (!hoverNode) {
      return;
    }
    tower.bobClock = (tower.bobClock || 0) + deltaSeconds;
    hoverNode.position.y = (AOE_HOVER_BASE_Y + (
      Math.sin((tower.bobClock * AOE_BOB_FREQUENCY) + (tower.bobPhase || 0))
      * AOE_BOB_AMPLITUDE
    )) * AOE_VISUAL_SCALE;
  }

  function updateAoeTowerAppearance(tower, chargeRatio) {
    const coreMaterial = tower.mesh?.userData?.aoeCoreMaterial;
    const auraMaterial = tower.mesh?.userData?.aoeAuraMaterial;
    const spikeMaterial = tower.mesh?.userData?.aoeSpikeMaterial;
    const aoeLight = tower.mesh?.userData?.aoeLight;
    if (!coreMaterial) {
      return;
    }

    tempColorA.copy(tower.aoeIdleColor).lerp(tower.aoeChargeColor, chargeRatio);
    tempColorB.copy(tower.aoeEmissiveIdle).lerp(tower.aoeEmissiveCharge, chargeRatio);
    coreMaterial.color.copy(tempColorA);
    coreMaterial.emissive.copy(tempColorB);
    if (spikeMaterial) {
      spikeMaterial.color.copy(tempColorA);
      spikeMaterial.emissive.copy(tempColorB);
    }

    if (auraMaterial) {
      auraMaterial.color.copy(tempColorB);
      auraMaterial.opacity = THREE.MathUtils.lerp(
        AOE_TOWER_CONFIG.auraOpacity * 0.35,
        AOE_TOWER_CONFIG.auraOpacity,
        chargeRatio
      );
    }
    if (aoeLight) {
      aoeLight.color.copy(tempColorB);
      aoeLight.intensity = THREE.MathUtils.lerp(0.2, 2.2, chargeRatio);
    }
  }

  function updateSlowTowerBobbing(tower, deltaSeconds) {
    const hoverNode = tower.mesh?.userData?.hoverNode;
    if (!hoverNode) {
      return;
    }
    tower.bobClock = (tower.bobClock || 0) + deltaSeconds;
    tower.slowProcFlash = Math.max(0, (tower.slowProcFlash || 0) - (deltaSeconds * 2.8));
    const flashRatio = THREE.MathUtils.clamp(tower.slowProcFlash || 0, 0, 1);
    const breath = 0.5 + (0.5 * Math.sin((tower.bobClock * 3.2) + (tower.bobPhase || 0)));

    hoverNode.position.y = 0;

    const upperRing = tower.mesh?.userData?.slowRingUpperMesh;
    if (upperRing) {
      upperRing.rotation.y += deltaSeconds * (1.05 + (flashRatio * 2.0));
      upperRing.rotation.x = THREE.MathUtils.degToRad(
        26 + (Math.sin(tower.bobClock * 2.1) * 3)
      );
    }

    const lowerRing = tower.mesh?.userData?.slowRingLowerMesh;
    if (lowerRing) {
      lowerRing.rotation.y -= deltaSeconds * (0.9 + (flashRatio * 1.7));
      lowerRing.rotation.x = THREE.MathUtils.degToRad(
        -24 + (Math.sin((tower.bobClock * 1.9) + 1.7) * 2.5)
      );
    }

    const crystalMesh = tower.mesh?.userData?.slowCrystalMesh;
    if (crystalMesh) {
      const pulseScale = 1 + (breath * 0.05) + (flashRatio * 0.22);
      const baseScaleY = Number(crystalMesh.userData?.baseScaleY) || 1;
      crystalMesh.scale.x = pulseScale;
      crystalMesh.scale.z = pulseScale;
      crystalMesh.scale.y = baseScaleY * (1 + (breath * 0.04) + (flashRatio * 0.16));
      crystalMesh.rotation.y += deltaSeconds * (0.2 + (flashRatio * 0.3));
    }

    const bandMaterial = tower.mesh?.userData?.slowBandMaterial;
    if (bandMaterial) {
      bandMaterial.opacity = THREE.MathUtils.clamp(
        SLOW_TOWER_CONFIG.bandOpacity * (0.6 + (breath * 0.2) + (flashRatio * 0.58)),
        0,
        1
      );
    }

    const bodyMaterial = tower.mesh?.userData?.slowBodyMaterial;
    if (bodyMaterial) {
      bodyMaterial.emissiveIntensity = THREE.MathUtils.lerp(
        SLOW_TOWER_CONFIG.emissiveIntensity * 0.65,
        SLOW_TOWER_CONFIG.emissiveIntensity * 2.2,
        Math.min(1, flashRatio + (breath * 0.25))
      );
    }
    const accentMaterial = tower.mesh?.userData?.slowAccentMaterial;
    if (accentMaterial) {
      accentMaterial.emissiveIntensity = THREE.MathUtils.lerp(
        SLOW_TOWER_CONFIG.emissiveIntensity * 0.48,
        SLOW_TOWER_CONFIG.emissiveIntensity * 1.45,
        Math.min(1, flashRatio + (breath * 0.35))
      );
    }

    const glowLight = tower.mesh?.userData?.slowLight;
    if (glowLight) {
      glowLight.intensity = THREE.MathUtils.lerp(
        0.26,
        1.75,
        Math.min(1, flashRatio + (breath * 0.35))
      );
    }
  }

  function spawnSlowFieldEffect(position) {
    const mesh = new THREE.Mesh(slowFieldGeometry, slowFieldMaterial.clone());
    mesh.material.toneMapped = false;
    mesh.position.copy(position);
    mesh.scale.setScalar(1);
    scene.add(mesh);

    const halfExtent = grid.cellSize * 0.5;
    slowFieldEffects.push({
      mesh,
      life: SLOW_FIELD_DURATION,
      maxLife: SLOW_FIELD_DURATION,
      halfExtent,
    });
  }

  function destroySlowFieldEffect(effect) {
    if (!effect?.mesh) {
      return;
    }
    scene.remove(effect.mesh);
    effect.mesh.material.dispose();
  }

  function updateSlowFieldEffects(deltaSeconds) {
    for (let i = slowFieldEffects.length - 1; i >= 0; i -= 1) {
      const effect = slowFieldEffects[i];
      effect.life -= deltaSeconds;
      if (effect.life <= 0) {
        destroySlowFieldEffect(effect);
        slowFieldEffects.splice(i, 1);
        continue;
      }

      const t = Math.max(0, effect.life / effect.maxLife);
      effect.mesh.material.opacity = SLOW_TOWER_CONFIG.fieldOpacity * t;
    }
  }

  function updateSlowTowerCombat(tower, deltaSeconds, enemySystem) {
    updateSlowTowerBobbing(tower, deltaSeconds);
    tower.cooldown = Math.max(0, tower.cooldown - deltaSeconds);

    const target = findTargetWithLineOfSight(tower, enemySystem, { skipSlowed: true });
    if (!target || !target.mesh || !target.mesh.visible || tower.cooldown > 0) {
      return;
    }

    const fieldCenter = target.mesh.position.clone();
    spawnSlowFieldEffect(fieldCenter);

    if (typeof enemySystem.applyTemporarySlowInAabb === "function") {
      tempVecF.copy(fieldCenter);
      tempVecG.set(grid.cellSize * 0.5, grid.cellSize * 0.5, grid.cellSize * 0.5);
      enemySystem.applyTemporarySlowInAabb(tempVecF, tempVecG, SLOW_MULTIPLIER, SLOW_DURATION);
    } else if (typeof enemySystem.applyTemporarySlowToEnemyMesh === "function") {
      enemySystem.applyTemporarySlowToEnemyMesh(target.mesh, SLOW_MULTIPLIER, SLOW_DURATION);
    }

    tower.slowProcFlash = 1;
    tower.cooldown = SLOW_FIRE_INTERVAL * towerFireRateMultiplier;
  }

  function updateGunTowerCombat(tower, deltaSeconds, enemySystem) {
    tower.cooldown = Math.max(0, tower.cooldown - deltaSeconds);
    tower.gunMuzzleFlashTimer = Math.max(0, (tower.gunMuzzleFlashTimer || 0) - deltaSeconds);

    const target = findTargetWithLineOfSight(tower, enemySystem, { skipSlowed: false });
    if (!target || !target.mesh || !target.mesh.visible) {
      return;
    }

    const yawNode = tower.mesh?.userData?.gunTurretYawNode;
    if (yawNode) {
      tempVecA.copy(target.aimPoint || target.position).sub(tower.mesh.position);
      tempVecA.y = 0;
      if (tempVecA.lengthSq() >= TOWER_CONFIG.segmentEpsilon) {
        const targetYaw = Math.atan2(tempVecA.x, tempVecA.z);
        const maxYawStep = Math.max(0, Number(GUN_TOWER_CONFIG.turretTurnSpeed) || 0) * Math.max(0, deltaSeconds);
        yawNode.rotation.y = rotateYawTowards(yawNode.rotation.y, targetYaw, maxYawStep);
      }
    }

    if (tower.cooldown <= 0) {
      const targetPoint = target.aimPoint ? target.aimPoint.clone() : target.position.clone();
      spawnGunProjectile(tower, targetPoint);
      tower.cooldown = GUN_FIRE_INTERVAL * towerFireRateMultiplier;
    }
  }

  function updateAoeTowerCombat(tower, deltaSeconds, enemySystem) {
    updateAoeTowerBobbing(tower, deltaSeconds);

    const hasEnemyInRange = hasDamageableEnemyInRange(tower, enemySystem);
    const chargeInterval = Math.max(0.05, AOE_PULSE_INTERVAL * towerFireRateMultiplier);
    if (hasEnemyInRange) {
      tower.chargeTimer += deltaSeconds;
    } else {
      tower.chargeTimer = Math.max(0, tower.chargeTimer - (deltaSeconds * 1.5));
    }

    let chargeRatio = THREE.MathUtils.clamp(tower.chargeTimer / chargeInterval, 0, 1);
    updateAoeTowerAppearance(tower, chargeRatio);

    if (!hasEnemyInRange || tower.chargeTimer < chargeInterval) {
      return;
    }

    const pulseRange = tower.range ?? AOE_RANGE;
    const pulseDamage = AOE_PULSE_DAMAGE * towerDamageMultiplier;
    while (tower.chargeTimer >= chargeInterval) {
      tower.chargeTimer -= chargeInterval;
      getAoePulseOrigin(tower, tempVecA);
      spawnAoePulse(tempVecA, pulseRange, pulseDamage);
    }

    chargeRatio = THREE.MathUtils.clamp(tower.chargeTimer / chargeInterval, 0, 1);
    updateAoeTowerAppearance(tower, chargeRatio);
  }

  function updateTowerCombat(deltaSeconds, enemySystem) {
    for (const tower of towers) {
      if (!tower.isOperational) {
        continue;
      }
      if (tower.towerType === "aoe") {
        updateAoeTowerCombat(tower, deltaSeconds, enemySystem);
      } else if (tower.towerType === "slow") {
        updateSlowTowerCombat(tower, deltaSeconds, enemySystem);
      } else {
        updateGunTowerCombat(tower, deltaSeconds, enemySystem);
      }
    }
  }

  function update(deltaSeconds, enemySystem) {
    updatePreviewFromCamera();
    updateTowerBuildEffects(deltaSeconds);
    updateTowerCombat(deltaSeconds, enemySystem);
    updateGunProjectiles(deltaSeconds, enemySystem);
    updateGunMuzzleFlashes(deltaSeconds);
    updateAoePulseEffects(deltaSeconds, enemySystem);
    updateSlowFieldEffects(deltaSeconds);
  }

  function disposeMeshResources(root, { disposeGeometry = true } = {}) {
    if (!root) {
      return;
    }
    const disposedMaterials = new Set();
    const disposedGeometries = new Set();
    root.traverse((child) => {
      if (disposeGeometry && child?.geometry && typeof child.geometry.dispose === "function" && !disposedGeometries.has(child.geometry)) {
        disposedGeometries.add(child.geometry);
        child.geometry.dispose();
      }
      if (!child?.material) {
        return;
      }
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!material || disposedMaterials.has(material) || typeof material.dispose !== "function") {
          continue;
        }
        disposedMaterials.add(material);
        material.dispose();
      }
    });
  }

  function clearAllTowers() {
    cancelPlacement();

    for (let i = gunProjectiles.length - 1; i >= 0; i -= 1) {
      destroyGunProjectile(gunProjectiles[i]);
    }
    gunProjectiles.length = 0;

    for (let i = gunMuzzleFlashes.length - 1; i >= 0; i -= 1) {
      scene.remove(gunMuzzleFlashes[i].mesh);
      gunMuzzleFlashes[i].mesh.material.dispose();
    }
    gunMuzzleFlashes.length = 0;

    for (let i = aoePulseEffects.length - 1; i >= 0; i -= 1) {
      destroyAoePulseEffect(aoePulseEffects[i]);
    }
    aoePulseEffects.length = 0;

    for (let i = slowFieldEffects.length - 1; i >= 0; i -= 1) {
      destroySlowFieldEffect(slowFieldEffects[i]);
    }
    slowFieldEffects.length = 0;

    for (let i = activeBuildEffects.length - 1; i >= 0; i -= 1) {
      const tower = activeBuildEffects[i];
      if (!tower) {
        continue;
      }
      if (tower.buildFxState) {
        restoreTowerBuildMaterialStates(tower.buildFxState.materialStates || []);
        disposeTowerBuildFxState(tower.buildFxState);
        tower.buildFxState = null;
      }
      tower.isOperational = true;
    }
    activeBuildEffects.length = 0;

    for (const tower of towers) {
      scene.remove(tower.mesh);
      disposeMeshResources(tower.mesh);
    }
    towers.length = 0;
    notifyBlockedCellsChanged();
  }

  function dispose() {
    clearAllTowers();

    hidePathRangeHighlights();
    if (preview?.parent) {
      scene.remove(preview);
    }
    disposeMeshResources(preview);

    for (const entry of pathRangeHighlights.entries) {
      if (entry?.mesh?.parent) {
        scene.remove(entry.mesh);
      }
    }
    pathRangeHighlights.entries.length = 0;
    pathRangeHighlights.material?.dispose?.();

    gunProjectileGeometry.dispose();
    gunProjectileMaterial.dispose();
    muzzleFlashGeometry.dispose();
    muzzleFlashMaterial.dispose();
    aoePulseGeometry.dispose();
    aoePulseMaterial.dispose();
    slowFieldGeometry.dispose();
    slowFieldMaterial.dispose();
    buildFxTeleportColumnGeometry.dispose();
    buildFxRingGeometry.dispose();
    buildFxSparkGeometry.dispose();
    buildFxSparkBaseMaterial.dispose();
  }

  function isBuildMode() {
    return buildMode;
  }

  function getStatusText() {
    if (buildMode) {
      if (selectedTowerType && !canAffordTower(selectedTowerType)) {
        const towerCost = getTowerCost(selectedTowerType);
        return `Build mode: need $${towerCost}`;
      }
      if (previewValid) {
        const selectedLabel = TOWER_DISPLAY_NAMES[selectedTowerType] || "tower";
        return `Build mode: place ${selectedLabel}`;
      }
      return "Build mode: invalid location";
    }
    return `Towers built: ${towers.length}`;
  }

  function getAvailableTowers(type = null) {
    if (typeof type === "string") {
      const normalizedType = normalizeTowerType(type);
      if (!normalizedType || !isTowerTypeUnlocked(normalizedType)) {
        return 0;
      }
      return canAffordTower(normalizedType) ? 1 : 0;
    }
    return getTowerInventory().reduce(
      (total, entry) => total + (entry.affordable ? 1 : 0),
      0
    );
  }

  function getTowerInventory() {
    return TOWER_TYPE_ORDER
      .filter((type) => unlockedTowerTypes.has(type))
      .map((type) => ({
        type,
        label: TOWER_DISPLAY_NAMES[type] || type,
        remaining: canAffordTower(type) ? 1 : 0,
        affordable: canAffordTower(type),
        cost: getTowerCost(type),
      }));
  }

  function getSelectedTowerType() {
    return selectedTowerType;
  }

  function getMovementObstacles() {
    return towers;
  }

  return {
    update,
    selectTower,
    cancelPlacement,
    placeSelectedTower,
    isBuildMode,
    getStatusText,
    getAvailableTowers,
    getTowerInventory,
    getSelectedTowerType,
    getMovementObstacles,
    getBlockedCells,
    getTowerCost,
    canAffordTower,
    unlockTowerType,
    isTowerTypeUnlocked,
    getUnlockedTowerTypes,
    upgradeTowerDamage,
    upgradeTowerFireRate,
    clearAllTowers,
    dispose,
    forcePlaceTower: (x, z, towerType = "gun") => {
      const normalizedType = normalizeTowerType(towerType);
      const towerSpec = getTowerSpec(normalizedType);
      if (!towerSpec) {
        return false;
      }
      unlockTowerType(normalizedType);

      const targetCell = typeof grid.worldToCell === "function"
        ? grid.worldToCell(x, z)
        : null;
      if (!targetCell || !Number.isInteger(targetCell.x) || !Number.isInteger(targetCell.z)) {
        return false;
      }
      const resolvedPlacement = resolvePlacementFromAim(targetCell, { x, z }, normalizedType);
      if (!resolvedPlacement || !isPlacementValid(resolvedPlacement) || !resolvedPlacement.position) {
        return false;
      }

      const towerMesh = createTowerPlacedMesh(normalizedType);

      towerMesh.position.copy(resolvedPlacement.position);
      scene.add(towerMesh);
      const towerEntry = createTowerEntry(
        normalizedType,
        towerMesh,
        resolvedPlacement.position,
        resolvedPlacement
      );
      if (!towerEntry) {
        scene.remove(towerMesh);
        return false;
      }
      towers.push(towerEntry);
      startTowerBuildFx(towerEntry);
      if (!notifyBlockedCellsChanged()) {
        const buildEffectIndex = activeBuildEffects.indexOf(towerEntry);
        if (buildEffectIndex >= 0) {
          activeBuildEffects.splice(buildEffectIndex, 1);
        }
        if (towerEntry.buildFxState) {
          restoreTowerBuildMaterialStates(towerEntry.buildFxState.materialStates || []);
          disposeTowerBuildFxState(towerEntry.buildFxState);
          towerEntry.buildFxState = null;
        }
        const towerIndex = towers.indexOf(towerEntry);
        if (towerIndex >= 0) {
          towers.splice(towerIndex, 1);
        }
        scene.remove(towerMesh);
        disposeMeshResources(towerMesh);
        return false;
      }
      return true;
    }
  };
}
