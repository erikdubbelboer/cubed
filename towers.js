import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";

const TOWER_CONFIG = GAME_CONFIG.towers;
const TOWER_TYPES = TOWER_CONFIG.types;
const LASER_TOWER_CONFIG = TOWER_TYPES.laser;
const EMP_TOWER_CONFIG = TOWER_TYPES.emp;

const TOWER_RANGE = LASER_TOWER_CONFIG.range;
const TOWER_FIRE_INTERVAL = LASER_TOWER_CONFIG.fireInterval;
const TOWER_BEAM_DAMAGE = LASER_TOWER_CONFIG.beamDamage;
const TOWER_BEAM_HIT_RADIUS = LASER_TOWER_CONFIG.beamHitRadius;
const LASER_TOWER_RADIUS = LASER_TOWER_CONFIG.radius;
const LASER_TOWER_HALF_SIZE = LASER_TOWER_CONFIG.halfSize;
const LASER_TOWER_HEIGHT = LASER_TOWER_CONFIG.height;
const EMP_RANGE = EMP_TOWER_CONFIG.range;
const EMP_PULSE_INTERVAL = EMP_TOWER_CONFIG.pulseInterval;
const EMP_PULSE_DAMAGE = EMP_TOWER_CONFIG.pulseDamage;
const EMP_PULSE_DURATION = EMP_TOWER_CONFIG.pulseDuration;
const EMP_SHELL_THICKNESS = EMP_TOWER_CONFIG.shellThickness;
const EMP_TOWER_RADIUS = EMP_TOWER_CONFIG.radius;
const EMP_TOWER_HALF_SIZE = EMP_TOWER_CONFIG.halfSize;
const EMP_TOWER_HEIGHT = EMP_TOWER_CONFIG.height;
const EMP_HOVER_BASE_Y = EMP_TOWER_CONFIG.hoverBaseY;
const EMP_BOB_AMPLITUDE = EMP_TOWER_CONFIG.bobAmplitude;
const EMP_BOB_FREQUENCY = EMP_TOWER_CONFIG.bobFrequency;
const TOWER_PLACEMENT_GAP = TOWER_CONFIG.placementGap;
const LASER_RING_HALF_EXTENT = LASER_TOWER_CONFIG.ringHalfExtent;
const LASER_RING_THICKNESS = LASER_TOWER_CONFIG.ringThickness;
const LASER_ACTIVE_GLOW_INTENSITY = LASER_TOWER_CONFIG.activeGlowIntensity;
const LASER_IDLE_GLOW_INTENSITY = LASER_TOWER_CONFIG.idleGlowIntensity;
const LASER_PULSE_DURATION = LASER_TOWER_CONFIG.pulseDuration;
const LASER_BEAM_BASE_OPACITY = LASER_TOWER_CONFIG.beamBaseOpacity;
const LASER_BEAM_PULSE_OPACITY_BOOST = LASER_TOWER_CONFIG.beamPulseOpacityBoost;
const LASER_BEAM_PULSE_WIDTH_BOOST = LASER_TOWER_CONFIG.beamPulseWidthBoost;
const LASER_FLASH_BASE_OPACITY = LASER_TOWER_CONFIG.flashBaseOpacity;
const LASER_FLASH_PULSE_OPACITY_BOOST = LASER_TOWER_CONFIG.flashPulseOpacityBoost;
const LASER_FLASH_BASE_SCALE = LASER_TOWER_CONFIG.flashBaseScale;
const LASER_FLASH_PULSE_SCALE_BOOST = LASER_TOWER_CONFIG.flashPulseScaleBoost;
const LASER_IMPACT_DURATION = LASER_TOWER_CONFIG.impactDuration;
const LASER_IMPACT_PARTICLE_COUNT = LASER_TOWER_CONFIG.impactParticleCount;
const LASER_IMPACT_SURFACE_INSET_SCALE = LASER_TOWER_CONFIG.impactSurfaceInsetScale;
const PATH_RANGE_HIGHLIGHT_VALID_COLOR = LASER_TOWER_CONFIG.rangeHighlightValidColor;
const PATH_RANGE_HIGHLIGHT_INVALID_COLOR = LASER_TOWER_CONFIG.rangeHighlightInvalidColor;
const LASER_CORNER_OFFSETS = LASER_TOWER_CONFIG.cornerOffsets;
const TOWER_TYPE_ORDER = ["laser", "emp"];
const TOWER_DISPLAY_NAMES = {
  laser: "Laser Tower",
  emp: "EMP Tower",
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
    LASER_TOWER_CONFIG.beamRadius,
    LASER_TOWER_CONFIG.beamRadius,
    1,
    LASER_TOWER_CONFIG.beamRadialSegments,
    1,
    true
  );
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: LASER_TOWER_CONFIG.beamColor,
    transparent: true,
    opacity: LASER_TOWER_CONFIG.beamOpacity,
    depthWrite: false,
  });
  beamMaterial.toneMapped = false;

  const muzzleFlashGeometry = new THREE.SphereGeometry(
    LASER_TOWER_CONFIG.muzzleRadius,
    LASER_TOWER_CONFIG.muzzleSegments,
    LASER_TOWER_CONFIG.muzzleSegments
  );
  const muzzleFlashMaterial = new THREE.MeshBasicMaterial({
    color: LASER_TOWER_CONFIG.muzzleColor,
    transparent: true,
    opacity: LASER_TOWER_CONFIG.muzzleOpacity,
    depthWrite: false,
  });
  muzzleFlashMaterial.toneMapped = false;

  const impactFlashGeometry = new THREE.SphereGeometry(
    LASER_TOWER_CONFIG.impactFlashRadius,
    LASER_TOWER_CONFIG.impactFlashSegments,
    LASER_TOWER_CONFIG.impactFlashSegments
  );
  const impactFlashMaterial = new THREE.MeshBasicMaterial({
    color: LASER_TOWER_CONFIG.impactFlashColor,
    transparent: true,
    opacity: LASER_TOWER_CONFIG.impactFlashOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  impactFlashMaterial.toneMapped = false;

  const impactRingGeometry = new THREE.RingGeometry(
    LASER_TOWER_CONFIG.impactRingInnerRadius,
    LASER_TOWER_CONFIG.impactRingOuterRadius,
    LASER_TOWER_CONFIG.impactRingSegments
  );
  const impactRingMaterial = new THREE.MeshBasicMaterial({
    color: LASER_TOWER_CONFIG.impactRingColor,
    transparent: true,
    opacity: LASER_TOWER_CONFIG.impactRingOpacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  impactRingMaterial.toneMapped = false;

  const impactParticleGeometry = new THREE.BoxGeometry(
    LASER_TOWER_CONFIG.impactParticleSize,
    LASER_TOWER_CONFIG.impactParticleSize,
    LASER_TOWER_CONFIG.impactParticleSize
  );
  const impactParticleMaterial = new THREE.MeshBasicMaterial({
    color: LASER_TOWER_CONFIG.impactRingColor,
    transparent: true,
    opacity: LASER_TOWER_CONFIG.impactParticleOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  impactParticleMaterial.toneMapped = false;

  const empPulseGeometry = new THREE.SphereGeometry(
    1,
    EMP_TOWER_CONFIG.pulseSegments,
    EMP_TOWER_CONFIG.pulseSegments
  );
  const empPulseMaterial = new THREE.MeshBasicMaterial({
    color: EMP_TOWER_CONFIG.pulseColor,
    transparent: true,
    opacity: EMP_TOWER_CONFIG.pulseOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    wireframe: true,
  });
  empPulseMaterial.toneMapped = false;

  const tempVecA = new THREE.Vector3();
  const tempVecB = new THREE.Vector3();
  const tempVecC = new THREE.Vector3();
  const tempVecD = new THREE.Vector3();
  const tempVecE = new THREE.Vector3();
  const tempColorA = new THREE.Color();
  const tempColorB = new THREE.Color();
  const upVector = new THREE.Vector3(0, 1, 0);
  const ringNormal = new THREE.Vector3(0, 0, 1);
  const impactEffects = [];
  const empPulseEffects = [];

  const towerSpecs = {
    laser: {
      type: "laser",
      range: TOWER_RANGE,
      radius: LASER_TOWER_RADIUS,
      halfSize: LASER_TOWER_HALF_SIZE,
      height: LASER_TOWER_HEIGHT,
      usesLineOfSight: true,
    },
    emp: {
      type: "emp",
      range: EMP_RANGE,
      radius: EMP_TOWER_RADIUS,
      halfSize: EMP_TOWER_HALF_SIZE,
      height: EMP_TOWER_HEIGHT,
      usesLineOfSight: false,
    },
  };

  let selectedTowerType = null;
  let buildMode = false;
  const towerStock = {
    laser: LASER_TOWER_CONFIG.baseStock,
    emp: EMP_TOWER_CONFIG.baseStock ?? 0,
  };
  const unlockedTowerTypes = new Set(["laser"]);
  if (towerStock.emp > 0) {
    unlockedTowerTypes.add("emp");
  }
  const towers = [];
  let previewValid = false;
  let previewPosition = null;

  let towerDamageMultiplier = 1;
  let towerFireRateMultiplier = 1;

  function getTowerSpec(type) {
    if (!type) {
      return null;
    }
    return towerSpecs[type] || null;
  }

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
    if (!getTowerSpec(type)) {
      return 0;
    }

    const increment = Math.max(0, Math.floor(amount));
    if (increment <= 0) {
      return getTowerRemaining(type);
    }

    towerStock[type] = getTowerRemaining(type) + increment;
    unlockedTowerTypes.add(type);
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
      roughness: LASER_TOWER_CONFIG.bodyRoughness,
      metalness: LASER_TOWER_CONFIG.bodyMetalness,
      opacity,
      transparent,
      emissive: LASER_TOWER_CONFIG.bodyEmissive,
      emissiveIntensity: LASER_TOWER_CONFIG.bodyEmissiveIntensity,
    });

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: LASER_TOWER_CONFIG.edgeColor,
      transparent,
      opacity: transparent ? opacity : LASER_TOWER_CONFIG.edgeOpaqueOpacity,
    });

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: ringColor,
      emissive: ringGlowColor,
      emissiveIntensity: LASER_TOWER_CONFIG.ringEmissiveIntensity,
      roughness: LASER_TOWER_CONFIG.ringRoughness,
      metalness: LASER_TOWER_CONFIG.ringMetalness,
      opacity,
      transparent,
    });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(
        LASER_TOWER_CONFIG.bodySize,
        LASER_TOWER_CONFIG.bodySize,
        LASER_TOWER_CONFIG.bodySize
      ),
      bodyMaterial
    );
    body.position.y = LASER_TOWER_CONFIG.bodyCenterY;
    root.add(body);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(
          LASER_TOWER_CONFIG.edgeSize,
          LASER_TOWER_CONFIG.edgeSize,
          LASER_TOWER_CONFIG.edgeSize
        )
      ),
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

    const glowLight = new THREE.PointLight(
      LASER_TOWER_CONFIG.ringLightColor,
      0,
      LASER_TOWER_CONFIG.ringLightDistance
    );
    glowLight.position.copy(ringAnchor.position);
    root.add(glowLight);

    root.userData.materials = [bodyMaterial, edgeMaterial, ringMaterial];
    root.userData.ringMaterial = ringMaterial;
    root.userData.ringNode = ringAnchor;
    root.userData.flashLight = glowLight;

    applyShadowSettings(root);
    return root;
  }

  function createEmpTowerMesh({
    coreColor,
    emissiveColor,
    auraColor = emissiveColor,
    opacity = 1,
    transparent = false,
  }) {
    const root = new THREE.Group();
    const hoverNode = new THREE.Object3D();
    hoverNode.position.y = EMP_HOVER_BASE_Y;
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
      new THREE.SphereGeometry(EMP_TOWER_CONFIG.coreRadius, 20, 16),
      coreMaterial
    );
    hoverNode.add(coreMesh);

    const auraMaterial = new THREE.MeshBasicMaterial({
      color: auraColor,
      transparent: true,
      opacity: Math.max(0, Math.min(1, EMP_TOWER_CONFIG.auraOpacity * opacity)),
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    auraMaterial.toneMapped = false;
    const auraMesh = new THREE.Mesh(
      new THREE.SphereGeometry(EMP_TOWER_CONFIG.auraRadius, 20, 16),
      auraMaterial
    );
    hoverNode.add(auraMesh);

    const glowLight = new THREE.PointLight(emissiveColor, 0.35, EMP_TOWER_CONFIG.lightDistance);
    hoverNode.add(glowLight);

    root.userData.materials = [coreMaterial, auraMaterial];
    root.userData.empCoreMaterial = coreMaterial;
    root.userData.empAuraMaterial = auraMaterial;
    root.userData.empLight = glowLight;
    root.userData.hoverNode = hoverNode;

    applyShadowSettings(root);
    auraMesh.castShadow = false;
    auraMesh.receiveShadow = false;
    return root;
  }

  function createTowerPreviewMesh(type) {
    if (type === "emp") {
      return createEmpTowerMesh({
        coreColor: EMP_TOWER_CONFIG.previewColor,
        emissiveColor: EMP_TOWER_CONFIG.previewGlow,
        auraColor: EMP_TOWER_CONFIG.previewGlow,
        opacity: EMP_TOWER_CONFIG.previewOpacity,
        transparent: true,
      });
    }

    return createLaserTowerMesh({
      bodyColor: LASER_TOWER_CONFIG.previewBodyColor,
      ringColor: LASER_TOWER_CONFIG.previewRingColor,
      ringGlowColor: LASER_TOWER_CONFIG.previewRingGlow,
      opacity: LASER_TOWER_CONFIG.previewOpacity,
      transparent: true,
    });
  }

  function createTowerPlacedMesh(type) {
    if (type === "emp") {
      return createEmpTowerMesh({
        coreColor: EMP_TOWER_CONFIG.placedColor,
        emissiveColor: EMP_TOWER_CONFIG.placedGlow,
        auraColor: EMP_TOWER_CONFIG.placedGlow,
        opacity: 1,
        transparent: false,
      });
    }

    return createLaserTowerMesh({
      bodyColor: LASER_TOWER_CONFIG.placedBodyColor,
      ringColor: LASER_TOWER_CONFIG.placedRingColor,
      ringGlowColor: LASER_TOWER_CONFIG.placedRingGlow,
      opacity: 1,
      transparent: false,
    });
  }

  function createPathRangeHighlights() {
    const pathTiles = Array.isArray(grid.tiles)
      ? grid.tiles.filter((tile) => tile?.userData?.isPath)
      : [];

    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: PATH_RANGE_HIGHLIGHT_VALID_COLOR,
      transparent: true,
      opacity: LASER_TOWER_CONFIG.rangeHighlightOpacity,
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
      marker.renderOrder = LASER_TOWER_CONFIG.rangeHighlightRenderOrder;
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
      height: towerSpec.height,
      baseY: origin.y,
      cornerIndex: null,
    };

    for (const entry of pathRangeHighlights.entries) {
      previewTowerProbe.cornerIndex = null;
      entry.mesh.visible = canTowerHitPoint(previewTowerProbe, entry.center);
    }
  }

  function setPreviewValidityVisual(isValid) {
    if (selectedTowerType === "emp") {
      const coreMaterial = preview.userData.empCoreMaterial;
      const auraMaterial = preview.userData.empAuraMaterial;
      const glowLight = preview.userData.empLight;
      if (!coreMaterial || !auraMaterial) {
        return;
      }

      if (isValid) {
        coreMaterial.color.setHex(EMP_TOWER_CONFIG.previewColor);
        coreMaterial.emissive.setHex(EMP_TOWER_CONFIG.previewGlow);
        auraMaterial.color.setHex(EMP_TOWER_CONFIG.previewGlow);
        if (glowLight) {
          glowLight.color.setHex(EMP_TOWER_CONFIG.previewGlow);
        }
      } else {
        coreMaterial.color.setHex(EMP_TOWER_CONFIG.previewInvalidColor);
        coreMaterial.emissive.setHex(EMP_TOWER_CONFIG.previewInvalidGlow);
        auraMaterial.color.setHex(EMP_TOWER_CONFIG.previewInvalidGlow);
        if (glowLight) {
          glowLight.color.setHex(EMP_TOWER_CONFIG.previewInvalidGlow);
        }
      }
      return;
    }

    const materials = preview.userData.materials || [];
    const bodyMaterial = materials[0];
    const edgeMaterial = materials[1];
    const ringMaterial = materials[2];
    if (!bodyMaterial || !edgeMaterial || !ringMaterial) {
      return;
    }

    if (isValid) {
      bodyMaterial.color.setHex(LASER_TOWER_CONFIG.previewBodyColor);
      edgeMaterial.color.setHex(LASER_TOWER_CONFIG.previewEdgeColor);
      ringMaterial.color.setHex(LASER_TOWER_CONFIG.previewRingColor);
      ringMaterial.emissive.setHex(LASER_TOWER_CONFIG.previewRingGlow);
    } else {
      bodyMaterial.color.setHex(LASER_TOWER_CONFIG.previewInvalidBodyColor);
      edgeMaterial.color.setHex(LASER_TOWER_CONFIG.previewInvalidEdgeColor);
      ringMaterial.color.setHex(LASER_TOWER_CONFIG.previewInvalidRingColor);
      ringMaterial.emissive.setHex(LASER_TOWER_CONFIG.previewInvalidRingGlow);
    }
  }

  let preview = createTowerPreviewMesh("laser");
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

  function overlapsTrack(position, towerRadius) {
    if (pathWaypoints.length < 2) {
      return false;
    }
    const minDistanceFromPath = pathHalfWidth + towerRadius;
    for (let i = 0; i < pathWaypoints.length - 1; i += 1) {
      const start = pathWaypoints[i];
      const end = pathWaypoints[i + 1];
      if (distancePointToSegmentXZ(position, start, end) < minDistanceFromPath) {
        return true;
      }
    }
    return false;
  }

  function overlapsOtherTower(position, towerRadius) {
    for (const tower of towers) {
      const minDistance = towerRadius + (tower.radius ?? LASER_TOWER_RADIUS) + TOWER_PLACEMENT_GAP;
      const dx = position.x - tower.mesh.position.x;
      const dz = position.z - tower.mesh.position.z;
      if ((dx * dx + dz * dz) < (minDistance * minDistance)) {
        return true;
      }
    }
    return false;
  }

  function isInsideBuildBounds(position, towerRadius) {
    return (
      position.x >= grid.moveBounds.minX + towerRadius &&
      position.x <= grid.moveBounds.maxX - towerRadius &&
      position.z >= grid.moveBounds.minZ + towerRadius &&
      position.z <= grid.moveBounds.maxZ - towerRadius
    );
  }

  function isPlacementValid(position, towerRadius) {
    if (!isInsideBuildBounds(position, towerRadius)) {
      return false;
    }
    if (overlapsTrack(position, towerRadius)) {
      return false;
    }
    if (overlapsOtherTower(position, towerRadius)) {
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
    const towerSpec = getTowerSpec(type);
    if (!towerSpec) {
      return false;
    }

    if (getTowerRemaining(type) <= 0) {
      return false;
    }

    selectedTowerType = type;
    buildMode = true;

    scene.remove(preview);
    preview = createTowerPreviewMesh(type);
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
    const towerSpec = getTowerSpec(selectedTowerType);
    if (
      !buildMode
      || !towerSpec
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
      grid.moveBounds.maxX - towerSpec.radius,
      Math.max(grid.moveBounds.minX + towerSpec.radius, groundHit.x)
    );
    const z = Math.min(
      grid.moveBounds.maxZ - towerSpec.radius,
      Math.max(grid.moveBounds.minZ + towerSpec.radius, groundHit.z)
    );
    const y = getBuildSurfaceY(x, z);

    preview.visible = true;
    preview.position.set(x, y, z);
    if (!previewPosition) {
      previewPosition = new THREE.Vector3();
    }
    previewPosition.copy(preview.position);
    previewValid = isPlacementValid(previewPosition, towerSpec.radius);
    setPreviewValidityVisual(previewValid);
    setPathRangeHighlightValidityVisual(previewValid);
    updatePathRangeHighlights(previewPosition);
  }

  function createTowerEntry(towerType, towerMesh, basePosition) {
    const towerSpec = getTowerSpec(towerType);
    if (!towerSpec) {
      return null;
    }

    const entry = {
      mesh: towerMesh,
      cooldown: 0,
      pulseTimer: 0,
      chargeTimer: 0,
      towerType,
      range: towerSpec.range,
      radius: towerSpec.radius,
      halfSize: towerSpec.halfSize,
      height: towerSpec.height,
      baseY: basePosition.y,
      beamVisual: null,
      cornerIndex: null,
      bobClock: Math.random() * Math.PI * 2,
      bobPhase: Math.random() * Math.PI * 2,
      empIdleColor: new THREE.Color(EMP_TOWER_CONFIG.idleColor),
      empChargeColor: new THREE.Color(EMP_TOWER_CONFIG.chargeColor),
      empEmissiveIdle: new THREE.Color(EMP_TOWER_CONFIG.emissiveIdle),
      empEmissiveCharge: new THREE.Color(EMP_TOWER_CONFIG.emissiveCharge),
    };

    return entry;
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

    const towerMesh = createTowerPlacedMesh(selectedTowerType);
    towerMesh.position.copy(previewPosition);
    scene.add(towerMesh);

    const towerEntry = createTowerEntry(selectedTowerType, towerMesh, previewPosition);
    if (!towerEntry) {
      scene.remove(towerMesh);
      return false;
    }
    towers.push(towerEntry);
    unlockedTowerTypes.add(selectedTowerType);

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
    }

    if (typeof enemySystem.getTargetInRange === "function") {
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

  function hasDamageableEnemyInRange(tower, enemySystem) {
    const range = tower.range ?? EMP_RANGE;
    const rangeSq = range * range;
    for (const enemyMesh of getDamageableEnemyMeshes(enemySystem)) {
      if (!enemyMesh || !enemyMesh.visible) {
        continue;
      }
      if (tower.mesh.position.distanceToSquared(enemyMesh.position) <= rangeSq) {
        return true;
      }
    }
    return false;
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

  function randomDirection(out) {
    const z = (Math.random() * 2) - 1;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.max(0, 1 - (z * z)));
    out.set(radius * Math.cos(angle), z, radius * Math.sin(angle));
    return out;
  }

  function destroyImpactEffect(effect) {
    scene.remove(effect.flash);
    scene.remove(effect.ring);
    effect.flash.material.dispose();
    effect.ring.material.dispose();

    for (const particle of effect.particles) {
      scene.remove(particle.mesh);
      particle.mesh.material.dispose();
    }
  }

  function spawnImpactEffect(position, beamDirection) {
    const flash = new THREE.Mesh(impactFlashGeometry, impactFlashMaterial.clone());
    flash.material.toneMapped = false;
    flash.position.copy(position);
    scene.add(flash);

    const ring = new THREE.Mesh(impactRingGeometry, impactRingMaterial.clone());
    ring.material.toneMapped = false;
    ring.position.copy(position);
    ring.quaternion.setFromUnitVectors(ringNormal, beamDirection);
    scene.add(ring);

    const particles = [];
    const count = Math.max(1, LASER_IMPACT_PARTICLE_COUNT);
    for (let i = 0; i < count; i += 1) {
      const particle = new THREE.Mesh(impactParticleGeometry, impactParticleMaterial.clone());
      particle.material.toneMapped = false;

      randomDirection(tempVecA);
      particle.position.copy(position).addScaledVector(tempVecA, Math.random() * LASER_TOWER_CONFIG.impactPositionJitter);
      particle.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      scene.add(particle);

      randomDirection(tempVecB);
      tempVecC.copy(beamDirection).addScaledVector(tempVecB, LASER_TOWER_CONFIG.impactParticleSpread);
      if (tempVecC.lengthSq() < TOWER_CONFIG.segmentEpsilon) {
        tempVecC.copy(beamDirection);
      }
      const speed = THREE.MathUtils.lerp(
        LASER_TOWER_CONFIG.impactParticleSpeedMin,
        LASER_TOWER_CONFIG.impactParticleSpeedMax,
        Math.random()
      );
      tempVecC.normalize().multiplyScalar(speed);

      const particleLife = THREE.MathUtils.lerp(
        LASER_TOWER_CONFIG.impactParticleLifeMin,
        LASER_TOWER_CONFIG.impactParticleLifeMax,
        Math.random()
      );
      const baseScale = THREE.MathUtils.lerp(0.65, 1.18, Math.random());
      particle.scale.setScalar(baseScale);

      particles.push({
        mesh: particle,
        velocity: tempVecC.clone(),
        life: particleLife,
        maxLife: particleLife,
        baseScale,
        baseOpacity: LASER_TOWER_CONFIG.impactParticleOpacity,
        spin: new THREE.Vector3(
          THREE.MathUtils.lerp(-12, 12, Math.random()),
          THREE.MathUtils.lerp(-12, 12, Math.random()),
          THREE.MathUtils.lerp(-12, 12, Math.random())
        ),
      });
    }

    impactEffects.push({
      flash,
      ring,
      particles,
      life: LASER_IMPACT_DURATION,
      maxLife: LASER_IMPACT_DURATION,
    });
  }

  function updateImpactEffects(deltaSeconds) {
    for (let i = impactEffects.length - 1; i >= 0; i -= 1) {
      const effect = impactEffects[i];
      effect.life -= deltaSeconds;
      if (effect.life <= 0) {
        destroyImpactEffect(effect);
        impactEffects.splice(i, 1);
        continue;
      }

      const t = Math.max(0, effect.life / effect.maxLife);
      const invT = 1 - t;
      effect.flash.material.opacity = LASER_TOWER_CONFIG.impactFlashOpacity * t;
      effect.flash.scale.setScalar(1 + (invT * LASER_TOWER_CONFIG.impactFlashExpand));
      effect.ring.material.opacity = LASER_TOWER_CONFIG.impactRingOpacity * t;
      effect.ring.scale.setScalar(1 + (invT * LASER_TOWER_CONFIG.impactRingExpand));
      effect.ring.rotateZ(deltaSeconds * LASER_TOWER_CONFIG.impactRingSpin);

      for (let j = effect.particles.length - 1; j >= 0; j -= 1) {
        const particle = effect.particles[j];
        particle.life -= deltaSeconds;
        if (particle.life <= 0) {
          scene.remove(particle.mesh);
          particle.mesh.material.dispose();
          effect.particles.splice(j, 1);
          continue;
        }

        const pt = Math.max(0, particle.life / particle.maxLife);
        particle.mesh.position.addScaledVector(particle.velocity, deltaSeconds);
        particle.velocity.multiplyScalar(Math.max(0, 1 - (LASER_TOWER_CONFIG.impactParticleDrag * deltaSeconds)));
        particle.velocity.y -= LASER_TOWER_CONFIG.impactParticleGravity * deltaSeconds;
        particle.mesh.material.opacity = particle.baseOpacity * pt;
        particle.mesh.scale.setScalar(
          particle.baseScale * (0.45 + (0.55 * pt))
        );
        particle.mesh.rotation.x += particle.spin.x * deltaSeconds;
        particle.mesh.rotation.y += particle.spin.y * deltaSeconds;
        particle.mesh.rotation.z += particle.spin.z * deltaSeconds;
      }
    }
  }

  function destroyEmpPulseEffect(effect) {
    if (!effect?.mesh) {
      return;
    }
    scene.remove(effect.mesh);
    effect.mesh.material.dispose();
  }

  function getEmpPulseOrigin(tower, out) {
    const hoverNode = tower.mesh?.userData?.hoverNode;
    if (hoverNode && typeof hoverNode.getWorldPosition === "function") {
      hoverNode.getWorldPosition(out);
      return out;
    }

    out.copy(tower.mesh.position);
    out.y += EMP_HOVER_BASE_Y;
    return out;
  }

  function spawnEmpPulse(origin, maxRadius, damage) {
    const mesh = new THREE.Mesh(empPulseGeometry, empPulseMaterial.clone());
    mesh.material.toneMapped = false;
    mesh.position.copy(origin);
    mesh.scale.setScalar(0.01);
    scene.add(mesh);

    empPulseEffects.push({
      mesh,
      origin: origin.clone(),
      elapsed: 0,
      prevRadius: 0,
      currentRadius: 0,
      maxRadius,
      duration: Math.max(TOWER_CONFIG.segmentEpsilon, EMP_PULSE_DURATION),
      damage,
      hitSet: new Set(),
    });
  }

  function doesPulseWaveHitEnemy(pulse, enemyMesh) {
    const enemyRadius = typeof enemyMesh?.userData?.hitSphereRadius === "number"
      ? enemyMesh.userData.hitSphereRadius
      : 0;
    const dist = pulse.origin.distanceTo(enemyMesh.position);
    const halfShell = Math.max(0.01, EMP_SHELL_THICKNESS * 0.5);
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

  function updateEmpPulseEffects(deltaSeconds, enemySystem) {
    const damageableEnemies = getDamageableEnemyMeshes(enemySystem);

    for (let i = empPulseEffects.length - 1; i >= 0; i -= 1) {
      const pulse = empPulseEffects[i];
      pulse.elapsed += deltaSeconds;
      pulse.prevRadius = pulse.currentRadius;

      const t = Math.min(1, pulse.elapsed / pulse.duration);
      pulse.currentRadius = pulse.maxRadius * t;

      pulse.mesh.scale.setScalar(Math.max(0.01, pulse.currentRadius));
      pulse.mesh.material.opacity = Math.max(0, EMP_TOWER_CONFIG.pulseOpacity * (1 - t));

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
          hit = enemySystem.applyDamageAtPoint(enemyMesh.position, enemyRadius, pulse.damage);
        }

        if (hit) {
          pulse.hitSet.add(enemyMesh);
        }
      }

      if (t >= 1) {
        destroyEmpPulseEffect(pulse);
        empPulseEffects.splice(i, 1);
      }
    }
  }

  function updateEmpTowerBobbing(tower, deltaSeconds) {
    const hoverNode = tower.mesh?.userData?.hoverNode;
    if (!hoverNode) {
      return;
    }
    tower.bobClock = (tower.bobClock || 0) + deltaSeconds;
    hoverNode.position.y = EMP_HOVER_BASE_Y + (
      Math.sin((tower.bobClock * EMP_BOB_FREQUENCY) + (tower.bobPhase || 0))
      * EMP_BOB_AMPLITUDE
    );
  }

  function updateEmpTowerAppearance(tower, chargeRatio) {
    const coreMaterial = tower.mesh?.userData?.empCoreMaterial;
    const auraMaterial = tower.mesh?.userData?.empAuraMaterial;
    const empLight = tower.mesh?.userData?.empLight;
    if (!coreMaterial) {
      return;
    }

    tempColorA.copy(tower.empIdleColor).lerp(tower.empChargeColor, chargeRatio);
    tempColorB.copy(tower.empEmissiveIdle).lerp(tower.empEmissiveCharge, chargeRatio);
    coreMaterial.color.copy(tempColorA);
    coreMaterial.emissive.copy(tempColorB);

    if (auraMaterial) {
      auraMaterial.color.copy(tempColorB);
      auraMaterial.opacity = THREE.MathUtils.lerp(
        EMP_TOWER_CONFIG.auraOpacity * 0.35,
        EMP_TOWER_CONFIG.auraOpacity,
        chargeRatio
      );
    }
    if (empLight) {
      empLight.color.copy(tempColorB);
      empLight.intensity = THREE.MathUtils.lerp(0.2, 2.2, chargeRatio);
    }
  }

  function updateLaserTowerCombat(tower, deltaSeconds, enemySystem) {
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
      return;
    }

    const targetPoint = target.aimPoint
      ? target.aimPoint.clone()
      : target.position.clone();
    const origin = resolveCornerShotOrigin(tower, targetPoint);
    const impactPoint = targetPoint.clone();
    const targetHalfSize = target.mesh?.userData?.bodyHalfSize;
    const targetSphereRadius = target.mesh?.userData?.hitSphereRadius;
    tempVecD.copy(target.position).sub(origin);
    if (tempVecD.lengthSq() >= TOWER_CONFIG.segmentEpsilon) {
      const baseRadius = typeof targetSphereRadius === "number"
        ? targetSphereRadius
        : (typeof targetHalfSize === "number" ? targetHalfSize : 0);
      if (baseRadius > 0) {
        // Force the impact just outside the enemy hit sphere, never inside it.
        const outsideFactor = Math.max(1.02, LASER_IMPACT_SURFACE_INSET_SCALE);
        const outsideDistance = (baseRadius * outsideFactor) + 0.03;
        tempVecD.normalize();
        impactPoint.copy(target.position).addScaledVector(tempVecD, -outsideDistance);
      }
    }

    if (!tower.beamVisual) {
      tower.beamVisual = createLaserBeamVisual();
    }
    const pulseT = tower.pulseTimer > 0 ? (tower.pulseTimer / LASER_PULSE_DURATION) : 0;
    const pulseBoost = pulseT > 0 ? Math.pow(pulseT, LASER_TOWER_CONFIG.pulseExponent) : 0;

    if (tower.beamVisual) {
      updateBeamTransform(tower.beamVisual.beam, origin, impactPoint);
      tower.beamVisual.flash.position.copy(origin);
      tower.beamVisual.beam.scale.x = 1 + (pulseBoost * LASER_BEAM_PULSE_WIDTH_BOOST);
      tower.beamVisual.beam.scale.z = 1 + (pulseBoost * LASER_BEAM_PULSE_WIDTH_BOOST);
      tower.beamVisual.beam.material.opacity = Math.min(
        LASER_TOWER_CONFIG.beamMaxOpacity,
        LASER_BEAM_BASE_OPACITY + (pulseBoost * LASER_BEAM_PULSE_OPACITY_BOOST)
      );
      tower.beamVisual.flash.material.opacity = Math.min(
        LASER_TOWER_CONFIG.flashMaxOpacity,
        LASER_FLASH_BASE_OPACITY + (pulseBoost * LASER_FLASH_PULSE_OPACITY_BOOST)
      );
      tower.beamVisual.flash.scale.setScalar(
        LASER_FLASH_BASE_SCALE + (pulseBoost * LASER_FLASH_PULSE_SCALE_BOOST)
      );
    }

    if (ringMaterial) {
      ringMaterial.emissiveIntensity = LASER_ACTIVE_GLOW_INTENSITY + (pulseBoost * LASER_TOWER_CONFIG.ringPulseBoost);
    }
    if (flashLight) {
      flashLight.intensity = LASER_TOWER_CONFIG.flashLightBaseIntensity + (pulseBoost * LASER_TOWER_CONFIG.flashLightPulseBoost);
    }

    if (tower.cooldown <= 0) {
      const hitAny = enemySystem.applyDamageAtPoint(
        targetPoint,
        TOWER_BEAM_HIT_RADIUS,
        TOWER_BEAM_DAMAGE * towerDamageMultiplier
      );
      tower.cooldown = TOWER_FIRE_INTERVAL * towerFireRateMultiplier;
      if (hitAny) {
        tempVecE.copy(impactPoint).sub(origin);
        if (tempVecE.lengthSq() < TOWER_CONFIG.segmentEpsilon) {
          tempVecE.copy(upVector);
        } else {
          tempVecE.normalize();
        }
        spawnImpactEffect(impactPoint, tempVecE);
        tower.pulseTimer = LASER_PULSE_DURATION;
      }
    }
  }

  function updateEmpTowerCombat(tower, deltaSeconds, enemySystem) {
    if (tower.beamVisual) {
      destroyLaserBeamVisual(tower.beamVisual);
      tower.beamVisual = null;
    }

    updateEmpTowerBobbing(tower, deltaSeconds);

    const hasEnemyInRange = hasDamageableEnemyInRange(tower, enemySystem);
    const chargeInterval = Math.max(0.05, EMP_PULSE_INTERVAL * towerFireRateMultiplier);
    if (hasEnemyInRange) {
      tower.chargeTimer += deltaSeconds;
    } else {
      tower.chargeTimer = Math.max(0, tower.chargeTimer - (deltaSeconds * 1.5));
    }

    let chargeRatio = THREE.MathUtils.clamp(tower.chargeTimer / chargeInterval, 0, 1);
    updateEmpTowerAppearance(tower, chargeRatio);

    if (!hasEnemyInRange || tower.chargeTimer < chargeInterval) {
      return;
    }

    const pulseRange = tower.range ?? EMP_RANGE;
    const pulseDamage = EMP_PULSE_DAMAGE * towerDamageMultiplier;
    while (tower.chargeTimer >= chargeInterval) {
      tower.chargeTimer -= chargeInterval;
      getEmpPulseOrigin(tower, tempVecA);
      spawnEmpPulse(tempVecA, pulseRange, pulseDamage);
    }

    chargeRatio = THREE.MathUtils.clamp(tower.chargeTimer / chargeInterval, 0, 1);
    updateEmpTowerAppearance(tower, chargeRatio);
  }

  function updateTowerCombat(deltaSeconds, enemySystem) {
    for (const tower of towers) {
      if (tower.towerType === "emp") {
        updateEmpTowerCombat(tower, deltaSeconds, enemySystem);
      } else {
        updateLaserTowerCombat(tower, deltaSeconds, enemySystem);
      }
    }
  }

  function update(deltaSeconds, enemySystem) {
    updatePreviewFromCamera();
    updateImpactEffects(deltaSeconds);
    updateTowerCombat(deltaSeconds, enemySystem);
    updateEmpPulseEffects(deltaSeconds, enemySystem);
  }

  function isBuildMode() {
    return buildMode;
  }

  function getStatusText() {
    if (buildMode) {
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
      return getTowerRemaining(type);
    }

    return Object.values(towerStock).reduce(
      (total, count) => total + Math.max(0, count || 0),
      0
    );
  }

  function getTowerInventory() {
    return TOWER_TYPE_ORDER
      .filter((type) => unlockedTowerTypes.has(type))
      .map((type) => ({
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
      const towerSpec = getTowerSpec(towerType);
      if (!towerSpec || getTowerRemaining(towerType) <= 0) {
        return false;
      }

      const towerPosition = new THREE.Vector3(x, getBuildSurfaceY(x, z), z);
      if (!isPlacementValid(towerPosition, towerSpec.radius)) {
        return false;
      }

      const towerMesh = createTowerPlacedMesh(towerType);

      towerMesh.position.copy(towerPosition);
      scene.add(towerMesh);
      const towerEntry = createTowerEntry(towerType, towerMesh, towerPosition);
      if (!towerEntry) {
        scene.remove(towerMesh);
        return false;
      }
      towers.push(towerEntry);
      unlockedTowerTypes.add(towerType);
      towerStock[towerType] = Math.max(0, getTowerRemaining(towerType) - 1);
      return true;
    }
  };
}
