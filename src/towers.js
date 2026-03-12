import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";

const TOWER_CONFIG = GAME_CONFIG.towers;
const TOWER_TYPES = TOWER_CONFIG.types;
const GUN_TOWER_CONFIG = TOWER_TYPES.gun;
const AOE_TOWER_CONFIG = TOWER_TYPES.aoe;
const SLOW_TOWER_CONFIG = TOWER_TYPES.slow;
const LASER_SNIPER_TOWER_CONFIG = TOWER_TYPES.laserSniper;
const MORTAR_TOWER_CONFIG = TOWER_TYPES.mortar;
const TESLA_TOWER_CONFIG = TOWER_TYPES.tesla;
const SPIKES_TOWER_CONFIG = TOWER_TYPES.spikes;
const PLASMA_TOWER_CONFIG = TOWER_TYPES.plasma;
const BUFF_TOWER_CONFIG = TOWER_TYPES.buff;
const BLOCK_TOWER_CONFIG = TOWER_TYPES.block;

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
const LASER_SNIPER_RANGE = LASER_SNIPER_TOWER_CONFIG.range;
const LASER_SNIPER_FIRE_INTERVAL = LASER_SNIPER_TOWER_CONFIG.fireInterval;
const LASER_SNIPER_DAMAGE = LASER_SNIPER_TOWER_CONFIG.beamDamage;
const LASER_SNIPER_BEAM_DURATION = LASER_SNIPER_TOWER_CONFIG.beamDuration;
const MORTAR_RANGE = MORTAR_TOWER_CONFIG.range;
const MORTAR_FIRE_INTERVAL = MORTAR_TOWER_CONFIG.fireInterval;
const MORTAR_SPLASH_DAMAGE = MORTAR_TOWER_CONFIG.splashDamage;
const MORTAR_SPLASH_RADIUS = MORTAR_TOWER_CONFIG.splashRadius;
const MORTAR_PROJECTILE_LIFETIME = MORTAR_TOWER_CONFIG.projectileLifetime;
const TESLA_RANGE = TESLA_TOWER_CONFIG.range;
const TESLA_FIRE_INTERVAL = TESLA_TOWER_CONFIG.fireInterval;
const TESLA_DAMAGE = TESLA_TOWER_CONFIG.damage;
const TESLA_CHAIN_COUNT = Math.max(1, Math.floor(Number(TESLA_TOWER_CONFIG.chainCount) || 1));
const TESLA_CHAIN_RANGE = TESLA_TOWER_CONFIG.chainRange;
const TESLA_BOLT_DURATION = TESLA_TOWER_CONFIG.boltDuration;
const SPIKES_RANGE = SPIKES_TOWER_CONFIG.range;
const SPIKES_CYCLE_INTERVAL = SPIKES_TOWER_CONFIG.cycleInterval;
const SPIKES_ACTIVE_DURATION = SPIKES_TOWER_CONFIG.activeDuration;
const SPIKES_DAMAGE = SPIKES_TOWER_CONFIG.spikeDamage;
const SPIKES_HIT_RADIUS = SPIKES_TOWER_CONFIG.hitRadius;
const PLASMA_RANGE = PLASMA_TOWER_CONFIG.range;
const PLASMA_FIRE_INTERVAL = PLASMA_TOWER_CONFIG.fireInterval;
const PLASMA_DAMAGE = PLASMA_TOWER_CONFIG.damage;
const BUFF_RANGE = BUFF_TOWER_CONFIG.range;
const BLOCK_TOWER_DEFAULT_HALF_SIZE = 1;
const BLOCK_TOWER_HALF_SIZE = Number.isFinite(Number(BLOCK_TOWER_CONFIG.halfSize))
  ? Math.max(0.05, Number(BLOCK_TOWER_CONFIG.halfSize))
  : BLOCK_TOWER_DEFAULT_HALF_SIZE;
const BLOCK_TOWER_HEIGHT = Number.isFinite(Number(BLOCK_TOWER_CONFIG.height))
  ? Math.max(0.05, Number(BLOCK_TOWER_CONFIG.height))
  : 2;
const PATH_RANGE_HIGHLIGHT_VALID_COLOR = GUN_TOWER_CONFIG.rangeHighlightValidColor;
const PATH_RANGE_HIGHLIGHT_INVALID_COLOR = GUN_TOWER_CONFIG.rangeHighlightInvalidColor;
const BUILD_FX_CONFIG = TOWER_CONFIG.buildFx ?? {};
const TOWER_TYPE_ORDER = [
  "gun",
  "block",
  "aoe",
  "slow",
  "laserSniper",
  "mortar",
  "tesla",
  "spikes",
  "plasma",
  "buff",
];
const TOWER_DISPLAY_NAMES = {
  gun: "Gun Tower",
  block: "Build Block",
  aoe: "AOE Tower",
  slow: "Slow Tower",
  laserSniper: "Laser Sniper",
  mortar: "Mortar Tower",
  tesla: "Tesla Tower",
  spikes: "Spikes",
  plasma: "Plasma Burner",
  buff: "Buff Tower",
};
const SELL_CONFIG = TOWER_CONFIG.sell ?? {};
const DEFAULT_SELL_AIM_MAX_DISTANCE = Number.isFinite(Number(SELL_CONFIG.aimMaxDistance))
  ? Math.max(0.5, Number(SELL_CONFIG.aimMaxDistance))
  : 7;
const DEFAULT_SELL_PLAYER_MAX_DISTANCE = Number.isFinite(Number(SELL_CONFIG.playerMaxDistance))
  ? Math.max(0.5, Number(SELL_CONFIG.playerMaxDistance))
  : 5;
const DEFAULT_SELL_ANCHOR_Y_OFFSET = Number.isFinite(Number(SELL_CONFIG.anchorYOffset))
  ? Number(SELL_CONFIG.anchorYOffset)
  : 0.45;

function finiteOr(rawValue, fallback) {
  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function syncMaterialProxyState(material) {
  if (!material?.userData) {
    return;
  }
  const opacityUniformName = typeof material.userData.opacityUniformName === "string"
    ? material.userData.opacityUniformName
    : null;
  if (!opacityUniformName || !material.uniforms?.[opacityUniformName]) {
    return;
  }
  const opacityScale = Number.isFinite(Number(material.userData.opacityScale))
    ? Number(material.userData.opacityScale)
    : 1;
  material.uniforms[opacityUniformName].value = THREE.MathUtils.clamp(
    (Number(material.opacity) || 0) * opacityScale,
    0,
    1.5
  );
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

const PLASMA_FLAME_VERTEX_SHADER = `
  uniform float uTime;
  varying vec3 vLocalPos;

  void main() {
    vec3 p = position;
    float zN = clamp(p.z + 0.5, 0.0, 1.0);
    float swayX = sin((p.y * 14.0) + (uTime * 8.0) + (p.z * 20.0)) * 0.06 * zN;
    float swayY = cos((p.x * 13.0) - (uTime * 6.0) + (p.z * 17.0)) * 0.03 * zN;
    p.x += swayX;
    p.y += swayY;
    vLocalPos = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const PLASMA_FLAME_FRAGMENT_SHADER = `
  uniform vec3 uColorCore;
  uniform vec3 uColorEdge;
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vLocalPos;

  void main() {
    float zN = clamp(vLocalPos.z + 0.5, 0.0, 1.0);
    vec2 radialVec = vec2(vLocalPos.x * 1.18, vLocalPos.y * 0.86 + (zN * 0.18));
    float radial = length(radialVec);

    float coreMask = smoothstep(0.7, 0.08, radial);
    float startMask = smoothstep(0.0, 0.16, zN);
    float endMask = 1.0 - smoothstep(0.78, 1.0, zN);
    float flicker = 0.74 + (0.26 * sin((uTime * 17.0) + (zN * 31.0) + (vLocalPos.y * 14.0)));
    float turbulence = 0.8 + (0.2 * sin((uTime * 10.0) - (vLocalPos.x * 21.0) + (vLocalPos.y * 16.0)));
    float alpha = uOpacity * coreMask * startMask * endMask * flicker * turbulence;
    if (alpha <= 0.02) {
      discard;
    }

    vec3 color = mix(uColorEdge, uColorCore, zN);
    color += uColorCore * pow(zN, 1.8) * 0.32;
    gl_FragColor = vec4(color, alpha);
  }
`;

const GUN_BLACK_HOLE_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GUN_BLACK_HOLE_FRAGMENT_SHADER = `
  uniform vec3 uAccentColor;
  uniform vec3 uGlowColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uPulse;

  varying vec2 vUv;

  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec3 permute(vec3 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }

  float snoise(vec2 v) {
    const vec4 C = vec4(
      0.211324865405187,
      0.366025403784439,
      -0.577350269189626,
      0.024390243902439
    );
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
      + i.x
      + vec3(0.0, i1.x, 1.0)
    );
    vec3 m = max(
      0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)),
      0.0
    );
    m = m * m;
    m = m * m;
    vec3 x = (2.0 * fract(p * C.www)) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float falloff(float innerEdge, float outerEdge, float value) {
    return 1.0 - smoothstep(innerEdge, outerEdge, value);
  }

  void main() {
    vec2 uv = (vUv * 2.0) - 1.0;
    float dist = length(uv);
    if (dist > 1.0) {
      discard;
    }

    float pulse = clamp(uPulse, 0.0, 1.35);
    float eventHorizonRadius = 0.28 + (pulse * 0.018);
    vec2 radialDir = dist > 1e-4 ? (uv / dist) : vec2(0.0, 0.0);
    float lensing = falloff(eventHorizonRadius + 0.04, 0.94, dist);
    vec2 warpedUv = uv;
    warpedUv += radialDir * lensing * (0.22 * (0.7 - dist));
    warpedUv += vec2(-radialDir.y, radialDir.x) * lensing * sin((uTime * 1.7) + (dist * 16.0)) * 0.045;
    float warpedDist = length(warpedUv);
    float angle = atan(warpedUv.y, warpedUv.x);
    float speed = uTime * (2.25 + (pulse * 0.4));
    float spiral = angle + (6.0 * (1.0 - warpedDist)) - speed;

    vec2 noiseCoord = vec2(cos(spiral), sin(spiral)) * warpedDist * 4.2;
    float noise = 0.0;
    noise += 0.55 * snoise(noiseCoord - vec2(speed * 0.45, speed * 0.18));
    noise += 0.28 * snoise((noiseCoord * 2.0) - vec2(speed * 0.82, -speed * 0.36));
    noise += 0.14 * snoise((noiseCoord * 4.0) - vec2(speed * 1.18, speed * 0.72));
    noise = (noise * 0.5) + 0.5;

    float spiralWaveA = 0.5 + (0.5 * sin((spiral * 3.0) + (noise * 2.6)));
    float spiralWaveB = 0.5 + (0.5 * sin((angle * -8.0) - (dist * 18.0) - (speed * 1.4) + (noise * 4.0)));
    float fireBand = clamp((spiralWaveA * 0.65) + (spiralWaveB * 0.45), 0.0, 1.0);

    float discMask = falloff(0.92, 1.0, dist);
    float falloffMask = falloff(eventHorizonRadius + 0.08, 1.0, dist);
    float ringGlow = smoothstep(eventHorizonRadius + 0.02, eventHorizonRadius + 0.11, dist)
      * falloff(eventHorizonRadius + 0.11, eventHorizonRadius + 0.26, dist);
    float emberEdge = smoothstep(eventHorizonRadius + 0.04, 0.98, dist) * falloff(0.86, 1.0, dist);
    float sinkMask = falloff(0.0, eventHorizonRadius + 0.04, dist);
    float centerCut = smoothstep(eventHorizonRadius - 0.015, eventHorizonRadius + 0.03, dist);

    float fireIntensity = ((noise * 0.6) + (fireBand * 0.7)) * falloffMask * 1.25;
    fireIntensity += ringGlow * (0.55 + (pulse * 0.18));
    fireIntensity *= discMask;

    vec3 deepSpace = mix(vec3(0.08, 0.01, 0.04), uAccentColor * 0.08, 0.6);
    vec3 emberColor = mix(uAccentColor, uGlowColor, 0.52);
    vec3 whiteHot = mix(uGlowColor, vec3(1.0, 0.92, 0.8), 0.55);

    vec3 finalColor = mix(deepSpace, emberColor, smoothstep(0.0, 0.45, fireIntensity));
    finalColor = mix(finalColor, whiteHot, smoothstep(0.45, 1.1, fireIntensity));
    finalColor += emberColor * emberEdge * 0.18;
    finalColor = mix(finalColor, vec3(0.0), sinkMask * 0.96);
    finalColor = mix(vec3(0.0), finalColor, centerCut);

    float alpha = uOpacity * discMask * clamp(
      0.26 + (fireIntensity * 0.7) + (ringGlow * 0.16),
      0.0,
      1.0
    );
    alpha *= 1.0 - (sinkMask * 0.94);
    alpha = max(alpha, uOpacity * ringGlow * 0.24);

    if (dist < eventHorizonRadius) {
      gl_FragColor = vec4(vec3(0.0), uOpacity);
      return;
    }

    if (alpha <= 0.01) {
      discard;
    }

    gl_FragColor = vec4(finalColor, min(alpha, 1.0));
  }
