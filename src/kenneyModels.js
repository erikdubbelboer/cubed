import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GAME_CONFIG } from "./config.js";
import {
  DECORATIVE_MODEL_SPECS,
  getDecorativeModelSpec,
  getEnemyModelProfile,
  resolveEnemyModelKey,
} from "./modelCatalog.js";

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
const REMOTE_PLAYER_VISUAL_YAW_CORRECTION = Math.PI;
const RAMP_VISUAL_YAW_CORRECTION = Math.PI;
const RAMP_VISUAL_SURFACE_LIFT = 0.02;
const WALL_VISUAL_SURFACE_LIFT = Number.isFinite(Number(GRID_CONFIG.kenneyWallVisualLift))
  ? Math.max(0, Number(GRID_CONFIG.kenneyWallVisualLift))
  : 0.02;
const WALL_BOTTOM_CAP_Y_OFFSET = 0.0005;
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
const OBJ_LOADER = new OBJLoader();
const TEXTURE_LOADER = new THREE.TextureLoader();
const ARENA_ATLAS_KEY = "colormap";
const GRAVEYARD_ATLAS_KEY = "colormap2";
const DUNGEON_ATLAS_KEY = "colormap3";
const DEFAULT_ATLAS_KEY = ARENA_ATLAS_KEY;
const MODEL_ATLAS_KEY_BY_FILE_BASENAME = Object.freeze({
  "altar-stone": GRAVEYARD_ATLAS_KEY,
  "altar-wood": GRAVEYARD_ATLAS_KEY,
  "character-ghost": GRAVEYARD_ATLAS_KEY,
  "character-skeleton": GRAVEYARD_ATLAS_KEY,
  "character-vampire": GRAVEYARD_ATLAS_KEY,
  "character-zombie": GRAVEYARD_ATLAS_KEY,
  "coffin-old": GRAVEYARD_ATLAS_KEY,
  coffin: GRAVEYARD_ATLAS_KEY,
  "column-large": GRAVEYARD_ATLAS_KEY,
  "cross-column": GRAVEYARD_ATLAS_KEY,
  "cross-wood": GRAVEYARD_ATLAS_KEY,
  cross: GRAVEYARD_ATLAS_KEY,
  "crypt-a": GRAVEYARD_ATLAS_KEY,
  "crypt-b": GRAVEYARD_ATLAS_KEY,
  "debris-wood": GRAVEYARD_ATLAS_KEY,
  debris: GRAVEYARD_ATLAS_KEY,
  "grave-border": GRAVEYARD_ATLAS_KEY,
  grave: GRAVEYARD_ATLAS_KEY,
  "gravestone-broken": GRAVEYARD_ATLAS_KEY,
  "gravestone-cross-large": GRAVEYARD_ATLAS_KEY,
  "gravestone-cross": GRAVEYARD_ATLAS_KEY,
  "gravestone-debris": GRAVEYARD_ATLAS_KEY,
  "gravestone-decorative": GRAVEYARD_ATLAS_KEY,
  "gravestone-roof": GRAVEYARD_ATLAS_KEY,
  "gravestone-round": GRAVEYARD_ATLAS_KEY,
  "gravestone-wide": GRAVEYARD_ATLAS_KEY,
  "pine-crooked": GRAVEYARD_ATLAS_KEY,
  pine: GRAVEYARD_ATLAS_KEY,
  road: GRAVEYARD_ATLAS_KEY,
  rocks: GRAVEYARD_ATLAS_KEY,
  "rocks-tall": GRAVEYARD_ATLAS_KEY,
  "shovel-dirt": GRAVEYARD_ATLAS_KEY,
  "trunk-long": GRAVEYARD_ATLAS_KEY,
  trunk: GRAVEYARD_ATLAS_KEY,
  barrel: DUNGEON_ATLAS_KEY,
  "character-human": DUNGEON_ATLAS_KEY,
  "character-orc": DUNGEON_ATLAS_KEY,
  chest: DUNGEON_ATLAS_KEY,
  coin: DUNGEON_ATLAS_KEY,
  gate: DUNGEON_ATLAS_KEY,
  stairs: DUNGEON_ATLAS_KEY,
  stones: DUNGEON_ATLAS_KEY,
  wall: DUNGEON_ATLAS_KEY,
  "wood-structure": DUNGEON_ATLAS_KEY,
});
const MODEL_UV_FIXES_BY_FILE_BASENAME = Object.freeze({
  pine: [
    {
      matchU: 0.46875,
      setU: 0.71875,
      addV: 0.25,
    },
  ],
  "pine-crooked": [
    {
      matchU: 0.46875,
      setU: 0.71875,
      addV: 0.25,
    },
  ],
  "column-large": [
    {
      matchU: 0.21875,
      setU: 0.96875,
      addV: -0.3,
    },
  ],
});
const OBJ_MODEL_URLS = import.meta.glob("../models/*.obj", {
  eager: true,
  import: "default",
  query: "?url",
});
const KENNEY_MANAGED_FLAG = "kenneyManaged";
const KENNEY_SHARED_FLAG = "kenneyShared";
const WALL_BOTTOM_CAP_GEOMETRY = markKenneyManaged(new THREE.PlaneGeometry(1, 1), { shared: true });
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

