import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { GAME_CONFIG } from "./config.js";

const GRID_CONFIG = GAME_CONFIG.grid ?? {};
const ENEMY_CONFIG = GAME_CONFIG.enemies ?? {};
const TOWER_CONFIG = GAME_CONFIG.towers ?? {};
const TOWER_TYPES = TOWER_CONFIG.types ?? {};
const BLOCK_TOWER_CONFIG = TOWER_TYPES.block ?? {};
const ECONOMY_PICKUP_CONFIG = (GAME_CONFIG.economy ?? {}).pickups ?? {};

const GRID_CELL_SIZE = Number.isFinite(Number(GRID_CONFIG.cellSize))
  ? Math.max(0.01, Number(GRID_CONFIG.cellSize))
  : 1;
const BLOCK_TARGET_WIDTH = Number.isFinite(Number(BLOCK_TOWER_CONFIG.halfSize))
  ? Math.max(0.1, Number(BLOCK_TOWER_CONFIG.halfSize) * 2)
  : 2;
const BLOCK_TARGET_HEIGHT = Number.isFinite(Number(BLOCK_TOWER_CONFIG.height))
  ? Math.max(0.1, Number(BLOCK_TOWER_CONFIG.height))
  : 2;
const REMOTE_PLAYER_TARGET_HEIGHT = 2.05;
const MONEY_DROP_TARGET_SIZE = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.cubeSize))
  ? Math.max(0.05, Number(ECONOMY_PICKUP_CONFIG.cubeSize))
  : 0.26;
const ENEMY_VISUAL_HEIGHT_MULTIPLIER = 1.25;
const ENEMY_VISUAL_YAW_CORRECTION = 0;
const REMOTE_PLAYER_VISUAL_YAW_CORRECTION = 0;
const RAMP_VISUAL_YAW_CORRECTION = Math.PI;
const RAMP_VISUAL_SURFACE_LIFT = 0.02;
const REMOTE_PLAYER_BASE_COLOR = 0xffffff;
const REMOTE_PLAYER_EMISSIVE = 0x000000;
const RAMP_BASE_COLOR = 0xffffff;
const RAMP_EMISSIVE = 0x000000;
const TERRAIN_WALL_BASE_COLOR = 0xffffff;
const TERRAIN_WALL_EMISSIVE = 0x000000;
const ENEMY_BODY_EMISSIVE_INTENSITY = Number.isFinite(Number(ENEMY_CONFIG.bodyEmissiveIntensity))
  ? Math.max(0, Number(ENEMY_CONFIG.bodyEmissiveIntensity))
  : 0.22;
const DEFAULT_PICKUP_ROUGHNESS = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.roughness))
  ? THREE.MathUtils.clamp(Number(ECONOMY_PICKUP_CONFIG.roughness), 0, 1)
  : 0.38;
const DEFAULT_PICKUP_METALNESS = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.metalness))
  ? THREE.MathUtils.clamp(Number(ECONOMY_PICKUP_CONFIG.metalness), 0, 1)
  : 0.08;
const DEFAULT_PICKUP_EMISSIVE_INTENSITY = Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.emissiveIntensity))
  ? Math.max(0, Number(ECONOMY_PICKUP_CONFIG.emissiveIntensity))
  : 0.62;
const DECORATIVE_PROP_TARGET_HEIGHTS = {
  chest: GRID_CELL_SIZE * 0.42,
  barrel: GRID_CELL_SIZE * 0.36,
  stones: GRID_CELL_SIZE * 0.22,
};

const OBJ_LOADER = new OBJLoader();
const TEXTURE_LOADER = new THREE.TextureLoader();
const KENNEY_MANAGED_FLAG = "kenneyManaged";
const KENNEY_SHARED_FLAG = "kenneyShared";
const KENNEY_DEBUG_ENABLED = (() => {
  if (typeof window === "undefined" || typeof window.location?.search !== "string") {
    return false;
  }
  try {
    return new URLSearchParams(window.location.search).get("kenneyDebug") === "1";
  } catch {
    return false;
  }
})();
const debugLogOnceKeys = new Set();