`;

export function createTowerSystem({
  scene,
  camera,
  grid,
  localOwnerId = "local",
  getCurrentMoney = null,
  spendMoney = null,
  refundMoney = null,
  canBlockCells = null,
  canBlockCell = null,
  getBlockedRevision = null,
  onBlockedCellsChanged = null,
  onTowerPlaced = null,
} = {}) {
  const raycaster = new THREE.Raycaster();
  let activeLocalOwnerId = typeof localOwnerId === "string" && localOwnerId.length > 0
    ? localOwnerId
    : "local";
  const aimPoint = new THREE.Vector2(0, 0);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -grid.tileTopY);
  const groundHit = new THREE.Vector3();
  const terrainObstacles = Array.isArray(grid.heightObstacles) ? grid.heightObstacles : [];
  const rampObstacles = Array.isArray(grid.rampObstacles) ? grid.rampObstacles : [];
  const spawnCells = Array.isArray(grid.spawnCells) ? grid.spawnCells : [];
  const endCell = grid.endCell ?? null;
  const gridCellSize = Math.max(0.01, Number(grid.cellSize) || 0);
  const gridCubeHalfSize = gridCellSize * 0.5;
  const spawnTargetBlockVolumes = spawnCells
    .map((cell) => {
      if (!Number.isInteger(cell?.x) || !Number.isInteger(cell?.z)) {
        return null;
      }
      const spawnCellY = Number.isFinite(Number(cell?.y))
        ? Number(cell.y)
        : 0;
      const spawnBaseY = grid.tileTopY + (spawnCellY * gridCellSize);
      const center = typeof grid.cellToWorldCenter === "function"
        ? grid.cellToWorldCenter(cell.x, cell.z, spawnBaseY)
        : new THREE.Vector3(0, spawnBaseY, 0);
      return {
        minX: center.x - gridCubeHalfSize,
        maxX: center.x + gridCubeHalfSize,
        minY: spawnBaseY,
        maxY: spawnBaseY + gridCellSize,
        minZ: center.z - gridCubeHalfSize,
        maxZ: center.z + gridCubeHalfSize,
      };
    })
    .filter((entry) => !!entry);

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

  const laserBeamGeometry = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  const laserBeamMaterial = new THREE.MeshBasicMaterial({
    color: LASER_SNIPER_TOWER_CONFIG.beamColor,
    transparent: true,
    opacity: LASER_SNIPER_TOWER_CONFIG.beamOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  laserBeamMaterial.toneMapped = false;

  const mortarProjectileGeometry = new THREE.BoxGeometry(
    MORTAR_TOWER_CONFIG.projectileSize,
    MORTAR_TOWER_CONFIG.projectileSize,
    MORTAR_TOWER_CONFIG.projectileSize
  );
  const mortarProjectileMaterial = new THREE.MeshStandardMaterial({
    color: MORTAR_TOWER_CONFIG.projectileColor,
    emissive: MORTAR_TOWER_CONFIG.projectileEmissive,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.25,
  });
  const mortarExplosionGeometry = new THREE.SphereGeometry(1, 16, 12);
  const mortarExplosionMaterial = new THREE.MeshBasicMaterial({
    color: MORTAR_TOWER_CONFIG.explosionColor,
    transparent: true,
    opacity: MORTAR_TOWER_CONFIG.explosionOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  mortarExplosionMaterial.toneMapped = false;

  const teslaBoltGeometry = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  const teslaBoltMaterial = new THREE.MeshBasicMaterial({
    color: TESLA_TOWER_CONFIG.boltColor,
    transparent: true,
    opacity: TESLA_TOWER_CONFIG.boltOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  teslaBoltMaterial.toneMapped = false;

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
  const tempVecI = new THREE.Vector3();
  const tempVecJ = new THREE.Vector3();
  const tempVecK = new THREE.Vector3();
  const tempBoxA = new THREE.Box3();
  const tempColorA = new THREE.Color();
  const tempColorB = new THREE.Color();
  const tempQuatA = new THREE.Quaternion();
  const upVector = new THREE.Vector3(0, 1, 0);
  const gunProjectiles = [];
  const gunMuzzleFlashes = [];
  const aoePulseEffects = [];
  const slowFieldEffects = [];
  const laserBeamEffects = [];
  const mortarProjectiles = [];
  const mortarExplosions = [];
  const teslaBoltEffects = [];
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
    block: {
      type: "block",
      range: 0,
      radius: BLOCK_TOWER_HALF_SIZE,
      halfSize: BLOCK_TOWER_HALF_SIZE,
      height: BLOCK_TOWER_HEIGHT,
      usesLineOfSight: false,
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
    laserSniper: {
      type: "laserSniper",
      range: LASER_SNIPER_RANGE,
      radius: Math.max(0.1, Number(LASER_SNIPER_TOWER_CONFIG.halfSize) || 0.95),
      halfSize: Math.max(0.1, Number(LASER_SNIPER_TOWER_CONFIG.halfSize) || 0.95),
      height: Math.max(0.1, Number(LASER_SNIPER_TOWER_CONFIG.height) || 2.4),
      usesLineOfSight: true,
    },
    mortar: {
      type: "mortar",
      range: MORTAR_RANGE,
      radius: Math.max(0.1, Number(MORTAR_TOWER_CONFIG.halfSize) || 1.05),
      halfSize: Math.max(0.1, Number(MORTAR_TOWER_CONFIG.halfSize) || 1.05),
      height: Math.max(0.1, Number(MORTAR_TOWER_CONFIG.height) || 2.15),
      usesLineOfSight: false,
    },
    tesla: {
      type: "tesla",
      range: TESLA_RANGE,
      radius: Math.max(0.1, Number(TESLA_TOWER_CONFIG.halfSize) || 0.92),
      halfSize: Math.max(0.1, Number(TESLA_TOWER_CONFIG.halfSize) || 0.92),
      height: Math.max(0.1, Number(TESLA_TOWER_CONFIG.height) || 2.25),
      usesLineOfSight: true,
    },
    spikes: {
      type: "spikes",
      range: SPIKES_RANGE,
      radius: Math.max(0.1, Number(SPIKES_TOWER_CONFIG.halfSize) || 0.98),
      halfSize: Math.max(0.1, Number(SPIKES_TOWER_CONFIG.halfSize) || 0.98),
      height: Math.max(0.1, Number(SPIKES_TOWER_CONFIG.height) || 0.8),
      usesLineOfSight: false,
    },
    plasma: {
      type: "plasma",
      range: PLASMA_RANGE,
      radius: Math.max(
        0.1,
        Number.isFinite(Number(PLASMA_TOWER_CONFIG.halfSizeX))
          ? Number(PLASMA_TOWER_CONFIG.halfSizeX)
          : Number(PLASMA_TOWER_CONFIG.halfSizeZ) || 0.72
      ),
      halfSize: Math.max(0.1, Number(PLASMA_TOWER_CONFIG.halfSizeZ) || 0.72),
      halfSizeX: Math.max(0.1, Number(PLASMA_TOWER_CONFIG.halfSizeX) || 0.36),
      halfSizeZ: Math.max(0.1, Number(PLASMA_TOWER_CONFIG.halfSizeZ) || 0.72),
      height: Math.max(0.1, Number(PLASMA_TOWER_CONFIG.height) || 1.15),
      usesLineOfSight: false,
    },
    buff: {
      type: "buff",
      range: BUFF_RANGE,
      radius: Math.max(0.1, Number(BUFF_TOWER_CONFIG.halfSize) || 0.9),
      halfSize: Math.max(0.1, Number(BUFF_TOWER_CONFIG.halfSize) || 0.9),
      height: Math.max(0.1, Number(BUFF_TOWER_CONFIG.height) || 2.1),
      usesLineOfSight: false,
    },
  };

  let selectedTowerType = null;
  let buildMode = false;
  const towers = [];
  let previewValid = false;
  let previewPlacement = null;
  let previewPathBlockCache = null;
  let suppressPreviewFootprintKey = null;
  const peerPreviewEntries = new Map();

  const reservedCellKeys = new Set(
    spawnCells.map((cell) => `${cell.x},${cell.z}`)
  );
  if (endCell && Number.isInteger(endCell.x) && Number.isInteger(endCell.z)) {
    reservedCellKeys.add(`${endCell.x},${endCell.z}`);
  }

  let towerDamageMultiplier = 1;
  let towerFireRateMultiplier = 1;
  const towerTechModifiersByType = new Map();
  const towerTechModifiersByOwner = new Map();
  for (const type of TOWER_TYPE_ORDER) {
    towerTechModifiersByType.set(type, {
      damageMultiplier: 1,
      fireIntervalMultiplier: 1,
      rangeAdd: 0,
      projectilePierce: 0,
      laserPierceTargets: 0,
      mortarSplashRadiusAdd: 0,
      teslaChainCountAdd: 0,
      spikesCycleIntervalMultiplier: 1,
      spikesActiveDurationMultiplier: 1,
      plasmaDepthCellsAdd: 0,
      plasmaSideCellsAdd: 0,
      slowMultiplierAdd: 0,
      slowDurationMultiplier: 1,
      buffRangeAdd: 0,
      buffDamageBonusPerTowerAdd: 0,
      buffFireRateBonusPerTowerAdd: 0,
      buffAffectsBuffTowers: false,
      costSet: null,
      opacitySet: null,
    });
  }

  function createDefaultTowerTechModifiers() {
    return {
      damageMultiplier: 1,
      fireIntervalMultiplier: 1,
      rangeAdd: 0,
      projectilePierce: 0,
      laserPierceTargets: 0,
      mortarSplashRadiusAdd: 0,
      teslaChainCountAdd: 0,
      spikesCycleIntervalMultiplier: 1,
      spikesActiveDurationMultiplier: 1,
      plasmaDepthCellsAdd: 0,
      plasmaSideCellsAdd: 0,
      slowMultiplierAdd: 0,
      slowDurationMultiplier: 1,
      buffRangeAdd: 0,
      buffDamageBonusPerTowerAdd: 0,
      buffFireRateBonusPerTowerAdd: 0,
      buffAffectsBuffTowers: false,
      costSet: null,
      opacitySet: null,
    };
  }

  function normalizeOwnerId(ownerId) {
    if (typeof ownerId === "string" && ownerId.length > 0) {
      return ownerId;
    }
    return activeLocalOwnerId;
  }

  function ensureOwnerTechModifiers(ownerId) {
    const key = normalizeOwnerId(ownerId);
    if (!towerTechModifiersByOwner.has(key)) {
      const byType = new Map();
      for (const type of TOWER_TYPE_ORDER) {
        byType.set(type, createDefaultTowerTechModifiers());
      }
      towerTechModifiersByOwner.set(key, byType);
    }
    return towerTechModifiersByOwner.get(key);
  }

  function getTowerTechModifiers(type, ownerId = null) {
    const normalizedType = normalizeTowerType(type);
    if (!normalizedType) {
      return null;
    }
    const resolvedOwnerId = normalizeOwnerId(ownerId);
    if (resolvedOwnerId) {
      const ownerMap = ensureOwnerTechModifiers(resolvedOwnerId);
      const ownerModifiers = ownerMap.get(normalizedType) ?? null;
      if (ownerModifiers) {
        return ownerModifiers;
      }
    }
    return towerTechModifiersByType.get(normalizedType) ?? null;
  }

  function getTowerRangeForType(type, ownerId = null) {
    const spec = getTowerSpec(type);
    if (!spec) {
      return 0;
    }
    const modifiers = getTowerTechModifiers(type, ownerId);
    const rangeAdd = Number.isFinite(Number(modifiers?.rangeAdd))
      ? Number(modifiers.rangeAdd)
      : 0;
    const buffRangeAdd = Number.isFinite(Number(modifiers?.buffRangeAdd))
      ? Number(modifiers.buffRangeAdd)
      : 0;
    return Math.max(0.1, Number(spec.range) + rangeAdd + buffRangeAdd);
  }

  function makeCellKey(cellX, cellZ) {
    return `${cellX},${cellZ}`;
  }

  function doesTowerTypeBlockPath(towerType) {
    const normalizedType = normalizeTowerType(towerType);
    if (!normalizedType) {
      return true;
    }
    if (normalizedType === "plasma" || normalizedType === "spikes") {
      return false;
    }
    return true;
  }

  function doesTowerTypeCollideWithPlayer(towerType) {
    const normalizedType = normalizeTowerType(towerType);
    if (!normalizedType) {
      return true;
    }
    if (normalizedType === "plasma" || normalizedType === "spikes") {
      return false;
    }
    return true;
  }

  function normalizeTowerType(type) {
    if (typeof type !== "string") {
      return null;
    }
    const trimmed = type.trim();
    const lowered = trimmed.toLowerCase();
    if (lowered === "emp") {
      return "aoe";
    }
    if (lowered === "lasersniper" || lowered === "laser_sniper" || lowered === "sniper") {
      return "laserSniper";
    }
    if (lowered === "plasmaburner") {
      return "plasma";
    }
    const byExactKey = Object.keys(towerSpecs).find((key) => key.toLowerCase() === lowered);
    if (byExactKey) {
      return byExactKey;
    }
    if (Object.prototype.hasOwnProperty.call(towerSpecs, trimmed)) {
      return trimmed;
    }
    return null;
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

  function getTowerCost(type, ownerId = null) {
    const normalizedType = normalizeTowerType(type);
    if (!normalizedType) {
      return 0;
    }
    const configuredCost = Number(TOWER_TYPES[normalizedType]?.cost);
    if (!Number.isFinite(configuredCost)) {
      return 0;
    }
    let resolvedCost = configuredCost;
    if (normalizedType === "block") {
      const blockCostOverride = getTowerTechModifiers("block", ownerId)?.costSet;
      const blockCostSet = Number(blockCostOverride);
      if (blockCostOverride != null && Number.isFinite(blockCostSet) && blockCostSet >= 0) {
        resolvedCost = blockCostSet;
      }
    }
    return Math.max(0, Math.floor(resolvedCost));
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

  function canAffordTower(type, ownerId = null) {
    const cost = getTowerCost(type, ownerId);
    if (cost <= 0) {
      return true;
    }
    return getPlayerMoney() >= cost;
  }

  function spendTowerCost(type, ownerId = null) {
    const cost = getTowerCost(type, ownerId);
    if (cost <= 0) {
      return true;
    }
    if (typeof spendMoney !== "function") {
      return true;
    }
    return !!spendMoney(cost, type);
  }

  function refundTowerCost(type, ownerId = null) {
    const cost = getTowerCost(type, ownerId);
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

  function towerOccupiesCell(tower, cellX, cellZ) {
    if (!tower || typeof tower !== "object") {
      return false;
    }
    if (Array.isArray(tower.occupiedCells)) {
      for (const cell of tower.occupiedCells) {
        if (cell?.x === cellX && cell?.z === cellZ) {
          return true;
        }
      }
      return false;
    }
    return tower.cellX === cellX && tower.cellZ === cellZ;
  }

  function getTowersAtCell(cellX, cellZ) {
    const results = [];
    for (const tower of towers) {
      if (towerOccupiesCell(tower, cellX, cellZ)) {
        results.push(tower);
      }
    }
    return results;
  }

  function findTowerAtCell(cellX, cellZ) {
    return getTowersAtCell(cellX, cellZ)[0] ?? null;
  }

  function getTowerVerticalBounds(baseY, height) {
    const safeBaseY = Number(baseY);
    const safeHeight = Math.max(0.01, Number(height) || gridCellSize);
    if (!Number.isFinite(safeBaseY)) {
      return null;
    }
    return {
      minY: safeBaseY,
      maxY: safeBaseY + safeHeight,
    };
  }

  function doVerticalBoundsOverlap(boundsA, boundsB, epsilon = 1e-4) {
    if (!boundsA || !boundsB) {
      return true;
    }
    return (boundsA.minY < (boundsB.maxY - epsilon)) && (boundsB.minY < (boundsA.maxY - epsilon));
  }

  function getBlockSurfaceOpacity(targetOpacity) {
    const clampedTargetOpacity = THREE.MathUtils.clamp(Number(targetOpacity) || 1, 0.05, 1);
    return clampedTargetOpacity;
  }

  function getBlockOpacityForOwner(ownerId = null) {
    const configuredPlacedOpacity = Number(BLOCK_TOWER_CONFIG.placedOpacity);
    let opacity = Number.isFinite(configuredPlacedOpacity)
      ? THREE.MathUtils.clamp(configuredPlacedOpacity, 0.05, 1)
      : 1;
    const opacityOverride = getTowerTechModifiers("block", ownerId)?.opacitySet;
    const opacitySet = Number(opacityOverride);
    if (opacityOverride != null && Number.isFinite(opacitySet)) {
      opacity = THREE.MathUtils.clamp(opacitySet, 0.05, 1);
    }
    return getBlockSurfaceOpacity(opacity);
  }

  function applyBlockOpacityToMesh(mesh, opacity) {
    if (!mesh || !mesh.userData) {
      return;
    }
    const safeOpacity = THREE.MathUtils.clamp(Number(opacity) || 1, 0.05, 1);
    const shouldBeTransparent = safeOpacity < 0.999;
    const materials = Array.isArray(mesh.userData.materials) ? mesh.userData.materials : [];
    for (const material of materials) {
      if (!material) {
        continue;
      }
      if ("transparent" in material) {
        material.transparent = shouldBeTransparent;
      }
      if ("opacity" in material) {
        material.opacity = safeOpacity;
      }
      if ("emissiveIntensity" in material) {
        const baseEmissiveIntensity = Number(material.userData?.baseEmissiveIntensity);
        if (Number.isFinite(baseEmissiveIntensity)) {
          material.emissiveIntensity = shouldBeTransparent
            ? baseEmissiveIntensity * safeOpacity
            : baseEmissiveIntensity;
        }
      }
      if ("depthWrite" in material) {
        material.depthWrite = !shouldBeTransparent;
      }
      syncMaterialProxyState(material);
      material.needsUpdate = true;
    }
    const outlineMaterial = mesh.userData?.footprintOutlineMaterial;
    if (outlineMaterial) {
      const baseOutlineOpacity = Number(outlineMaterial.userData?.baseOpacity);
      const resolvedBaseOpacity = Number.isFinite(baseOutlineOpacity) ? baseOutlineOpacity : 0.46;
      outlineMaterial.opacity = shouldBeTransparent
        ? resolvedBaseOpacity * Math.max(0.2, safeOpacity)
        : resolvedBaseOpacity;
      outlineMaterial.needsUpdate = true;
    }
  }

  function applyBlockOpacityToTower(tower, ownerId = null, opacityOverride = null) {
    if (!tower || tower.towerType !== "block") {
      return;
    }
    const resolvedOpacity = opacityOverride != null && Number.isFinite(Number(opacityOverride))
      ? THREE.MathUtils.clamp(Number(opacityOverride), 0.05, 1)
      : getBlockOpacityForOwner(ownerId);
    tower.blockOpacity = resolvedOpacity;
    applyBlockOpacityToMesh(tower.mesh, resolvedOpacity);
  }

  function refreshBlockTowerOpacityForOwner(ownerId = null) {
    const normalizedOwnerId = normalizeOwnerId(ownerId);
    for (const tower of towers) {
      if (tower?.towerType !== "block") {
        continue;
      }
      if (normalizeOwnerId(tower.ownerId) !== normalizedOwnerId) {
        continue;
      }
      applyBlockOpacityToTower(tower, normalizedOwnerId);
    }
  }

  function findTowerByAnchorKey(anchorKey) {
    if (typeof anchorKey !== "string" || anchorKey.length === 0) {
      return null;
    }
    for (const tower of towers) {
      if (tower?.anchorKey === anchorKey) {
        return tower;
      }
    }
    return null;
  }

  function getTowerTargetId(tower) {
    if (!tower || typeof tower !== "object") {
      return null;
    }
    if (typeof tower.anchorKey === "string" && tower.anchorKey.length > 0) {
      return tower.anchorKey;
    }
    if (typeof tower.footprintKey === "string" && tower.footprintKey.length > 0) {
      return tower.footprintKey;
    }
    return null;
  }

  function findTowerByTargetId(targetId) {
    if (typeof targetId !== "string" || targetId.length === 0) {
      return null;
    }
    for (const tower of towers) {
      if (getTowerTargetId(tower) === targetId) {
        return tower;
      }
    }
    return null;
  }

  function getBlockedCells() {
    const unique = new Map();
    for (const tower of towers) {
      if (!doesTowerTypeBlockPath(tower?.towerType)) {
        continue;
      }
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

  function getPlacementFootprintKey(cells, baseY = null) {
    const cellFootprint = getFootprintKey(cells);
    if (!cellFootprint || !Number.isFinite(Number(baseY))) {
      return cellFootprint;
    }
    return `${cellFootprint}@${Number(baseY).toFixed(3)}`;
  }

  function getBlockedCellKeySet() {
    const blockedKeys = new Set();
    for (const tower of towers) {
      if (!doesTowerTypeBlockPath(tower?.towerType)) {
        continue;
      }
      const cells = Array.isArray(tower.occupiedCells)
        ? tower.occupiedCells
        : [{ x: tower.cellX, z: tower.cellZ }];
      for (const cell of cells) {
        if (!Number.isInteger(cell?.x) || !Number.isInteger(cell?.z)) {
          continue;
        }
        blockedKeys.add(makeCellKey(cell.x, cell.z));
      }
    }
    return blockedKeys;
  }

  function getNewlyBlockedPlacementCells(placement) {
    if (
      !doesTowerTypeBlockPath(placement?.towerType)
      || !Array.isArray(placement?.occupiedCells)
      || placement.occupiedCells.length === 0
    ) {
      return [];
    }
    const existingBlockedKeys = getBlockedCellKeySet();
    return placement.occupiedCells.filter((cell) => !existingBlockedKeys.has(makeCellKey(cell.x, cell.z)));
  }

  function towersShareAnyOccupiedCell(a, b) {
    if (!a || !b) {
      return false;
    }
    const aCells = Array.isArray(a.occupiedCells) ? a.occupiedCells : [];
    const bCells = Array.isArray(b.occupiedCells) ? b.occupiedCells : [];
    for (const aCell of aCells) {
      for (const bCell of bCells) {
        if (aCell?.x === bCell?.x && aCell?.z === bCell?.z) {
          return true;
        }
      }
    }
    return false;
  }

  function isTowerSupportingOtherTower(tower) {
    if (!tower || tower.towerType !== "block") {
      return false;
    }
    const supportTopY = Number(tower.baseY) + Math.max(0.01, Number(tower.height) || BLOCK_TOWER_HEIGHT);
    if (!Number.isFinite(supportTopY)) {
      return false;
    }
    for (const otherTower of towers) {
      if (otherTower === tower || !towersShareAnyOccupiedCell(tower, otherTower)) {
        continue;
      }
      const otherBaseY = Number(otherTower.baseY);
      if (Number.isFinite(otherBaseY) && otherBaseY >= (supportTopY - 1e-4)) {
        return true;
      }
    }
    return false;
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

  function applyTowerModifierPatch(modifiers, modifierPatch) {
    if (!modifiers || !modifierPatch || typeof modifierPatch !== "object") {
      return false;
    }
    let appliedAny = false;

    const damageMultiplier = Number(modifierPatch.damageMultiplier);
    if (Number.isFinite(damageMultiplier) && damageMultiplier > 0) {
      modifiers.damageMultiplier *= damageMultiplier;
      appliedAny = true;
    }

    const fireIntervalMultiplier = Number(modifierPatch.fireIntervalMultiplier);
    if (Number.isFinite(fireIntervalMultiplier) && fireIntervalMultiplier > 0) {
      modifiers.fireIntervalMultiplier *= fireIntervalMultiplier;
      appliedAny = true;
    }

    const rangeAdd = Number(modifierPatch.rangeAdd);
    if (Number.isFinite(rangeAdd) && rangeAdd !== 0) {
      modifiers.rangeAdd += rangeAdd;
      appliedAny = true;
    }

    const projectilePierceAdd = Math.floor(Number(modifierPatch.projectilePierceAdd));
    if (Number.isFinite(projectilePierceAdd) && projectilePierceAdd !== 0) {
      modifiers.projectilePierce += projectilePierceAdd;
      appliedAny = true;
    }

    const laserPierceTargetsAdd = Math.floor(Number(modifierPatch.laserPierceTargetsAdd));
    if (Number.isFinite(laserPierceTargetsAdd) && laserPierceTargetsAdd !== 0) {
      modifiers.laserPierceTargets += laserPierceTargetsAdd;
      appliedAny = true;
    }

    const mortarSplashRadiusAdd = Number(modifierPatch.mortarSplashRadiusAdd);
    if (Number.isFinite(mortarSplashRadiusAdd) && mortarSplashRadiusAdd !== 0) {
      modifiers.mortarSplashRadiusAdd += mortarSplashRadiusAdd;
      appliedAny = true;
    }

    const teslaChainCountAdd = Math.floor(Number(modifierPatch.teslaChainCountAdd));
    if (Number.isFinite(teslaChainCountAdd) && teslaChainCountAdd !== 0) {
      modifiers.teslaChainCountAdd += teslaChainCountAdd;
      appliedAny = true;
    }

    const spikesCycleIntervalMultiplier = Number(modifierPatch.spikesCycleIntervalMultiplier);
    if (Number.isFinite(spikesCycleIntervalMultiplier) && spikesCycleIntervalMultiplier > 0) {
      modifiers.spikesCycleIntervalMultiplier *= spikesCycleIntervalMultiplier;
      appliedAny = true;
    }

    const spikesActiveDurationMultiplier = Number(modifierPatch.spikesActiveDurationMultiplier);
    if (Number.isFinite(spikesActiveDurationMultiplier) && spikesActiveDurationMultiplier > 0) {
      modifiers.spikesActiveDurationMultiplier *= spikesActiveDurationMultiplier;
      appliedAny = true;
    }

    const plasmaDepthCellsAdd = Math.floor(Number(modifierPatch.plasmaDepthCellsAdd));
    if (Number.isFinite(plasmaDepthCellsAdd) && plasmaDepthCellsAdd !== 0) {
      modifiers.plasmaDepthCellsAdd += plasmaDepthCellsAdd;
      appliedAny = true;
    }

    const plasmaSideCellsAdd = Math.floor(Number(modifierPatch.plasmaSideCellsAdd));
    if (Number.isFinite(plasmaSideCellsAdd) && plasmaSideCellsAdd !== 0) {
      modifiers.plasmaSideCellsAdd += plasmaSideCellsAdd;
      appliedAny = true;
    }

    const slowMultiplierAdd = Number(modifierPatch.slowMultiplierAdd);
    if (Number.isFinite(slowMultiplierAdd) && slowMultiplierAdd !== 0) {
      modifiers.slowMultiplierAdd += slowMultiplierAdd;
      appliedAny = true;
    }

    const slowDurationMultiplier = Number(modifierPatch.slowDurationMultiplier);
    if (Number.isFinite(slowDurationMultiplier) && slowDurationMultiplier > 0) {
      modifiers.slowDurationMultiplier *= slowDurationMultiplier;
      appliedAny = true;
    }

    const buffRangeAdd = Number(modifierPatch.buffRangeAdd);
    if (Number.isFinite(buffRangeAdd) && buffRangeAdd !== 0) {
      modifiers.buffRangeAdd += buffRangeAdd;
      appliedAny = true;
    }

    const buffDamageBonusPerTowerAdd = Number(modifierPatch.buffDamageBonusPerTowerAdd);
    if (Number.isFinite(buffDamageBonusPerTowerAdd) && buffDamageBonusPerTowerAdd !== 0) {
      modifiers.buffDamageBonusPerTowerAdd += buffDamageBonusPerTowerAdd;
      appliedAny = true;
    }

    const buffFireRateBonusPerTowerAdd = Number(modifierPatch.buffFireRateBonusPerTowerAdd);
    if (Number.isFinite(buffFireRateBonusPerTowerAdd) && buffFireRateBonusPerTowerAdd !== 0) {
      modifiers.buffFireRateBonusPerTowerAdd += buffFireRateBonusPerTowerAdd;
      appliedAny = true;
    }

    if (modifierPatch.buffAffectsBuffTowers === true) {
      modifiers.buffAffectsBuffTowers = true;
      appliedAny = true;
    }

    const costSet = Number(modifierPatch.costSet);
    if (Number.isFinite(costSet) && costSet >= 0) {
      modifiers.costSet = Math.floor(costSet);
      appliedAny = true;
    }

    const opacitySet = Number(modifierPatch.opacitySet);
    if (Number.isFinite(opacitySet)) {
      modifiers.opacitySet = THREE.MathUtils.clamp(opacitySet, 0.05, 1);
      appliedAny = true;
    }

    return appliedAny;
  }

  function applyTechGrants(grants = {}, options = {}) {
    let appliedAny = false;
    const ownerId = normalizeOwnerId(options?.ownerId);

    if (typeof grants.unlockTowerType === "string") {
      appliedAny = unlockTowerType(grants.unlockTowerType) || appliedAny;
    }

    const towerGrants = grants?.tower;
    if (towerGrants && typeof towerGrants === "object") {
      for (const [rawType, modifierPatch] of Object.entries(towerGrants)) {
        const normalizedType = normalizeTowerType(rawType);
        const modifiers = getTowerTechModifiers(rawType, ownerId);
        const hadOpacityGrant = normalizedType === "block"
          && Number.isFinite(Number(modifierPatch?.opacitySet));
        appliedAny = applyTowerModifierPatch(modifiers, modifierPatch) || appliedAny;
        if (hadOpacityGrant) {
          refreshBlockTowerOpacityForOwner(ownerId);
        }
      }
    }

    return appliedAny;
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

  function createGunBlackHoleParticleTexture() {
    const particleCanvas = document.createElement("canvas");
    particleCanvas.width = 32;
    particleCanvas.height = 32;
    const ctx = particleCanvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.22, "rgba(255, 190, 96, 0.98)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(particleCanvas);
    texture.needsUpdate = true;
    return texture;
  }

  const gunBlackHoleParticleTexture = createGunBlackHoleParticleTexture();

  function createGunBlackHoleParticleSystem({
    radius,
    opacity = 1,
  }) {
    const particleCount = 18;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const positionAttribute = new THREE.BufferAttribute(positions, 3);
    const particleData = [];
    const sinkRadius = radius * 0.32;
    const outerRadiusMin = radius * 0.62;
    const outerRadiusMax = radius * 1.04;
    const depthRange = Math.max(0.03, radius * 0.22);

    for (let i = 0; i < particleCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const particleRadius = THREE.MathUtils.lerp(outerRadiusMin, outerRadiusMax, Math.random());
      const swirlSpeed = 1.2 + (Math.random() * 1.3);
      const inwardSpeed = 0.42 + (Math.random() * 0.68);
      const zOffset = Math.random() * depthRange;

      particleData.push({
        angle,
        radius: particleRadius,
        swirlSpeed,
        inwardSpeed,
        zOffset,
      });

      positions[i * 3] = Math.cos(angle) * particleRadius;
      positions[(i * 3) + 1] = Math.sin(angle) * particleRadius;
      positions[(i * 3) + 2] = zOffset;
    }

    geometry.setAttribute("position", positionAttribute);

    const material = new THREE.PointsMaterial({
      color: 0xffc278,
      size: Math.max(0.035, radius * 0.18),
      map: gunBlackHoleParticleTexture,
      transparent: true,
      opacity: Math.max(0.16, Math.min(1, opacity * 0.82)),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    material.toneMapped = false;

    return {
      mesh: new THREE.Points(geometry, material),
      state: {
        positionAttribute,
        particleData,
        sinkRadius,
        outerRadiusMin,
        outerRadiusMax,
        depthRange,
      },
    };
  }

  function createGunBlackHoleMaterial({
    accentColor,
    glowColor,
    opacity = 1,
  }) {
    const uniforms = {
      uAccentColor: { value: new THREE.Color(accentColor) },
      uGlowColor: { value: new THREE.Color(glowColor) },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uPulse: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: GUN_BLACK_HOLE_VERTEX_SHADER,
      fragmentShader: GUN_BLACK_HOLE_FRAGMENT_SHADER,
    });
    material.name = "GunBlackHoleMaterial";
    material.toneMapped = false;
    material.opacity = opacity;
    material.color = uniforms.uAccentColor.value;
    material.emissive = uniforms.uGlowColor.value;
    material.userData = {
      ...(material.userData || {}),
      opacityUniformName: "uOpacity",
      opacityScale: 0.96,
    };
    syncMaterialProxyState(material);
    return { material, uniforms };
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
    turretYawNode.position.y = GUN_TOWER_CONFIG.baseHeight;
    root.add(turretYawNode);

    const cubeSize = Math.max(0.45, Math.min(
      GUN_TOWER_CONFIG.turretWidth * 0.98,
      GUN_TOWER_CONFIG.turretHeight + (GUN_TOWER_CONFIG.turretWidth * 0.38)
    ));
    const portalRadius = Math.max(0.14, Math.min(
      cubeSize * 0.33,
      Math.max(0.14, (Number(GUN_TOWER_CONFIG.barrelLength) || cubeSize) * 0.3)
    ));
    const portalFrameTube = Math.max(0.06, portalRadius * 0.22);
    const portalDiscRadius = portalRadius * 1.02;
    const portalFrameCenterZ = (cubeSize * 0.5) + 0.01;
    const portalDiscCenterZ = portalFrameCenterZ + 0.004;
    const portalParticleCenterZ = portalDiscCenterZ + Math.max(0.016, portalRadius * 0.06);
    const portalLensCenterZ = portalDiscCenterZ + Math.max(0.03, portalRadius * 0.12);

    const pitchNode = new THREE.Object3D();
    pitchNode.position.y = cubeSize * 0.5;
    turretYawNode.add(pitchNode);

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
      turretMaterial
    );
    pitchNode.add(cube);

    const portalFrame = new THREE.Mesh(
      new THREE.TorusGeometry(portalRadius, portalFrameTube, 20, 48),
      turretMaterial
    );
    portalFrame.position.z = portalFrameCenterZ;
    pitchNode.add(portalFrame);

    const { material: portalMaterial, uniforms: portalUniforms } = createGunBlackHoleMaterial({
      accentColor: 0xff4c10,
      glowColor: 0xffc978,
      opacity,
    });
    const portalVolume = new THREE.Mesh(
      new THREE.CircleGeometry(portalDiscRadius, 64),
      portalMaterial
    );
    portalVolume.position.z = portalDiscCenterZ;
    portalVolume.renderOrder = 2;
    pitchNode.add(portalVolume);

    const { mesh: portalParticles, state: portalParticleState } = createGunBlackHoleParticleSystem({
      radius: portalRadius,
      opacity,
    });
    portalParticles.position.z = portalParticleCenterZ;
    portalParticles.renderOrder = 3;
    pitchNode.add(portalParticles);

    const portalLensMaterial = new THREE.MeshStandardMaterial({
      color: 0xa4c5ff,
      emissive: 0x4d7fe8,
      emissiveIntensity: 0.15,
      roughness: 0.08,
      metalness: 0.04,
      transparent: true,
      opacity: Math.max(0.06, Math.min(0.22, opacity * 0.2)),
      depthWrite: false,
    });
    portalLensMaterial.toneMapped = false;
    portalLensMaterial.userData = {
      ...(portalLensMaterial.userData || {}),
      baseEmissiveIntensity: 0.15,
    };
    const portalLensGeometry = new THREE.SphereGeometry(portalRadius * 1.34, 24, 18);
    portalLensGeometry.scale(1, 1, 0.22);
    const portalLens = new THREE.Mesh(portalLensGeometry, portalLensMaterial);
    portalLens.position.z = portalLensCenterZ;
    portalLens.renderOrder = 4;
    portalLens.userData.baseScalar = 1;
    pitchNode.add(portalLens);

    const muzzleNode = new THREE.Object3D();
    muzzleNode.position.z = portalLensCenterZ + Math.max(0.03, GUN_PROJECTILE_SIZE * 0.1);
    pitchNode.add(muzzleNode);

    const footprintOutline = createFootprintOutlineMesh({
      halfSizeX: baseHalfSizeX,
      halfSizeZ: baseHalfSizeZ,
      height: gridCellSize,
      inset: Math.min(baseHalfSizeX, baseHalfSizeZ) * 0.02,
      color: footprintOutlineColor,
      opacity: 0.4,
    });
    root.add(footprintOutline);

    root.userData.materials = [baseMaterial, turretMaterial, portalMaterial, portalLensMaterial, portalParticles.material];
    root.userData.gunBaseMaterial = baseMaterial;
    root.userData.gunTurretMaterial = turretMaterial;
    root.userData.gunBlackHoleMaterial = portalMaterial;
    root.userData.gunBlackHoleUniforms = portalUniforms;
    root.userData.gunPortalFrame = portalFrame;
    root.userData.gunPortalLensMesh = portalLens;
    root.userData.gunPortalLensMaterial = portalLensMaterial;
    root.userData.gunPortalParticleMaterial = portalParticles.material;
    root.userData.gunBlackHoleParticleState = portalParticleState;
    root.userData.gunBaseHalfSizeX = baseHalfSizeX;
    root.userData.gunBaseHalfSizeZ = baseHalfSizeZ;
    root.userData.gunCubeSize = cubeSize;
    root.userData.gunUpperCollisionRadius = cubeSize * 0.72;
    root.userData.footprintOutlineMaterial = footprintOutline.userData.footprintOutlineMaterial;
    root.userData.gunTurretYawNode = turretYawNode;
    root.userData.gunTurretPitchNode = pitchNode;
    root.userData.gunMuzzleNode = muzzleNode;
    root.userData.gunGlowColor = new THREE.Color(glowColor);

    applyShadowSettings(root);
    portalVolume.castShadow = false;
    portalVolume.receiveShadow = false;
    portalParticles.castShadow = false;
    portalParticles.receiveShadow = false;
    portalLens.castShadow = false;
    portalLens.receiveShadow = false;
    return root;
  }

  function createBlockTowerMesh({
    bodyColor,
    accentColor,
    emissiveColor,
    edgeColor,
    opacity = 1,
    transparent = false,
    footprintOutlineColor = edgeColor,
  }) {
    const root = new THREE.Group();
    const safeOpacity = THREE.MathUtils.clamp(Number(opacity) || 1, 0.05, 1);
    const safeTransparent = transparent || safeOpacity < 0.999;
    const halfSize = Math.max(0.05, BLOCK_TOWER_HALF_SIZE);
    const height = Math.max(0.05, BLOCK_TOWER_HEIGHT);

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: bodyColor,
      emissive: emissiveColor,
      emissiveIntensity: 0.18,
      roughness: BLOCK_TOWER_CONFIG.roughness,
      metalness: BLOCK_TOWER_CONFIG.metalness,
      opacity: safeOpacity,
      transparent: safeTransparent,
      depthWrite: !safeTransparent,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: emissiveColor,
      emissiveIntensity: 0.3,
      roughness: Math.max(0, Math.min(1, (Number(BLOCK_TOWER_CONFIG.roughness) || 0.72) * 0.9)),
      metalness: Math.max(0, Math.min(1, (Number(BLOCK_TOWER_CONFIG.metalness) || 0.08) * 1.1)),
      opacity: safeOpacity,
      transparent: safeTransparent,
      depthWrite: !safeTransparent,
    });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(halfSize * 2, height, halfSize * 2),
      bodyMaterial
    );
    body.position.y = height * 0.5;
    root.add(body);

    const accentInset = Math.max(0.02, halfSize * 0.14);
    const accentWidth = Math.max(0.05, (halfSize * 2) - (accentInset * 2));
    const accentHeight = Math.max(0.05, height * 0.17);
    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(accentWidth, accentHeight, accentWidth),
      accentMaterial
    );
    accent.position.y = height - (accentHeight * 0.5) - 0.01;
    root.add(accent);

    const outline = createFootprintOutlineMesh({
      halfSizeX: halfSize,
      halfSizeZ: halfSize,
      height,
      inset: Math.min(halfSize * 0.08, 0.08),
      color: footprintOutlineColor,
      opacity: 0.46,
    });
    root.add(outline);

    root.userData.materials = [bodyMaterial, accentMaterial];
    root.userData.blockBodyMaterial = bodyMaterial;
    root.userData.blockAccentMaterial = accentMaterial;
    root.userData.footprintOutlineMaterial = outline.userData.footprintOutlineMaterial;
    bodyMaterial.userData = {
      ...(bodyMaterial.userData || {}),
      baseEmissiveIntensity: 0.18,
    };
    accentMaterial.userData = {
      ...(accentMaterial.userData || {}),
      baseEmissiveIntensity: 0.3,
    };
    if (outline.userData?.footprintOutlineMaterial) {
      outline.userData.footprintOutlineMaterial.userData = {
        ...(outline.userData.footprintOutlineMaterial.userData || {}),
        baseOpacity: 0.46,
      };
    }
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

  function createLaserSniperTowerMesh({
    color,
    glow,
    opacity = 1,
    transparent = false,
  }) {
    const root = new THREE.Group();
    const baseMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: glow,
      emissiveIntensity: 0.55,
      roughness: 0.42,
      metalness: 0.26,
      transparent,
      opacity,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: tempColorA.setHex(color).offsetHSL(0, 0, 0.08),
      emissive: glow,
      emissiveIntensity: 0.8,
      roughness: 0.36,
      metalness: 0.34,
      transparent,
      opacity,
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(
        LASER_SNIPER_TOWER_CONFIG.baseRadius * 0.84,
        LASER_SNIPER_TOWER_CONFIG.baseRadius,
        0.85,
        16
      ),
      baseMaterial
    );
    base.position.y = 0.42;
    root.add(base);

    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.22, LASER_SNIPER_TOWER_CONFIG.spineHeight, 12),
      accentMaterial
    );
    spine.position.y = 0.85 + (LASER_SNIPER_TOWER_CONFIG.spineHeight * 0.5);
    root.add(spine);

    const dishYawNode = new THREE.Object3D();
    dishYawNode.position.y = spine.position.y + (LASER_SNIPER_TOWER_CONFIG.spineHeight * 0.38);
    root.add(dishYawNode);

    const dish = new THREE.Mesh(
      new THREE.CylinderGeometry(
        LASER_SNIPER_TOWER_CONFIG.dishRadius * 0.35,
        LASER_SNIPER_TOWER_CONFIG.dishRadius,
        0.28,
        14
      ),
      accentMaterial
    );
    dish.rotation.x = Math.PI * 0.5;
    dishYawNode.add(dish);

    const emitterNode = new THREE.Object3D();
    emitterNode.position.set(0, 0, LASER_SNIPER_TOWER_CONFIG.dishRadius * 0.74);
    dishYawNode.add(emitterNode);

    const outline = createFootprintOutlineMesh({
      halfSizeX: gridCubeHalfSize,
      halfSizeZ: gridCubeHalfSize,
      height: gridCellSize,
      inset: 0.06,
      color: glow,
      opacity: 0.42,
    });
    root.add(outline);

    root.userData.materials = [baseMaterial, accentMaterial];
    root.userData.footprintOutlineMaterial = outline.userData.footprintOutlineMaterial;
    root.userData.laserSniperYawNode = dishYawNode;
    root.userData.laserSniperEmitterNode = emitterNode;
    applyShadowSettings(root);
    return root;
  }

  function createMortarTowerMesh({
    color,
    glow,
    opacity = 1,
    transparent = false,
  }) {
    const root = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: glow,
      emissiveIntensity: 0.45,
      roughness: 0.5,
      metalness: 0.24,
      transparent,
      opacity,
    });
    const barrelMaterial = new THREE.MeshStandardMaterial({
      color: tempColorA.setHex(color).offsetHSL(0, 0, 0.12),
      emissive: glow,
      emissiveIntensity: 0.32,
      roughness: 0.4,
      metalness: 0.3,
      transparent,
      opacity,
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(
        MORTAR_TOWER_CONFIG.baseRadius,
        MORTAR_TOWER_CONFIG.baseRadius * 1.08,
        0.72,
        14
      ),
      bodyMaterial
    );
    base.position.y = 0.36;
    root.add(base);

    const yawNode = new THREE.Object3D();
    yawNode.position.y = 0.7;
    root.add(yawNode);

    const barrelPivot = new THREE.Object3D();
    barrelPivot.rotation.x = -THREE.MathUtils.degToRad(80);
    yawNode.add(barrelPivot);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(
        MORTAR_TOWER_CONFIG.barrelRadius,
        MORTAR_TOWER_CONFIG.barrelRadius * 0.94,
        MORTAR_TOWER_CONFIG.barrelLength,
        12
      ),
      barrelMaterial
    );
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.z = MORTAR_TOWER_CONFIG.barrelLength * 0.3;
    barrelPivot.add(barrel);

    const muzzleNode = new THREE.Object3D();
    muzzleNode.position.set(0, 0, MORTAR_TOWER_CONFIG.barrelLength * 0.85);
    barrelPivot.add(muzzleNode);

    const outline = createFootprintOutlineMesh({
      halfSizeX: gridCubeHalfSize,
      halfSizeZ: gridCubeHalfSize,
      height: gridCellSize,
      inset: 0.06,
      color: glow,
      opacity: 0.42,
    });
    root.add(outline);

    root.userData.materials = [bodyMaterial, barrelMaterial];
    root.userData.footprintOutlineMaterial = outline.userData.footprintOutlineMaterial;
    root.userData.mortarYawNode = yawNode;
    root.userData.mortarBarrelPivot = barrelPivot;
    root.userData.mortarMuzzleNode = muzzleNode;
    applyShadowSettings(root);
    return root;
  }

  function createTeslaTowerMesh({
    color,
    glow,
    opacity = 1,
    transparent = false,
  }) {
    const root = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: glow,
      emissiveIntensity: 0.72,
      roughness: 0.4,
      metalness: 0.32,
      transparent,
      opacity,
    });
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: glow,
      transparent: true,
      opacity: Math.min(1, 0.7 * opacity),
      depthWrite: false,
    });
    ringMaterial.toneMapped = false;

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.66, 0.72, 14),
      bodyMaterial
    );
    base.position.y = 0.36;
    root.add(base);

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, TESLA_TOWER_CONFIG.coreHeight, 10),
      bodyMaterial
    );
    core.position.y = 0.72 + (TESLA_TOWER_CONFIG.coreHeight * 0.5);
    root.add(core);

    const ringTop = new THREE.Mesh(
      new THREE.TorusGeometry(TESLA_TOWER_CONFIG.ringRadius, 0.05, 12, 26),
      ringMaterial
    );
    ringTop.position.y = core.position.y + (TESLA_TOWER_CONFIG.coreHeight * 0.34);
    ringTop.rotation.x = THREE.MathUtils.degToRad(90);
    root.add(ringTop);

    const emitterNode = new THREE.Object3D();
    emitterNode.position.set(0, core.position.y + (TESLA_TOWER_CONFIG.coreHeight * 0.42), 0);
    root.add(emitterNode);

    const outline = createFootprintOutlineMesh({
      halfSizeX: gridCubeHalfSize,
      halfSizeZ: gridCubeHalfSize,
      height: gridCellSize,
      inset: 0.06,
      color: glow,
      opacity: 0.42,
    });
    root.add(outline);

    root.userData.materials = [bodyMaterial, ringMaterial];
    root.userData.footprintOutlineMaterial = outline.userData.footprintOutlineMaterial;
    root.userData.teslaEmitterNode = emitterNode;
    root.userData.teslaRingTop = ringTop;
    applyShadowSettings(root);
    ringTop.castShadow = false;
    ringTop.receiveShadow = false;
    return root;
  }

  function createSpikesTowerMesh({
    color,
    glow,
    opacity = 1,
    transparent = false,
  }) {
    const root = new THREE.Group();
    const baseMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: glow,
      emissiveIntensity: 0.35,
      roughness: 0.6,
      metalness: 0.2,
      transparent,
      opacity,
    });
    const spikeMaterial = new THREE.MeshStandardMaterial({
      color: tempColorA.setHex(color).offsetHSL(0, 0, 0.15),
      emissive: glow,
      emissiveIntensity: 0.5,
      roughness: 0.42,
      metalness: 0.34,
      transparent,
      opacity,
    });

    const spikeBaseHeight = 0.24 * 0.125;
    const spikeBaseLift = 0.004;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(gridCellSize * 0.86, spikeBaseHeight, gridCellSize * 0.86),
      baseMaterial
    );
    base.position.y = (spikeBaseHeight * 0.5) + spikeBaseLift;
    root.add(base);
    const spikeBaseTopY = spikeBaseHeight + spikeBaseLift;
    const spikeRestOffsetY = 0.002;
    const spikeGeometry = new THREE.ConeGeometry(0.12, SPIKES_TOWER_CONFIG.spikeHeight, 8);
    spikeGeometry.translate(0, SPIKES_TOWER_CONFIG.spikeHeight * 0.5, 0);

    const spikeMeshes = [];
    const spikeCount = Math.max(3, Math.floor(Number(SPIKES_TOWER_CONFIG.spikeCount) || 7));
    const spikeGridInset = gridCellSize * 0.12;
    const spikeGridMin = (-gridCellSize * 0.43) + spikeGridInset;
    const spikeGridMax = (gridCellSize * 0.43) - spikeGridInset;
    const spikeCols = Math.max(1, Math.ceil(Math.sqrt(spikeCount)));
    const spikeRows = Math.max(1, Math.ceil(spikeCount / spikeCols));
    const spikeStepX = (spikeGridMax - spikeGridMin) / Math.max(1, spikeCols);
    const spikeStepZ = (spikeGridMax - spikeGridMin) / Math.max(1, spikeRows);
    for (let row = 0; row < spikeRows && spikeMeshes.length < spikeCount; row += 1) {
      const interleaveOffset = ((row & 1) === 1 && spikeCols > 1) ? 0.5 : 0;
      for (let col = 0; col < spikeCols && spikeMeshes.length < spikeCount; col += 1) {
        const x = spikeGridMin + ((col + interleaveOffset + 0.5) * spikeStepX);
        const z = spikeGridMin + ((row + 0.5) * spikeStepZ);
        const spike = new THREE.Mesh(
          spikeGeometry,
          spikeMaterial
        );
        spike.position.set(
          x,
          spikeBaseTopY + spikeRestOffsetY,
          z
        );
        spike.scale.y = 0.02;
        spikeMeshes.push(spike);
        root.add(spike);
      }
    }

    const outline = createFootprintOutlineMesh({
      halfSizeX: gridCubeHalfSize,
      halfSizeZ: gridCubeHalfSize,
      height: gridCellSize,
      inset: 0.06,
      color: glow,
      opacity: 0.42,
    });
    root.add(outline);

    root.userData.materials = [baseMaterial, spikeMaterial];
    root.userData.footprintOutlineMaterial = outline.userData.footprintOutlineMaterial;
    root.userData.spikeMeshes = spikeMeshes;
    applyShadowSettings(root);
    return root;
  }

  function createPlasmaTowerMesh({
    color,
    glow,
    opacity = 1,
    transparent = false,
  }) {
    const root = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: glow,
      emissiveIntensity: 0.62,
      roughness: 0.38,
      metalness: 0.34,
      transparent,
      opacity,
    });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(
        PLASMA_TOWER_CONFIG.bodyWidth,
        PLASMA_TOWER_CONFIG.bodyHeight,
        PLASMA_TOWER_CONFIG.bodyDepth
      ),
      bodyMaterial
    );
    body.position.y = PLASMA_TOWER_CONFIG.bodyHeight * 0.5;
    root.add(body);

    const flameLength = Math.max(0.3, Number(PLASMA_TOWER_CONFIG.flameLength) || (gridCellSize * 0.9));
    const flameWidth = Math.max(0.2, Number(PLASMA_TOWER_CONFIG.flameWidth) || (PLASMA_TOWER_CONFIG.bodyWidth * 0.5));
    const flameHeight = Math.max(0.2, Number(PLASMA_TOWER_CONFIG.flameHeight) || (PLASMA_TOWER_CONFIG.bodyHeight * 0.48));
    const flameAnchorY = PLASMA_TOWER_CONFIG.bodyHeight * 0.56;
    const flameStartZ = (PLASMA_TOWER_CONFIG.bodyDepth * 0.5) + 0.02;
    const flameCenterZ = flameStartZ + (flameLength * 0.5);

    const flameUniforms = {
      uTime: { value: 0 },
      uOpacity: { value: Math.max(0.08, Math.min(1, (Number(PLASMA_TOWER_CONFIG.flameOpacity) || 0.62) * opacity)) },
      uColorCore: { value: new THREE.Color(glow) },
      uColorEdge: { value: new THREE.Color(color) },
    };
    const flameVolume = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1, 6, 8, 12),
      new THREE.ShaderMaterial({
        uniforms: flameUniforms,
        vertexShader: PLASMA_FLAME_VERTEX_SHADER,
        fragmentShader: PLASMA_FLAME_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    flameVolume.material.toneMapped = false;
    flameVolume.position.set(0, flameAnchorY, flameCenterZ);
    flameVolume.scale.set(flameWidth, flameHeight, flameLength);
    flameVolume.renderOrder = 2;
    root.add(flameVolume);

    const particleCount = Math.max(6, Math.floor(Number(PLASMA_TOWER_CONFIG.particleCount) || 18));
    const particleBaseSize = Math.max(0.02, Number(PLASMA_TOWER_CONFIG.particleSize) || 0.08);
    const particleGeometry = new THREE.SphereGeometry(1, 7, 6);
    const plasmaParticleDescriptors = [];
    for (let i = 0; i < particleCount; i += 1) {
      const seedA = Math.random();
      const seedB = Math.random();
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: glow,
        transparent: true,
        opacity: 0.55 * opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      particleMaterial.toneMapped = false;
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.set(0, flameAnchorY, flameStartZ);
      particle.renderOrder = 3;
      particle.castShadow = false;
      particle.receiveShadow = false;
      root.add(particle);
      plasmaParticleDescriptors.push({
        mesh: particle,
        phase: Math.random(),
        speed: 0.62 + (seedA * 0.95),
        driftX: (seedA * 2) - 1,
        driftY: (seedB * 2) - 1,
        size: particleBaseSize * (0.65 + (0.75 * Math.random())),
      });
    }

    root.userData.materials = [bodyMaterial];
    root.userData.plasmaFlameUniforms = flameUniforms;
    root.userData.plasmaFlameBaseOpacity = flameUniforms.uOpacity.value;
    root.userData.plasmaParticleDescriptors = plasmaParticleDescriptors;
    root.userData.plasmaFlameConfig = {
      startZ: flameStartZ,
      length: flameLength,
      width: flameWidth,
      height: flameHeight,
      anchorY: flameAnchorY,
    };
    applyShadowSettings(root);
    flameVolume.castShadow = false;
    flameVolume.receiveShadow = false;
    for (const descriptor of plasmaParticleDescriptors) {
      if (descriptor?.mesh) {
        descriptor.mesh.castShadow = false;
        descriptor.mesh.receiveShadow = false;
      }
    }
    return root;
  }

  function createBuffTowerMesh({
    color,
    glow,
    opacity = 1,
    transparent = false,
  }) {
    const root = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: glow,
      emissiveIntensity: 0.7,
      roughness: 0.34,
      metalness: 0.18,
      transparent,
      opacity,
    });
    const auraMaterial = new THREE.MeshBasicMaterial({
      color: BUFF_TOWER_CONFIG.auraColor,
      transparent: true,
      opacity: BUFF_TOWER_CONFIG.auraOpacity * opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    auraMaterial.toneMapped = false;

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.66, 0.66, 14),
      bodyMaterial
    );
    base.position.y = 0.33;
    root.add(base);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(BUFF_TOWER_CONFIG.coreRadius, 14, 10),
      bodyMaterial
    );
    core.position.y = 1.12;
    root.add(core);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(BUFF_TOWER_CONFIG.haloRadius, 0.08, 12, 28),
      auraMaterial
    );
    halo.position.y = 1.08;
    halo.rotation.x = THREE.MathUtils.degToRad(90);
    root.add(halo);

    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(BUFF_TOWER_CONFIG.range, 20, 14),
      auraMaterial.clone()
    );
    aura.material.opacity = BUFF_TOWER_CONFIG.auraOpacity * opacity;
    aura.castShadow = false;
    aura.receiveShadow = false;
    root.add(aura);

    const outline = createFootprintOutlineMesh({
      halfSizeX: gridCubeHalfSize,
      halfSizeZ: gridCubeHalfSize,
      height: gridCellSize,
      inset: 0.06,
      color: glow,
      opacity: 0.42,
    });
    root.add(outline);

    root.userData.materials = [bodyMaterial, auraMaterial, aura.material];
    root.userData.footprintOutlineMaterial = outline.userData.footprintOutlineMaterial;
    root.userData.buffAuraMesh = aura;
    root.userData.buffHaloMesh = halo;
    applyShadowSettings(root);
    return root;
  }

  function createTowerPreviewMesh(type) {
    if (type === "block") {
      return createBlockTowerMesh({
        bodyColor: BLOCK_TOWER_CONFIG.previewColor,
        accentColor: BLOCK_TOWER_CONFIG.previewAccentColor,
        emissiveColor: BLOCK_TOWER_CONFIG.previewGlow,
        edgeColor: BLOCK_TOWER_CONFIG.previewGlow,
        opacity: BLOCK_TOWER_CONFIG.previewOpacity,
        transparent: true,
        footprintOutlineColor: BLOCK_TOWER_CONFIG.previewGlow,
      });
    }

    if (type === "laserSniper") {
      return createLaserSniperTowerMesh({
        color: LASER_SNIPER_TOWER_CONFIG.previewColor,
        glow: LASER_SNIPER_TOWER_CONFIG.previewGlow,
        opacity: LASER_SNIPER_TOWER_CONFIG.previewOpacity,
        transparent: true,
      });
    }

    if (type === "mortar") {
      return createMortarTowerMesh({
        color: MORTAR_TOWER_CONFIG.previewColor,
        glow: MORTAR_TOWER_CONFIG.previewGlow,
        opacity: MORTAR_TOWER_CONFIG.previewOpacity,
        transparent: true,
      });
    }

    if (type === "tesla") {
      return createTeslaTowerMesh({
        color: TESLA_TOWER_CONFIG.previewColor,
        glow: TESLA_TOWER_CONFIG.previewGlow,
        opacity: TESLA_TOWER_CONFIG.previewOpacity,
        transparent: true,
      });
    }

    if (type === "spikes") {
      return createSpikesTowerMesh({
        color: SPIKES_TOWER_CONFIG.previewColor,
        glow: SPIKES_TOWER_CONFIG.previewGlow,
        opacity: SPIKES_TOWER_CONFIG.previewOpacity,
        transparent: true,
      });
    }

    if (type === "plasma") {
      return createPlasmaTowerMesh({
        color: PLASMA_TOWER_CONFIG.previewColor,
        glow: PLASMA_TOWER_CONFIG.previewGlow,
        opacity: PLASMA_TOWER_CONFIG.previewOpacity,
        transparent: true,
      });
    }

    if (type === "buff") {
      return createBuffTowerMesh({
        color: BUFF_TOWER_CONFIG.previewColor,
        glow: BUFF_TOWER_CONFIG.previewGlow,
        opacity: BUFF_TOWER_CONFIG.previewOpacity,
        transparent: true,
      });
    }

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

  function createTowerPlacedMesh(type, options = {}) {
    if (type === "block") {
      const blockOpacity = options?.blockOpacity != null && Number.isFinite(Number(options.blockOpacity))
        ? THREE.MathUtils.clamp(Number(options.blockOpacity), 0.05, 1)
        : getBlockOpacityForOwner(options?.ownerId);
      return createBlockTowerMesh({
        bodyColor: BLOCK_TOWER_CONFIG.placedColor,
        accentColor: BLOCK_TOWER_CONFIG.placedAccentColor,
        emissiveColor: BLOCK_TOWER_CONFIG.placedGlow,
        edgeColor: BLOCK_TOWER_CONFIG.placedGlow,
        opacity: blockOpacity,
        transparent: blockOpacity < 0.999,
        footprintOutlineColor: BLOCK_TOWER_CONFIG.placedGlow,
      });
    }

    if (type === "laserSniper") {
      return createLaserSniperTowerMesh({
        color: LASER_SNIPER_TOWER_CONFIG.placedColor,
        glow: LASER_SNIPER_TOWER_CONFIG.placedGlow,
      });
    }

    if (type === "mortar") {
      return createMortarTowerMesh({
        color: MORTAR_TOWER_CONFIG.placedColor,
        glow: MORTAR_TOWER_CONFIG.placedGlow,
      });
    }

    if (type === "tesla") {
      return createTeslaTowerMesh({
        color: TESLA_TOWER_CONFIG.placedColor,
        glow: TESLA_TOWER_CONFIG.placedGlow,
      });
    }

    if (type === "spikes") {
      return createSpikesTowerMesh({
        color: SPIKES_TOWER_CONFIG.placedColor,
        glow: SPIKES_TOWER_CONFIG.placedGlow,
      });
    }

    if (type === "plasma") {
      return createPlasmaTowerMesh({
        color: PLASMA_TOWER_CONFIG.placedColor,
        glow: PLASMA_TOWER_CONFIG.placedGlow,
      });
    }

    if (type === "buff") {
      return createBuffTowerMesh({
        color: BUFF_TOWER_CONFIG.placedColor,
        glow: BUFF_TOWER_CONFIG.placedGlow,
      });
    }

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
    const effectiveRange = getTowerRangeForType(selectedTowerType);

    if (!towerSpec.usesLineOfSight) {
      const rangeSq = effectiveRange * effectiveRange;
      for (const entry of pathRangeHighlights.entries) {
        entry.mesh.visible = origin.distanceToSquared(entry.center) <= rangeSq;
      }
      return;
    }

    const previewTowerProbe = {
      mesh: preview,
      range: effectiveRange,
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
    if (selectedTowerType === "block") {
      const bodyMaterial = preview.userData?.blockBodyMaterial;
      const accentMaterial = preview.userData?.blockAccentMaterial;
      const footprintOutlineMaterial = preview.userData?.footprintOutlineMaterial;
      if (!bodyMaterial || !accentMaterial) {
        return;
      }

      if (isValid) {
        bodyMaterial.color.setHex(BLOCK_TOWER_CONFIG.previewColor);
        bodyMaterial.emissive.setHex(BLOCK_TOWER_CONFIG.previewGlow);
        accentMaterial.color.setHex(BLOCK_TOWER_CONFIG.previewAccentColor);
        accentMaterial.emissive.setHex(BLOCK_TOWER_CONFIG.previewGlow);
        if (footprintOutlineMaterial) {
          footprintOutlineMaterial.color.setHex(BLOCK_TOWER_CONFIG.previewGlow);
        }
      } else {
        bodyMaterial.color.setHex(BLOCK_TOWER_CONFIG.previewInvalidColor);
        bodyMaterial.emissive.setHex(BLOCK_TOWER_CONFIG.previewInvalidGlow);
        accentMaterial.color.setHex(BLOCK_TOWER_CONFIG.previewInvalidAccentColor);
        accentMaterial.emissive.setHex(BLOCK_TOWER_CONFIG.previewInvalidGlow);
        if (footprintOutlineMaterial) {
          footprintOutlineMaterial.color.setHex(BLOCK_TOWER_CONFIG.previewInvalidGlow);
        }
      }
      return;
    }

    if (
      selectedTowerType === "laserSniper"
      || selectedTowerType === "mortar"
      || selectedTowerType === "tesla"
      || selectedTowerType === "spikes"
      || selectedTowerType === "plasma"
      || selectedTowerType === "buff"
    ) {
      const previewConfigByType = {
        laserSniper: LASER_SNIPER_TOWER_CONFIG,
        mortar: MORTAR_TOWER_CONFIG,
        tesla: TESLA_TOWER_CONFIG,
        spikes: SPIKES_TOWER_CONFIG,
        plasma: PLASMA_TOWER_CONFIG,
        buff: BUFF_TOWER_CONFIG,
      };
      const towerConfig = previewConfigByType[selectedTowerType];
      const colorHex = isValid
        ? towerConfig.previewColor
        : towerConfig.previewInvalidColor;
      const glowHex = isValid
        ? towerConfig.previewGlow
        : towerConfig.previewInvalidGlow;
      const materials = Array.isArray(preview.userData?.materials)
        ? preview.userData.materials
        : [];
      for (const material of materials) {
        if (!material) {
          continue;
        }
        if (material.color) {
          material.color.setHex(colorHex);
        }
        if (material.emissive) {
          material.emissive.setHex(glowHex);
        }
      }
      const outlineMaterial = preview.userData?.footprintOutlineMaterial;
      if (outlineMaterial?.color) {
        outlineMaterial.color.setHex(glowHex);
      }
      const auraMesh = preview.userData?.buffAuraMesh;
      if (auraMesh?.material?.color) {
        auraMesh.material.color.setHex(glowHex);
      }
      if (selectedTowerType === "plasma") {
        const flameUniforms = preview.userData?.plasmaFlameUniforms;
        if (flameUniforms?.uColorCore?.value) {
          flameUniforms.uColorCore.value.setHex(glowHex);
        }
        if (flameUniforms?.uColorEdge?.value) {
          flameUniforms.uColorEdge.value.setHex(colorHex);
        }
        const particleDescriptors = Array.isArray(preview.userData?.plasmaParticleDescriptors)
          ? preview.userData.plasmaParticleDescriptors
          : [];
        for (const descriptor of particleDescriptors) {
          if (descriptor?.mesh?.material?.color) {
            descriptor.mesh.material.color.setHex(glowHex);
          }
        }
      }
      return;
    }

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
    const blackHoleMaterial = preview.userData.gunBlackHoleMaterial;
    const portalLensMaterial = preview.userData.gunPortalLensMaterial;
    const portalParticleMaterial = preview.userData.gunPortalParticleMaterial;
    const footprintOutlineMaterial = preview.userData.footprintOutlineMaterial;
    if (!baseMaterial || !turretMaterial) {
      return;
    }

    if (isValid) {
      baseMaterial.color.setHex(GUN_TOWER_CONFIG.previewBaseColor);
      turretMaterial.color.setHex(GUN_TOWER_CONFIG.previewTurretColor);
      turretMaterial.emissive.setHex(GUN_TOWER_CONFIG.previewGlow);
      if (blackHoleMaterial) {
        if (blackHoleMaterial.color?.setHex) {
          blackHoleMaterial.color.setHex(0xff5050);
        }
        if (blackHoleMaterial.emissive?.setHex) {
          blackHoleMaterial.emissive.setHex(GUN_TOWER_CONFIG.previewGlow);
        }
      }
      if (portalLensMaterial?.color?.setHex) {
        portalLensMaterial.color.setHex(0xa9c9ff);
      }
      if (portalLensMaterial?.emissive?.setHex) {
        portalLensMaterial.emissive.setHex(GUN_TOWER_CONFIG.previewGlow);
      }
      if (portalParticleMaterial?.color?.setHex) {
        portalParticleMaterial.color.setHex(0xffd49a);
      }
      if (footprintOutlineMaterial) {
        footprintOutlineMaterial.color.setHex(GUN_TOWER_CONFIG.previewGlow);
      }
    } else {
      baseMaterial.color.setHex(GUN_TOWER_CONFIG.previewInvalidBaseColor);
      turretMaterial.color.setHex(GUN_TOWER_CONFIG.previewInvalidTurretColor);
      turretMaterial.emissive.setHex(GUN_TOWER_CONFIG.previewInvalidGlow);
      if (blackHoleMaterial) {
        if (blackHoleMaterial.color?.setHex) {
          blackHoleMaterial.color.setHex(0xff6060);
        }
        if (blackHoleMaterial.emissive?.setHex) {
          blackHoleMaterial.emissive.setHex(GUN_TOWER_CONFIG.previewInvalidGlow);
        }
      }
      if (portalLensMaterial?.color?.setHex) {
        portalLensMaterial.color.setHex(0xffa29a);
      }
      if (portalLensMaterial?.emissive?.setHex) {
        portalLensMaterial.emissive.setHex(GUN_TOWER_CONFIG.previewInvalidGlow);
      }
      if (portalParticleMaterial?.color?.setHex) {
        portalParticleMaterial.color.setHex(0xffb18a);
      }
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

  function getCellCenter(cellX, cellZ, y = grid.tileTopY) {
    return typeof grid.cellToWorldCenter === "function"
      ? grid.cellToWorldCenter(cellX, cellZ, y)
      : new THREE.Vector3(0, 0, 0);
  }

  function getCellBaseY(cellY = 0) {
    return grid.tileTopY + (Math.max(0, Number(cellY) || 0) * gridCellSize);
  }

  function resolvePlasmaPlacementFromRay(ray) {
    if (typeof grid.raycastWallAnchor !== "function") {
      return null;
    }
    const hit = grid.raycastWallAnchor(ray);
    if (!hit || !hit.point || !hit.normal) {
      return null;
    }

    const rawNormalX = Number(hit.normal.x) || 0;
    const rawNormalY = Number(hit.normal.y) || 0;
    const rawNormalZ = Number(hit.normal.z) || 0;
    if (Math.abs(rawNormalY) > 0.1) {
      return null;
    }
    const absNormalX = Math.abs(rawNormalX);
    const absNormalZ = Math.abs(rawNormalZ);
    if (Math.max(absNormalX, absNormalZ) < 1e-3) {
      return null;
    }
    let normalX = 0;
    let normalZ = 0;
    if (absNormalX >= absNormalZ) {
      normalX = rawNormalX < 0 ? -1 : 1;
    } else {
      normalZ = rawNormalZ < 0 ? -1 : 1;
    }
    if (normalX === 0 && normalZ === 0) {
      return null;
    }
    if (!Number.isInteger(hit.cellX) || !Number.isInteger(hit.cellY) || !Number.isInteger(hit.cellZ)) {
      return null;
    }

    const wallBaseY = getCellBaseY(hit.cellY);
    const wallCenter = getCellCenter(hit.cellX, hit.cellZ);
    const mountOffset = (gridCellSize * 0.5) + (PLASMA_TOWER_CONFIG.bodyDepth * 0.5) + 0.01;
    const mountPosition = new THREE.Vector3(
      wallCenter.x + (normalX * mountOffset),
      wallBaseY + (gridCellSize * 0.5) - (PLASMA_TOWER_CONFIG.bodyHeight * 0.5),
      wallCenter.z + (normalZ * mountOffset)
    );
    const anchorKey = `plasma:${hit.cellX},${hit.cellY},${hit.cellZ}|${normalX},${normalZ}`;
    const targetCell = {
      x: hit.cellX + normalX,
      z: hit.cellZ + normalZ,
    };

    return {
      towerType: "plasma",
      occupiedCells: [],
      position: mountPosition,
      sameSurfaceHeight: true,
      footprintKey: anchorKey,
      anchorKey,
      rotationY: Math.atan2(normalX, normalZ),
      plasmaDirection: { x: normalX, z: normalZ },
      plasmaWallCell: { x: hit.cellX, y: hit.cellY, z: hit.cellZ },
      plasmaTargetCell: targetCell,
    };
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
        towerType,
        occupiedCells,
        position: null,
        sameSurfaceHeight: false,
        footprintKey: getPlacementFootprintKey(occupiedCells, firstY),
      };
    }

    tempVecA.set(0, 0, 0);
    for (const center of centers) {
      tempVecA.add(center);
    }
    tempVecA.multiplyScalar(1 / Math.max(1, centers.length));
    tempVecA.y = firstY;
    return {
      towerType,
      occupiedCells,
      position: tempVecA.clone(),
      sameSurfaceHeight: true,
      footprintKey: getPlacementFootprintKey(occupiedCells, firstY),
    };
  }

  function isPlacementLocallyValid(placement) {
    if (!placement || !placement.position) {
      return false;
    }
    if (placement.towerType !== "plasma" && !isInsideBuildBounds(placement.position)) {
      return false;
    }
    if (!placement.sameSurfaceHeight) {
      return false;
    }
    if (placement.towerType === "plasma") {
      if (!placement.anchorKey || findTowerByAnchorKey(placement.anchorKey)) {
        return false;
      }
      const targetCell = placement.plasmaTargetCell;
      const wallCell = placement.plasmaWallCell;
      const direction = placement.plasmaDirection;
      if (
        !Number.isInteger(targetCell?.x)
        || !Number.isInteger(targetCell?.z)
        || !Number.isInteger(wallCell?.x)
        || !Number.isInteger(wallCell?.y)
        || !Number.isInteger(wallCell?.z)
        || !Number.isInteger(direction?.x)
        || !Number.isInteger(direction?.z)
      ) {
        return false;
      }
      if (typeof grid.isCellInsideLevel === "function" && !grid.isCellInsideLevel(targetCell.x, targetCell.z)) {
        return false;
      }
      if (typeof grid.isRampCell === "function" && grid.isRampCell(targetCell.x, targetCell.z)) {
        return false;
      }
      if (typeof grid.isSpawnCell === "function" && grid.isSpawnCell(targetCell.x, targetCell.z)) {
        return false;
      }
      if (typeof grid.isEndCell === "function" && grid.isEndCell(targetCell.x, targetCell.z)) {
        return false;
      }
      if (typeof grid.getCellHeight === "function") {
        const targetHeight = Number(grid.getCellHeight(targetCell.x, targetCell.z));
        if (Number.isFinite(targetHeight) && targetHeight > wallCell.y) {
          return false;
        }
      }
      return true;
    }
    if (!Array.isArray(placement.occupiedCells) || placement.occupiedCells.length === 0) {
      return false;
    }
    const placementSpec = getTowerSpec(placement.towerType);
    if (!placementSpec) {
      return false;
    }
    const placementBounds = getTowerVerticalBounds(placement.position.y, placementSpec.height);
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
      const towersAtCell = getTowersAtCell(cell.x, cell.z);
      for (const existingTower of towersAtCell) {
        const existingBounds = getTowerVerticalBounds(existingTower?.baseY, existingTower?.height);
        if (doVerticalBoundsOverlap(placementBounds, existingBounds)) {
          return false;
        }
      }
    }
    return true;
  }

  function isPlacementValid(placement) {
    if (!isPlacementLocallyValid(placement)) {
      return false;
    }
    if (!doesTowerTypeBlockPath(placement?.towerType)) {
      return true;
    }
    const newlyBlockedCells = getNewlyBlockedPlacementCells(placement);
    if (newlyBlockedCells.length > 0 && !canBlockCellsCached(newlyBlockedCells)) {
      return false;
    }
    return true;
  }

  function getBuildSurfaceY(x, z) {
    const terrainSurfaceY = typeof grid.getBuildSurfaceYAtWorld === "function"
      ? grid.getBuildSurfaceYAtWorld(x, z)
      : grid.tileTopY;
    const cell = typeof grid.worldToCell === "function"
      ? grid.worldToCell(x, z)
      : null;
    if (!cell || !Number.isInteger(cell.x) || !Number.isInteger(cell.z)) {
      return terrainSurfaceY;
    }
    let surfaceY = terrainSurfaceY;
    for (const tower of getTowersAtCell(cell.x, cell.z)) {
      if (tower?.towerType !== "block") {
        continue;
      }
      const topY = Number(tower.baseY) + Math.max(0.01, Number(tower.height) || BLOCK_TOWER_HEIGHT);
      if (Number.isFinite(topY)) {
        surfaceY = Math.max(surfaceY, topY);
      }
    }
    return surfaceY;
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

    if (selectedTowerType === "plasma") {
      const nextPlacement = resolvePlasmaPlacementFromRay(raycaster.ray);
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
      preview.position.copy(nextPlacement.position);
      preview.rotation.y = nextPlacement.rotationY || 0;
      previewPlacement = nextPlacement;
      previewValid = canAffordTower(selectedTowerType)
        && isPlacementValid(nextPlacement);
      setPreviewValidityVisual(previewValid);
      hidePathRangeHighlights();
      return;
    }

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
    preview.rotation.y = 0;
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

  function serializePlacementPayload(towerType, placement) {
    if (!placement || !placement.position) {
      return null;
    }
    const normalizedType = normalizeTowerType(towerType ?? placement.towerType);
    if (!normalizedType) {
      return null;
    }
    return {
      towerType: normalizedType,
      occupiedCells: Array.isArray(placement.occupiedCells)
        ? placement.occupiedCells
          .filter((cell) => Number.isInteger(cell?.x) && Number.isInteger(cell?.z))
          .map((cell) => ({ x: cell.x, z: cell.z }))
        : [],
      position: {
        x: placement.position.x,
        y: placement.position.y,
        z: placement.position.z,
      },
      blockOpacity: placement.blockOpacity != null && Number.isFinite(Number(placement.blockOpacity))
        ? Number(placement.blockOpacity)
        : null,
      footprintKey: typeof placement.footprintKey === "string" ? placement.footprintKey : "",
      anchorKey: typeof placement.anchorKey === "string" ? placement.anchorKey : null,
      rotationY: Number.isFinite(Number(placement.rotationY)) ? Number(placement.rotationY) : 0,
      plasmaDirection: placement.plasmaDirection
        ? { x: placement.plasmaDirection.x, z: placement.plasmaDirection.z }
        : null,
      plasmaWallCell: placement.plasmaWallCell
        ? {
          x: placement.plasmaWallCell.x,
          y: placement.plasmaWallCell.y,
          z: placement.plasmaWallCell.z,
        }
        : null,
      plasmaTargetCell: placement.plasmaTargetCell
        ? { x: placement.plasmaTargetCell.x, z: placement.plasmaTargetCell.z }
        : null,
    };
  }

  function parsePlacementPayload(payload = {}) {
    const normalizedType = normalizeTowerType(payload?.towerType ?? payload?.type);
    const px = Number(payload?.position?.x);
    const py = Number(payload?.position?.y);
    const pz = Number(payload?.position?.z);
    if (!normalizedType || !Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) {
      return null;
    }
    const occupiedCells = Array.isArray(payload?.occupiedCells)
      ? payload.occupiedCells
        .filter((cell) => Number.isInteger(cell?.x) && Number.isInteger(cell?.z))
        .map((cell) => ({ x: cell.x, z: cell.z }))
      : [];
    const resolvedPlacement = {
      towerType: normalizedType,
      occupiedCells,
      position: new THREE.Vector3(px, py, pz),
      blockOpacity: payload?.blockOpacity != null && Number.isFinite(Number(payload.blockOpacity))
        ? THREE.MathUtils.clamp(Number(payload.blockOpacity), 0.05, 1)
        : null,
      sameSurfaceHeight: true,
      footprintKey: typeof payload?.footprintKey === "string" && payload.footprintKey.length > 0
        ? payload.footprintKey
        : getPlacementFootprintKey(occupiedCells, py),
      anchorKey: typeof payload?.anchorKey === "string" ? payload.anchorKey : null,
      rotationY: Number.isFinite(Number(payload?.rotationY)) ? Number(payload.rotationY) : 0,
      plasmaDirection: payload?.plasmaDirection
        ? {
          x: Number.isInteger(payload.plasmaDirection.x) ? payload.plasmaDirection.x : 0,
          z: Number.isInteger(payload.plasmaDirection.z) ? payload.plasmaDirection.z : 0,
        }
        : null,
      plasmaWallCell: payload?.plasmaWallCell
        ? {
          x: payload.plasmaWallCell.x,
          y: payload.plasmaWallCell.y,
          z: payload.plasmaWallCell.z,
        }
        : null,
      plasmaTargetCell: payload?.plasmaTargetCell
        ? {
          x: payload.plasmaTargetCell.x,
          z: payload.plasmaTargetCell.z,
        }
        : null,
    };
    if (normalizedType === "plasma") {
      resolvedPlacement.occupiedCells = [];
    }
    return resolvedPlacement;
  }

  function placeTowerAtResolvedPlacement(resolvedPlacement, options = {}) {
    const normalizedType = normalizeTowerType(resolvedPlacement?.towerType);
    if (!normalizedType || !resolvedPlacement?.position) {
      return { success: false, reason: "invalid_payload" };
    }

    const ownerId = normalizeOwnerId(options?.ownerId);
    const requireUnlocked = options?.requireUnlocked !== false;
    const requireAffordable = options?.requireAffordable !== false;
    const spendCost = options?.spendCost !== false;

    if (requireUnlocked && !isTowerTypeUnlocked(normalizedType)) {
      return { success: false, reason: "locked" };
    }
    if (requireAffordable && !canAffordTower(normalizedType, ownerId)) {
      return { success: false, reason: "unaffordable" };
    }
    if (!isPlacementValid(resolvedPlacement)) {
      return { success: false, reason: "invalid_placement" };
    }

    const resolvedBlockOpacity = normalizedType === "block"
      ? (
        resolvedPlacement.blockOpacity != null && Number.isFinite(Number(resolvedPlacement.blockOpacity))
          ? THREE.MathUtils.clamp(Number(resolvedPlacement.blockOpacity), 0.05, 1)
          : getBlockOpacityForOwner(ownerId)
      )
      : null;
    const towerMesh = createTowerPlacedMesh(normalizedType, {
      ownerId,
      blockOpacity: resolvedBlockOpacity,
    });
    towerMesh.position.copy(resolvedPlacement.position);
    if (typeof resolvedPlacement.rotationY === "number") {
      towerMesh.rotation.y = resolvedPlacement.rotationY;
    }
    scene.add(towerMesh);

    const towerEntry = createTowerEntry(
      normalizedType,
      towerMesh,
      resolvedPlacement.position,
      resolvedPlacement,
      {
        ownerId,
        blockOpacity: resolvedBlockOpacity,
      }
    );
    if (!towerEntry) {
      scene.remove(towerMesh);
      disposeMeshResources(towerMesh);
      return { success: false, reason: "entry_creation_failed" };
    }
    if (spendCost && !spendTowerCost(normalizedType, ownerId)) {
      scene.remove(towerMesh);
      disposeMeshResources(towerMesh);
      return { success: false, reason: "spend_failed" };
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
      if (spendCost) {
        refundTowerCost(normalizedType, ownerId);
      }
      return { success: false, reason: "path_blocking_rejected" };
    }

    const placementPayload = serializePlacementPayload(normalizedType, resolvedPlacement);
    if (placementPayload && normalizedType === "block" && Number.isFinite(resolvedBlockOpacity)) {
      placementPayload.blockOpacity = resolvedBlockOpacity;
    }
    if (typeof onTowerPlaced === "function" && placementPayload) {
      onTowerPlaced({
        ownerId,
        placement: placementPayload,
      });
    }
    return {
      success: true,
      ownerId,
      placement: placementPayload,
      tower: towerEntry,
    };
  }

  function createTowerEntry(towerType, towerMesh, basePosition, placement, options = {}) {
    const towerSpec = getTowerSpec(towerType);
    if (!towerSpec) {
      return null;
    }
    const ownerId = normalizeOwnerId(options?.ownerId);

    const occupiedCells = Array.isArray(placement?.occupiedCells)
      ? placement.occupiedCells.map((cell) => ({ x: cell.x, z: cell.z }))
      : (placement?.cellX != null && placement?.cellZ != null
        ? [{ x: placement.cellX, z: placement.cellZ }]
        : []);
    const primaryCell = occupiedCells[0] ?? null;
    const initialSpikesCycleInterval = Math.max(
      0.05,
      SPIKES_CYCLE_INTERVAL
        * Math.max(0.05, getTowerModifierNumber("spikes", "spikesCycleIntervalMultiplier", 1, ownerId))
    );

    const entry = {
      mesh: towerMesh,
      cooldown: 0,
      chargeTimer: 0,
      towerType,
      collidesWithPlayer: doesTowerTypeCollideWithPlayer(towerType),
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
      footprintKey: placement?.footprintKey || getFootprintKey(occupiedCells),
      anchorKey: placement?.anchorKey ?? null,
      plasmaTargetCell: placement?.plasmaTargetCell ?? null,
      plasmaDirection: placement?.plasmaDirection ?? null,
      plasmaWallCell: placement?.plasmaWallCell ?? null,
      bobClock: Math.random() * Math.PI * 2,
      bobPhase: Math.random() * Math.PI * 2,
      aoeIdleColor: new THREE.Color(AOE_TOWER_CONFIG.idleColor),
      aoeChargeColor: new THREE.Color(AOE_TOWER_CONFIG.chargeColor),
      aoeEmissiveIdle: new THREE.Color(AOE_TOWER_CONFIG.emissiveIdle),
      aoeEmissiveCharge: new THREE.Color(AOE_TOWER_CONFIG.emissiveCharge),
      gunMuzzleFlashTimer: 0,
      gunPortalClock: Math.random() * Math.PI * 2,
      gunPortalPulse: 0,
      slowProcFlash: 0,
      spikesCycleTimer: Math.random() * initialSpikesCycleInterval,
      spikesActiveTimer: 0,
      spikesDidDamageThisCycle: false,
      plasmaClock: Math.random() * Math.PI * 2,
      buffDamageMultiplier: 1,
      buffFireRateIntervalFactor: 1,
      buffAuraClock: Math.random() * Math.PI * 2,
      isOperational: true,
      buildFxState: null,
      ownerId,
      rotationY: typeof placement?.rotationY === "number" ? placement.rotationY : 0,
      topInsetFromRadius: towerType === "block" ? 0 : undefined,
      blockOpacity: towerType === "block"
        ? (
          options?.blockOpacity != null && Number.isFinite(Number(options.blockOpacity))
            ? THREE.MathUtils.clamp(Number(options.blockOpacity), 0.05, 1)
            : getBlockOpacityForOwner(ownerId)
        )
        : null,
    };

    if (towerType === "block") {
      applyBlockOpacityToTower(entry, ownerId, entry.blockOpacity);
    }

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
        syncMaterialProxyState(material);
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
      syncMaterialProxyState(state.material);
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
      syncMaterialProxyState(state.material);
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
    const resolvedPlacement = parsePlacementPayload(
      serializePlacementPayload(normalizedType, previewPlacement)
    );
    if (!resolvedPlacement) {
      return false;
    }
    const result = placeTowerAtResolvedPlacement(resolvedPlacement, {
      ownerId: normalizeOwnerId(null),
      spendCost: true,
      requireUnlocked: true,
      requireAffordable: true,
    });
    if (!result.success) {
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

    const rampSamplePoint = tempVecJ;
    const segmentDelta = tempVecK.copy(targetPosition).sub(origin);
    const segmentLength = segmentDelta.length();
    if (segmentLength <= TOWER_CONFIG.segmentEpsilon) {
      return false;
    }
    const losSampleStep = Math.max(0.22, gridCellSize * 0.12);
    const sampleCount = THREE.MathUtils.clamp(
      Math.ceil(segmentLength / losSampleStep),
      2,
      72
    );

    for (const obstacle of rampObstacles) {
      if (obstacle?.kind !== "ramp") {
        continue;
      }
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
        continue;
      }

      const dirXRaw = Number(obstacleDirection.x);
      const dirZRaw = Number(obstacleDirection.z);
      const dirLength = Math.hypot(dirXRaw, dirZRaw);
      if (dirLength <= TOWER_CONFIG.segmentEpsilon) {
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
      const alongMin = -rampAcrossHalf;
      const alongMax = rampAlongHalf + rampAcrossHalf;
      const paddedAcrossHalf = rampAcrossHalf + TOWER_CONFIG.terrainLosVerticalPadding;
      const paddedBaseY = obstacleBaseY + TOWER_CONFIG.terrainLosVerticalPadding;

      let blockedByRamp = false;
      for (let sampleIndex = 0; sampleIndex <= sampleCount; sampleIndex += 1) {
        const t = sampleIndex / sampleCount;
        rampSamplePoint.copy(origin).addScaledVector(segmentDelta, t);
        const deltaX = rampSamplePoint.x - lowCenterX;
        const deltaZ = rampSamplePoint.z - lowCenterZ;
        const along = (deltaX * dirX) + (deltaZ * dirZ);
        const across = (deltaX * rightX) + (deltaZ * rightZ);
        if (along < alongMin || along > alongMax || Math.abs(across) > paddedAcrossHalf) {
          continue;
        }

        const alongT = THREE.MathUtils.clamp(
          (along - alongMin) / Math.max(TOWER_CONFIG.segmentEpsilon, alongMax - alongMin),
          0,
          1
        );
        const rampSurfaceY = obstacleBaseY + (obstacleHeight * alongT) - TOWER_CONFIG.terrainLosVerticalPadding;
        if (rampSamplePoint.y >= paddedBaseY && rampSamplePoint.y <= rampSurfaceY) {
          blockedByRamp = true;
          break;
        }
      }

      if (blockedByRamp) {
        return true;
      }
    }

    return false;
  }

  function isPointInTowerRange(tower, targetPosition) {
    const towerRange = getTowerRangeForType(tower?.towerType, tower?.ownerId) || (tower.range ?? GUN_RANGE);
    return tower.mesh.position.distanceToSquared(targetPosition) <= (towerRange * towerRange);
  }

  function hasLineOfSightToPoint(tower, targetPosition) {
    let origin = tempVecC;
    if (tower.towerType === "gun") {
      getGunMuzzleWorldPosition(tower, origin);
    } else if (tower.towerType === "laserSniper") {
      getLaserEmitterWorldPosition(tower, origin);
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
    const towerRange = getTowerRangeForType(tower?.towerType, tower?.ownerId) || (tower.range ?? GUN_RANGE);
    const maxRangeSq = towerRange * towerRange;
    let bestTarget = null;
    let bestDistSq = maxRangeSq;
    const enemyMeshes = getDamageableEnemyMeshes(enemySystem);
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
        if (!isEnemyMeshFullyOutsideSpawnCubes(fallbackTarget.mesh)) {
          return null;
        }
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

  function findTargetWithUnlimitedLineOfSight(tower, enemySystem) {
    if (!enemySystem) {
      return null;
    }
    const enemyMeshes = getDamageableEnemyMeshes(enemySystem);
    let bestTarget = null;
    let bestDistSq = Number.POSITIVE_INFINITY;
    for (const enemyMesh of enemyMeshes) {
      if (!enemyMesh || !enemyMesh.visible) {
        continue;
      }
      getEnemyCollisionCenter(enemyMesh, tempVecD);
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
    return bestTarget;
  }

  function applyPointDamageToTowerTargetableEnemies(enemySystem, point, hitRadius, damage) {
    if (
      !enemySystem
      || typeof enemySystem.applyDamageToEnemyMesh !== "function"
      || !point
      || !Number.isFinite(Number(damage))
      || Number(damage) <= 0
    ) {
      return false;
    }

    const safeHitRadius = Math.max(0, Number(hitRadius) || 0);
    const targetableEnemies = getDamageableEnemyMeshes(enemySystem);
    let hitAny = false;
    for (const enemyMesh of targetableEnemies) {
      let intersects = false;
      if (typeof enemySystem.isPointNearEnemyMesh === "function") {
        intersects = enemySystem.isPointNearEnemyMesh(enemyMesh, point, safeHitRadius);
      } else {
        getEnemyCollisionCenter(enemyMesh, tempVecD);
        const containmentRadius = getEnemyContainmentRadiusForTowerTargeting(enemyMesh);
        const maxDistance = containmentRadius + safeHitRadius;
        intersects = tempVecD.distanceToSquared(point) <= (maxDistance * maxDistance);
      }
      if (!intersects) {
        continue;
      }
      if (enemySystem.applyDamageToEnemyMesh(enemyMesh, damage)) {
        hitAny = true;
      }
    }
    return hitAny;
  }

  function getDamageableEnemyMeshes(enemySystem) {
    if (!enemySystem) {
      return [];
    }
    if (typeof enemySystem.getDamageableEnemies === "function") {
      const meshes = enemySystem.getDamageableEnemies();
      if (Array.isArray(meshes)) {
        return meshes.filter((mesh) => mesh?.visible && isEnemyMeshFullyOutsideSpawnCubes(mesh));
      }
    }

    if (typeof enemySystem.getEnemies === "function") {
      const meshes = enemySystem.getEnemies();
      if (Array.isArray(meshes)) {
        return meshes.filter((mesh) => mesh?.visible && isEnemyMeshFullyOutsideSpawnCubes(mesh));
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

  function getEnemyContainmentRadiusForTowerTargeting(enemyMesh) {
    const bodyHalfSize = Number(enemyMesh?.userData?.bodyHalfSize);
    const legacyRadius = Number(enemyMesh?.userData?.hitSphereRadius);
    const baseHalfSize = Number.isFinite(bodyHalfSize) && bodyHalfSize > 0
      ? bodyHalfSize
      : (Number.isFinite(legacyRadius) && legacyRadius > 0 ? legacyRadius : 0);
    const scaleX = Math.max(0.001, Math.abs(Number(enemyMesh?.scale?.x) || 1));
    const scaleY = Math.max(0.001, Math.abs(Number(enemyMesh?.scale?.y) || 1));
    const scaleZ = Math.max(0.001, Math.abs(Number(enemyMesh?.scale?.z) || 1));
    return baseHalfSize * Math.max(scaleX, scaleY, scaleZ);
  }

  function isEnemyMeshFullyOutsideSpawnCubes(enemyMesh) {
    if (!enemyMesh || spawnTargetBlockVolumes.length === 0) {
      return true;
    }
    const containmentRadius = getEnemyContainmentRadiusForTowerTargeting(enemyMesh);
    getEnemyCollisionCenter(enemyMesh, tempVecH);
    for (const volume of spawnTargetBlockVolumes) {
      const intersectsSpawnCube = (
        tempVecH.x + containmentRadius > volume.minX
        && tempVecH.x - containmentRadius < volume.maxX
        && tempVecH.y + containmentRadius > volume.minY
        && tempVecH.y - containmentRadius < volume.maxY
        && tempVecH.z + containmentRadius > volume.minZ
        && tempVecH.z - containmentRadius < volume.maxZ
      );
      if (intersectsSpawnCube) {
        return false;
      }
    }
    return true;
  }

  function hasDamageableEnemyInRange(tower, enemySystem) {
    const range = getTowerRangeForType(tower?.towerType, tower?.ownerId) || (tower.range ?? AOE_RANGE);
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

  function getTowerDamageScale(tower) {
    const localBuff = Number.isFinite(Number(tower?.buffDamageMultiplier))
      ? Number(tower.buffDamageMultiplier)
      : 1;
    const typeDamageMultiplier = Number.isFinite(Number(getTowerTechModifiers(tower?.towerType, tower?.ownerId)?.damageMultiplier))
      ? Number(getTowerTechModifiers(tower?.towerType, tower?.ownerId)?.damageMultiplier)
      : 1;
    return towerDamageMultiplier * typeDamageMultiplier * Math.max(0, localBuff);
  }

  function getTowerFireIntervalScale(tower) {
    const localBuff = Number.isFinite(Number(tower?.buffFireRateIntervalFactor))
      ? Number(tower.buffFireRateIntervalFactor)
      : 1;
    const typeFireIntervalMultiplier = Number.isFinite(Number(getTowerTechModifiers(tower?.towerType, tower?.ownerId)?.fireIntervalMultiplier))
      ? Number(getTowerTechModifiers(tower?.towerType, tower?.ownerId)?.fireIntervalMultiplier)
      : 1;
    return towerFireRateMultiplier * typeFireIntervalMultiplier * Math.max(0.05, localBuff);
  }

  function getTowerModifierNumber(towerType, key, fallback = 0, ownerId = null) {
    const modifiers = getTowerTechModifiers(towerType, ownerId);
    const value = Number(modifiers?.[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function updateBuffTowerAurasAndBonuses(deltaSeconds) {
    const buffBaseDamageBonus = Number(BUFF_TOWER_CONFIG.damageBonusPerTower) || 0;
    const buffBaseFireRateBonus = Number(BUFF_TOWER_CONFIG.fireRateBonusPerTower) || 0;
    const activeBuffTowers = towers.filter((tower) => tower?.isOperational && tower.towerType === "buff");

    for (const tower of towers) {
      if (!tower) {
        continue;
      }
      tower.buffDamageMultiplier = 1;
      tower.buffFireRateIntervalFactor = 1;
    }

    for (const buffTower of activeBuffTowers) {
      buffTower.buffAuraClock = (buffTower.buffAuraClock || 0) + Math.max(0, deltaSeconds);
      const pulseT = 0.5 + (0.5 * Math.sin(buffTower.buffAuraClock * BUFF_TOWER_CONFIG.auraPulseSpeed));
      const auraMesh = buffTower.mesh?.userData?.buffAuraMesh;
      if (auraMesh?.material) {
        auraMesh.material.opacity = THREE.MathUtils.lerp(
          BUFF_TOWER_CONFIG.auraOpacity * 0.5,
          BUFF_TOWER_CONFIG.auraOpacity,
          pulseT
        );
      }
    }

    for (const tower of towers) {
      if (!tower?.isOperational) {
        continue;
      }
      let damageBonusSum = 0;
      let fireRateBonusSum = 0;
      for (const buffTower of activeBuffTowers) {
        const buffModifiers = getTowerTechModifiers("buff", buffTower.ownerId);
        const buffRange = getTowerRangeForType("buff", buffTower.ownerId) || BUFF_RANGE;
        const buffAffectsBuffTowers = !!buffModifiers?.buffAffectsBuffTowers;
        if (!buffAffectsBuffTowers && tower.towerType === "buff") {
          continue;
        }
        if (tower.mesh.position.distanceToSquared(buffTower.mesh.position) <= (buffRange * buffRange)) {
          damageBonusSum += buffBaseDamageBonus + (Number(buffModifiers?.buffDamageBonusPerTowerAdd) || 0);
          fireRateBonusSum += buffBaseFireRateBonus + (Number(buffModifiers?.buffFireRateBonusPerTowerAdd) || 0);
        }
      }
      if (damageBonusSum <= 0 && fireRateBonusSum <= 0) {
        continue;
      }
      tower.buffDamageMultiplier = Math.max(0, 1 + damageBonusSum);
      tower.buffFireRateIntervalFactor = Math.max(0.1, 1 - fireRateBonusSum);
    }
  }

  function rotateAngleTowards(currentAngle, targetAngle, maxStep) {
    const delta = THREE.MathUtils.euclideanModulo(targetAngle - currentAngle + Math.PI, Math.PI * 2) - Math.PI;
    if (Math.abs(delta) <= maxStep) {
      return targetAngle;
    }
    return currentAngle + Math.sign(delta) * maxStep;
  }

  function updateGunBlackHoleVisualState(tower, deltaSeconds, hasTarget = false) {
    if (!tower?.mesh) {
      return;
    }
    tower.gunPortalClock = (tower.gunPortalClock || 0) + Math.max(0, deltaSeconds);
    tower.gunPortalPulse = Math.max(0, (tower.gunPortalPulse || 0) - (deltaSeconds * 2.6));

    const uniforms = tower.mesh.userData?.gunBlackHoleUniforms;
    if (uniforms?.uTime) {
      uniforms.uTime.value = tower.gunPortalClock;
    }
    if (uniforms?.uPulse) {
      uniforms.uPulse.value = THREE.MathUtils.clamp(
        0.08 + (hasTarget ? 0.18 : 0) + ((tower.gunPortalPulse || 0) * 0.86),
        0,
        1.35
      );
    }

    const portalFrame = tower.mesh.userData?.gunPortalFrame;
    if (portalFrame) {
      const frameScale = 1 + ((uniforms?.uPulse?.value || 0) * 0.08);
      portalFrame.scale.setScalar(frameScale);
    }

    const portalLens = tower.mesh.userData?.gunPortalLensMesh;
    if (portalLens) {
      const lensScale = 1
        + ((uniforms?.uPulse?.value || 0) * 0.05)
        + (Math.sin(tower.gunPortalClock * 2.4) * 0.015);
      portalLens.scale.setScalar(lensScale);
    }

    const particleState = tower.mesh.userData?.gunBlackHoleParticleState;
    if (particleState?.positionAttribute && Array.isArray(particleState.particleData)) {
      const pulseBoost = 1 + ((uniforms?.uPulse?.value || 0) * 0.24);
      const positions = particleState.positionAttribute.array;
      for (let i = 0; i < particleState.particleData.length; i += 1) {
        const particle = particleState.particleData[i];
        particle.radius -= deltaSeconds * particle.inwardSpeed * pulseBoost;
        particle.angle -= deltaSeconds * particle.swirlSpeed * (1 + ((uniforms?.uPulse?.value || 0) * 0.18));
        if (particle.radius <= particleState.sinkRadius) {
          particle.radius = THREE.MathUtils.lerp(
            particleState.outerRadiusMin,
            particleState.outerRadiusMax,
            Math.random()
          );
          particle.angle = Math.random() * Math.PI * 2;
          particle.zOffset = Math.random() * particleState.depthRange;
        }

        positions[i * 3] = Math.cos(particle.angle) * particle.radius;
        positions[(i * 3) + 1] = Math.sin(particle.angle) * particle.radius;
        positions[(i * 3) + 2] = particle.zOffset;
      }
      particleState.positionAttribute.needsUpdate = true;
    }
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

    const gunModifiers = getTowerTechModifiers("gun", tower?.ownerId);
    const extraPierce = Math.max(0, Math.floor(Number(gunModifiers?.projectilePierce) || 0));
    gunProjectiles.push({
      mesh: projectileMesh,
      velocity: tempVecB.clone().multiplyScalar(GUN_PROJECTILE_SPEED),
      life: GUN_PROJECTILE_LIFETIME,
      damage: GUN_PROJECTILE_DAMAGE * getTowerDamageScale(tower),
      hitRadius: GUN_PROJECTILE_HIT_RADIUS,
      remainingPierceHits: extraPierce,
      hitEnemyUuids: new Set(),
      sourceTower: tower,
    });
    spawnGunMuzzleFlash(tempVecA);
    tower.gunMuzzleFlashTimer = Math.max(0, Number(GUN_TOWER_CONFIG.muzzleFlashDuration) || 0.08);
    tower.gunPortalPulse = 1;
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
      if (projectile?.hitEnemyUuids?.has(enemyMesh.uuid)) {
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
        const didApplyDamage = enemySystem.applyDamageToEnemyMesh(hitEnemyMesh, projectile.damage);
        if (didApplyDamage) {
          projectile.hitEnemyUuids?.add?.(hitEnemyMesh.uuid);
        }
        if ((Number(projectile.remainingPierceHits) || 0) > 0) {
          projectile.remainingPierceHits -= 1;
        } else {
          destroyGunProjectile(projectile);
          gunProjectiles.splice(i, 1);
          continue;
        }
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
    const slowModifiers = getTowerTechModifiers("slow", tower?.ownerId);
    const effectiveSlowMultiplier = THREE.MathUtils.clamp(
      SLOW_MULTIPLIER + (Number(slowModifiers?.slowMultiplierAdd) || 0),
      0.15,
      0.98
    );
    const effectiveSlowDuration = Math.max(
      0.05,
      SLOW_DURATION * Math.max(0.1, Number(slowModifiers?.slowDurationMultiplier) || 1)
    );

    const target = findTargetWithLineOfSight(tower, enemySystem, { skipSlowed: true });
    if (!target || !target.mesh || !target.mesh.visible || tower.cooldown > 0) {
      return;
    }

    const fieldCenter = target.mesh.position.clone();
    spawnSlowFieldEffect(fieldCenter);

    if (typeof enemySystem.applyTemporarySlowInAabb === "function") {
      tempVecF.copy(fieldCenter);
      tempVecG.set(grid.cellSize * 0.5, grid.cellSize * 0.5, grid.cellSize * 0.5);
      enemySystem.applyTemporarySlowInAabb(tempVecF, tempVecG, effectiveSlowMultiplier, effectiveSlowDuration);
    } else if (typeof enemySystem.applyTemporarySlowToEnemyMesh === "function") {
      enemySystem.applyTemporarySlowToEnemyMesh(target.mesh, effectiveSlowMultiplier, effectiveSlowDuration);
    }

    tower.slowProcFlash = 1;
    tower.cooldown = SLOW_FIRE_INTERVAL * getTowerFireIntervalScale(tower);
  }

  function updateGunTowerCombat(tower, deltaSeconds, enemySystem) {
    tower.cooldown = Math.max(0, tower.cooldown - deltaSeconds);
    tower.gunMuzzleFlashTimer = Math.max(0, (tower.gunMuzzleFlashTimer || 0) - deltaSeconds);

    const target = findTargetWithLineOfSight(tower, enemySystem, { skipSlowed: false });
    updateGunBlackHoleVisualState(tower, deltaSeconds, !!(target?.mesh?.visible));
    if (!target || !target.mesh || !target.mesh.visible) {
      const pitchNode = tower.mesh?.userData?.gunTurretPitchNode;
      if (pitchNode) {
        pitchNode.rotation.x = 0;
      }
      return;
    }

    const yawNode = tower.mesh?.userData?.gunTurretYawNode;
    const pitchNode = tower.mesh?.userData?.gunTurretPitchNode;
    if (yawNode) {
      tempVecA.copy(target.aimPoint || target.position).sub(tower.mesh.position);
      tempVecA.y = 0;
      if (tempVecA.lengthSq() >= TOWER_CONFIG.segmentEpsilon) {
        const targetYaw = Math.atan2(tempVecA.x, tempVecA.z);
        const maxYawStep = Math.max(0, Number(GUN_TOWER_CONFIG.turretTurnSpeed) || 0) * Math.max(0, deltaSeconds);
        yawNode.rotation.y = rotateAngleTowards(yawNode.rotation.y, targetYaw, maxYawStep);
      }
    }

    if (pitchNode) {
      pitchNode.rotation.x = 0;
    }

    if (tower.cooldown <= 0) {
      const targetPoint = target.aimPoint ? target.aimPoint.clone() : target.position.clone();
      spawnGunProjectile(tower, targetPoint);
      tower.cooldown = GUN_FIRE_INTERVAL * getTowerFireIntervalScale(tower);
    }
  }

  function updateAoeTowerCombat(tower, deltaSeconds, enemySystem) {
    updateAoeTowerBobbing(tower, deltaSeconds);

    const hasEnemyInRange = hasDamageableEnemyInRange(tower, enemySystem);
    const chargeInterval = Math.max(0.05, AOE_PULSE_INTERVAL * getTowerFireIntervalScale(tower));
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

    const pulseRange = getTowerRangeForType("aoe", tower?.ownerId) || (tower.range ?? AOE_RANGE);
    const pulseDamage = AOE_PULSE_DAMAGE * getTowerDamageScale(tower);
    while (tower.chargeTimer >= chargeInterval) {
      tower.chargeTimer -= chargeInterval;
      getAoePulseOrigin(tower, tempVecA);
      spawnAoePulse(tempVecA, pulseRange, pulseDamage);
    }

    chargeRatio = THREE.MathUtils.clamp(tower.chargeTimer / chargeInterval, 0, 1);
    updateAoeTowerAppearance(tower, chargeRatio);
  }

  function spawnCylinderSegmentEffect(start, end, geometry, baseMaterial, width = 0.1) {
    tempVecI.copy(end).sub(start);
    const length = tempVecI.length();
    if (length <= TOWER_CONFIG.segmentEpsilon) {
      return null;
    }
    const mesh = new THREE.Mesh(geometry, baseMaterial.clone());
    mesh.material.toneMapped = false;
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.scale.set(Math.max(0.01, width), length, Math.max(0.01, width));
    mesh.quaternion.setFromUnitVectors(upVector, tempVecI.normalize());
    scene.add(mesh);
    return mesh;
  }

  function updateTimedMeshEffects(collection, deltaSeconds, {
    baseOpacity = 1,
    minScale = 1,
    maxScale = 1,
  } = {}) {
    for (let i = collection.length - 1; i >= 0; i -= 1) {
      const effect = collection[i];
      effect.life -= deltaSeconds;
      if (effect.life <= 0) {
        if (effect.mesh?.parent) {
          effect.mesh.parent.remove(effect.mesh);
        }
        effect.mesh?.material?.dispose?.();
        collection.splice(i, 1);
        continue;
      }

      const t = Math.max(0, effect.life / effect.maxLife);
      if (effect.mesh?.material) {
        effect.mesh.material.opacity = baseOpacity * t;
      }
      if (effect.mesh && (minScale !== 1 || maxScale !== 1)) {
        const scale = THREE.MathUtils.lerp(minScale, maxScale, 1 - t);
        if (effect.scaleAxis === "xyz") {
          effect.mesh.scale.setScalar(scale);
        } else if (effect.scaleAxis === "y") {
          effect.mesh.scale.y = scale;
        }
      }
    }
  }

  function getLaserEmitterWorldPosition(tower, out) {
    const emitterNode = tower.mesh?.userData?.laserSniperEmitterNode;
    if (emitterNode && typeof emitterNode.getWorldPosition === "function") {
      emitterNode.getWorldPosition(out);
      return out;
    }
    out.copy(tower.mesh.position);
    out.y += LASER_SNIPER_TOWER_CONFIG.spineHeight * 0.8;
    return out;
  }

  function spawnLaserBeam(start, end) {
    const beamMesh = spawnCylinderSegmentEffect(
      start,
      end,
      laserBeamGeometry,
      laserBeamMaterial,
      LASER_SNIPER_TOWER_CONFIG.beamWidth
    );
    if (!beamMesh) {
      return;
    }
    laserBeamEffects.push({
      mesh: beamMesh,
      life: Math.max(0.01, LASER_SNIPER_BEAM_DURATION),
      maxLife: Math.max(0.01, LASER_SNIPER_BEAM_DURATION),
    });
  }

  function updateLaserSniperCombat(tower, deltaSeconds, enemySystem) {
    tower.cooldown = Math.max(0, tower.cooldown - deltaSeconds);
    const target = findTargetWithUnlimitedLineOfSight(tower, enemySystem);
    const yawNode = tower.mesh?.userData?.laserSniperYawNode;
    if (target && yawNode) {
      tempVecA.copy(target.aimPoint || target.position).sub(tower.mesh.position);
      tempVecA.y = 0;
      if (tempVecA.lengthSq() >= TOWER_CONFIG.segmentEpsilon) {
        yawNode.rotation.y = Math.atan2(tempVecA.x, tempVecA.z);
      }
    }
    if (!target || !target.mesh || tower.cooldown > 0) {
      return;
    }
    getLaserEmitterWorldPosition(tower, tempVecB);
    const sniperModifiers = getTowerTechModifiers("laserSniper", tower?.ownerId);
    const pierceTargets = Math.max(0, Math.floor(Number(sniperModifiers?.laserPierceTargets) || 0));
    const maxHits = Math.max(1, 1 + pierceTargets);
    const effectiveRange = getTowerRangeForType("laserSniper", tower?.ownerId) || LASER_SNIPER_RANGE;

    const primaryAimPoint = target.aimPoint ? target.aimPoint.clone() : target.position.clone();
    tempVecI.copy(primaryAimPoint).sub(tempVecB);
    if (tempVecI.lengthSq() <= TOWER_CONFIG.segmentEpsilon) {
      return;
    }
    const beamDirection = tempVecI.normalize().clone();
    const hitCandidates = [];
    for (const enemyMesh of getDamageableEnemyMeshes(enemySystem)) {
      getEnemyCollisionCenter(enemyMesh, tempVecD);
      tempVecE.copy(tempVecD).sub(tempVecB);
      const along = tempVecE.dot(beamDirection);
      if (along < 0 || along > effectiveRange) {
        continue;
      }
      const lateralSq = tempVecE.lengthSq() - (along * along);
      const enemyContainmentRadius = getEnemyContainmentRadiusForTowerTargeting(enemyMesh);
      const hitRadius = enemyContainmentRadius + (LASER_SNIPER_TOWER_CONFIG.beamWidth * 0.9);
      if (lateralSq > (hitRadius * hitRadius)) {
        continue;
      }
      if (!hasLineOfSightToPoint(tower, tempVecD)) {
        continue;
      }
      hitCandidates.push({
        mesh: enemyMesh,
        aimPoint: tempVecD.clone(),
        along,
      });
    }

    hitCandidates.sort((a, b) => a.along - b.along);
    const hitTargets = hitCandidates.length > 0
      ? hitCandidates.slice(0, maxHits)
      : [{ mesh: target.mesh, aimPoint: primaryAimPoint }];

    if (typeof enemySystem.applyDamageToEnemyMesh === "function") {
      const laserDamage = LASER_SNIPER_DAMAGE * getTowerDamageScale(tower);
      for (const hitTarget of hitTargets) {
        enemySystem.applyDamageToEnemyMesh(hitTarget.mesh, laserDamage);
      }
    }

    const beamEnd = hitTargets[hitTargets.length - 1]?.aimPoint || primaryAimPoint;
    spawnLaserBeam(tempVecB, beamEnd);
    tower.cooldown = LASER_SNIPER_FIRE_INTERVAL * getTowerFireIntervalScale(tower);
  }

  function findTargetInRangeNoLos(tower, enemySystem) {
    const effectiveRange = getTowerRangeForType("mortar", tower?.ownerId) || (tower.range ?? MORTAR_RANGE);
    const rangeSq = effectiveRange ** 2;
    let best = null;
    let bestDistSq = rangeSq;
    for (const enemyMesh of getDamageableEnemyMeshes(enemySystem)) {
      getEnemyCollisionCenter(enemyMesh, tempVecA);
      const distSq = tower.mesh.position.distanceToSquared(tempVecA);
      if (distSq > bestDistSq) {
        continue;
      }
      bestDistSq = distSq;
      best = {
        mesh: enemyMesh,
        aimPoint: tempVecA.clone(),
      };
    }
    return best;
  }

  function getMortarMuzzleWorldPosition(tower, out) {
    const muzzleNode = tower.mesh?.userData?.mortarMuzzleNode;
    if (muzzleNode && typeof muzzleNode.getWorldPosition === "function") {
      muzzleNode.getWorldPosition(out);
      return out;
    }
    out.copy(tower.mesh.position);
    out.y += 1.2;
    return out;
  }

  function getMortarImpactPoint(targetPoint, out) {
    out.copy(targetPoint);
    const impactSurfaceY = getBuildSurfaceY(targetPoint.x, targetPoint.z);
    if (Number.isFinite(impactSurfaceY)) {
      out.y = impactSurfaceY + (MORTAR_TOWER_CONFIG.projectileSize * 0.4);
    }
    return out;
  }

  function setMortarBarrelElevation(tower, elevationRadians) {
    const barrelPivot = tower.mesh?.userData?.mortarBarrelPivot;
    if (!barrelPivot || !Number.isFinite(elevationRadians)) {
      return;
    }
    const clampedElevation = THREE.MathUtils.clamp(
      elevationRadians,
      THREE.MathUtils.degToRad(20),
      THREE.MathUtils.degToRad(88)
    );
    barrelPivot.rotation.x = -clampedElevation;
  }

  function setMortarYawToward(tower, targetPoint) {
    const yawNode = tower.mesh?.userData?.mortarYawNode;
    if (!yawNode || !targetPoint) {
      return;
    }
    tempVecF.copy(targetPoint).sub(tower.mesh.position);
    tempVecF.y = 0;
    if (tempVecF.lengthSq() <= TOWER_CONFIG.segmentEpsilon) {
      return;
    }
    yawNode.rotation.y = Math.atan2(tempVecF.x, tempVecF.z);
  }

  function solveMortarLaunchVelocity(launchPosition, impactPoint, outVelocity) {
    const gravity = Math.max(0.01, Number(MORTAR_TOWER_CONFIG.projectileGravity) || 0.01);
    const baseLaunchVerticalSpeed = Math.max(0.01, Number(MORTAR_TOWER_CONFIG.projectileLaunchArcY) || 0.01);

    tempVecD.copy(impactPoint).sub(launchPosition);
    tempVecE.set(tempVecD.x, 0, tempVecD.z);
    const horizontalDistance = tempVecE.length();
    const verticalDelta = tempVecD.y;

    let launchVerticalSpeed = baseLaunchVerticalSpeed;
    if (verticalDelta > 0) {
      const minVerticalSpeed = Math.sqrt(Math.max(0, 2 * gravity * verticalDelta)) + 0.5;
      launchVerticalSpeed = Math.max(launchVerticalSpeed, minVerticalSpeed);
    }

    const discriminant = (launchVerticalSpeed * launchVerticalSpeed) - (2 * gravity * verticalDelta);
    if (!(discriminant > 0)) {
      return null;
    }

    const sqrtDiscriminant = Math.sqrt(discriminant);
    const timeShort = (launchVerticalSpeed - sqrtDiscriminant) / gravity;
    const timeLong = (launchVerticalSpeed + sqrtDiscriminant) / gravity;
    const flightTime = (Number.isFinite(timeLong) && timeLong > 0.02)
      ? timeLong
      : ((Number.isFinite(timeShort) && timeShort > 0.02) ? timeShort : 0);
    if (!(flightTime > 0)) {
      return null;
    }

    let horizontalSpeed = 0;
    if (horizontalDistance > TOWER_CONFIG.segmentEpsilon) {
      tempVecE.multiplyScalar(1 / horizontalDistance);
      horizontalSpeed = horizontalDistance / flightTime;
      outVelocity.set(
        tempVecE.x * horizontalSpeed,
        launchVerticalSpeed,
        tempVecE.z * horizontalSpeed
      );
    } else {
      outVelocity.set(0, launchVerticalSpeed, 0);
    }

    return {
      flightTime,
      elevationRadians: Math.atan2(launchVerticalSpeed, Math.max(0.0001, horizontalSpeed)),
    };
  }

  function spawnMortarProjectile(tower, targetPoint) {
    getMortarImpactPoint(targetPoint, tempVecC);
    setMortarYawToward(tower, tempVecC);
    getMortarMuzzleWorldPosition(tower, tempVecA);
    const launchSolution = solveMortarLaunchVelocity(tempVecA, tempVecC, tempVecB);
    if (!launchSolution) {
      return false;
    }
    setMortarBarrelElevation(tower, launchSolution.elevationRadians);
    const projectile = new THREE.Mesh(mortarProjectileGeometry, mortarProjectileMaterial);
    projectile.position.copy(tempVecA);
    scene.add(projectile);
    mortarProjectiles.push({
      mesh: projectile,
      velocity: tempVecB.clone(),
      life: MORTAR_PROJECTILE_LIFETIME,
      splashDamage: MORTAR_SPLASH_DAMAGE * getTowerDamageScale(tower),
      splashRadius: Math.max(
        0.1,
        MORTAR_SPLASH_RADIUS + getTowerModifierNumber("mortar", "mortarSplashRadiusAdd", 0, tower?.ownerId)
      ),
      sourceTower: tower,
    });
    return true;
  }

  function isPointInsideObstacle(position, obstacle, padding = 0) {
    if (obstacle?.kind === "ramp" && typeof obstacle.getSurfaceYAtWorld === "function") {
      const rampSurfaceY = obstacle.getSurfaceYAtWorld(position.x, position.z);
      if (!Number.isFinite(rampSurfaceY)) {
        return false;
      }
      return position.y <= (rampSurfaceY + padding) && position.y >= (obstacle.baseY - padding);
    }

    const obstaclePos = obstacle?.mesh?.position ?? obstacle?.position;
    const halfSizeX = Number.isFinite(Number(obstacle?.halfSizeX))
      ? Number(obstacle.halfSizeX)
      : Number(obstacle?.halfSize);
    const halfSizeZ = Number.isFinite(Number(obstacle?.halfSizeZ))
      ? Number(obstacle.halfSizeZ)
      : Number(obstacle?.halfSize);
    const height = Number(obstacle?.height);
    const baseY = Number(obstacle?.baseY ?? 0);
    if (
      !obstaclePos
      || !Number.isFinite(halfSizeX)
      || !Number.isFinite(halfSizeZ)
      || !Number.isFinite(height)
    ) {
      return false;
    }
    return (
      position.x >= obstaclePos.x - halfSizeX - padding
      && position.x <= obstaclePos.x + halfSizeX + padding
      && position.y >= baseY - padding
      && position.y <= baseY + height + padding
      && position.z >= obstaclePos.z - halfSizeZ - padding
      && position.z <= obstaclePos.z + halfSizeZ + padding
    );
  }

  function spawnMortarExplosion(position, radius) {
    const explosionMesh = new THREE.Mesh(mortarExplosionGeometry, mortarExplosionMaterial.clone());
    explosionMesh.material.toneMapped = false;
    explosionMesh.position.copy(position);
    explosionMesh.scale.setScalar(0.01);
    scene.add(explosionMesh);
    mortarExplosions.push({
      mesh: explosionMesh,
      life: Math.max(0.05, MORTAR_TOWER_CONFIG.explosionDuration),
      maxLife: Math.max(0.05, MORTAR_TOWER_CONFIG.explosionDuration),
      radius: Math.max(0.1, radius),
      scaleAxis: "xyz",
    });
  }

  function detonateMortarProjectile(projectile, enemySystem) {
    if (!projectile?.mesh) {
      return;
    }
    const explosionPoint = projectile.mesh.position.clone();
    spawnMortarExplosion(explosionPoint, projectile.splashRadius);
    applyPointDamageToTowerTargetableEnemies(
      enemySystem,
      explosionPoint,
      projectile.splashRadius,
      projectile.splashDamage
    );
    scene.remove(projectile.mesh);
  }

  function updateMortarProjectiles(deltaSeconds, enemySystem) {
    const staticObstacles = [
      ...terrainObstacles,
      ...(Array.isArray(grid.rampObstacles) ? grid.rampObstacles : []),
      ...(Array.isArray(grid.endpointObstacles) ? grid.endpointObstacles : []),
    ];

    for (let i = mortarProjectiles.length - 1; i >= 0; i -= 1) {
      const projectile = mortarProjectiles[i];
      projectile.velocity.y -= MORTAR_TOWER_CONFIG.projectileGravity * deltaSeconds;
      projectile.mesh.position.addScaledVector(projectile.velocity, deltaSeconds);
      projectile.life -= deltaSeconds;

      let shouldExplode = projectile.life <= 0;
      if (!shouldExplode) {
        const projectilePadding = (MORTAR_TOWER_CONFIG.projectileSize * 0.45);
        for (const obstacle of staticObstacles) {
          if (isPointInsideObstacle(projectile.mesh.position, obstacle, projectilePadding)) {
            shouldExplode = true;
            break;
          }
        }
      }
      if (!shouldExplode) {
        for (const tower of towers) {
          if (!tower?.mesh || tower === projectile.sourceTower) {
            continue;
          }
          if (isPointInsideObstacle(projectile.mesh.position, tower, MORTAR_TOWER_CONFIG.projectileSize * 0.45)) {
            shouldExplode = true;
            break;
          }
        }
      }
      if (!shouldExplode) {
        const groundY = getBuildSurfaceY(projectile.mesh.position.x, projectile.mesh.position.z);
        if (projectile.mesh.position.y <= (groundY + (MORTAR_TOWER_CONFIG.projectileSize * 0.4))) {
          projectile.mesh.position.y = groundY + (MORTAR_TOWER_CONFIG.projectileSize * 0.4);
          shouldExplode = true;
        }
      }
      if (!shouldExplode) {
        continue;
      }

      detonateMortarProjectile(projectile, enemySystem);
      mortarProjectiles.splice(i, 1);
    }
  }

  function updateMortarCombat(tower, deltaSeconds, enemySystem) {
    tower.cooldown = Math.max(0, tower.cooldown - deltaSeconds);
    const target = findTargetInRangeNoLos(tower, enemySystem);
    if (target?.mesh) {
      getMortarImpactPoint(target.aimPoint, tempVecC);
      setMortarYawToward(tower, tempVecC);
      getMortarMuzzleWorldPosition(tower, tempVecA);
      const previewLaunch = solveMortarLaunchVelocity(tempVecA, tempVecC, tempVecB);
      if (previewLaunch) {
        setMortarBarrelElevation(tower, previewLaunch.elevationRadians);
      }
    }
    if (tower.cooldown > 0) {
      return;
    }
    if (!target?.mesh) {
      return;
    }
    if (!spawnMortarProjectile(tower, target.aimPoint)) {
      return;
    }
    tower.cooldown = MORTAR_FIRE_INTERVAL * getTowerFireIntervalScale(tower);
  }

  function getTeslaEmitterWorldPosition(tower, out) {
    const emitterNode = tower.mesh?.userData?.teslaEmitterNode;
    if (emitterNode && typeof emitterNode.getWorldPosition === "function") {
      emitterNode.getWorldPosition(out);
      return out;
    }
    out.copy(tower.mesh.position);
    out.y += 1.6;
    return out;
  }

  function spawnTeslaBolt(start, end) {
    const boltMesh = spawnCylinderSegmentEffect(
      start,
      end,
      teslaBoltGeometry,
      teslaBoltMaterial,
      0.08
    );
    if (!boltMesh) {
      return;
    }
    teslaBoltEffects.push({
      mesh: boltMesh,
      life: Math.max(0.01, TESLA_BOLT_DURATION),
      maxLife: Math.max(0.01, TESLA_BOLT_DURATION),
    });
  }

  function updateTeslaCombat(tower, deltaSeconds, enemySystem) {
    tower.cooldown = Math.max(0, tower.cooldown - deltaSeconds);
    const ringTop = tower.mesh?.userData?.teslaRingTop;
    if (ringTop) {
      ringTop.rotation.z += deltaSeconds * 1.2;
    }
    if (tower.cooldown > 0) {
      return;
    }

    const primary = findTargetWithLineOfSight(tower, enemySystem, { skipSlowed: false });
    if (!primary?.mesh) {
      return;
    }

    const candidates = getDamageableEnemyMeshes(enemySystem);
    const chainTargets = [primary.mesh];
    const targetSet = new Set([primary.mesh.uuid]);
    const extraChainTargets = Math.max(
      0,
      Math.floor(getTowerModifierNumber("tesla", "teslaChainCountAdd", 0, tower?.ownerId))
    );
    const maxChainTargets = Math.max(1, TESLA_CHAIN_COUNT + extraChainTargets);
    let lastCenter = getEnemyCollisionCenter(primary.mesh, tempVecD).clone();
    while (chainTargets.length < maxChainTargets) {
      let bestCandidate = null;
      let bestDistSq = TESLA_CHAIN_RANGE * TESLA_CHAIN_RANGE;
      for (const enemyMesh of candidates) {
        if (!enemyMesh?.visible || targetSet.has(enemyMesh.uuid)) {
          continue;
        }
        getEnemyCollisionCenter(enemyMesh, tempVecE);
        const distSq = tempVecE.distanceToSquared(lastCenter);
        if (distSq > bestDistSq) {
          continue;
        }
        bestDistSq = distSq;
        bestCandidate = enemyMesh;
      }
      if (!bestCandidate) {
        break;
      }
      chainTargets.push(bestCandidate);
      targetSet.add(bestCandidate.uuid);
      lastCenter = getEnemyCollisionCenter(bestCandidate, tempVecF).clone();
    }

    const linkDamage = TESLA_DAMAGE * getTowerDamageScale(tower);
    getTeslaEmitterWorldPosition(tower, tempVecA);
    let previousPoint = tempVecA.clone();
    for (const enemyMesh of chainTargets) {
      getEnemyCollisionCenter(enemyMesh, tempVecB);
      spawnTeslaBolt(previousPoint, tempVecB);
      if (typeof enemySystem.applyDamageToEnemyMesh === "function") {
        enemySystem.applyDamageToEnemyMesh(enemyMesh, linkDamage);
      }
      previousPoint = tempVecB.clone();
    }

    tower.cooldown = TESLA_FIRE_INTERVAL * getTowerFireIntervalScale(tower);
  }

  function updateSpikesCombat(tower, deltaSeconds, enemySystem) {
    const cycleInterval = Math.max(
      0.05,
      SPIKES_CYCLE_INTERVAL
        * Math.max(0.05, getTowerModifierNumber("spikes", "spikesCycleIntervalMultiplier", 1, tower?.ownerId))
    );
    const activeDuration = Math.max(
      0.02,
      SPIKES_ACTIVE_DURATION
        * Math.max(0.05, getTowerModifierNumber("spikes", "spikesActiveDurationMultiplier", 1, tower?.ownerId))
    );
    tower.spikesCycleTimer += Math.max(0, deltaSeconds);
    if (tower.spikesCycleTimer >= cycleInterval) {
      tower.spikesCycleTimer -= cycleInterval;
      tower.spikesActiveTimer = activeDuration;
      tower.spikesDidDamageThisCycle = false;
    }

    tower.spikesActiveTimer = Math.max(0, tower.spikesActiveTimer - deltaSeconds);
    let extension = 0.02;
    if (tower.spikesActiveTimer > 0) {
      const activeT = 1 - (tower.spikesActiveTimer / Math.max(0.01, activeDuration));
      extension = Math.max(0.02, Math.sin(activeT * Math.PI));
      if (!tower.spikesDidDamageThisCycle && enemySystem) {
        tempVecA.copy(tower.mesh.position);
        tempVecA.y = tower.baseY + 0.45;
        applyPointDamageToTowerTargetableEnemies(
          enemySystem,
          tempVecA,
          SPIKES_HIT_RADIUS,
          SPIKES_DAMAGE * getTowerDamageScale(tower)
        );
        tower.spikesDidDamageThisCycle = true;
      }
    }

    const spikeMeshes = tower.mesh?.userData?.spikeMeshes;
    if (Array.isArray(spikeMeshes)) {
      for (const spike of spikeMeshes) {
        spike.scale.y = extension;
      }
    }
  }

  function updatePlasmaVisualState(tower, deltaSeconds, intensity = 1) {
    if (!tower?.mesh) {
      return;
    }
    const mesh = tower.mesh;
    tower.plasmaClock = (tower.plasmaClock || 0) + Math.max(0, deltaSeconds);

    const flameUniforms = mesh.userData?.plasmaFlameUniforms;
    const baseOpacity = Number(mesh.userData?.plasmaFlameBaseOpacity) || 0.6;
    const intensityClamped = THREE.MathUtils.clamp(intensity, 0, 1.2);
    if (flameUniforms?.uTime) {
      flameUniforms.uTime.value = tower.plasmaClock;
    }
    if (flameUniforms?.uOpacity) {
      flameUniforms.uOpacity.value = THREE.MathUtils.lerp(
        baseOpacity * 0.7,
        baseOpacity * 1.1,
        THREE.MathUtils.clamp(intensityClamped, 0, 1)
      );
    }

    const flameConfig = mesh.userData?.plasmaFlameConfig;
    const descriptors = Array.isArray(mesh.userData?.plasmaParticleDescriptors)
      ? mesh.userData.plasmaParticleDescriptors
      : [];
    if (!flameConfig || descriptors.length === 0) {
      return;
    }
    for (const descriptor of descriptors) {
      const particleMesh = descriptor?.mesh;
      if (!particleMesh) {
        continue;
      }
      const progress = (tower.plasmaClock * descriptor.speed + descriptor.phase) % 1;
      const spread = 1 - progress;
      const lateralJitter = Math.sin((tower.plasmaClock * 9.5) + (descriptor.phase * 19)) * 0.03;
      const verticalJitter = Math.cos((tower.plasmaClock * 7.2) + (descriptor.phase * 23)) * 0.035;
      const x = (descriptor.driftX * spread * flameConfig.width * 0.26) + (lateralJitter * spread);
      const y = flameConfig.anchorY + (descriptor.driftY * spread * flameConfig.height * 0.18) + verticalJitter;
      const z = flameConfig.startZ + (progress * flameConfig.length);
      particleMesh.position.set(x, y, z);

      const particleScale = descriptor.size * THREE.MathUtils.lerp(1.3, 0.36, progress);
      particleMesh.scale.setScalar(Math.max(0.01, particleScale));
      if (particleMesh.material) {
        particleMesh.material.opacity = THREE.MathUtils.clamp(
          THREE.MathUtils.lerp(0.1, 0.78, spread) * THREE.MathUtils.clamp(intensityClamped, 0.65, 1.2),
          0,
          1
        );
      }
    }
  }

  function getPlasmaTargetCellsForTower(tower) {
    const wallCell = tower?.plasmaWallCell;
    const direction = tower?.plasmaDirection;
    if (
      !Number.isInteger(wallCell?.x)
      || !Number.isInteger(wallCell?.z)
      || !Number.isInteger(direction?.x)
      || !Number.isInteger(direction?.z)
    ) {
      return [];
    }

    const depthCells = Math.max(
      1,
      1 + Math.max(0, Math.floor(getTowerModifierNumber("plasma", "plasmaDepthCellsAdd", 0, tower?.ownerId)))
    );
    const sideCells = Math.max(
      0,
      Math.floor(getTowerModifierNumber("plasma", "plasmaSideCellsAdd", 0, tower?.ownerId))
    );
    const rightX = -direction.z;
    const rightZ = direction.x;
    const seen = new Set();
    const cells = [];

    for (let depth = 1; depth <= depthCells; depth += 1) {
      const baseX = wallCell.x + (direction.x * depth);
      const baseZ = wallCell.z + (direction.z * depth);
      for (let side = -sideCells; side <= sideCells; side += 1) {
        const cellX = baseX + (rightX * side);
        const cellZ = baseZ + (rightZ * side);
        if (!Number.isInteger(cellX) || !Number.isInteger(cellZ)) {
          continue;
        }
        if (typeof grid?.isCellInsideLevel === "function" && !grid.isCellInsideLevel(cellX, cellZ)) {
          continue;
        }
        const key = `${cellX},${cellZ}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        cells.push({ x: cellX, z: cellZ });
      }
    }

    return cells;
  }

  function updatePlasmaCombat(tower, deltaSeconds, enemySystem) {
    const wallCell = tower.plasmaWallCell;
    const targetCells = getPlasmaTargetCellsForTower(tower);
    if (targetCells.length === 0 || !Number.isInteger(wallCell?.y)) {
      updatePlasmaVisualState(tower, deltaSeconds, 0.82);
      return;
    }

    const targetBaseY = getCellBaseY(wallCell.y);
    const targetCenters = targetCells.map((targetCell) => {
      const center = getCellCenter(targetCell.x, targetCell.z, targetBaseY + (gridCellSize * 0.5));
      center.y = targetBaseY + (gridCellSize * 0.5);
      return center;
    });

    let hitAny = false;
    if (enemySystem) {
      const halfExtent = gridCellSize * 0.5;
      const dpsBase = PLASMA_DAMAGE / Math.max(0.05, PLASMA_FIRE_INTERVAL);
      const frameDamage = dpsBase
        * Math.max(0, deltaSeconds)
        * getTowerDamageScale(tower)
        / Math.max(0.05, getTowerFireIntervalScale(tower));
      const damageable = getDamageableEnemyMeshes(enemySystem);
      const damagedEnemyUuids = new Set();
      for (const enemyMesh of damageable) {
        if (!enemyMesh || damagedEnemyUuids.has(enemyMesh.uuid)) {
          continue;
        }
        getEnemyCollisionCenter(enemyMesh, tempVecA);
        let insideAnyTargetCell = false;
        for (const targetCenter of targetCenters) {
          if (
            Math.abs(tempVecA.x - targetCenter.x) <= halfExtent
            && Math.abs(tempVecA.y - targetCenter.y) <= halfExtent
            && Math.abs(tempVecA.z - targetCenter.z) <= halfExtent
          ) {
            insideAnyTargetCell = true;
            break;
          }
        }
        if (insideAnyTargetCell) {
          if (typeof enemySystem.applyDamageToEnemyMesh === "function" && frameDamage > 0) {
            if (enemySystem.applyDamageToEnemyMesh(enemyMesh, frameDamage)) {
              damagedEnemyUuids.add(enemyMesh.uuid);
              hitAny = true;
            }
          }
        }
      }
    }

    updatePlasmaVisualState(tower, deltaSeconds, hitAny ? 1 : 0.82);
  }

  function updateBuffTowerVisualOnly(tower, deltaSeconds) {
    tower.buffAuraClock = (tower.buffAuraClock || 0) + Math.max(0, deltaSeconds);
    const halo = tower.mesh?.userData?.buffHaloMesh;
    if (halo) {
      halo.rotation.y += deltaSeconds * 0.8;
    }
  }

  function updateBlockTowerIdle() {
  }

  function updateTowerCombat(deltaSeconds, enemySystem) {
    updateBuffTowerAurasAndBonuses(deltaSeconds);
    for (const tower of towers) {
      if (!tower.isOperational) {
        continue;
      }
      const behaviorByType = {
        gun: updateGunTowerCombat,
        aoe: updateAoeTowerCombat,
        slow: updateSlowTowerCombat,
        laserSniper: updateLaserSniperCombat,
        mortar: updateMortarCombat,
        tesla: updateTeslaCombat,
        spikes: updateSpikesCombat,
        plasma: updatePlasmaCombat,
        block: updateBlockTowerIdle,
        buff: updateBuffTowerVisualOnly,
      };
      const handler = behaviorByType[tower.towerType] || updateGunTowerCombat;
      handler(tower, deltaSeconds, enemySystem);
    }
  }

  function updateTransientTowerEffects(deltaSeconds, enemySystem) {
    updateTimedMeshEffects(laserBeamEffects, deltaSeconds, {
      baseOpacity: LASER_SNIPER_TOWER_CONFIG.beamOpacity,
    });
    updateMortarProjectiles(deltaSeconds, enemySystem);
    updateTimedMeshEffects(mortarExplosions, deltaSeconds, {
      baseOpacity: MORTAR_TOWER_CONFIG.explosionOpacity,
      minScale: 0.1,
      maxScale: 1,
    });
    for (const explosion of mortarExplosions) {
      if (explosion?.mesh) {
        const growthT = 1 - (explosion.life / Math.max(0.01, explosion.maxLife));
        explosion.mesh.scale.setScalar(Math.max(0.01, explosion.radius * growthT));
      }
    }
    updateTimedMeshEffects(teslaBoltEffects, deltaSeconds, {
      baseOpacity: TESLA_TOWER_CONFIG.boltOpacity,
    });
  }

  function update(deltaSeconds, enemySystem) {
    updatePreviewFromCamera();
    updateTowerBuildEffects(deltaSeconds);
    updateTowerCombat(deltaSeconds, enemySystem);
    updateGunProjectiles(deltaSeconds, enemySystem);
    updateGunMuzzleFlashes(deltaSeconds);
    updateAoePulseEffects(deltaSeconds, enemySystem);
    updateSlowFieldEffects(deltaSeconds);
    updateTransientTowerEffects(deltaSeconds, enemySystem);
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
    clearAllPeerPreviews();

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

    for (let i = laserBeamEffects.length - 1; i >= 0; i -= 1) {
      const effect = laserBeamEffects[i];
      if (effect?.mesh?.parent) {
        effect.mesh.parent.remove(effect.mesh);
      }
      effect?.mesh?.material?.dispose?.();
    }
    laserBeamEffects.length = 0;

    for (let i = mortarProjectiles.length - 1; i >= 0; i -= 1) {
      if (mortarProjectiles[i]?.mesh?.parent) {
        mortarProjectiles[i].mesh.parent.remove(mortarProjectiles[i].mesh);
      }
    }
    mortarProjectiles.length = 0;

    for (let i = mortarExplosions.length - 1; i >= 0; i -= 1) {
      const effect = mortarExplosions[i];
      if (effect?.mesh?.parent) {
        effect.mesh.parent.remove(effect.mesh);
      }
      effect?.mesh?.material?.dispose?.();
    }
    mortarExplosions.length = 0;

    for (let i = teslaBoltEffects.length - 1; i >= 0; i -= 1) {
      const effect = teslaBoltEffects[i];
      if (effect?.mesh?.parent) {
        effect.mesh.parent.remove(effect.mesh);
      }
      effect?.mesh?.material?.dispose?.();
    }
    teslaBoltEffects.length = 0;

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

  function removeTowerEntry(towerEntry) {
    if (!towerEntry || typeof towerEntry !== "object") {
      return false;
    }
    const towerIndex = towers.indexOf(towerEntry);
    if (towerIndex < 0) {
      return false;
    }

    for (let i = gunProjectiles.length - 1; i >= 0; i -= 1) {
      if (gunProjectiles[i]?.sourceTower !== towerEntry) {
        continue;
      }
      destroyGunProjectile(gunProjectiles[i]);
      gunProjectiles.splice(i, 1);
    }

    for (let i = mortarProjectiles.length - 1; i >= 0; i -= 1) {
      if (mortarProjectiles[i]?.sourceTower !== towerEntry) {
        continue;
      }
      if (mortarProjectiles[i]?.mesh?.parent) {
        mortarProjectiles[i].mesh.parent.remove(mortarProjectiles[i].mesh);
      }
      mortarProjectiles.splice(i, 1);
    }

    const buildEffectIndex = activeBuildEffects.indexOf(towerEntry);
    if (buildEffectIndex >= 0) {
      activeBuildEffects.splice(buildEffectIndex, 1);
    }
    if (towerEntry.buildFxState) {
      restoreTowerBuildMaterialStates(towerEntry.buildFxState.materialStates || []);
      disposeTowerBuildFxState(towerEntry.buildFxState);
      towerEntry.buildFxState = null;
    }
    towerEntry.isOperational = false;

    const mesh = towerEntry.mesh;
    if (mesh?.parent) {
      mesh.parent.remove(mesh);
    }
    disposeMeshResources(mesh);

    towers.splice(towerIndex, 1);
    notifyBlockedCellsChanged();
    return true;
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
    laserBeamGeometry.dispose();
    laserBeamMaterial.dispose();
    mortarProjectileGeometry.dispose();
    mortarProjectileMaterial.dispose();
    mortarExplosionGeometry.dispose();
    mortarExplosionMaterial.dispose();
    teslaBoltGeometry.dispose();
    teslaBoltMaterial.dispose();
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
    const obstacles = [];
    for (const tower of towers) {
      if (!tower?.mesh || tower.collidesWithPlayer === false) {
        continue;
      }

      if (tower.towerType !== "gun") {
        obstacles.push(tower);
        continue;
      }

      const baseHalfSizeX = Number.isFinite(Number(tower.mesh.userData?.gunBaseHalfSizeX))
        ? Number(tower.mesh.userData.gunBaseHalfSizeX)
        : tower.halfSizeX;
      const baseHalfSizeZ = Number.isFinite(Number(tower.mesh.userData?.gunBaseHalfSizeZ))
        ? Number(tower.mesh.userData.gunBaseHalfSizeZ)
        : tower.halfSizeZ;
      const baseHeight = Number.isFinite(Number(tower.supportHeight))
        ? Number(tower.supportHeight)
        : GUN_TOWER_SUPPORT_HEIGHT;
      obstacles.push({
        kind: "box",
        towerType: tower.towerType,
        collidesWithPlayer: true,
        mesh: tower.mesh,
        position: tower.mesh.position,
        baseY: tower.baseY,
        height: baseHeight,
        supportHeight: baseHeight,
        halfSizeX: baseHalfSizeX,
        halfSizeZ: baseHalfSizeZ,
        topInsetFromRadius: 0,
      });

      const cubeSize = Number.isFinite(Number(tower.mesh.userData?.gunCubeSize))
        ? Number(tower.mesh.userData.gunCubeSize)
        : Math.max(0.45, GUN_TOWER_CONFIG.turretWidth);
      const upperRadius = Number.isFinite(Number(tower.mesh.userData?.gunUpperCollisionRadius))
        ? Number(tower.mesh.userData.gunUpperCollisionRadius)
        : cubeSize * 0.72;
      obstacles.push({
        kind: "cylinder",
        towerType: tower.towerType,
        collidesWithPlayer: true,
        supportsPlayer: false,
        position: tower.mesh.position,
        baseY: tower.baseY + baseHeight,
        height: cubeSize,
        radius: upperRadius,
      });
    }
    return obstacles;
  }

  function setLocalOwnerId(nextOwnerId) {
    const previousOwnerId = activeLocalOwnerId;
    if (typeof nextOwnerId === "string" && nextOwnerId.length > 0) {
      activeLocalOwnerId = nextOwnerId;
    }
    if (previousOwnerId !== activeLocalOwnerId) {
      const previousOwnerMap = towerTechModifiersByOwner.get(previousOwnerId) ?? null;
      if (previousOwnerMap && !towerTechModifiersByOwner.has(activeLocalOwnerId)) {
        const clonedOwnerMap = new Map();
        for (const [type, modifiers] of previousOwnerMap.entries()) {
          clonedOwnerMap.set(type, { ...modifiers });
        }
        towerTechModifiersByOwner.set(activeLocalOwnerId, clonedOwnerMap);
      }
      for (const tower of towers) {
        if (tower?.ownerId === previousOwnerId) {
          tower.ownerId = activeLocalOwnerId;
        }
      }
    }
    ensureOwnerTechModifiers(activeLocalOwnerId);
    return activeLocalOwnerId;
  }

  function getCurrentPreviewPayload() {
    if (!buildMode || !selectedTowerType) {
      return {
        active: false,
        towerType: null,
        valid: false,
        placement: null,
      };
    }
    const placementPayload = previewPlacement
      ? serializePlacementPayload(selectedTowerType, previewPlacement)
      : null;
    return {
      active: true,
      towerType: selectedTowerType,
      valid: previewValid,
      placement: placementPayload,
    };
  }

  function canPlaceTowerFromPayload(payload, options = {}) {
    const parsedPlacement = parsePlacementPayload(payload);
    if (!parsedPlacement) {
      return false;
    }
    const ownerId = options.ownerId ?? payload?.ownerId ?? normalizeOwnerId(null);
    if (options.requireUnlocked !== false && !isTowerTypeUnlocked(parsedPlacement.towerType)) {
      return false;
    }
    if (options.requireAffordable !== false && !canAffordTower(parsedPlacement.towerType, ownerId)) {
      return false;
    }
    return isPlacementValid(parsedPlacement);
  }

  function placeTowerFromPayload(payload, options = {}) {
    const parsedPlacement = parsePlacementPayload(payload);
    if (!parsedPlacement) {
      return false;
    }
    const result = placeTowerAtResolvedPlacement(parsedPlacement, {
      ownerId: options.ownerId ?? payload?.ownerId ?? normalizeOwnerId(null),
      spendCost: options.spendCost === true,
      requireUnlocked: options.requireUnlocked === true,
      requireAffordable: options.requireAffordable === true,
    });
    return !!result.success;
  }

  function getSellCandidateFromAim(options = {}) {
    if (!camera || !scene || towers.length === 0) {
      return null;
    }
    const aimDistanceLimit = Number.isFinite(Number(options?.maxAimDistance))
      ? Math.max(0.5, Number(options.maxAimDistance))
      : DEFAULT_SELL_AIM_MAX_DISTANCE;
    const playerDistanceLimit = Number.isFinite(Number(options?.maxPlayerDistance))
      ? Math.max(0.5, Number(options.maxPlayerDistance))
      : DEFAULT_SELL_PLAYER_MAX_DISTANCE;
    const playerPosition = options?.playerPosition && typeof options.playerPosition === "object"
      ? options.playerPosition
      : null;

    const towerRoots = [];
    const towerByRootUuid = new Map();
    for (const tower of towers) {
      if (!tower?.mesh) {
        continue;
      }
      towerRoots.push(tower.mesh);
      towerByRootUuid.set(tower.mesh.uuid, tower);
    }
    if (towerRoots.length === 0) {
      return null;
    }

    raycaster.setFromCamera(aimPoint, camera);
    const intersections = raycaster.intersectObjects(towerRoots, true);
    if (!Array.isArray(intersections) || intersections.length === 0) {
      return null;
    }

    const playerDistanceLimitSq = playerDistanceLimit * playerDistanceLimit;
    for (const hit of intersections) {
      const hitDistance = Number(hit?.distance);
      if (!Number.isFinite(hitDistance) || hitDistance > aimDistanceLimit) {
        continue;
      }
      let node = hit.object ?? null;
      let tower = null;
      while (node) {
        tower = towerByRootUuid.get(node.uuid) ?? null;
        if (tower) {
          break;
        }
        node = node.parent ?? null;
      }
      if (!tower?.mesh) {
        continue;
      }
      if (
        playerPosition
        && Number.isFinite(Number(playerPosition.x))
        && Number.isFinite(Number(playerPosition.y))
        && Number.isFinite(Number(playerPosition.z))
      ) {
        const distSq = tower.mesh.position.distanceToSquared(
          tempVecK.set(playerPosition.x, playerPosition.y, playerPosition.z)
        );
        if (distSq > playerDistanceLimitSq) {
          continue;
        }
      }

      const targetId = getTowerTargetId(tower);
      if (!targetId) {
        continue;
      }
      const towerType = normalizeTowerType(tower.towerType);
      if (!towerType) {
        continue;
      }
      if (isTowerSupportingOtherTower(tower)) {
        continue;
      }
      const refundAmount = getTowerCost(towerType, options?.sellerId ?? normalizeOwnerId(null));
      const topY = tower.baseY + Math.max(0.1, Number(tower.height) || gridCellSize);
      tempVecJ.set(
        tower.mesh.position.x,
        topY + DEFAULT_SELL_ANCHOR_Y_OFFSET,
        tower.mesh.position.z
      );
      return {
        targetId,
        towerType,
        ownerId: normalizeOwnerId(tower.ownerId),
        worldAnchor: tempVecJ.clone(),
        refundAmount,
      };
    }

    return null;
  }

  function sellTowerById(targetId, options = {}) {
    const tower = findTowerByTargetId(targetId);
    if (!tower) {
      return {
        success: false,
        targetId: typeof targetId === "string" ? targetId : null,
        towerType: null,
        refundAmount: 0,
        sellerId: normalizeOwnerId(options?.sellerId),
      };
    }

    const towerType = normalizeTowerType(tower.towerType);
    const resolvedTargetId = getTowerTargetId(tower);
    const sellerId = normalizeOwnerId(options?.sellerId);
    if (isTowerSupportingOtherTower(tower)) {
      return {
        success: false,
        targetId: resolvedTargetId,
        towerType,
        refundAmount: 0,
        sellerId,
      };
    }
    const refundAmount = towerType ? getTowerCost(towerType, sellerId) : 0;
    const applyRefund = options?.applyRefund !== false;
    const didRemove = removeTowerEntry(tower);
    if (!didRemove) {
      return {
        success: false,
        targetId: resolvedTargetId,
        towerType,
        refundAmount: 0,
        sellerId,
      };
    }

    if (applyRefund && refundAmount > 0) {
      if (typeof refundMoney === "function") {
        refundMoney(refundAmount, towerType);
      } else if (typeof spendMoney === "function") {
        spendMoney(-refundAmount, towerType);
      }
    }

    return {
      success: true,
      targetId: resolvedTargetId,
      towerType,
      refundAmount,
      sellerId,
    };
  }

  function getTowerSnapshots() {
    const snapshots = [];
    for (const tower of towers) {
      const snapshot = serializePlacementPayload(tower.towerType, {
        towerType: tower.towerType,
        occupiedCells: tower.occupiedCells,
        position: tower.mesh?.position ?? new THREE.Vector3(),
        blockOpacity: tower.blockOpacity,
        footprintKey: tower.footprintKey,
        anchorKey: tower.anchorKey,
        rotationY: tower.rotationY ?? tower.mesh?.rotation?.y ?? 0,
        plasmaDirection: tower.plasmaDirection,
        plasmaWallCell: tower.plasmaWallCell,
        plasmaTargetCell: tower.plasmaTargetCell,
      });
      if (!snapshot) {
        continue;
      }
      snapshots.push({
        ...snapshot,
        ownerId: normalizeOwnerId(tower.ownerId),
      });
    }
    return snapshots;
  }

  function applyPeerPreviewVisual(mesh, isValid = true) {
    const colorHex = isValid ? 0x78d6ff : 0xff8d8d;
    const emissiveHex = isValid ? 0x164f64 : 0x5a1414;
    const opacity = isValid ? 0.42 : 0.34;
    mesh.traverse((child) => {
      if (!child?.material) {
        return;
      }
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!material) {
          continue;
        }
        if (material.color?.setHex) {
          material.color.setHex(colorHex);
        }
        if (material.emissive?.setHex) {
          material.emissive.setHex(emissiveHex);
        }
        if ("transparent" in material) {
          material.transparent = true;
        }
        if ("opacity" in material && Number.isFinite(Number(material.opacity))) {
          material.opacity = Math.min(Number(material.opacity), opacity);
        }
        if ("depthWrite" in material) {
          material.depthWrite = false;
        }
        syncMaterialProxyState(material);
      }
    });
  }

  function clearPeerPreview(peerId) {
    if (typeof peerId !== "string" || !peerPreviewEntries.has(peerId)) {
      return;
    }
    const entry = peerPreviewEntries.get(peerId);
    if (entry?.mesh?.parent) {
      entry.mesh.parent.remove(entry.mesh);
    }
    disposeMeshResources(entry?.mesh);
    peerPreviewEntries.delete(peerId);
  }

  function clearAllPeerPreviews() {
    for (const peerId of peerPreviewEntries.keys()) {
      clearPeerPreview(peerId);
    }
  }

  function setPeerPreview(peerId, previewState = null) {
    if (typeof peerId !== "string" || peerId.length === 0) {
      return false;
    }
    const active = previewState?.active === true;
    const towerType = normalizeTowerType(previewState?.towerType);
    const placementPayload = previewState?.placement ?? null;
    const parsedPlacement = placementPayload ? parsePlacementPayload(placementPayload) : null;
    if (!active || !towerType || !parsedPlacement?.position) {
      clearPeerPreview(peerId);
      return false;
    }

    let entry = peerPreviewEntries.get(peerId);
    if (!entry || entry.towerType !== towerType) {
      clearPeerPreview(peerId);
      const mesh = createTowerPreviewMesh(towerType);
      mesh.visible = true;
      scene.add(mesh);
      entry = { towerType, mesh };
      peerPreviewEntries.set(peerId, entry);
    }

    entry.mesh.visible = true;
    entry.mesh.position.copy(parsedPlacement.position);
    entry.mesh.rotation.y = Number(parsedPlacement.rotationY) || 0;
    applyPeerPreviewVisual(entry.mesh, previewState?.valid === true);
    return true;
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
    setLocalOwnerId,
    getCurrentPreviewPayload,
    canPlaceTowerFromPayload,
    placeTowerFromPayload,
    getSellCandidateFromAim,
    sellTowerById,
    getTowerSnapshots,
    setPeerPreview,
    clearPeerPreview,
    clearAllPeerPreviews,
    getBlockedCells,
    getTowerCost,
    canAffordTower,
    unlockTowerType,
    isTowerTypeUnlocked,
    getUnlockedTowerTypes,
    applyTechGrants,
    upgradeTowerDamage,
    upgradeTowerFireRate,
    clearAllTowers,
    dispose,
    forcePlaceTower: (x, z, towerType = "gun", options = {}) => {
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
      const result = placeTowerAtResolvedPlacement(resolvedPlacement, {
        ownerId: options.ownerId ?? normalizeOwnerId(null),
        spendCost: false,
        requireUnlocked: false,
        requireAffordable: false,
      });
      return !!result.success;
    }
  };
}