function getObjModelUrl(fileBasename) {
  return OBJ_MODEL_URLS[`../models/${fileBasename}.obj`] ?? null;
}

function createObjModelDefinition(fileBasename) {
  const objUrl = getObjModelUrl(fileBasename);
  if (!objUrl) {
    throw new Error(`[KenneyModels] Missing OBJ asset URL for '${fileBasename}.obj'.`);
  }
  return {
    objUrl,
    atlasKey: MODEL_ATLAS_KEY_BY_FILE_BASENAME[fileBasename] ?? DEFAULT_ATLAS_KEY,
    uvFixes: MODEL_UV_FIXES_BY_FILE_BASENAME[fileBasename] ?? null,
  };
}

const MODEL_DEFINITIONS = {
  "character-orc": createObjModelDefinition("character-orc"),
  "character-ghost": createObjModelDefinition("character-ghost"),
  "character-skeleton": createObjModelDefinition("character-skeleton"),
  "character-vampire": createObjModelDefinition("character-vampire"),
  "character-zombie": createObjModelDefinition("character-zombie"),
  "character-human": createObjModelDefinition("character-human"),
  coin: createObjModelDefinition("coin"),
  stairs: createObjModelDefinition("stairs"),
  wall: createObjModelDefinition("wall"),
  ...Object.fromEntries(
    DECORATIVE_MODEL_SPECS.map((entry) => [entry.type, createObjModelDefinition(entry.type)])
  ),
};

const assetDescriptors = new Map();
let sharedAtlasTexture = null;
let sharedAtlasTexture2 = null;
let sharedAtlasTexture3 = null;
const atlasTextureByKey = new Map();
let preloadPromise = null;
let preloadFailed = false;
const sharedWallBottomCapMaterials = new Map();
const preparedBatchVisualCache = new Map();

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

function applyUvFixes(root, uvFixes = null) {
  if (!root || !Array.isArray(uvFixes) || uvFixes.length === 0) {
    return;
  }
  const processedGeometries = new Set();
  const UV_EPSILON = 1e-5;
  root.traverse((child) => {
    const geometry = child?.isMesh ? child.geometry : null;
    const uvAttribute = geometry?.attributes?.uv;
    if (!uvAttribute || processedGeometries.has(geometry)) {
      return;
    }
    processedGeometries.add(geometry);
    for (let index = 0; index < uvAttribute.count; index += 1) {
      let nextU = uvAttribute.getX(index);
      let nextV = uvAttribute.getY(index);
      let changed = false;
      for (const fix of uvFixes) {
        if (!fix || Math.abs(nextU - fix.matchU) > UV_EPSILON) {
          continue;
        }
        if (Number.isFinite(Number(fix.setU))) {
          nextU = Number(fix.setU);
          changed = true;
        }
        if (Number.isFinite(Number(fix.addV))) {
          nextV += Number(fix.addV);
          changed = true;
        }
      }
      if (changed) {
        uvAttribute.setXY(index, nextU, nextV);
      }
    }
    uvAttribute.needsUpdate = true;
  });
}