const MONEY_DROP_COLOR_BY_VALUE = {
  1: Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.valueColors?.value1))
    ? Number(ECONOMY_PICKUP_CONFIG.valueColors.value1)
    : 0x61ff8e,
  10: Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.valueColors?.value10))
    ? Number(ECONOMY_PICKUP_CONFIG.valueColors.value10)
    : 0x39c35b,
  100: Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.valueColors?.value100))
    ? Number(ECONOMY_PICKUP_CONFIG.valueColors.value100)
    : 0x1f8637,
};
const MONEY_DROP_EMISSIVE_BY_VALUE = {
  1: Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.valueEmissives?.value1))
    ? Number(ECONOMY_PICKUP_CONFIG.valueEmissives.value1)
    : 0x1f6d37,
  10: Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.valueEmissives?.value10))
    ? Number(ECONOMY_PICKUP_CONFIG.valueEmissives.value10)
    : 0x16512a,
  100: Number.isFinite(Number(ECONOMY_PICKUP_CONFIG.valueEmissives?.value100))
    ? Number(ECONOMY_PICKUP_CONFIG.valueEmissives.value100)
    : 0x10371e,
};

const MODEL_DEFINITIONS = {
  enemy: {
    objUrl: new URL("../models/character-orc.obj", import.meta.url).href,
  },
  remotePlayer: {
    objUrl: new URL("../models/character-human.obj", import.meta.url).href,
  },
  moneyDrop: {
    objUrl: new URL("../models/coin.obj", import.meta.url).href,
  },
  ramp: {
    objUrl: new URL("../models/stairs.obj", import.meta.url).href,
  },
  block: {
    objUrl: new URL("../models/wall.obj", import.meta.url).href,
  },
  chest: {
    objUrl: new URL("../models/chest.obj", import.meta.url).href,
  },
  barrel: {
    objUrl: new URL("../models/barrel.obj", import.meta.url).href,
  },
  stones: {
    objUrl: new URL("../models/stones.obj", import.meta.url).href,
  },
};

const assetDescriptors = new Map();
let sharedAtlasTexture = null;
let preloadPromise = null;
let preloadFailed = false;

function logKenneyDebug(message, details = null, { onceKey = null } = {}) {
  if (!KENNEY_DEBUG_ENABLED) {
    return;
  }
  if (onceKey && debugLogOnceKeys.has(onceKey)) {
    return;
  }
  if (onceKey) {
    debugLogOnceKeys.add(onceKey);
  }
  if (details == null) {
    console.log(`[KenneyModels] ${message}`);
    return;
  }
  console.log(`[KenneyModels] ${message}`, details);
}

function markKenneyManaged(resource, { shared = true } = {}) {
  if (!resource) {
    return resource;
  }
  resource.userData = {
    ...(resource.userData || {}),
    [KENNEY_MANAGED_FLAG]: true,
    [KENNEY_SHARED_FLAG]: shared === true,
  };
  return resource;
}

export function isKenneyAssetManagedResource(resource) {
  return resource?.userData?.[KENNEY_MANAGED_FLAG] === true && resource?.userData?.[KENNEY_SHARED_FLAG] === true;
}

function cloneColor(value, fallback = 0xffffff) {
  if (value instanceof THREE.Color) {
    return value.clone();
  }
  if (Number.isFinite(Number(value))) {
    return new THREE.Color(Number(value));
  }
  return new THREE.Color(fallback);
}

function hasFiniteNumber(value) {
  if (value == null) {
    return false;
  }
  return Number.isFinite(Number(value));
}

function mixColorWithWhite(value, amount = 0) {
  const color = cloneColor(value, 0xffffff);
  const mixAmount = THREE.MathUtils.clamp(Number(amount) || 0, 0, 1);
  return new THREE.Color(0xffffff).lerp(color, mixAmount);
}

function setShadowState(root) {
  root.traverse((child) => {
    if (!child?.isMesh) {
      return;
    }
    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = false;
  });
}

function collectUniqueMaterials(root) {
  const materials = [];
  const seen = new Set();
  root.traverse((child) => {
    if (!child?.material) {
      return;
    }
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of childMaterials) {
      if (!material || seen.has(material)) {
        continue;
      }
      seen.add(material);
      materials.push(material);
    }
  });
  return materials;
}

