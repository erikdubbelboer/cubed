import * as THREE from "three";

const TOWER_RANGE = 9;
const TOWER_FIRE_INTERVAL = 0.75;
const TOWER_BEAM_DAMAGE = 20;
const TOWER_BEAM_HIT_RADIUS = 0.55;
const LASER_TOWER_RADIUS = 1.35;
const LASER_TOWER_HALF_SIZE = 1.1;
const LASER_TOWER_HEIGHT = 2.2;
const TOWER_PLACEMENT_GAP = 0.25;
const LASER_RING_HALF_EXTENT = 1.16;
const LASER_RING_THICKNESS = 0.08;
const LASER_ACTIVE_GLOW_INTENSITY = 2.2;
const LASER_IDLE_GLOW_INTENSITY = 0.35;
const LASER_PULSE_DURATION = 0.2;
const LASER_BEAM_BASE_OPACITY = 0.72;
const LASER_BEAM_PULSE_OPACITY_BOOST = 0.26;
const LASER_BEAM_PULSE_WIDTH_BOOST = 0.34;
const LASER_FLASH_BASE_OPACITY = 0.45;
const LASER_FLASH_PULSE_OPACITY_BOOST = 0.45;
const LASER_FLASH_BASE_SCALE = 0.82;
const LASER_FLASH_PULSE_SCALE_BOOST = 0.52;
const PATH_RANGE_HIGHLIGHT_VALID_COLOR = 0x7ffaff;
const PATH_RANGE_HIGHLIGHT_INVALID_COLOR = 0xffa4a4;
const LASER_CORNER_OFFSETS = [
  [1, 1],
  [1, -1],
  [-1, -1],
  [-1, 1],
];

