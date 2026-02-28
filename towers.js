import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";

const TOWER_CONFIG = GAME_CONFIG.towers;

const TOWER_RANGE = TOWER_CONFIG.range;
const TOWER_FIRE_INTERVAL = TOWER_CONFIG.fireInterval;
const TOWER_BEAM_DAMAGE = TOWER_CONFIG.beamDamage;
const TOWER_BEAM_HIT_RADIUS = TOWER_CONFIG.beamHitRadius;
const LASER_TOWER_RADIUS = TOWER_CONFIG.radius;
const LASER_TOWER_HALF_SIZE = TOWER_CONFIG.halfSize;
const LASER_TOWER_HEIGHT = TOWER_CONFIG.height;
const TOWER_PLACEMENT_GAP = TOWER_CONFIG.placementGap;
const LASER_RING_HALF_EXTENT = TOWER_CONFIG.ringHalfExtent;
const LASER_RING_THICKNESS = TOWER_CONFIG.ringThickness;
const LASER_ACTIVE_GLOW_INTENSITY = TOWER_CONFIG.activeGlowIntensity;
const LASER_IDLE_GLOW_INTENSITY = TOWER_CONFIG.idleGlowIntensity;
const LASER_PULSE_DURATION = TOWER_CONFIG.pulseDuration;
const LASER_BEAM_BASE_OPACITY = TOWER_CONFIG.beamBaseOpacity;
const LASER_BEAM_PULSE_OPACITY_BOOST = TOWER_CONFIG.beamPulseOpacityBoost;
const LASER_BEAM_PULSE_WIDTH_BOOST = TOWER_CONFIG.beamPulseWidthBoost;
const LASER_FLASH_BASE_OPACITY = TOWER_CONFIG.flashBaseOpacity;
const LASER_FLASH_PULSE_OPACITY_BOOST = TOWER_CONFIG.flashPulseOpacityBoost;
const LASER_FLASH_BASE_SCALE = TOWER_CONFIG.flashBaseScale;
const LASER_FLASH_PULSE_SCALE_BOOST = TOWER_CONFIG.flashPulseScaleBoost;
const PATH_RANGE_HIGHLIGHT_VALID_COLOR = TOWER_CONFIG.rangeHighlightValidColor;
const PATH_RANGE_HIGHLIGHT_INVALID_COLOR = TOWER_CONFIG.rangeHighlightInvalidColor;
const LASER_CORNER_OFFSETS = TOWER_CONFIG.cornerOffsets;
const TOWER_DISPLAY_NAMES = {
  laser: "Laser Tower",
};