function applyMaterialStyle(material, {
  color = null,
  emissive = null,
  emissiveIntensity = null,
  opacity = null,
  transparent = null,
  roughness = null,
  metalness = null,
  useMap = null,
} = {}) {
  if (!material) {
    return material;
  }
  if (color != null && material.color) {
    material.color.copy(cloneColor(color));
  }
  if (emissive != null && material.emissive) {
    material.emissive.copy(cloneColor(emissive, 0x000000));
  }
  if (hasFiniteNumber(emissiveIntensity) && "emissiveIntensity" in material) {
    material.emissiveIntensity = Math.max(0, Number(emissiveIntensity));
  }
  if (hasFiniteNumber(roughness) && "roughness" in material) {
    material.roughness = THREE.MathUtils.clamp(Number(roughness), 0, 1);
  }
  if (hasFiniteNumber(metalness) && "metalness" in material) {
    material.metalness = THREE.MathUtils.clamp(Number(metalness), 0, 1);
  }
  if (typeof useMap === "boolean" && "map" in material) {
    material.map = useMap ? sharedAtlasTexture : null;
  }
  if (hasFiniteNumber(opacity) && "opacity" in material) {
    const safeOpacity = THREE.MathUtils.clamp(Number(opacity), 0, 1);
    material.opacity = safeOpacity;
    material.transparent = transparent === true || safeOpacity < 0.999;
    if ("depthWrite" in material) {
      material.depthWrite = !(material.transparent === true);
    }
  } else if (typeof transparent === "boolean") {
    material.transparent = transparent;
    if ("depthWrite" in material) {
      material.depthWrite = !transparent;
    }
  }
  material.needsUpdate = true;
  return material;
}

function buildSharedMaterialVariant(descriptor, variantKey, style = {}) {
  if (descriptor.sharedVariantMaterials.has(variantKey)) {
    return descriptor.sharedVariantMaterials.get(variantKey);
  }
  const materialMap = new Map();
  for (const baseMaterial of descriptor.baseMaterials) {
    const variantMaterial = baseMaterial.clone();
    applyMaterialStyle(variantMaterial, style);
    markKenneyManaged(variantMaterial, { shared: true });
    materialMap.set(baseMaterial.uuid, variantMaterial);
  }
  descriptor.sharedVariantMaterials.set(variantKey, materialMap);
  return materialMap;
}

function assignMappedMaterials(root, materialMap) {
  root.traverse((child) => {
    if (!child?.material) {
      return;
    }
    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => materialMap.get(material.uuid) ?? material);
      return;
    }
    child.material = materialMap.get(child.material.uuid) ?? child.material;
  });
}

function cloneMaterialsForInstance(root, style = {}) {
  const materialMap = new Map();
  root.traverse((child) => {
    if (!child?.material) {
      return;
    }
    if (Array.isArray(child.material)) {
      child.material = child.material.map((sourceMaterial) => {
        if (!sourceMaterial) {
          return sourceMaterial;
        }
        let clonedMaterial = materialMap.get(sourceMaterial.uuid);
        if (!clonedMaterial) {
          clonedMaterial = sourceMaterial.clone();
          applyMaterialStyle(clonedMaterial, style);
          materialMap.set(sourceMaterial.uuid, clonedMaterial);
        }
        return clonedMaterial;
      });
      return;
    }
    const sourceMaterial = child.material;
    let clonedMaterial = materialMap.get(sourceMaterial.uuid);
    if (!clonedMaterial) {
      clonedMaterial = sourceMaterial.clone();
      applyMaterialStyle(clonedMaterial, style);
      materialMap.set(sourceMaterial.uuid, clonedMaterial);
    }
    child.material = clonedMaterial;
  });
}

function createPreparedStandardMaterial() {
  const material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0x000000,
    emissiveIntensity: 0,
    map: sharedAtlasTexture,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  material.toneMapped = false;
  material.fog = false;
  markKenneyManaged(material, { shared: true });
  return material;
}

function replaceLoaderMaterials(root) {
  const materialByName = new Map();
  root.traverse((child) => {
    if (!child?.isMesh) {
      return;
    }
    if (child.geometry && typeof child.geometry.computeVertexNormals === "function" && !child.geometry.attributes.normal) {
      child.geometry.computeVertexNormals();
    }
    markKenneyManaged(child.geometry, { shared: true });
    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const nextMaterials = sourceMaterials.map((sourceMaterial, index) => {
      const materialKey = `${sourceMaterial?.name || "default"}:${index}`;
      if (!materialByName.has(materialKey)) {
        materialByName.set(materialKey, createPreparedStandardMaterial());
      }
      return materialByName.get(materialKey);
    });
    child.material = Array.isArray(child.material) ? nextMaterials : nextMaterials[0];
  });
}

function computeBounds(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  return {
    box,
    size,
    center,
    min: box.min.clone(),
    max: box.max.clone(),
  };
}