export function createTowerSystem({ scene, camera, grid }) {
  const raycaster = new THREE.Raycaster();
  const aimPoint = new THREE.Vector2(0, 0);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -grid.tileTopY);
  const groundHit = new THREE.Vector3();
  const pathWaypoints = Array.isArray(grid.pathWaypoints) ? grid.pathWaypoints : [];
  const terrainObstacles = Array.isArray(grid.heightObstacles) ? grid.heightObstacles : [];
  const pathHalfWidth = grid.cellSize * 0.47;

  const beamGeometry = new THREE.CylinderGeometry(0.055, 0.055, 1, 10, 1, true);
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0x7cfff5,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  beamMaterial.toneMapped = false;

  const muzzleFlashGeometry = new THREE.SphereGeometry(0.1, 10, 10);
  const muzzleFlashMaterial = new THREE.MeshBasicMaterial({
    color: 0xb8fffa,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  muzzleFlashMaterial.toneMapped = false;

  const tempVecA = new THREE.Vector3();
  const tempVecB = new THREE.Vector3();
  const tempVecC = new THREE.Vector3();
  const upVector = new THREE.Vector3(0, 1, 0);

  let selectedTowerType = null;
  let buildMode = false;
  let maxTowers = 1;
  const towers = [];
  let previewValid = false;
  let previewPosition = null;

  let towerDamageMultiplier = 1;
  let towerFireRateMultiplier = 1;

  function upgradeMaxTowers() { maxTowers += 1; }
  function upgradeTowerDamage() { towerDamageMultiplier += 0.5; }
  function upgradeTowerFireRate() { towerFireRateMultiplier *= 0.75; }

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
      roughness: 0.58,
      metalness: 0.35,
      opacity,
      transparent,
      emissive: 0x02080d,
      emissiveIntensity: 0.2,
    });

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x91d7ff,
      transparent,
      opacity: transparent ? opacity : 0.5,
    });

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: ringColor,
      emissive: ringGlowColor,
      emissiveIntensity: 0.4,
      roughness: 0.22,
      metalness: 0.65,
      opacity,
      transparent,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), bodyMaterial);
    body.position.y = 1.1;
    root.add(body);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(2.22, 2.22, 2.22)),
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

    const glowLight = new THREE.PointLight(0x7cfff5, 0, 4.4);
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
      opacity: 0.34,
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
      marker.renderOrder = 6;
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
      bodyMaterial.color.setHex(0x4d6f8f);
      edgeMaterial.color.setHex(0x93ffff);
      ringMaterial.color.setHex(0x73ebe2);
      ringMaterial.emissive.setHex(0x2ab8bd);
    } else {
      bodyMaterial.color.setHex(0xa45a5a);
      edgeMaterial.color.setHex(0xffb0b0);
      ringMaterial.color.setHex(0xe08d8d);
      ringMaterial.emissive.setHex(0x9f3535);
    }
  }

  let preview = createLaserTowerMesh({
    bodyColor: 0x4d6f8f,
    ringColor: 0x73ebe2,
    ringGlowColor: 0x2ab8bd,
    opacity: 0.55,
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

    if (lengthSq < 1e-6) {
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

  function selectTower() {
    if (towers.length >= maxTowers) {
      return false;
    }

    selectedTowerType = "laser";
    buildMode = true;

    scene.remove(preview);
    preview = createLaserTowerMesh({
      bodyColor: 0x4d6f8f,
      ringColor: 0x73ebe2,
      ringGlowColor: 0x2ab8bd,
      opacity: 0.55,
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
    if (!buildMode || towers.length >= maxTowers) {
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

    if (!buildMode || !previewValid || towers.length >= maxTowers || !selectedTowerType || !previewPosition) {
      return false;
    }

    const towerMesh = createLaserTowerMesh({
      bodyColor: 0x445d79,
      ringColor: 0x87f9f0,
      ringGlowColor: 0x31bfc0,
      opacity: 1,
      transparent: false,
    });
    towerMesh.position.copy(previewPosition);
    scene.add(towerMesh);

    towers.push({
      mesh: towerMesh,
      cooldown: 0,
      pulseTimer: 0,
      range: TOWER_RANGE,
      radius: LASER_TOWER_RADIUS,
      halfSize: LASER_TOWER_HALF_SIZE,
      height: LASER_TOWER_HEIGHT,
      baseY: previewPosition.y,
      beamVisual: null,
      cornerIndex: null,
    });

    if (towers.length >= maxTowers) {
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
    if (Math.abs(dx) < 1e-6) {
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
    if (Math.abs(dy) < 1e-6) {
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
    if (Math.abs(dz) < 1e-6) {
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

    const innerHalfSize = Math.max(0.25, (tower.halfSize ?? LASER_TOWER_HALF_SIZE) - 0.04);
    const baseY = (tower.baseY ?? grid.tileTopY) + 0.04;
    const topY = baseY + Math.max(0.4, (tower.height ?? LASER_TOWER_HEIGHT) - 0.08);
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

      const shrink = Math.min(0.08, obstacleHalfSize * 0.08);
      const halfSize = Math.max(0.2, obstacleHalfSize - shrink);
      const minX = obstaclePos.x - halfSize;
      const maxX = obstaclePos.x + halfSize;
      const minZ = obstaclePos.z - halfSize;
      const maxZ = obstaclePos.z + halfSize;
      const minY = obstacleBaseY + 0.02;
      const maxY = obstacleBaseY + obstacleHeight - 0.02;
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
    if (length < 1e-5) {
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
      const pulseBoost = pulseT > 0 ? Math.pow(pulseT, 0.35) : 0;

      if (tower.beamVisual) {
        updateBeamTransform(tower.beamVisual.beam, origin, targetPoint);
        tower.beamVisual.flash.position.copy(origin);
        tower.beamVisual.beam.scale.x = 1 + (pulseBoost * LASER_BEAM_PULSE_WIDTH_BOOST);
        tower.beamVisual.beam.scale.z = 1 + (pulseBoost * LASER_BEAM_PULSE_WIDTH_BOOST);
        tower.beamVisual.beam.material.opacity = Math.min(
          0.98,
          LASER_BEAM_BASE_OPACITY + (pulseBoost * LASER_BEAM_PULSE_OPACITY_BOOST)
        );
        tower.beamVisual.flash.material.opacity = Math.min(
          0.95,
          LASER_FLASH_BASE_OPACITY + (pulseBoost * LASER_FLASH_PULSE_OPACITY_BOOST)
        );
        tower.beamVisual.flash.scale.setScalar(
          LASER_FLASH_BASE_SCALE + (pulseBoost * LASER_FLASH_PULSE_SCALE_BOOST)
        );
      }

      if (ringMaterial) {
        ringMaterial.emissiveIntensity = LASER_ACTIVE_GLOW_INTENSITY + (pulseBoost * 1.2);
      }
      if (flashLight) {
        flashLight.intensity = 2.6 + (pulseBoost * 2.2);
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
    return `Towers built: ${towers.length} / ${maxTowers}`;
  }

  function getAvailableTowers() {
    return Math.max(0, maxTowers - towers.length);
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
    getMovementObstacles,
    upgradeMaxTowers,
    upgradeTowerDamage,
    upgradeTowerFireRate,
    forcePlaceTower: (x, z) => {
      if (towers.length >= maxTowers) {
        return false;
      }

      const towerPosition = new THREE.Vector3(x, getBuildSurfaceY(x, z), z);
      if (!isPlacementValid(towerPosition)) {
        return false;
      }

      const towerMesh = createLaserTowerMesh({
        bodyColor: 0x445d79,
        ringColor: 0x87f9f0,
        ringGlowColor: 0x31bfc0,
      });

      towerMesh.position.copy(towerPosition);
      scene.add(towerMesh);
      towers.push({
        mesh: towerMesh,
        cooldown: 0,
        pulseTimer: 0,
        range: TOWER_RANGE,
        radius: LASER_TOWER_RADIUS,
        halfSize: LASER_TOWER_HALF_SIZE,
        height: LASER_TOWER_HEIGHT,
        baseY: towerPosition.y,
        beamVisual: null,
        cornerIndex: null,
      });
      return true;
    }
  };
}