function configureAtlasTexture(texture) {
  if (!texture) {
    return texture;
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = true;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  markKenneyManaged(texture, { shared: true });
  return texture;
}

function getAtlasTexture(atlasKey = DEFAULT_ATLAS_KEY) {
  return atlasTextureByKey.get(atlasKey) ?? atlasTextureByKey.get(DEFAULT_ATLAS_KEY) ?? null;
}

function assignAtlasTexture(material, atlasTexture) {
  if (!material) {
    return material;
  }
  material.userData = {
    ...(material.userData || {}),
    kenneyAtlasTexture: atlasTexture ?? null,
  };
  if ("map" in material) {
    material.map = atlasTexture ?? null;
  }
  return material;
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

function getSharedWallBottomCapMaterial(materialKey, style = {}) {
  if (sharedWallBottomCapMaterials.has(materialKey)) {
    return sharedWallBottomCapMaterials.get(materialKey);
  }
  const material = new THREE.MeshStandardMaterial({
    color: cloneColor(style.color ?? 0xffffff),
    emissive: cloneColor(style.emissive ?? 0x000000, 0x000000),
    emissiveIntensity: hasFiniteNumber(style.emissiveIntensity)
      ? Math.max(0, Number(style.emissiveIntensity))
      : 0,
    roughness: hasFiniteNumber(style.roughness)
      ? THREE.MathUtils.clamp(Number(style.roughness), 0, 1)
      : 0.82,
    metalness: hasFiniteNumber(style.metalness)
      ? THREE.MathUtils.clamp(Number(style.metalness), 0, 1)
      : 0.04,
    side: THREE.DoubleSide,
  });
  if (hasFiniteNumber(style.opacity)) {
    const opacity = THREE.MathUtils.clamp(Number(style.opacity), 0, 1);
    material.opacity = opacity;
    material.transparent = opacity < 0.999;
  }
  markKenneyManaged(material, { shared: true });
  sharedWallBottomCapMaterials.set(materialKey, material);
  return material;
}

function addWallBottomCap(root, {
  width,
  depth,
  materialKey,
  color = 0xffffff,
  emissive = 0x000000,
  emissiveIntensity = 0,
  roughness = 0.82,
  metalness = 0.04,
  opacity = 1,
} = {}) {
  if (!root) {
    return;
  }
  const capMaterial = getSharedWallBottomCapMaterial(materialKey, {
    color,
    emissive,
    emissiveIntensity,
    roughness,
    metalness,
    opacity,
  });
  const cap = new THREE.Mesh(WALL_BOTTOM_CAP_GEOMETRY, capMaterial);
  cap.rotation.x = Math.PI * 0.5;
  cap.position.y = WALL_BOTTOM_CAP_Y_OFFSET;
  cap.scale.set(Math.max(0.01, Number(width) || 1), Math.max(0.01, Number(depth) || 1), 1);
  cap.castShadow = false;
  cap.receiveShadow = true;
  root.add(cap);
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
    material.map = useMap
      ? (material.userData?.kenneyAtlasTexture ?? sharedAtlasTexture)
      : null;
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
    assignAtlasTexture(variantMaterial, descriptor.atlasTexture ?? baseMaterial.userData?.kenneyAtlasTexture ?? sharedAtlasTexture);
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
          assignAtlasTexture(
            clonedMaterial,
            sourceMaterial.userData?.kenneyAtlasTexture ?? sourceMaterial.map ?? sharedAtlasTexture
          );
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
      assignAtlasTexture(
        clonedMaterial,
        sourceMaterial.userData?.kenneyAtlasTexture ?? sourceMaterial.map ?? sharedAtlasTexture
      );
      applyMaterialStyle(clonedMaterial, style);
      materialMap.set(sourceMaterial.uuid, clonedMaterial);
    }
    child.material = clonedMaterial;
  });
}

function createPreparedStandardMaterial(atlasTexture = sharedAtlasTexture) {
  const material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0x000000,
    emissiveIntensity: 0,
    map: atlasTexture,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  material.toneMapped = false;
  material.fog = false;
  assignAtlasTexture(material, atlasTexture);
  markKenneyManaged(material, { shared: true });
  return material;
}