function createCloneRoot(descriptor, {
  fit = "height",
  targetWidth = null,
  targetHeight = null,
  targetDepth = null,
  anchorY = "bottom",
  sharedMaterialVariantKey = null,
  sharedMaterialStyle = null,
  instanceMaterialStyle = null,
} = {}) {
  if (!descriptor?.template) {
    return null;
  }

  const clone = descriptor.template.clone(true);
  if (sharedMaterialVariantKey && sharedMaterialStyle) {
    const sharedMaterialMap = buildSharedMaterialVariant(descriptor, sharedMaterialVariantKey, sharedMaterialStyle);
    assignMappedMaterials(clone, sharedMaterialMap);
  } else if (instanceMaterialStyle) {
    cloneMaterialsForInstance(clone, instanceMaterialStyle);
  }

  const { size, center, min } = descriptor.bounds;
  const safeSizeX = Math.max(0.0001, size.x);
  const safeSizeY = Math.max(0.0001, size.y);
  const safeSizeZ = Math.max(0.0001, size.z);
  let scaleX = 1;
  let scaleY = 1;
  let scaleZ = 1;

  if (fit === "xyz") {
    scaleX = Number.isFinite(Number(targetWidth)) ? Number(targetWidth) / safeSizeX : 1;
    scaleY = Number.isFinite(Number(targetHeight)) ? Number(targetHeight) / safeSizeY : 1;
    scaleZ = Number.isFinite(Number(targetDepth)) ? Number(targetDepth) / safeSizeZ : 1;
  } else if (fit === "width") {
    const uniformScale = Number.isFinite(Number(targetWidth))
      ? Number(targetWidth) / safeSizeX
      : 1;
    scaleX = uniformScale;
    scaleY = uniformScale;
    scaleZ = uniformScale;
  } else {
    const uniformScale = Number.isFinite(Number(targetHeight))
      ? Number(targetHeight) / safeSizeY
      : 1;
    scaleX = uniformScale;
    scaleY = uniformScale;
    scaleZ = uniformScale;
  }

  clone.scale.set(scaleX, scaleY, scaleZ);
  clone.position.set(
    -center.x * scaleX,
    anchorY === "bottom" ? -min.y * scaleY : -center.y * scaleY,
    -center.z * scaleZ
  );
  setShadowState(clone);

  const root = new THREE.Group();
  root.add(clone);
  root.userData.materials = collectUniqueMaterials(clone);
  root.userData.kenneyVisual = true;
  root.userData.kenneyModelKey = descriptor.key;
  return root;
}

async function loadTemplate(key, definition) {
  const loaded = await OBJ_LOADER.loadAsync(definition.objUrl);
  replaceLoaderMaterials(loaded);
  const descriptor = {
    key,
    template: loaded,
    bounds: computeBounds(loaded),
    baseMaterials: collectUniqueMaterials(loaded),
    sharedVariantMaterials: new Map(),
  };
  assetDescriptors.set(key, descriptor);
  logKenneyDebug("Loaded template", {
    key,
    url: definition.objUrl,
    bounds: {
      min: descriptor.bounds.min.toArray(),
      max: descriptor.bounds.max.toArray(),
      size: descriptor.bounds.size.toArray(),
    },
    baseMaterialCount: descriptor.baseMaterials.length,
  });
}

export async function preloadKenneyModels() {
  if (preloadPromise) {
    return preloadPromise;
  }
  preloadPromise = (async () => {
    try {
      sharedAtlasTexture = await TEXTURE_LOADER.loadAsync(new URL("../models/Textures/colormap.png", import.meta.url).href);
      sharedAtlasTexture.colorSpace = THREE.SRGBColorSpace;
      sharedAtlasTexture.flipY = true;
      sharedAtlasTexture.magFilter = THREE.NearestFilter;
      sharedAtlasTexture.minFilter = THREE.NearestMipmapNearestFilter;
      sharedAtlasTexture.needsUpdate = true;
      markKenneyManaged(sharedAtlasTexture, { shared: true });
      await Promise.all(
        Object.entries(MODEL_DEFINITIONS).map(([key, definition]) => loadTemplate(key, definition))
      );
      preloadFailed = false;
      logKenneyDebug("Preload completed", {
        loadedKeys: Array.from(assetDescriptors.keys()),
        atlasLoaded: !!sharedAtlasTexture,
      });
      return true;
    } catch (error) {
      preloadFailed = true;
      console.warn("[KenneyModels] Failed to preload Kenney models; using procedural fallbacks.", error);
      return false;
    }
  })();
  return preloadPromise;
}