export function createTowerSystem({ scene, camera, grid }) {
  const raycaster = new THREE.Raycaster();
  const aimPoint = new THREE.Vector2(0, 0);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -grid.tileTopY);
  const groundHit = new THREE.Vector3();
  const pathWaypoints = Array.isArray(grid.pathWaypoints) ? grid.pathWaypoints : [];
  const terrainObstacles = Array.isArray(grid.heightObstacles) ? grid.heightObstacles : [];
  const pathHalfWidth = grid.cellSize * TOWER_CONFIG.pathHalfWidthCellScale;

  const beamGeometry = new THREE.CylinderGeometry(
    TOWER_CONFIG.beamRadius,
    TOWER_CONFIG.beamRadius,
    1,
    TOWER_CONFIG.beamRadialSegments,
    1,
    true
  );
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: TOWER_CONFIG.beamColor,
    transparent: true,
    opacity: TOWER_CONFIG.beamOpacity,
    depthWrite: false,
  });
  beamMaterial.toneMapped = false;

  const muzzleFlashGeometry = new THREE.SphereGeometry(
    TOWER_CONFIG.muzzleRadius,
    TOWER_CONFIG.muzzleSegments,
    TOWER_CONFIG.muzzleSegments
  );
  const muzzleFlashMaterial = new THREE.MeshBasicMaterial({
    color: TOWER_CONFIG.muzzleColor,
    transparent: true,
    opacity: TOWER_CONFIG.muzzleOpacity,
    depthWrite: false,
  });
  muzzleFlashMaterial.toneMapped = false;

  const tempVecA = new THREE.Vector3();
  const tempVecB = new THREE.Vector3();
  const tempVecC = new THREE.Vector3();
  const upVector = new THREE.Vector3(0, 1, 0);

  let selectedTowerType = null;
  let buildMode = false;
  const towerStock = {
    laser: TOWER_CONFIG.baseMaxTowers,
  };
  const towers = [];
  let previewValid = false;
  let previewPosition = null;

  let towerDamageMultiplier = 1;
  let towerFireRateMultiplier = 1;

  function getTowerRemaining(type) {
    if (!type) {
      return 0;
    }
    return Math.max(0, towerStock[type] || 0);
  }

  function grantTowerStock(type, amount = 1) {
    if (typeof type !== "string") {
      return 0;
    }

    const increment = Math.max(0, Math.floor(amount));
    if (increment <= 0) {
      return getTowerRemaining(type);
    }

    towerStock[type] = getTowerRemaining(type) + increment;
    return towerStock[type];
  }

  function upgradeMaxTowers() {
    grantTowerStock("laser", TOWER_CONFIG.maxTowerUpgradeStep);
  }
  function upgradeTowerDamage() { towerDamageMultiplier += TOWER_CONFIG.damageUpgradeAdd; }
  function upgradeTowerFireRate() { towerFireRateMultiplier *= TOWER_CONFIG.fireRateUpgradeMultiplier; }

  function applyShadowSettings(object) {
    object.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  function createLaserTowerMesh({
    bodyColor,
    ringColor,
    ringGlowColor,
    opacity = 1,
    transparent = false,
  }) {
    const root = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: TOWER_CONFIG.bodyRoughness,
      metalness: TOWER_CONFIG.bodyMetalness,
      opacity,
      transparent,
      emissive: TOWER_CONFIG.bodyEmissive,
      emissiveIntensity: TOWER_CONFIG.bodyEmissiveIntensity,
    });

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: TOWER_CONFIG.edgeColor,
      transparent,
      opacity: transparent ? opacity : TOWER_CONFIG.edgeOpaqueOpacity,
    });

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: ringColor,
      emissive: ringGlowColor,
      emissiveIntensity: TOWER_CONFIG.ringEmissiveIntensity,
      roughness: TOWER_CONFIG.ringRoughness,
      metalness: TOWER_CONFIG.ringMetalness,
      opacity,
      transparent,
    });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(TOWER_CONFIG.bodySize, TOWER_CONFIG.bodySize, TOWER_CONFIG.bodySize),
      bodyMaterial
    );
    body.position.y = TOWER_CONFIG.bodyCenterY;
    root.add(body);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(TOWER_CONFIG.edgeSize, TOWER_CONFIG.edgeSize, TOWER_CONFIG.edgeSize)),
      edgeMaterial
    );
    edges.position.copy(body.position);
    root.add(edges);

    const ringAnchor = new THREE.Object3D();
    ringAnchor.position.y = body.position.y;
    root.add(ringAnchor);

    const ringSpan = (LASER_RING_HALF_EXTENT * 2) + LASER_RING_THICKNESS;
    const ringXGeometry = new THREE.BoxGeometry(ringSpan, LASER_RING_THICKNESS, LASER_RING_THICKNESS);
    const ringZGeometry = new THREE.BoxGeometry(LASER_RING_THICKNESS, LASER_RING_THICKNESS, ringSpan);

    const ringFront = new THREE.Mesh(ringXGeometry, ringMaterial);
    ringFront.position.z = LASER_RING_HALF_EXTENT;
    ringAnchor.add(ringFront);

    const ringBack = new THREE.Mesh(ringXGeometry, ringMaterial);
    ringBack.position.z = -LASER_RING_HALF_EXTENT;
    ringAnchor.add(ringBack);

    const ringLeft = new THREE.Mesh(ringZGeometry, ringMaterial);
    ringLeft.position.x = -LASER_RING_HALF_EXTENT;
    ringAnchor.add(ringLeft);

    const ringRight = new THREE.Mesh(ringZGeometry, ringMaterial);
    ringRight.position.x = LASER_RING_HALF_EXTENT;
    ringAnchor.add(ringRight);

    const glowLight = new THREE.PointLight(TOWER_CONFIG.ringLightColor, 0, TOWER_CONFIG.ringLightDistance);
    glowLight.position.copy(ringAnchor.position);
    root.add(glowLight);

    root.userData.materials = [bodyMaterial, edgeMaterial, ringMaterial];
    root.userData.ringMaterial = ringMaterial;
    root.userData.ringNode = ringAnchor;
    root.userData.flashLight = glowLight;

    applyShadowSettings(root);
    return root;
  }

  function createPathRangeHighlights() {
    const pathTiles = Array.isArray(grid.tiles)
      ? grid.tiles.filter((tile) => tile?.userData?.isPath)
      : [];

    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: PATH_RANGE_HIGHLIGHT_VALID_COLOR,
      transparent: true,
      opacity: TOWER_CONFIG.rangeHighlightOpacity,
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
      marker.renderOrder = TOWER_CONFIG.rangeHighlightRenderOrder;
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
    const previewTowerProbe = {
      mesh: preview,
      range: TOWER_RANGE,
      halfSize: LASER_TOWER_HALF_SIZE,
      height: LASER_TOWER_HEIGHT,
      baseY: origin.y,
      cornerIndex: null,
    };

    for (const entry of pathRangeHighlights.entries) {
      previewTowerProbe.cornerIndex = null;
      entry.mesh.visible = canTowerHitPoint(previewTowerProbe, entry.center);
    }
  }

  function setPreviewValidityVisual(isValid) {
    const materials = preview.userData.materials || [];
    const bodyMaterial = materials[0];
    const edgeMaterial = materials[1];
    const ringMaterial = materials[2];
    if (!bodyMaterial || !edgeMaterial || !ringMaterial) {
      return;
    }

    if (isValid) {
      bodyMaterial.color.setHex(TOWER_CONFIG.previewBodyColor);
      edgeMaterial.color.setHex(TOWER_CONFIG.previewEdgeColor);
      ringMaterial.color.setHex(TOWER_CONFIG.previewRingColor);
      ringMaterial.emissive.setHex(TOWER_CONFIG.previewRingGlow);
    } else {
      bodyMaterial.color.setHex(TOWER_CONFIG.previewInvalidBodyColor);
      edgeMaterial.color.setHex(TOWER_CONFIG.previewInvalidEdgeColor);
      ringMaterial.color.setHex(TOWER_CONFIG.previewInvalidRingColor);
      ringMaterial.emissive.setHex(TOWER_CONFIG.previewInvalidRingGlow);
    }
  }

  let preview = createLaserTowerMesh({
    bodyColor: TOWER_CONFIG.previewBodyColor,
    ringColor: TOWER_CONFIG.previewRingColor,
    ringGlowColor: TOWER_CONFIG.previewRingGlow,
    opacity: TOWER_CONFIG.previewOpacity,
    transparent: true,
  });
  preview.visible = false;
  scene.add(preview);

  const pathRangeHighlights = createPathRangeHighlights();

  function distancePointToSegmentXZ(point, segStart, segEnd) {
    const sx = segStart.x;
    const sz = segStart.z;
    const ex = segEnd.x;
    const ez = segEnd.z;
    const dx = ex - sx;
    const dz = ez - sz;
    const lengthSq = dx * dx + dz * dz;

    if (lengthSq < TOWER_CONFIG.segmentEpsilon) {
      return Math.hypot(point.x - sx, point.z - sz);
    }

    const t = Math.max(0, Math.min(1, ((point.x - sx) * dx + (point.z - sz) * dz) / lengthSq));
    const closestX = sx + dx * t;
    const closestZ = sz + dz * t;
    return Math.hypot(point.x - closestX, point.z - closestZ);
  }

  function overlapsTrack(position) {
    if (pathWaypoints.length < 2) {
      return false;
    }
    const minDistanceFromPath = pathHalfWidth + LASER_TOWER_RADIUS;
    for (let i = 0; i < pathWaypoints.length - 1; i += 1) {
      const start = pathWaypoints[i];
      const end = pathWaypoints[i + 1];
      if (distancePointToSegmentXZ(position, start, end) < minDistanceFromPath) {
        return true;
      }
    }
    return false;
  }

  function overlapsOtherTower(position) {
    for (const tower of towers) {
      const minDistance = LASER_TOWER_RADIUS + (tower.radius ?? LASER_TOWER_RADIUS) + TOWER_PLACEMENT_GAP;
      const dx = position.x - tower.mesh.position.x;
      const dz = position.z - tower.mesh.position.z;
      if ((dx * dx + dz * dz) < (minDistance * minDistance)) {
        return true;
      }
    }
    return false;
  }

  function isInsideBuildBounds(position) {
    return (
      position.x >= grid.moveBounds.minX + LASER_TOWER_RADIUS &&
      position.x <= grid.moveBounds.maxX - LASER_TOWER_RADIUS &&
      position.z >= grid.moveBounds.minZ + LASER_TOWER_RADIUS &&
      position.z <= grid.moveBounds.maxZ - LASER_TOWER_RADIUS
    );
  }

  function isPlacementValid(position) {
    if (!isInsideBuildBounds(position)) {
      return false;
    }
    if (overlapsTrack(position)) {
      return false;
    }
    if (overlapsOtherTower(position)) {
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

  function selectTower(type = "laser") {
    if (type !== "laser") {
      return false;
    }

    if (getTowerRemaining(type) <= 0) {
      return false;
    }

    selectedTowerType = type;
    buildMode = true;

    scene.remove(preview);
    preview = createLaserTowerMesh({
      bodyColor: TOWER_CONFIG.previewBodyColor,
      ringColor: TOWER_CONFIG.previewRingColor,
      ringGlowColor: TOWER_CONFIG.previewRingGlow,
      opacity: TOWER_CONFIG.previewOpacity,
      transparent: true,
    });
    scene.add(preview);

    preview.visible = true;
    setPathRangeHighlightValidityVisual(false);
    hidePathRangeHighlights();
    previewValid = false;
    previewPosition = null;
    return true;
  }

  function cancelPlacement() {
    buildMode = false;
    selectedTowerType = null;
    preview.visible = false;
    hidePathRangeHighlights();
    previewValid = false;
    previewPosition = null;
  }

  function updatePreviewFromCamera() {
    if (
      !buildMode
      || selectedTowerType !== "laser"
      || getTowerRemaining(selectedTowerType) <= 0
    ) {
      preview.visible = false;
      hidePathRangeHighlights();
      previewValid = false;
      previewPosition = null;
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
      previewPosition = null;
      return;
    }

    const x = Math.min(
      grid.moveBounds.maxX - LASER_TOWER_RADIUS,
      Math.max(grid.moveBounds.minX + LASER_TOWER_RADIUS, groundHit.x)
    );
    const z = Math.min(
      grid.moveBounds.maxZ - LASER_TOWER_RADIUS,
      Math.max(grid.moveBounds.minZ + LASER_TOWER_RADIUS, groundHit.z)
    );
    const y = getBuildSurfaceY(x, z);

    preview.visible = true;
    preview.position.set(x, y, z);
    if (!previewPosition) {
      previewPosition = new THREE.Vector3();
    }
    previewPosition.copy(preview.position);
    previewValid = isPlacementValid(previewPosition);
    setPreviewValidityVisual(previewValid);
    setPathRangeHighlightValidityVisual(previewValid);
    updatePathRangeHighlights(previewPosition);
  }

  function placeSelectedTower() {
    updatePreviewFromCamera();

    if (
      !buildMode
      || !previewValid
      || !selectedTowerType
      || getTowerRemaining(selectedTowerType) <= 0
      || !previewPosition
    ) {
      return false;
    }

    const towerMesh = createLaserTowerMesh({
      bodyColor: TOWER_CONFIG.placedBodyColor,
      ringColor: TOWER_CONFIG.placedRingColor,
      ringGlowColor: TOWER_CONFIG.placedRingGlow,
      opacity: 1,
      transparent: false,
    });
    towerMesh.position.copy(previewPosition);
    scene.add(towerMesh);

    towers.push({
      mesh: towerMesh,
      cooldown: 0,
      pulseTimer: 0,
      towerType: selectedTowerType,
      range: TOWER_RANGE,
      radius: LASER_TOWER_RADIUS,
      halfSize: LASER_TOWER_HALF_SIZE,
      height: LASER_TOWER_HEIGHT,
      baseY: previewPosition.y,
      beamVisual: null,
      cornerIndex: null,
    });

    towerStock[selectedTowerType] = Math.max(0, getTowerRemaining(selectedTowerType) - 1);
    if (getTowerRemaining(selectedTowerType) <= 0) {
      cancelPlacement();
    }
    return true;
  }

  function getCornerWorldPosition(towerMesh, cornerIndex, out) {
    const ringNode = towerMesh.userData.ringNode || towerMesh;
    ringNode.getWorldPosition(tempVecA);
    const corner = LASER_CORNER_OFFSETS[cornerIndex] || LASER_CORNER_OFFSETS[0];
    out.set(
      tempVecA.x + corner[0] * LASER_RING_HALF_EXTENT,
      tempVecA.y,
      tempVecA.z + corner[1] * LASER_RING_HALF_EXTENT
    );
    return out;
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

  function beamWouldGoThroughTower(tower, cornerIndex, targetPosition) {
    getCornerWorldPosition(tower.mesh, cornerIndex, tempVecA);

    const innerHalfSize = Math.max(
      TOWER_CONFIG.selfBlockMinHalfSize,
      (tower.halfSize ?? LASER_TOWER_HALF_SIZE) - TOWER_CONFIG.selfBlockInset
    );
    const baseY = (tower.baseY ?? grid.tileTopY) + TOWER_CONFIG.selfBlockBaseOffsetY;
    const topY = baseY + Math.max(
      TOWER_CONFIG.selfBlockMinHeight,
      (tower.height ?? LASER_TOWER_HEIGHT) - TOWER_CONFIG.selfBlockTopInset
    );
    const minX = tower.mesh.position.x - innerHalfSize;
    const maxX = tower.mesh.position.x + innerHalfSize;
    const minZ = tower.mesh.position.z - innerHalfSize;
    const maxZ = tower.mesh.position.z + innerHalfSize;

    return segmentIntersectsAabb(
      tempVecA,
      targetPosition,
      minX,
      baseY,
      minZ,
      maxX,
      topY,
      maxZ
    );
  }

  function resolveCornerShotOrigin(tower, targetPosition) {
    if (tower.cornerIndex == null) {
      // First lock-on picks whichever corner is closest to current target.
      let bestIdx = 0;
      let bestDistSq = Infinity;
      for (let i = 0; i < LASER_CORNER_OFFSETS.length; i += 1) {
        getCornerWorldPosition(tower.mesh, i, tempVecA);
        const distSq = tempVecA.distanceToSquared(targetPosition);
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestIdx = i;
        }
      }
      tower.cornerIndex = bestIdx;
    }

    const currentIndex = tower.cornerIndex;
    if (beamWouldGoThroughTower(tower, currentIndex, targetPosition)) {
      let replacementIndex = currentIndex;
      let replacementDistSq = Infinity;
      for (let i = 0; i < LASER_CORNER_OFFSETS.length; i += 1) {
        if (i === currentIndex) {
          continue;
        }
        if (beamWouldGoThroughTower(tower, i, targetPosition)) {
          continue;
        }
        getCornerWorldPosition(tower.mesh, i, tempVecB);
        const distSq = tempVecB.distanceToSquared(targetPosition);
        if (distSq < replacementDistSq) {
          replacementDistSq = distSq;
          replacementIndex = i;
        }
      }
      tower.cornerIndex = replacementIndex;
    }

    getCornerWorldPosition(tower.mesh, tower.cornerIndex, tempVecC);
    return tempVecC;
  }

  function lineOfSightBlockedByOtherTower(origin, targetPosition, sourceTower) {
    for (const otherTower of towers) {
      if (otherTower === sourceTower) {
        continue;
      }

      const halfSize = otherTower.halfSize ?? LASER_TOWER_HALF_SIZE;
      const baseY = otherTower.baseY ?? grid.tileTopY;
      const topY = baseY + (otherTower.height ?? LASER_TOWER_HEIGHT);
      const minX = otherTower.mesh.position.x - halfSize;
      const maxX = otherTower.mesh.position.x + halfSize;
      const minZ = otherTower.mesh.position.z - halfSize;
      const maxZ = otherTower.mesh.position.z + halfSize;

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
      const obstacleHalfSize = obstacle?.halfSize;
      const obstacleHeight = obstacle?.height;
      const obstacleBaseY = obstacle?.baseY ?? 0;
      if (!obstaclePos || typeof obstacleHalfSize !== "number" || typeof obstacleHeight !== "number") {
        continue;
      }

      const shrink = Math.min(TOWER_CONFIG.terrainLosShrinkMax, obstacleHalfSize * TOWER_CONFIG.terrainLosShrinkPercent);
      const halfSize = Math.max(TOWER_CONFIG.terrainLosMinHalfSize, obstacleHalfSize - shrink);
      const minX = obstaclePos.x - halfSize;
      const maxX = obstaclePos.x + halfSize;
      const minZ = obstaclePos.z - halfSize;
      const maxZ = obstaclePos.z + halfSize;
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
    const towerRange = tower.range ?? TOWER_RANGE;
    return tower.mesh.position.distanceToSquared(targetPosition) <= (towerRange * towerRange);
  }

  function hasLineOfSightToPoint(tower, targetPosition) {
    const origin = resolveCornerShotOrigin(tower, targetPosition);
    return (
      !lineOfSightBlockedByOtherTower(origin, targetPosition, tower) &&
      !lineOfSightBlockedByTerrain(origin, targetPosition)
    );
  }

  function canTowerHitPoint(tower, targetPosition) {
    return isPointInTowerRange(tower, targetPosition) && hasLineOfSightToPoint(tower, targetPosition);
  }

  function findTargetWithLineOfSight(tower, enemySystem) {
    const towerRange = tower.range ?? TOWER_RANGE;
    const maxRangeSq = towerRange * towerRange;
    let bestTarget = null;
    let bestDistSq = maxRangeSq;

    if (typeof enemySystem.getEnemies === "function") {
      const enemyMeshes = enemySystem.getEnemies();
      if (Array.isArray(enemyMeshes)) {
        for (const enemyMesh of enemyMeshes) {
          if (!enemyMesh || !enemyMesh.visible) {
            continue;
          }

          const distSq = tower.mesh.position.distanceToSquared(enemyMesh.position);
          if (distSq > bestDistSq) {
            continue;
          }

          if (!hasLineOfSightToPoint(tower, enemyMesh.position)) {
            continue;
          }

          bestDistSq = distSq;
          bestTarget = {
            mesh: enemyMesh,
            position: enemyMesh.position,
          };
        }
        if (bestTarget) {
          return bestTarget;
        }
      }
    }

    if (typeof enemySystem.getTargetInRange === "function") {
      const fallbackTarget = enemySystem.getTargetInRange(tower.mesh.position, towerRange);
      if (fallbackTarget && fallbackTarget.position) {
        if (hasLineOfSightToPoint(tower, fallbackTarget.position)) {
          return fallbackTarget;
        }
      }
    }

    return null;
  }

  function updateBeamTransform(beamMesh, origin, targetPosition) {
    const dir = targetPosition.clone().sub(origin);
    const length = dir.length();
    if (length < TOWER_CONFIG.beamLengthEpsilon) {
      return false;
    }
    dir.divideScalar(length);
    beamMesh.position.copy(origin).addScaledVector(dir, length * 0.5);
    beamMesh.quaternion.setFromUnitVectors(upVector, dir);
    beamMesh.scale.set(1, length, 1);
    return true;
  }

  function createLaserBeamVisual() {
    const beam = new THREE.Mesh(beamGeometry, beamMaterial.clone());
    beam.material.toneMapped = false;
    scene.add(beam);

    const muzzleFlash = new THREE.Mesh(muzzleFlashGeometry, muzzleFlashMaterial.clone());
    muzzleFlash.material.toneMapped = false;
    scene.add(muzzleFlash);

    return {
      beam,
      flash: muzzleFlash,
    };
  }

  function destroyLaserBeamVisual(beamVisual) {
    if (!beamVisual) {
      return;
    }
    scene.remove(beamVisual.beam);
    scene.remove(beamVisual.flash);
    beamVisual.beam.material.dispose();
    beamVisual.flash.material.dispose();
  }

  function updateTowerCombat(deltaSeconds, enemySystem) {
    for (const tower of towers) {
      tower.cooldown = Math.max(0, tower.cooldown - deltaSeconds);
      tower.pulseTimer = Math.max(0, (tower.pulseTimer || 0) - deltaSeconds);

      const ringMaterial = tower.mesh.userData.ringMaterial;
      const flashLight = tower.mesh.userData.flashLight;

      const target = findTargetWithLineOfSight(tower, enemySystem);
      if (!target || !target.mesh || !target.mesh.visible) {
        if (tower.beamVisual) {
          destroyLaserBeamVisual(tower.beamVisual);
          tower.beamVisual = null;
        }
        tower.pulseTimer = 0;
        if (ringMaterial) {
          ringMaterial.emissiveIntensity = LASER_IDLE_GLOW_INTENSITY;
        }
        if (flashLight) {
          flashLight.intensity = 0;
        }
        continue;
      }

      const targetPoint = target.position.clone();
      const origin = resolveCornerShotOrigin(tower, targetPoint);

      if (!tower.beamVisual) {
        tower.beamVisual = createLaserBeamVisual();
      }
      const pulseT = tower.pulseTimer > 0 ? (tower.pulseTimer / LASER_PULSE_DURATION) : 0;
      const pulseBoost = pulseT > 0 ? Math.pow(pulseT, TOWER_CONFIG.pulseExponent) : 0;

      if (tower.beamVisual) {
        updateBeamTransform(tower.beamVisual.beam, origin, targetPoint);
        tower.beamVisual.flash.position.copy(origin);
        tower.beamVisual.beam.scale.x = 1 + (pulseBoost * LASER_BEAM_PULSE_WIDTH_BOOST);
        tower.beamVisual.beam.scale.z = 1 + (pulseBoost * LASER_BEAM_PULSE_WIDTH_BOOST);
        tower.beamVisual.beam.material.opacity = Math.min(
          TOWER_CONFIG.beamMaxOpacity,
          LASER_BEAM_BASE_OPACITY + (pulseBoost * LASER_BEAM_PULSE_OPACITY_BOOST)
        );
        tower.beamVisual.flash.material.opacity = Math.min(
          TOWER_CONFIG.flashMaxOpacity,
          LASER_FLASH_BASE_OPACITY + (pulseBoost * LASER_FLASH_PULSE_OPACITY_BOOST)
        );
        tower.beamVisual.flash.scale.setScalar(
          LASER_FLASH_BASE_SCALE + (pulseBoost * LASER_FLASH_PULSE_SCALE_BOOST)
        );
      }

      if (ringMaterial) {
        ringMaterial.emissiveIntensity = LASER_ACTIVE_GLOW_INTENSITY + (pulseBoost * TOWER_CONFIG.ringPulseBoost);
      }
      if (flashLight) {
        flashLight.intensity = TOWER_CONFIG.flashLightBaseIntensity + (pulseBoost * TOWER_CONFIG.flashLightPulseBoost);
      }

      if (tower.cooldown <= 0) {
        enemySystem.applyDamageAtPoint(
          target.position,
          TOWER_BEAM_HIT_RADIUS,
          TOWER_BEAM_DAMAGE * towerDamageMultiplier
        );
        tower.cooldown = TOWER_FIRE_INTERVAL * towerFireRateMultiplier;
        tower.pulseTimer = LASER_PULSE_DURATION;
      }
    }
  }

  function update(deltaSeconds, enemySystem) {
    updatePreviewFromCamera();
    updateTowerCombat(deltaSeconds, enemySystem);
  }

  function isBuildMode() {
    return buildMode;
  }

  function getStatusText() {
    if (buildMode) {
      if (previewValid) {
        return "Build mode: place laser cube turret";
      }
      return "Build mode: invalid location";
    }
    return `Towers built: ${towers.length}`;
  }

  function getAvailableTowers(type = null) {
    if (typeof type === "string") {
      return getTowerRemaining(type);
    }

    return Object.values(towerStock).reduce(
      (total, count) => total + Math.max(0, count || 0),
      0
    );
  }

  function getTowerInventory() {
    return Object.keys(towerStock).map((type) => ({
      type,
      label: TOWER_DISPLAY_NAMES[type] || type,
      remaining: getTowerRemaining(type),
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
    grantTowerStock,
    upgradeMaxTowers,
    upgradeTowerDamage,
    upgradeTowerFireRate,
    forcePlaceTower: (x, z, towerType = "laser") => {
      if (towerType !== "laser" || getTowerRemaining(towerType) <= 0) {
        return false;
      }

      const towerPosition = new THREE.Vector3(x, getBuildSurfaceY(x, z), z);
      if (!isPlacementValid(towerPosition)) {
        return false;
      }

      const towerMesh = createLaserTowerMesh({
        bodyColor: TOWER_CONFIG.placedBodyColor,
        ringColor: TOWER_CONFIG.placedRingColor,
        ringGlowColor: TOWER_CONFIG.placedRingGlow,
      });

      towerMesh.position.copy(towerPosition);
      scene.add(towerMesh);
      towers.push({
        mesh: towerMesh,
        cooldown: 0,
        pulseTimer: 0,
        towerType,
        range: TOWER_RANGE,
        radius: LASER_TOWER_RADIUS,
        halfSize: LASER_TOWER_HALF_SIZE,
        height: LASER_TOWER_HEIGHT,
        baseY: towerPosition.y,
        beamVisual: null,
        cornerIndex: null,
      });
      towerStock[towerType] = Math.max(0, getTowerRemaining(towerType) - 1);
      return true;
    }
  };
}
