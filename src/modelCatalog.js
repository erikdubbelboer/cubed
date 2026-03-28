const DECORATIVE_MODEL_BASE_DEFS = [
  { type: "chest", targetHeightCells: 0.42 },
  { type: "barrel", targetHeightCells: 0.36 },
  { type: "stones", targetHeightCells: 0.22 },
  { type: "altar-stone", targetHeightCells: 0.44 },
  { type: "altar-wood", targetHeightCells: 0.48 },
  { type: "banner", targetHeightCells: 0.86 },
  { type: "coffin-old", targetHeightCells: 0.2 },
  { type: "coffin", targetHeightCells: 0.24 },
  { type: "column-damaged", targetHeightCells: 0.72 },
  { type: "column-large", targetHeightCells: 1.02 },
  { type: "column", targetHeightCells: 0.9 },
  { type: "cross-column", targetHeightCells: 1.14 },
  { type: "cross-wood", targetHeightCells: 0.9 },
  { type: "cross", targetHeightCells: 0.9 },
  { type: "crypt-a", targetHeightCells: 0.5 },
  { type: "crypt-b", targetHeightCells: 0.5 },
  { type: "debris-wood", targetHeightCells: 0.12 },
  { type: "debris", targetHeightCells: 0.16 },
  {
    type: "gate",
    targetHeightCells: 0.98,
    placement: "grid",
    rotationStepDegrees: 90,
    collision: {
      blocksPlayer: true,
      blocksProjectiles: true,
      supportsPlayer: false,
    },
  },
  { type: "grave-border", targetHeightCells: 0.12 },
  { type: "grave", targetHeightCells: 0.12 },
  { type: "gravestone-broken", targetHeightCells: 0.32 },
  { type: "gravestone-cross-large", targetHeightCells: 0.82 },
  { type: "gravestone-cross", targetHeightCells: 0.8 },
  { type: "gravestone-debris", targetHeightCells: 0.2 },
  { type: "gravestone-decorative", targetHeightCells: 0.56 },
  { type: "gravestone-roof", targetHeightCells: 0.58 },
  { type: "gravestone-round", targetHeightCells: 0.48 },
  { type: "gravestone-wide", targetHeightCells: 0.5 },
  { type: "pine-crooked", targetHeightCells: 1.62 },
  { type: "pine", targetHeightCells: 1.74 },
  { type: "road", targetHeightCells: 0.08 },
  { type: "rocks-tall", targetHeightCells: 0.42 },
  { type: "rocks", targetHeightCells: 0.28 },
  { type: "shovel-dirt", targetHeightCells: 0.4 },
  { type: "statue", targetHeightCells: 1.0 },
  { type: "tree", targetHeightCells: 1.44 },
  { type: "trophy", targetHeightCells: 0.42 },
  { type: "trunk-long", targetHeightCells: 0.9 },
  { type: "trunk", targetHeightCells: 0.42 },
  { type: "weapon-rack", targetHeightCells: 0.42 },
  { type: "wood-structure", targetHeightCells: 0.92 },
];

function humanizeTypeLabel(type) {
  return String(type ?? "")
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const DECORATIVE_MODEL_SPECS = Object.freeze(
  DECORATIVE_MODEL_BASE_DEFS.map((entry) => Object.freeze({
    ...entry,
    collision: entry.collision && typeof entry.collision === "object"
      ? Object.freeze({ ...entry.collision })
      : null,
    label: humanizeTypeLabel(entry.type),
  }))
);

export const DECORATIVE_MODEL_TYPES = Object.freeze(
  DECORATIVE_MODEL_SPECS.map((entry) => entry.type)
);

export const DECORATIVE_OBJECT_TYPES = new Set(DECORATIVE_MODEL_TYPES);

export const DECORATIVE_MODEL_SPEC_BY_TYPE = new Map(
  DECORATIVE_MODEL_SPECS.map((entry) => [entry.type, entry])
);

export function isDecorativeObjectType(type) {
  return DECORATIVE_OBJECT_TYPES.has(String(type ?? "").trim().toLowerCase());
}

export function getDecorativeModelSpec(type) {
  return DECORATIVE_MODEL_SPEC_BY_TYPE.get(String(type ?? "").trim().toLowerCase()) ?? null;
}

export const EDITOR_DOODAD_PAGE_COLUMNS = 5;
export const EDITOR_DOODAD_PAGE_ROWS = 3;
export const EDITOR_DOODAD_PAGE_SIZE = EDITOR_DOODAD_PAGE_COLUMNS * EDITOR_DOODAD_PAGE_ROWS;

function freezeArray(values) {
  return Object.freeze(values.slice());
}

function createEnemyModelProfile(modelKey, {
  headMeshNames = [],
  syntheticHead = null,
} = {}) {
  return Object.freeze({
    modelKey,
    headMeshNames: freezeArray(headMeshNames),
    headMeshNameSet: new Set(headMeshNames),
    syntheticHead: syntheticHead
      ? Object.freeze({
        sourceMeshNames: freezeArray(syntheticHead.sourceMeshNames ?? []),
        sourceMeshNameSet: new Set(syntheticHead.sourceMeshNames ?? []),
        centerYRatio: Number.isFinite(Number(syntheticHead.centerYRatio))
          ? Number(syntheticHead.centerYRatio)
          : 0.72,
        widthRatio: Number.isFinite(Number(syntheticHead.widthRatio))
          ? Number(syntheticHead.widthRatio)
          : 0.72,
        heightRatio: Number.isFinite(Number(syntheticHead.heightRatio))
          ? Number(syntheticHead.heightRatio)
          : 0.24,
        depthRatio: Number.isFinite(Number(syntheticHead.depthRatio))
          ? Number(syntheticHead.depthRatio)
          : 0.82,
      })
      : null,
  });
}

export const ENEMY_MODEL_PROFILES = Object.freeze({
  "character-orc": createEnemyModelProfile("character-orc", {
    headMeshNames: ["head-mesh"],
  }),
  "character-ghost": createEnemyModelProfile("character-ghost", {
    syntheticHead: {
      sourceMeshNames: ["torso"],
      centerYRatio: 0.72,
      widthRatio: 0.72,
      heightRatio: 0.24,
      depthRatio: 0.82,
    },
  }),
  "character-skeleton": createEnemyModelProfile("character-skeleton", {
    headMeshNames: ["head"],
  }),
  "character-vampire": createEnemyModelProfile("character-vampire", {
    headMeshNames: ["head"],
  }),
  "character-zombie": createEnemyModelProfile("character-zombie", {
    headMeshNames: ["head"],
  }),
});

export const ENEMY_MODEL_KEY_BY_TYPE = Object.freeze({
  red: "character-ghost",
  pink: "character-ghost",
  lead: "character-ghost",
  blue: "character-skeleton",
  black: "character-skeleton",
  zebra: "character-skeleton",
  green: "character-vampire",
  white: "character-vampire",
  rainbow: "character-vampire",
  yellow: "character-zombie",
  purple: "character-zombie",
  ceramic: "character-zombie",
});

export function resolveEnemyModelKey(enemyTypeId) {
  const normalizedType = String(enemyTypeId ?? "").trim().toLowerCase();
  return ENEMY_MODEL_KEY_BY_TYPE[normalizedType] ?? "character-orc";
}

export function getEnemyModelProfile(modelKey) {
  const normalizedKey = String(modelKey ?? "").trim();
  return ENEMY_MODEL_PROFILES[normalizedKey] ?? ENEMY_MODEL_PROFILES["character-orc"];
}