function getDescriptor(key) {
  if (preloadFailed) {
    logKenneyDebug("Descriptor lookup blocked by preload failure", { key }, { onceKey: `preload-failed:${key}` });
    return null;
  }
  const descriptor = assetDescriptors.get(key) ?? null;
  if (!descriptor) {
    logKenneyDebug("Descriptor missing", { key }, { onceKey: `missing:${key}` });
  }
  return descriptor;
}

export function createEnemyVisual(enemyType = null) {
  const descriptor = getDescriptor("enemy");
  if (!descriptor) {
    return null;
  }
  const targetHeight = Math.max(
    0.2,
    (Number.isFinite(Number(enemyType?.size)) ? Number(enemyType.size) : 1) * ENEMY_VISUAL_HEIGHT_MULTIPLIER
  );
  const root = createCloneRoot(descriptor, {
    fit: "height",
    targetHeight,
    anchorY: "bottom",
    instanceMaterialStyle: {
      color: 0xffffff,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.82,
      metalness: 0.02,
      useMap: true,
    },
  });
  if (root) {
    root.rotation.y = ENEMY_VISUAL_YAW_CORRECTION;
  }
  logKenneyDebug("Created enemy visual", {
    targetHeight,
    enemyType: enemyType ? {
      size: enemyType.size,
      color: enemyType.color,
      emissive: enemyType.emissive,
    } : null,
    ok: !!root,
  }, { onceKey: `create-enemy:${targetHeight.toFixed(2)}:${enemyType?.color ?? "na"}` });
  return root;
}

export function createRemotePlayerVisual() {
  const descriptor = getDescriptor("remotePlayer");
  if (!descriptor) {
    return null;
  }
  const root = createCloneRoot(descriptor, {
    fit: "height",
    targetHeight: REMOTE_PLAYER_TARGET_HEIGHT,
    anchorY: "bottom",
    sharedMaterialVariantKey: "remotePlayer:base",
    sharedMaterialStyle: {
      color: REMOTE_PLAYER_BASE_COLOR,
      emissive: REMOTE_PLAYER_EMISSIVE,
      emissiveIntensity: 0,
      roughness: 0.82,
      metalness: 0.02,
      useMap: true,
    },
  });
  if (root) {
    root.rotation.y = REMOTE_PLAYER_VISUAL_YAW_CORRECTION;
  }
  logKenneyDebug("Created remote player visual", { ok: !!root }, { onceKey: "create-remote-player" });
  return root;
}

export function createMoneyDropVisual(value = 1) {
  const descriptor = getDescriptor("moneyDrop");
  if (!descriptor) {
    return null;
  }
  const normalizedValue = Math.max(1, Math.floor(Number(value) || 1));
  const root = createCloneRoot(descriptor, {
    fit: "height",
    targetHeight: MONEY_DROP_TARGET_SIZE,
    anchorY: "center",
    sharedMaterialVariantKey: `moneyDrop:${normalizedValue}`,
    sharedMaterialStyle: {
      color: 0xffffff,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: Math.min(DEFAULT_PICKUP_ROUGHNESS, 0.3),
      metalness: Math.max(DEFAULT_PICKUP_METALNESS, 0.18),
      useMap: true,
    },
  });
  logKenneyDebug("Created money drop visual", {
    value: normalizedValue,
    ok: !!root,
  }, { onceKey: `create-money:${normalizedValue}` });
  return root;
}

export function createRampVisual(rotation = 0) {
  const descriptor = getDescriptor("ramp");
  if (!descriptor) {
    return null;
  }
  const root = createCloneRoot(descriptor, {
    fit: "xyz",
    targetWidth: GRID_CELL_SIZE,
    targetHeight: GRID_CELL_SIZE,
    targetDepth: GRID_CELL_SIZE * 2,
    anchorY: "bottom",
    sharedMaterialVariantKey: "ramp:base",
    sharedMaterialStyle: {
      color: RAMP_BASE_COLOR,
      emissive: RAMP_EMISSIVE,
      emissiveIntensity: 0,
      roughness: 0.88,
      metalness: 0.02,
      useMap: true,
    },
  });
  if (root) {
    root.rotation.y = RAMP_VISUAL_YAW_CORRECTION;
    root.position.y += RAMP_VISUAL_SURFACE_LIFT;
  }
  logKenneyDebug("Created ramp visual", { rotation, ok: !!root }, { onceKey: `create-ramp:${rotation}` });
  return root;
}

