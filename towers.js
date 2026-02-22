import * as THREE from "https://esm.sh/three@0.161.0";
import { getModel } from "./models.js";

const TOWER_RANGE = 18;
const TOWER_FIRE_INTERVAL = 0.75;
const TOWER_PROJECTILE_SPEED = 40;
const TOWER_PROJECTILE_LIFE = 3;
const TOWER_PROJECTILE_DAMAGE = 20;
const TOWER_PROJECTILE_HIT_RADIUS = 0.4;

export function createTowerSystem({ scene, camera, grid }) {
  const raycaster = new THREE.Raycaster();
  const aimPoint = new THREE.Vector2(0, 0);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -grid.tileTopY);
  const groundHit = new THREE.Vector3();
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

  let selectedTowerType = null;
  let buildMode = false;
  let maxTowers = 1;
  const towers = [];
  let previewValid = false;
  let previewCell = null;

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
    const model = getModel("turret_double");

    const turretGroup = new THREE.Group();

    if (model) {
      model.scale.set(4.5, 4.5, 4.5);
      turretGroup.add(model);
      root.add(turretGroup);
      root.userData.turret = turretGroup;
      root.userData.muzzleLocal = new THREE.Vector3(0, 3.5, 1.5);
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

    turretGroup.position.set(0, 2.4, 0);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.8, 8), topMaterial);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(0, 0, 0.9);

    turretGroup.add(barrel);
    root.add(base);
    root.add(body);
    root.add(turretGroup);

    root.userData.materials = [baseMaterial, topMaterial];
    root.userData.turret = turretGroup;
    root.userData.muzzleLocal = new THREE.Vector3(0, 0, 1.8);
    return root;
  }

  function createTowerMesh({ baseColor, accentColor, opacity = 1, transparent = false }) {
    const root = new THREE.Group();
    const model = getModel("turret_single");

    const turretGroup = new THREE.Group();

    if (model) {
      model.scale.set(4.5, 4.5, 4.5);
      turretGroup.add(model);

      root.add(turretGroup);
      root.userData.turret = turretGroup;
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

  function selectTower(type = "basic") {
    if (towers.length >= maxTowers) {
      return false;
    }
    selectedTowerType = type;
    buildMode = true;

    scene.remove(preview);
    preview = type === "mortar" ? createMortarMesh({
      baseColor: 0x58c89a, accentColor: 0xa9fff9, opacity: 0.55, transparent: true,
    }) : createTowerMesh({
      baseColor: 0x58c89a, accentColor: 0xa9fff9, opacity: 0.55, transparent: true,
    });
    scene.add(preview);

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
    if (!buildMode || towers.length >= maxTowers) {
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

    if (!buildMode || !previewValid || towers.length >= maxTowers || !selectedTowerType || !previewCell) {
      return false;
    }

    const towerMesh = selectedTowerType === "mortar" ? createMortarMesh({
      baseColor: 0x506c97, accentColor: 0x9dd9ff, opacity: 1, transparent: false,
    }) : createTowerMesh({
      baseColor: 0x506c97, accentColor: 0x9dd9ff, opacity: 1, transparent: false,
    });
    towerMesh.position.copy(grid.cellToWorldCenter(previewCell.x, previewCell.z, grid.tileTopY));
    scene.add(towerMesh);

    towers.push({
      mesh: towerMesh,
      cooldown: 0,
      type: selectedTowerType,
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

    const velocity = target.position
      .clone()
      .sub(origin)
      .normalize()
      .multiplyScalar(isMortar ? TOWER_PROJECTILE_SPEED * 0.6 : TOWER_PROJECTILE_SPEED);

    if (isMortar) {
      // parabolic arc for mortar
      velocity.y = 8;
    }

    towerProjectiles.push({
      mesh: projectile,
      velocity,
      life: isMortar ? 5 : TOWER_PROJECTILE_LIFE,
      damage: TOWER_PROJECTILE_DAMAGE * towerDamageMultiplier * (isMortar ? 2.5 : 1),
      target: isMortar ? null : target,
      isMortar,
    });
  }

  function updateTowerCombat(deltaSeconds, enemySystem) {
    for (const t of towers) {
      t.cooldown = Math.max(0, t.cooldown - deltaSeconds);

      const range = t.type === "mortar" ? TOWER_RANGE * 1.5 : TOWER_RANGE;
      const target = enemySystem.getTargetInRange(t.mesh.position, range);
      if (target) {
        const targetPos = target.position.clone();
        if (t.type === "mortar") {
          targetPos.y = t.mesh.position.y + t.mesh.userData.turret.position.y + 4; // aim high
        } else {
          targetPos.y = t.mesh.position.y + t.mesh.userData.turret.position.y;
        }
        t.mesh.userData.turret.lookAt(targetPos);

        if (t.cooldown <= 0) {
          const muzzleWorld = t.mesh.userData.turret.localToWorld(t.mesh.userData.muzzleLocal.clone());
          spawnTowerProjectile(muzzleWorld, target, t.type);
          t.cooldown = TOWER_FIRE_INTERVAL * towerFireRateMultiplier * (t.type === "mortar" ? 3 : 1);
        }
      }
    }
  }

  function updateTowerProjectiles(deltaSeconds, enemySystem) {
    for (let i = towerProjectiles.length - 1; i >= 0; i -= 1) {
      const projectile = towerProjectiles[i];

      if (!projectile.isMortar && projectile.target && projectile.target.mesh.visible) {
        const dir = projectile.target.mesh.position.clone().sub(projectile.mesh.position).normalize();
        projectile.velocity.copy(dir).multiplyScalar(TOWER_PROJECTILE_SPEED);
      }

      const gravityToApply = projectile.isMortar ? 20 : projectileGravity;
      projectile.velocity.y -= gravityToApply * deltaSeconds;
      projectile.mesh.position.addScaledVector(projectile.velocity, deltaSeconds);
      projectile.life -= deltaSeconds;

      let hit = false;
      let impact = false;
      if (projectile.isMortar) {
        if (projectile.mesh.position.y <= grid.tileTopY) {
          impact = true; // hit ground
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
          const enemies = enemySystem.getEnemies();
          for (const eMesh of enemies) {
            if (eMesh.position.distanceTo(projectile.mesh.position) <= splashRadius) {
              enemySystem.applyDamageAtPoint(eMesh.position, splashRadius, projectile.damage);
            }
          }
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
  }

  function isBuildMode() {
    return buildMode;
  }

  function getStatusText() {
    if (buildMode) {
      if (previewValid) {
        return `Build mode: place ${selectedTowerType} tower`;
      }
      return "Build mode: invalid tile";
    }
    return `Towers built: ${towers.length} / ${maxTowers}`;
  }

  function getAvailableTowers() {
    return Math.max(0, maxTowers - towers.length);
  }

  return {
    update,
    selectTower,
    cancelPlacement,
    placeSelectedTower,
    isBuildMode,
    getStatusText,
    getAvailableTowers,
    upgradeMaxTowers,
    upgradeTowerDamage,
    upgradeTowerDamage,
    upgradeTowerFireRate,
    forcePlaceTower: (x, z, type) => {

      const newTower = {
        type: type,
        mesh: type === "mortar"
          ? createMortarMesh({ baseColor: 0x82a5c9, accentColor: 0x6ca3e6 })
          : createTowerMesh({ baseColor: 0x82a5c9, accentColor: 0x6ca3e6 }),
        cellX: Math.round(x / grid.tileSize),
        cellZ: Math.round(z / grid.tileSize),
        fireCooldown: 0,
      };

      newTower.mesh.position.set(x, grid.tileTopY, z);
      scene.add(newTower.mesh);
      towers.push(newTower);
    }
  };
}