function replaceLoaderMaterials(root, atlasTexture = sharedAtlasTexture) {
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
        materialByName.set(materialKey, createPreparedStandardMaterial(atlasTexture));
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

function getMaterialArray(material) {
  return Array.isArray(material) ? material : [material];
}

function capturePreparedVisualData(root) {
  if (!root) {
    return null;
  }
  root.updateMatrixWorld(true, true);
  const parts = [];
  const bounds = new THREE.Box3().makeEmpty();
  root.traverse((child) => {
    if (!child?.isMesh || !child.geometry || !child.material) {
      return;
    }
    const materials = getMaterialArray(child.material);
    const primaryMaterial = materials[0] ?? null;
    if (!primaryMaterial) {
      return;
    }
    if (child.geometry.boundingBox == null && typeof child.geometry.computeBoundingBox === "function") {
      child.geometry.computeBoundingBox();
    }
    if (child.geometry.boundingSphere == null && typeof child.geometry.computeBoundingSphere === "function") {
      child.geometry.computeBoundingSphere();
    }
    const partMatrix = child.matrixWorld.clone();
    const geometryBounds = child.geometry.boundingBox
      ? child.geometry.boundingBox.clone().applyMatrix4(partMatrix)
      : null;
    if (geometryBounds) {
      bounds.union(geometryBounds);
    }
    parts.push({
      key: `${child.name || "mesh"}:${parts.length}`,
      name: child.name || "",
      geometry: child.geometry,
      material: primaryMaterial,
      matrix: partMatrix,
      castShadow: child.castShadow === true,
      receiveShadow: child.receiveShadow === true,
    });
  });
  return {
    parts,
    bounds,
    materials: collectUniqueMaterials(root),
    userData: {
      enemyModelKey: root.userData?.enemyModelKey ?? null,
      enemyModelProfile: root.userData?.enemyModelProfile ?? null,
      enemyCollisionBoxes: cloneCollisionBoxes(root.userData?.enemyCollisionBoxes ?? null),
    },
  };
}

function getPreparedVisualData(cacheKey, buildVisual) {
  if (preparedBatchVisualCache.has(cacheKey)) {
    return preparedBatchVisualCache.get(cacheKey);
  }
  const visualRoot = buildVisual();
  if (!visualRoot) {
    return null;
  }
  const prepared = capturePreparedVisualData(visualRoot);
  if (!prepared) {
    return null;
  }
  prepared.variantKey = cacheKey;
  preparedBatchVisualCache.set(cacheKey, prepared);
  return prepared;
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
  const atlasTexture = getAtlasTexture(definition.atlasKey);
  const loaded = await OBJ_LOADER.loadAsync(definition.objUrl);
  applyUvFixes(loaded, definition.uvFixes);
  replaceLoaderMaterials(loaded, atlasTexture);
  const descriptor = {
    key,
    atlasKey: definition.atlasKey ?? DEFAULT_ATLAS_KEY,
    atlasTexture,
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
      sharedAtlasTexture = configureAtlasTexture(
        await TEXTURE_LOADER.loadAsync(new URL("../models/Textures/colormap.png", import.meta.url).href)
      );
      sharedAtlasTexture2 = configureAtlasTexture(
        await TEXTURE_LOADER.loadAsync(new URL("../models/Textures/colormap2.png", import.meta.url).href)
      );
      sharedAtlasTexture3 = configureAtlasTexture(
        await TEXTURE_LOADER.loadAsync(new URL("../models/Textures/colormap3.png", import.meta.url).href)
      );
      atlasTextureByKey.set(ARENA_ATLAS_KEY, sharedAtlasTexture);
      atlasTextureByKey.set(GRAVEYARD_ATLAS_KEY, sharedAtlasTexture2);
      atlasTextureByKey.set(DUNGEON_ATLAS_KEY, sharedAtlasTexture3);
      await Promise.all(
        Object.entries(MODEL_DEFINITIONS).map(([key, definition]) => loadTemplate(key, definition))
      );
      preloadFailed = false;
      logKenneyDebug("Preload completed", {
        loadedKeys: Array.from(assetDescriptors.keys()),
        atlasLoaded: !!sharedAtlasTexture,
        atlas2Loaded: !!sharedAtlasTexture2,
        atlas3Loaded: !!sharedAtlasTexture3,
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

function cloneCollisionBoxes(collisionBoxes) {
  if (!Array.isArray(collisionBoxes)) {
    return null;
  }
  return collisionBoxes.map((box) => ({
    hitPart: box.hitPart === "head" ? "head" : "body",
    center: {
      x: Number(box.center?.x) || 0,
      y: Number(box.center?.y) || 0,
      z: Number(box.center?.z) || 0,
    },
    halfExtents: {
      x: Math.max(0.01, Number(box.halfExtents?.x) || 0.01),
      y: Math.max(0.01, Number(box.halfExtents?.y) || 0.01),
      z: Math.max(0.01, Number(box.halfExtents?.z) || 0.01),
    },
  }));
}

function createCollisionBoxFromBounds(bounds, hitPart) {
  if (!bounds || bounds.isEmpty()) {
    return null;
  }
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  return {
    hitPart,
    center: {
      x: center.x,
      y: center.y,
      z: center.z,
    },
    halfExtents: {
      x: Math.max(0.01, size.x * 0.5),
      y: Math.max(0.01, size.y * 0.5),
      z: Math.max(0.01, size.z * 0.5),
    },
  };
}

function computeSyntheticHeadCollisionBox(bounds, syntheticHead) {
  if (!bounds || bounds.isEmpty() || !syntheticHead) {
    return null;
  }
  const size = bounds.getSize(new THREE.Vector3());
  const sourceCenter = bounds.getCenter(new THREE.Vector3());
  const halfExtents = {
    x: Math.max(0.01, size.x * syntheticHead.widthRatio * 0.5),
    y: Math.max(0.01, size.y * syntheticHead.heightRatio * 0.5),
    z: Math.max(0.01, size.z * syntheticHead.depthRatio * 0.5),
  };
  const minCenterY = bounds.min.y + halfExtents.y;
  const maxCenterY = bounds.max.y - halfExtents.y;
  const unclampedCenterY = bounds.min.y + (size.y * syntheticHead.centerYRatio);
  return {
    hitPart: "head",
    center: {
      x: sourceCenter.x,
      y: THREE.MathUtils.clamp(unclampedCenterY, minCenterY, maxCenterY),
      z: sourceCenter.z,
    },
    halfExtents,
  };
}

function getPrimaryMaterial(material) {
  const materials = getMaterialArray(material);
  return materials[0] ?? null;
}

function collectEnemyModelMeshEntries(root, profile) {
  const bodyEntries = [];
  const headEntries = [];
  const syntheticSourceBounds = new THREE.Box3().makeEmpty();
  let hasSyntheticSourceBounds = false;
  root.updateMatrixWorld(true, true);
  root.traverse((child) => {
    if (!child?.isMesh || !child.geometry || !child.material) {
      return;
    }
    const primaryMaterial = getPrimaryMaterial(child.material);
    if (!primaryMaterial) {
      return;
    }
    if (child.geometry.boundingBox == null && typeof child.geometry.computeBoundingBox === "function") {
      child.geometry.computeBoundingBox();
    }
    const entry = {
      name: child.name || "",
      geometry: child.geometry,
      material: primaryMaterial,
      matrixWorld: child.matrixWorld.clone(),
      castShadow: child.castShadow === true,
      receiveShadow: child.receiveShadow === true,
    };
    if (profile.headMeshNameSet.has(entry.name)) {
      headEntries.push(entry);
    } else {
      bodyEntries.push(entry);
    }
    if (profile.syntheticHead?.sourceMeshNameSet?.has(entry.name) && child.geometry.boundingBox) {
      const meshBounds = child.geometry.boundingBox.clone().applyMatrix4(entry.matrixWorld);
      if (!hasSyntheticSourceBounds) {
        syntheticSourceBounds.copy(meshBounds);
        hasSyntheticSourceBounds = true;
      } else {
        syntheticSourceBounds.union(meshBounds);
      }
    }
  });
  return {
    bodyEntries,
    headEntries,
    syntheticHeadSourceBounds: hasSyntheticSourceBounds ? syntheticSourceBounds : null,
  };
}

function buildEnemyCollisionBoxesFromCollectedEntries(collectedEntries, profile) {
  if (!collectedEntries) {
    return null;
  }
  const bodyBounds = new THREE.Box3().makeEmpty();
  const headBounds = new THREE.Box3().makeEmpty();
  let hasBodyBounds = false;
  let hasHeadBounds = false;
  for (const entry of collectedEntries.bodyEntries ?? []) {
    if (entry.geometry.boundingBox == null && typeof entry.geometry.computeBoundingBox === "function") {
      entry.geometry.computeBoundingBox();
    }
    if (!entry.geometry.boundingBox) {
      continue;
    }
    const meshBounds = entry.geometry.boundingBox.clone().applyMatrix4(entry.matrixWorld);
    if (!hasBodyBounds) {
      bodyBounds.copy(meshBounds);
      hasBodyBounds = true;
    } else {
      bodyBounds.union(meshBounds);
    }
  }
  for (const entry of collectedEntries.headEntries ?? []) {
    if (entry.geometry.boundingBox == null && typeof entry.geometry.computeBoundingBox === "function") {
      entry.geometry.computeBoundingBox();
    }
    if (!entry.geometry.boundingBox) {
      continue;
    }
    const meshBounds = entry.geometry.boundingBox.clone().applyMatrix4(entry.matrixWorld);
    if (!hasHeadBounds) {
      headBounds.copy(meshBounds);
      hasHeadBounds = true;
    } else {
      headBounds.union(meshBounds);
    }
  }
  const collisionBoxes = [];
  const bodyCollisionBox = hasBodyBounds ? createCollisionBoxFromBounds(bodyBounds, "body") : null;
  if (bodyCollisionBox) {
    collisionBoxes.push(bodyCollisionBox);
  }
  const headCollisionBox = hasHeadBounds
    ? createCollisionBoxFromBounds(headBounds, "head")
    : computeSyntheticHeadCollisionBox(
      collectedEntries.syntheticHeadSourceBounds ?? (hasBodyBounds ? bodyBounds : null),
      profile.syntheticHead
    );
  if (headCollisionBox) {
    collisionBoxes.push(headCollisionBox);
  }
  return collisionBoxes.length > 0 ? collisionBoxes : null;
}

function createMergedEnemyPart(entries, meshName) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }
  const transformedGeometries = [];
  for (const entry of entries) {
    if (!entry?.geometry) {
      continue;
    }
    const transformedGeometry = entry.geometry.clone();
    transformedGeometry.applyMatrix4(entry.matrixWorld);
    transformedGeometries.push(transformedGeometry);
  }
  if (transformedGeometries.length === 0) {
    return null;
  }

  let mergedGeometry = null;
  if (transformedGeometries.length === 1) {
    mergedGeometry = transformedGeometries[0];
  } else {
    mergedGeometry = mergeGeometries(transformedGeometries, false);
    for (const geometry of transformedGeometries) {
      geometry.dispose();
    }
  }
  if (!mergedGeometry) {
    return null;
  }
  if (mergedGeometry.boundingBox == null && typeof mergedGeometry.computeBoundingBox === "function") {
    mergedGeometry.computeBoundingBox();
  }
  if (mergedGeometry.boundingSphere == null && typeof mergedGeometry.computeBoundingSphere === "function") {
    mergedGeometry.computeBoundingSphere();
  }
  markKenneyManaged(mergedGeometry, { shared: true });
  const partMesh = new THREE.Mesh(mergedGeometry, entries[0].material);
  partMesh.name = meshName;
  partMesh.castShadow = entries.some((entry) => entry.castShadow === true);
  partMesh.receiveShadow = entries.some((entry) => entry.receiveShadow === true);
  return partMesh;
}

function getEnemyMaterialStyle(modelKey) {
  void modelKey;
  return {
    color: 0xffffff,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.82,
    metalness: 0.02,
    useMap: true,
  };
}

function createPreparedEnemyBatchRoot(modelKey, targetHeight) {
  const descriptor = getDescriptor(modelKey);
  if (!descriptor) {
    return null;
  }
  const sourceRoot = createCloneRoot(descriptor, {
    fit: "height",
    targetHeight,
    anchorY: "bottom",
    sharedMaterialVariantKey: `enemy:${modelKey}:live`,
    sharedMaterialStyle: getEnemyMaterialStyle(modelKey),
  });
  if (!sourceRoot) {
    return null;
  }
  sourceRoot.rotation.y = ENEMY_VISUAL_YAW_CORRECTION;
  const profile = getEnemyModelProfile(modelKey);
  const collectedEntries = collectEnemyModelMeshEntries(sourceRoot, profile);
  const collisionBoxes = buildEnemyCollisionBoxesFromCollectedEntries(collectedEntries, profile);
  const preparedRoot = new THREE.Group();
  const bodyMesh = createMergedEnemyPart(collectedEntries.bodyEntries, "body-mesh");
  const headMesh = createMergedEnemyPart(collectedEntries.headEntries, "head-mesh");
  if (!bodyMesh) {
    return null;
  }
  preparedRoot.add(bodyMesh);
  if (headMesh) {
    preparedRoot.add(headMesh);
  }
  preparedRoot.userData.enemyModelKey = modelKey;
  preparedRoot.userData.enemyModelProfile = profile;
  preparedRoot.userData.enemyCollisionBoxes = cloneCollisionBoxes(collisionBoxes);
  return preparedRoot;
}

export function createEnemyVisual(enemyType = null, enemyTypeId = null) {
  const targetHeight = Math.max(
    0.2,
    (Number.isFinite(Number(enemyType?.size)) ? Number(enemyType.size) : 1) * ENEMY_VISUAL_HEIGHT_MULTIPLIER
  );
  const modelKey = resolveEnemyModelKey(enemyTypeId);
  const descriptor = getDescriptor(modelKey);
  if (!descriptor) {
    return null;
  }
  const root = createCloneRoot(descriptor, {
    fit: "height",
    targetHeight,
    anchorY: "bottom",
    instanceMaterialStyle: getEnemyMaterialStyle(modelKey),
  });
  if (root) {
    root.rotation.y = ENEMY_VISUAL_YAW_CORRECTION;
    const profile = getEnemyModelProfile(modelKey);
    const collectedEntries = collectEnemyModelMeshEntries(root, profile);
    root.userData.enemyModelKey = modelKey;
    root.userData.enemyModelProfile = profile;
    root.userData.enemyCollisionBoxes = buildEnemyCollisionBoxesFromCollectedEntries(collectedEntries, profile);
  }
  logKenneyDebug("Created enemy visual", {
    modelKey,
    targetHeight,
    enemyType: enemyType ? {
      size: enemyType.size,
      color: enemyType.color,
      emissive: enemyType.emissive,
    } : null,
    ok: !!root,
  }, { onceKey: `create-enemy:${modelKey}:${targetHeight.toFixed(2)}:${enemyType?.color ?? "na"}` });
  return root;
}

export function getPreparedEnemyBatchParts(enemyType = null, enemyTypeId = null) {
  const targetHeight = Math.max(
    0.2,
    (Number.isFinite(Number(enemyType?.size)) ? Number(enemyType.size) : 1) * ENEMY_VISUAL_HEIGHT_MULTIPLIER
  );
  const modelKey = resolveEnemyModelKey(enemyTypeId);
  const preparedVisual = getPreparedVisualData(
    `enemy:${modelKey}:${targetHeight.toFixed(4)}`,
    () => createPreparedEnemyBatchRoot(modelKey, targetHeight)
  );
  if (preparedVisual) {
    preparedVisual.enemyModelKey = modelKey;
    preparedVisual.enemyModelProfile = preparedVisual.userData?.enemyModelProfile ?? getEnemyModelProfile(modelKey);
    preparedVisual.enemyCollisionBoxes = cloneCollisionBoxes(preparedVisual.userData?.enemyCollisionBoxes ?? null);
  }
  return preparedVisual;
}

export function createRemotePlayerVisual() {
  const descriptor = getDescriptor("character-human");
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
  const descriptor = getDescriptor("coin");
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

export function getPreparedMoneyDropBatchParts(value = 1) {
  const normalizedValue = Math.max(1, Math.floor(Number(value) || 1));
  return getPreparedVisualData(`moneyDrop:${normalizedValue}`, () => {
    const descriptor = getDescriptor("coin");
    if (!descriptor) {
      return null;
    }
    return createCloneRoot(descriptor, {
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
  });
}

export function createRampVisual(rotation = 0) {
  const descriptor = getDescriptor("stairs");
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

export function getPreparedRampBatchParts() {
  return getPreparedVisualData("ramp:base", () => createRampVisual(0));
}

export function createTerrainWallVisual({ addBottomCap = false } = {}) {
  const descriptor = getDescriptor("wall");
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
  if (root) {
    const wallShell = root.children[0];
    if (wallShell) {
      wallShell.position.y += WALL_VISUAL_SURFACE_LIFT;
    }
    if (addBottomCap) {
      addWallBottomCap(root, {
        width: GRID_CELL_SIZE,
        depth: GRID_CELL_SIZE,
        materialKey: "terrainWall:bottomCap",
        color: 0xd7d4e6,
        emissive: 0x000000,
        emissiveIntensity: 0,
        roughness: Number.isFinite(Number(GRID_CONFIG.altitudeRoughness))
          ? Number(GRID_CONFIG.altitudeRoughness)
          : 0.82,
        metalness: 0.02,
      });
    }
  }
  logKenneyDebug("Created terrain wall visual", { ok: !!root }, { onceKey: "create-terrain-wall" });
  return root;
}

export function getPreparedTerrainWallBatchParts({ addBottomCap = false } = {}) {
  return getPreparedVisualData(`terrainWall:${addBottomCap ? "bottomCap" : "plain"}`, () => (
    createTerrainWallVisual({ addBottomCap })
  ));
}

function getDefaultDecorationMaterialStyle() {
  return {
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
  };
}

export function createDecorationVisual(type, options = {}) {
  const normalizedType = typeof type === "string" ? type.trim().toLowerCase() : "";
  const decorativeSpec = getDecorativeModelSpec(normalizedType);
  if (!decorativeSpec) {
    return null;
  }
  const descriptor = getDescriptor(normalizedType);
  if (!descriptor) {
    return null;
  }
  const targetHeight = Math.max(
    0.05,
    GRID_CELL_SIZE * Math.max(0.05, Number(decorativeSpec.targetHeightCells) || 0.25)
  );
  const instanceMaterialStyle = (
    options.instanceMaterialStyle && typeof options.instanceMaterialStyle === "object"
  )
    ? options.instanceMaterialStyle
    : null;
  const root = createCloneRoot(descriptor, {
    fit: "height",
    targetHeight,
    anchorY: "bottom",
    sharedMaterialVariantKey: instanceMaterialStyle
      ? null
      : (typeof options.sharedMaterialVariantKey === "string" && options.sharedMaterialVariantKey.length > 0
        ? options.sharedMaterialVariantKey
        : `decor:${normalizedType}`),
    sharedMaterialStyle: instanceMaterialStyle
      ? null
      : {
        ...getDefaultDecorationMaterialStyle(),
        ...(options.sharedMaterialStyle && typeof options.sharedMaterialStyle === "object"
          ? options.sharedMaterialStyle
          : {}),
      },
    instanceMaterialStyle,
  });
  logKenneyDebug("Created decoration visual", {
    type: normalizedType,
    targetHeight,
    ok: !!root,
  }, { onceKey: `create-decoration:${normalizedType}` });
  return root;
}

export function getPreparedDecorationBatchParts(type) {
  const normalizedType = typeof type === "string" ? type.trim().toLowerCase() : "";
  if (!getDecorativeModelSpec(normalizedType)) {
    return null;
  }
  return getPreparedVisualData(`decor:${normalizedType}`, () => createDecorationVisual(normalizedType));
}

export function createBlockVisual({ opacity = 1 } = {}) {
  const descriptor = getDescriptor("wall");
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
  if (root) {
    const blockShell = root.children[0];
    if (blockShell) {
      blockShell.position.y += WALL_VISUAL_SURFACE_LIFT;
    }
  }
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
    atlas2Loaded: !!sharedAtlasTexture2,
    atlas3Loaded: !!sharedAtlasTexture3,
    loadedKeys: Array.from(assetDescriptors.keys()),
    descriptors: Array.from(assetDescriptors.values()).map((descriptor) => ({
      key: descriptor.key,
      atlasKey: descriptor.atlasKey ?? DEFAULT_ATLAS_KEY,
      baseMaterialCount: descriptor.baseMaterials.length,
      bounds: {
        min: descriptor.bounds.min.toArray(),
        max: descriptor.bounds.max.toArray(),
        size: descriptor.bounds.size.toArray(),
      },
    })),
  };
}