export function createTerrainWallVisual() {
  const descriptor = getDescriptor("block");
  if (!descriptor) {
    return null;
  }
  const root = createCloneRoot(descriptor, {
    fit: "xyz",
    targetWidth: GRID_CELL_SIZE,
    targetHeight: GRID_CELL_SIZE,
    targetDepth: GRID_CELL_SIZE,
    anchorY: "bottom",
    sharedMaterialVariantKey: "terrainWall:base",
    sharedMaterialStyle: {
      color: TERRAIN_WALL_BASE_COLOR,
      emissive: TERRAIN_WALL_EMISSIVE,
      emissiveIntensity: 0,
      roughness: Number.isFinite(Number(GRID_CONFIG.altitudeRoughness))
        ? Number(GRID_CONFIG.altitudeRoughness)
        : 0.82,
      metalness: Number.isFinite(Number(GRID_CONFIG.altitudeMetalness))
        ? Number(GRID_CONFIG.altitudeMetalness)
        : 0.04,
      useMap: true,
    },
  });
  logKenneyDebug("Created terrain wall visual", { ok: !!root }, { onceKey: "create-terrain-wall" });
  return root;
}

export function createDecorationVisual(type) {
  const normalizedType = typeof type === "string" ? type.trim().toLowerCase() : "";
  if (!Object.prototype.hasOwnProperty.call(DECORATIVE_PROP_TARGET_HEIGHTS, normalizedType)) {
    return null;
  }
  const descriptor = getDescriptor(normalizedType);
  if (!descriptor) {
    return null;
  }
  const targetHeight = Math.max(0.05, Number(DECORATIVE_PROP_TARGET_HEIGHTS[normalizedType]) || (GRID_CELL_SIZE * 0.25));
  const root = createCloneRoot(descriptor, {
    fit: "height",
    targetHeight,
    anchorY: "bottom",
    sharedMaterialVariantKey: `decor:${normalizedType}`,
    sharedMaterialStyle: {
      color: 0xffffff,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: Number.isFinite(Number(GRID_CONFIG.altitudeRoughness))
        ? Number(GRID_CONFIG.altitudeRoughness)
        : 0.82,
      metalness: Number.isFinite(Number(GRID_CONFIG.altitudeMetalness))
        ? Number(GRID_CONFIG.altitudeMetalness)
        : 0.04,
      useMap: true,
    },
  });
  logKenneyDebug("Created decoration visual", {
    type: normalizedType,
    targetHeight,
    ok: !!root,
  }, { onceKey: `create-decoration:${normalizedType}` });
  return root;
}

export function createBlockVisual({ opacity = 1 } = {}) {
  const descriptor = getDescriptor("block");
  if (!descriptor) {
    return null;
  }
  const blockOpacity = THREE.MathUtils.clamp(Number(opacity) || 1, 0.05, 1);
  const root = createCloneRoot(descriptor, {
    fit: "xyz",
    targetWidth: BLOCK_TARGET_WIDTH,
    targetHeight: BLOCK_TARGET_HEIGHT,
    targetDepth: BLOCK_TARGET_WIDTH,
    anchorY: "bottom",
    instanceMaterialStyle: {
      color: mixColorWithWhite(BLOCK_TOWER_CONFIG.placedColor ?? 0xffffff, 0.16),
      emissive: mixColorWithWhite(BLOCK_TOWER_CONFIG.placedGlow ?? 0x000000, 0.7),
      emissiveIntensity: 0.28,
      roughness: Number.isFinite(Number(BLOCK_TOWER_CONFIG.roughness))
        ? Number(BLOCK_TOWER_CONFIG.roughness)
        : 0.76,
      metalness: Number.isFinite(Number(BLOCK_TOWER_CONFIG.metalness))
        ? Number(BLOCK_TOWER_CONFIG.metalness)
        : 0.12,
      opacity: blockOpacity,
      transparent: blockOpacity < 0.999,
    },
  });
  logKenneyDebug("Created block visual", {
    opacity: blockOpacity,
    ok: !!root,
  }, { onceKey: `create-block:${blockOpacity.toFixed(2)}` });
  return root;
}

export function getKenneyDebugSnapshot() {
  return {
    debugEnabled: KENNEY_DEBUG_ENABLED,
    preloadFailed,
    atlasLoaded: !!sharedAtlasTexture,
    loadedKeys: Array.from(assetDescriptors.keys()),
    descriptors: Array.from(assetDescriptors.values()).map((descriptor) => ({
      key: descriptor.key,
      baseMaterialCount: descriptor.baseMaterials.length,
      bounds: {
        min: descriptor.bounds.min.toArray(),
        max: descriptor.bounds.max.toArray(),
        size: descriptor.bounds.size.toArray(),
      },
    })),
  };
}
