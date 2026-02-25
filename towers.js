import * as THREE from "three";
import { getModel } from "./models.js";

const TOWER_RANGE = 18;
const TOWER_FIRE_INTERVAL = 0.75;
const TOWER_PROJECTILE_SPEED = 40;
const TOWER_PROJECTILE_LIFE = 3;
const TOWER_PROJECTILE_DAMAGE = 20;
const TOWER_PROJECTILE_HIT_RADIUS = 0.4;
const MORTAR_UPWARD_SPEED = 12;
const MORTAR_GRAVITY = 20;
const MORTAR_INITIAL_LATERAL_SPEED = 3;
const MORTAR_HOMING_TURN_RATE = 7;
const MORTAR_MIN_LATERAL_SPEED = 7;
const MORTAR_MAX_LATERAL_SPEED = 20;
const MORTAR_DIRECT_HIT_RADIUS = 0.7;
const MORTAR_EXPLOSION_DURATION = 0.42;
const MORTAR_EXPLOSION_RADIUS = 13.2;
const MORTAR_EXPLOSION_SPARK_COUNT = 10;
const BASIC_TOWER_RADIUS = 1.35;
const MORTAR_TOWER_RADIUS = 1.7;
const TOWER_PLACEMENT_GAP = 0.25;

export function createTowerSystem({ scene, camera, grid }) {
  const raycaster = new THREE.Raycaster();
  const aimPoint = new THREE.Vector2(0, 0);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -grid.tileTopY);
  const groundHit = new THREE.Vector3();
  const pathWaypoints = Array.isArray(grid.pathWaypoints) ? grid.pathWaypoints : [];
  const pathHalfWidth = grid.cellSize * 0.47;
  const despawnMargin = 4;
  const projectileGravity = 0;

  const towerProjectileGeometry = new THREE.SphereGeometry(0.06, 8, 8);
  const towerProjectileMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd36b,
    emissive: 0x5a3b07,
    roughness: 0.4,
    metalness: 0.05,
  });
  const towerProjectiles = [];
  const mortarExplosions = [];
  const explosionFlashGeometry = new THREE.SphereGeometry(0.24, 12, 12);
  const explosionRingGeometry = new THREE.RingGeometry(0.2, 0.3, 24);
  const explosionSparkGeometry = new THREE.SphereGeometry(0.05, 6, 6);

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

  let preview = createTowerMesh({
    baseColor: 0x58c89a,
    accentColor: 0xa9fff9,
    opacity: 0.55,
    transparent: true,
  });
  preview.visible = false;
  scene.add(preview);

  function createMortarMesh({ baseColor, accentColor, opacity = 1, transparent = false }) {
    const root = new THREE.Group();
    const model = getModel("machine_barrelLarge");

    if (model) {
      model.scale.set(3.5, 3.5, 3.5);
      root.add(model);
      root.userData.turret = null;
      root.userData.muzzleNode = root;
      root.userData.muzzleLocal = new THREE.Vector3(0, 1.95, 0);
      root.userData.materials = [];

      if (transparent) {
        model.traverse(child => {
          if (child.isMesh) {
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = opacity;
          }
        });
      }
      return root;
    }

    // Fallback procedural
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: baseColor, roughness: 0.75, metalness: 0.1, opacity, transparent,
    });
    const topMaterial = new THREE.MeshStandardMaterial({
      color: accentColor, roughness: 0.55, metalness: 0.2, opacity, transparent,
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 2.8), baseMaterial);
    base.position.y = 0.4;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 1.6, 12), topMaterial);
    body.position.y = 1.6;

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 1.8, 12), topMaterial);
    barrel.position.y = 3.1;

    root.add(base);
    root.add(body);
    root.add(barrel);

    root.userData.materials = [baseMaterial, topMaterial];
    root.userData.turret = null;
    root.userData.muzzleNode = root;
    root.userData.muzzleLocal = new THREE.Vector3(0, 4.0, 0);
    return root;
  }

  function createTowerMesh({ baseColor, accentColor, opacity = 1, transparent = false }) {
    const root = new THREE.Group();
    const model = getModel("turret_single");

    const turretGroup = new THREE.Group();

    if (model) {
      model.rotation.y = Math.PI;
      model.scale.set(4.5, 4.5, 4.5);
      turretGroup.add(model);

      root.add(turretGroup);
      root.userData.turret = turretGroup;
      root.userData.muzzleNode = turretGroup;
      root.userData.muzzleLocal = new THREE.Vector3(0, 3.0, 1.5);
      root.userData.materials = [];

      if (transparent) {
        model.traverse(child => {
          if (child.isMesh) {
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = opacity;
          }
        });
      }
      return root;
    }

    // Fallback procedural
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.75,
      metalness: 0.1,
      opacity,
      transparent,
    });
    const topMaterial = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.55,
      metalness: 0.2,
      opacity,
      transparent,
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 2.8), baseMaterial);
    base.position.y = 0.4;

    const column = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), topMaterial);
    column.position.y = 1.4;

    turretGroup.position.y = 2.2;

    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 16), topMaterial);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.4, 8), topMaterial);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(0, 0, 1.2);

    turretGroup.add(turret);
    turretGroup.add(barrel);

    root.add(base);
    root.add(column);
    root.add(turretGroup);

    root.userData.materials = [baseMaterial, topMaterial];
    root.userData.turret = turretGroup;
    root.userData.muzzleNode = turretGroup;
    root.userData.muzzleLocal = new THREE.Vector3(0, 0, 2.4);
    return root;
  }

  function setPreviewValidityVisual(isValid) {
    if (preview.userData.materials && preview.userData.materials.length > 0) {
      // Procedural fallback
      const [baseMaterial, topMaterial] = preview.userData.materials;
      if (isValid) {
        baseMaterial.color.setHex(0x58c89a);
        topMaterial.color.setHex(0xa9fff9);
      } else {
        baseMaterial.color.setHex(0xc86666);
        topMaterial.color.setHex(0xff9f9f);
      }
    } else {
      // GLTF model preview 
      const colorHex = isValid ? 0x58c89a : 0xc86666;
      preview.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.color.setHex(colorHex);
        }
      });
    }
  }

  function getTowerRadius(type) {
    return type === "mortar" ? MORTAR_TOWER_RADIUS : BASIC_TOWER_RADIUS;
  }

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
      const otherRadius = tower.radius ?? BASIC_TOWER_RADIUS;
      const minDistance = towerRadius + otherRadius + TOWER_PLACEMENT_GAP;
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

  function isPlacementValid(position, type) {
    const towerRadius = getTowerRadius(type);
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

  function selectTower(type = "basic") {
    if (towers.length >= maxTowers) {
      return false;
    }
    selectedTowerType = type === "mortar" ? "mortar" : "basic";
    buildMode = true;

    scene.remove(preview);
    preview = selectedTowerType === "mortar" ? createMortarMesh({
      baseColor: 0x58c89a, accentColor: 0xa9fff9, opacity: 0.55, transparent: true,
    }) : createTowerMesh({
      baseColor: 0x58c89a, accentColor: 0xa9fff9, opacity: 0.55, transparent: true,
    });
    scene.add(preview);

    preview.visible = true;
    previewValid = false;
    previewPosition = null;
    return true;
  }

  function cancelPlacement() {
    buildMode = false;
    selectedTowerType = null;
    preview.visible = false;
    previewValid = false;
    previewPosition = null;
  }

  function updatePreviewFromCamera() {
    if (!buildMode || towers.length >= maxTowers) {
      preview.visible = false;
      previewValid = false;
      previewPosition = null;
      return;
    }

    raycaster.setFromCamera(aimPoint, camera);
    const hit = raycaster.ray.intersectPlane(groundPlane, groundHit);
    if (!hit) {
      preview.visible = false;
      previewValid = false;
      previewPosition = null;
      return;
    }

    const towerRadius = getTowerRadius(selectedTowerType);
    const x = Math.min(
      grid.moveBounds.maxX - towerRadius,
      Math.max(grid.moveBounds.minX + towerRadius, groundHit.x)
    );
    const z = Math.min(
      grid.moveBounds.maxZ - towerRadius,
      Math.max(grid.moveBounds.minZ + towerRadius, groundHit.z)
    );

    preview.visible = true;
    preview.position.set(x, grid.tileTopY, z);
    if (!previewPosition) {
      previewPosition = new THREE.Vector3();
    }
    previewPosition.copy(preview.position);
    previewValid = isPlacementValid(previewPosition, selectedTowerType);
    setPreviewValidityVisual(previewValid);
  }

  function placeSelectedTower() {
    updatePreviewFromCamera();

    if (!buildMode || !previewValid || towers.length >= maxTowers || !selectedTowerType || !previewPosition) {
      return false;
    }

    const towerRadius = getTowerRadius(selectedTowerType);
    const towerMesh = selectedTowerType === "mortar" ? createMortarMesh({
      baseColor: 0x506c97, accentColor: 0x9dd9ff, opacity: 1, transparent: false,
    }) : createTowerMesh({
      baseColor: 0x506c97, accentColor: 0x9dd9ff, opacity: 1, transparent: false,
    });
    towerMesh.position.copy(previewPosition);
    scene.add(towerMesh);

    towers.push({
      mesh: towerMesh,
      cooldown: 0,
      type: selectedTowerType,
      radius: towerRadius,
    });

    if (towers.length >= maxTowers) {
      cancelPlacement();
    }
    return true;
  }

  function spawnTowerProjectile(origin, target, type) {
    const isMortar = type === "mortar";
    const projGeo = isMortar ? new THREE.SphereGeometry(0.2, 8, 8) : towerProjectileGeometry;
    const projMat = isMortar ? new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0x5a0707, roughness: 0.4 }) : towerProjectileMaterial;

    const projectile = new THREE.Mesh(projGeo, projMat);
    projectile.position.copy(origin);
    scene.add(projectile);

    const velocity = target.position.clone().sub(origin).normalize().multiplyScalar(TOWER_PROJECTILE_SPEED);
    if (isMortar) {
      velocity.set(0, MORTAR_UPWARD_SPEED, 0);
      const lateralToTarget = target.position.clone().sub(origin);
      lateralToTarget.y = 0;
      if (lateralToTarget.lengthSq() > 0.0001) {
        lateralToTarget.normalize().multiplyScalar(MORTAR_INITIAL_LATERAL_SPEED);
        velocity.x = lateralToTarget.x;
        velocity.z = lateralToTarget.z;
      }
    }

    towerProjectiles.push({
      mesh: projectile,
      velocity,
      life: isMortar ? 5 : TOWER_PROJECTILE_LIFE,
      damage: TOWER_PROJECTILE_DAMAGE * towerDamageMultiplier * (isMortar ? 2.5 : 1),
      target,
      isMortar,
      homingTurnRate: MORTAR_HOMING_TURN_RATE,
      hitRadius: isMortar ? MORTAR_DIRECT_HIT_RADIUS : TOWER_PROJECTILE_HIT_RADIUS,
    });
  }

  function spawnMortarExplosion(position) {
    const root = new THREE.Group();
    root.position.copy(position);
    root.position.y = Math.max(root.position.y, grid.tileTopY + 0.05);

    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb25a,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const flash = new THREE.Mesh(explosionFlashGeometry, flashMaterial);
    root.add(flash);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6f2c,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(explosionRingGeometry, ringMaterial);
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = 0.04;
    root.add(ring);

    const light = new THREE.PointLight(0xff7d33, 2.6, 6.5);
    light.position.set(0, 0.5, 0);
    root.add(light);

    const sparks = [];
    for (let i = 0; i < MORTAR_EXPLOSION_SPARK_COUNT; i += 1) {
      const sparkMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd08a,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const spark = new THREE.Mesh(explosionSparkGeometry, sparkMaterial);
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        0.25 + Math.random() * 0.95,
        Math.random() * 2 - 1
      ).normalize();
      const speed = 2.6 + Math.random() * 2.2;
      sparks.push({ mesh: spark, velocity: dir.multiplyScalar(speed) });
      root.add(spark);
    }

    scene.add(root);
    mortarExplosions.push({
      root,
      flash,
      ring,
      light,
      sparks,
      life: 0,
      duration: MORTAR_EXPLOSION_DURATION,
    });
  }

  function updateMortarExplosions(deltaSeconds) {
    for (let i = mortarExplosions.length - 1; i >= 0; i -= 1) {
      const explosion = mortarExplosions[i];
      explosion.life += deltaSeconds;
      const t = Math.min(1, explosion.life / explosion.duration);
      const easeOut = 1 - Math.pow(1 - t, 2);

      const flashScale = 1 + easeOut * MORTAR_EXPLOSION_RADIUS;
      explosion.flash.scale.setScalar(flashScale);
      explosion.flash.material.opacity = 0.92 * (1 - t);

      const ringScale = 1 + easeOut * (MORTAR_EXPLOSION_RADIUS * 1.15);
      explosion.ring.scale.setScalar(ringScale);
      explosion.ring.material.opacity = 0.8 * (1 - t);

      explosion.light.intensity = 2.6 * (1 - t);

      for (const spark of explosion.sparks) {
        spark.velocity.y -= 8.5 * deltaSeconds;
        spark.mesh.position.addScaledVector(spark.velocity, deltaSeconds);
        spark.mesh.material.opacity = Math.max(0, 0.95 * (1 - t));
      }

      if (t >= 1) {
        scene.remove(explosion.root);
        explosion.flash.material.dispose();
        explosion.ring.material.dispose();
        for (const spark of explosion.sparks) {
          spark.mesh.material.dispose();
        }
        mortarExplosions.splice(i, 1);
      }
    }
  }

  function updateTowerCombat(deltaSeconds, enemySystem) {
    for (const t of towers) {
      t.cooldown = Math.max(0, t.cooldown - deltaSeconds);

      const range = t.type === "mortar" ? TOWER_RANGE * 1.5 : TOWER_RANGE;
      const target = enemySystem.getTargetInRange(t.mesh.position, range);
      if (target) {
        if (t.type !== "mortar" && t.mesh.userData.turret) {
          const targetPos = target.position.clone();
          targetPos.y = t.mesh.position.y + t.mesh.userData.turret.position.y;
          t.mesh.userData.turret.lookAt(targetPos);
        }

        if (t.cooldown <= 0) {
          const muzzleNode = t.mesh.userData.muzzleNode || t.mesh.userData.turret || t.mesh;
          const muzzleWorld = muzzleNode.localToWorld(t.mesh.userData.muzzleLocal.clone());
          spawnTowerProjectile(muzzleWorld, target, t.type);
          t.cooldown = TOWER_FIRE_INTERVAL * towerFireRateMultiplier * (t.type === "mortar" ? 3 : 1);
        }
      }
    }
  }

  function updateTowerProjectiles(deltaSeconds, enemySystem) {
    for (let i = towerProjectiles.length - 1; i >= 0; i -= 1) {
      const projectile = towerProjectiles[i];
      let impact = false;
      let impactPoint = null;

      if (!projectile.isMortar && projectile.target && projectile.target.mesh.visible) {
        const dir = projectile.target.mesh.position.clone().sub(projectile.mesh.position).normalize();
        projectile.velocity.copy(dir).multiplyScalar(TOWER_PROJECTILE_SPEED);
      } else if (projectile.isMortar && projectile.target && projectile.target.mesh && projectile.target.mesh.visible) {
        const toTarget = projectile.target.mesh.position.clone().sub(projectile.mesh.position);
        const horizontalDistance = Math.hypot(toTarget.x, toTarget.z);
        if (horizontalDistance > 0.0001) {
          const lateralSpeed = Math.min(
            MORTAR_MAX_LATERAL_SPEED,
            Math.max(MORTAR_MIN_LATERAL_SPEED, horizontalDistance * 2.4)
          );
          const desiredVx = (toTarget.x / horizontalDistance) * lateralSpeed;
          const desiredVz = (toTarget.z / horizontalDistance) * lateralSpeed;
          const blend = Math.min(1, projectile.homingTurnRate * deltaSeconds);
          projectile.velocity.x += (desiredVx - projectile.velocity.x) * blend;
          projectile.velocity.z += (desiredVz - projectile.velocity.z) * blend;
        }
      }

      const gravityToApply = projectile.isMortar ? MORTAR_GRAVITY : projectileGravity;
      projectile.velocity.y -= gravityToApply * deltaSeconds;
      projectile.mesh.position.addScaledVector(projectile.velocity, deltaSeconds);
      projectile.life -= deltaSeconds;

      let hit = false;
      if (projectile.isMortar) {
        if (projectile.target && projectile.target.mesh && projectile.target.mesh.visible) {
          const tPos = projectile.target.mesh.position;
          const horizontalDistance = Math.hypot(
            projectile.mesh.position.x - tPos.x,
            projectile.mesh.position.z - tPos.z
          );
          if (projectile.velocity.y <= 0 && horizontalDistance <= projectile.hitRadius) {
            impact = true;
            impactPoint = new THREE.Vector3(tPos.x, grid.tileTopY, tPos.z);
          }
        }
        if (!impact && projectile.mesh.position.y <= grid.tileTopY) {
          impact = true; // hit ground
          impactPoint = projectile.mesh.position.clone();
        }
      } else {
        hit = enemySystem.applyDamageAtPoint(
          projectile.mesh.position,
          TOWER_PROJECTILE_HIT_RADIUS,
          projectile.damage
        );
      }

      const outOfBounds =
        projectile.mesh.position.x < grid.moveBounds.minX - despawnMargin ||
        projectile.mesh.position.x > grid.moveBounds.maxX + despawnMargin ||
        projectile.mesh.position.z < grid.moveBounds.minZ - despawnMargin ||
        projectile.mesh.position.z > grid.moveBounds.maxZ + despawnMargin ||
        projectile.mesh.position.y < -3 ||
        projectile.mesh.position.y > 22;

      if (hit || impact || projectile.life <= 0 || outOfBounds) {
        if (impact) {
          // Mortar splash damage
          const splashRadius = 3.5;
          const splashCenter = impactPoint || projectile.mesh.position;
          projectile.mesh.position.copy(splashCenter);
          enemySystem.applyDamageAtPoint(splashCenter, splashRadius, projectile.damage);
          spawnMortarExplosion(splashCenter);
        }
        scene.remove(projectile.mesh);
        towerProjectiles.splice(i, 1);
      }
    }
  }

  function update(deltaSeconds, enemySystem) {
    updatePreviewFromCamera();
    updateTowerCombat(deltaSeconds, enemySystem);
    updateTowerProjectiles(deltaSeconds, enemySystem);
    updateMortarExplosions(deltaSeconds);
  }

  function isBuildMode() {
    return buildMode;
  }

  function getStatusText() {
    if (buildMode) {
      if (previewValid) {
        return `Build mode: place ${selectedTowerType} tower`;
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
    forcePlaceTower: (x, z, type = "basic") => {
      const towerType = type === "mortar" ? "mortar" : "basic";
      if (towers.length >= maxTowers) {
        return false;
      }

      const towerPosition = new THREE.Vector3(x, grid.tileTopY, z);
      if (!isPlacementValid(towerPosition, towerType)) {
        return false;
      }

      const towerMesh = towerType === "mortar"
        ? createMortarMesh({ baseColor: 0x82a5c9, accentColor: 0x6ca3e6 })
        : createTowerMesh({ baseColor: 0x82a5c9, accentColor: 0x6ca3e6 });

      towerMesh.position.copy(towerPosition);
      scene.add(towerMesh);
      towers.push({
        mesh: towerMesh,
        cooldown: 0,
        type: towerType,
        radius: getTowerRadius(towerType),
      });
      return true;
    }
  };
}
