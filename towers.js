import * as THREE from "https://esm.sh/three@0.161.0";

const TOWER_RANGE = 9;
const TOWER_FIRE_INTERVAL = 0.75;
const TOWER_PROJECTILE_SPEED = 7;
const TOWER_PROJECTILE_LIFE = 3;
const TOWER_PROJECTILE_DAMAGE = 20;
const TOWER_PROJECTILE_HIT_RADIUS = 0.2;

export function createTowerSystem({ scene, camera, grid }) {
  const raycaster = new THREE.Raycaster();
  const aimPoint = new THREE.Vector2(0, 0);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -grid.tileTopY);
  const groundHit = new THREE.Vector3();
  const despawnMargin = 4;
  const projectileGravity = 9;

  const towerProjectileGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const towerProjectileMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd36b,
    emissive: 0x5a3b07,
    roughness: 0.4,
    metalness: 0.05,
  });
  const towerProjectiles = [];

  let selectedTowerType = null;
  let buildMode = false;
  let hasTower = false;
  let previewValid = false;
  let previewCell = null;
  let tower = null;

  const preview = createTowerMesh({
    baseColor: 0x58c89a,
    accentColor: 0xa9fff9,
    opacity: 0.55,
    transparent: true,
  });
  preview.visible = false;
  scene.add(preview);

  function createTowerMesh({ baseColor, accentColor, opacity = 1, transparent = false }) {
    const root = new THREE.Group();
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

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 1.1), baseMaterial);
    base.position.y = 0.14;

    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.36, 8), topMaterial);
    column.position.y = 0.46;

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), topMaterial);
    barrel.rotation.z = Math.PI * 0.5;
    barrel.position.set(0.32, 0.46, 0);

    root.add(base);
    root.add(column);
    root.add(barrel);
    root.userData.materials = [baseMaterial, topMaterial];
    root.userData.muzzleLocal = new THREE.Vector3(0.66, 0.46, 0);
    return root;
  }

  function setPreviewValidityVisual(isValid) {
    const [baseMaterial, topMaterial] = preview.userData.materials;
    if (isValid) {
      baseMaterial.color.setHex(0x58c89a);
      topMaterial.color.setHex(0xa9fff9);
    } else {
      baseMaterial.color.setHex(0xc86666);
      topMaterial.color.setHex(0xff9f9f);
    }
  }

  function selectTower(type = "basic") {
    if (hasTower) {
      return false;
    }
    selectedTowerType = type;
    buildMode = true;
    preview.visible = true;
    previewValid = false;
    previewCell = null;
    return true;
  }

  function cancelPlacement() {
    buildMode = false;
    selectedTowerType = null;
    preview.visible = false;
    previewValid = false;
    previewCell = null;
  }

  function updatePreviewFromCamera() {
    if (!buildMode || hasTower) {
      preview.visible = false;
      previewValid = false;
      previewCell = null;
      return;
    }

    raycaster.setFromCamera(aimPoint, camera);
    const tileHit = raycaster.intersectObjects(grid.tiles, false)[0];
    let snapped = null;

    if (tileHit) {
      const { cellX, cellZ } = tileHit.object.userData;
      snapped = { x: cellX, z: cellZ };
    } else {
      const hit = raycaster.ray.intersectPlane(groundPlane, groundHit);
      if (hit) {
        snapped = grid.worldToCell(groundHit.x, groundHit.z);
      }
    }

    if (!snapped) {
      preview.visible = false;
      previewValid = false;
      previewCell = null;
      return;
    }

    preview.visible = true;
    previewCell = snapped;
    preview.position.copy(grid.cellToWorldCenter(snapped.x, snapped.z, grid.tileTopY));
    previewValid = !grid.isPathCell(snapped.x, snapped.z);
    setPreviewValidityVisual(previewValid);
  }

  function placeSelectedTower() {
    updatePreviewFromCamera();

    if (!buildMode || !previewValid || hasTower || !selectedTowerType || !previewCell) {
      return false;
    }

    const towerMesh = createTowerMesh({
      baseColor: 0x506c97,
      accentColor: 0x9dd9ff,
      opacity: 1,
      transparent: false,
    });
    towerMesh.position.copy(grid.cellToWorldCenter(previewCell.x, previewCell.z, grid.tileTopY));
    scene.add(towerMesh);

    tower = {
      mesh: towerMesh,
      cooldown: 0,
    };
    hasTower = true;
    cancelPlacement();
    return true;
  }

  function spawnTowerProjectile(origin, targetPosition) {
    const projectile = new THREE.Mesh(towerProjectileGeometry, towerProjectileMaterial);
    projectile.position.copy(origin);
    scene.add(projectile);

    const velocity = targetPosition
      .clone()
      .sub(origin)
      .normalize()
      .multiplyScalar(TOWER_PROJECTILE_SPEED);

    towerProjectiles.push({
      mesh: projectile,
      velocity,
      life: TOWER_PROJECTILE_LIFE,
      damage: TOWER_PROJECTILE_DAMAGE,
    });
  }

  function updateTowerCombat(deltaSeconds, enemySystem) {
    if (!tower) {
      return;
    }

    tower.cooldown = Math.max(0, tower.cooldown - deltaSeconds);
    const target = enemySystem.getTargetInRange(tower.mesh.position, TOWER_RANGE);
    if (target) {
      tower.mesh.lookAt(target.position.x, tower.mesh.position.y, target.position.z);

      if (tower.cooldown <= 0) {
        const muzzleWorld = tower.mesh.localToWorld(tower.mesh.userData.muzzleLocal.clone());
        spawnTowerProjectile(muzzleWorld, target.position);
        tower.cooldown = TOWER_FIRE_INTERVAL;
      }
    }
  }

  function updateTowerProjectiles(deltaSeconds, enemySystem) {
    for (let i = towerProjectiles.length - 1; i >= 0; i -= 1) {
      const projectile = towerProjectiles[i];
      projectile.velocity.y -= projectileGravity * deltaSeconds;
      projectile.mesh.position.addScaledVector(projectile.velocity, deltaSeconds);
      projectile.life -= deltaSeconds;

      const hit = enemySystem.applyDamageAtPoint(
        projectile.mesh.position,
        TOWER_PROJECTILE_HIT_RADIUS,
        projectile.damage
      );

      const outOfBounds =
        projectile.mesh.position.x < grid.moveBounds.minX - despawnMargin ||
        projectile.mesh.position.x > grid.moveBounds.maxX + despawnMargin ||
        projectile.mesh.position.z < grid.moveBounds.minZ - despawnMargin ||
        projectile.mesh.position.z > grid.moveBounds.maxZ + despawnMargin ||
        projectile.mesh.position.y < -3 ||
        projectile.mesh.position.y > 22;

      if (hit || projectile.life <= 0 || outOfBounds) {
        scene.remove(projectile.mesh);
        towerProjectiles.splice(i, 1);
      }
    }
  }

  function update(deltaSeconds, enemySystem) {
    updatePreviewFromCamera();
    updateTowerCombat(deltaSeconds, enemySystem);
    updateTowerProjectiles(deltaSeconds, enemySystem);
  }

  function isBuildMode() {
    return buildMode;
  }

  function getStatusText() {
    if (buildMode) {
      if (previewValid) {
        return "Build mode: place tower";
      }
      return "Build mode: invalid tile";
    }
    if (hasTower) {
      return "Tower deployed";
    }
    return "Combat mode";
  }

  return {
    update,
    selectTower,
    cancelPlacement,
    placeSelectedTower,
    isBuildMode,
    getStatusText,
  };
}
