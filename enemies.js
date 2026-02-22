import * as THREE from "https://esm.sh/three@0.161.0";

const ENEMY_RADIUS = 0.45;
const ENEMY_SPEED = 1.25;
const MAX_HEALTH = 100;
const RESPAWN_DELAY = 2.5;

export function createEnemySystem(scene, pathWaypoints) {
  if (!Array.isArray(pathWaypoints) || pathWaypoints.length < 2) {
    throw new Error("Enemy system requires at least two path waypoints.");
  }

  const enemyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.8, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x6cd5ff, roughness: 0.65, metalness: 0.1 })
  );
  scene.add(enemyMesh);

  const healthBarRoot = new THREE.Group();
  const healthBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.25, 0.14),
    new THREE.MeshBasicMaterial({
      color: 0x1f2835,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    })
  );
  const healthBarFg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.08),
    new THREE.MeshBasicMaterial({
      color: 0x6bf4ad,
      transparent: true,
      depthTest: false,
    })
  );
  healthBarBg.renderOrder = 20;
  healthBarFg.renderOrder = 21;
  healthBarFg.position.z = 0.01;
  healthBarRoot.add(healthBarBg);
  healthBarRoot.add(healthBarFg);
  healthBarRoot.position.set(0, 0.95, 0);
  enemyMesh.add(healthBarRoot);

  let alive = true;
  let health = MAX_HEALTH;
  let respawnTimer = 0;
  let segmentIndex = 0;
  let segmentProgress = 0;

  function updateHealthBar() {
    const ratio = Math.max(0, health / MAX_HEALTH);
    healthBarFg.scale.x = Math.max(0.001, ratio);
    healthBarFg.position.x = -(1 - ratio) * 0.575;
    healthBarFg.material.color.setHSL(0.28 * ratio, 0.85, 0.55);
  }

  function resetPathState() {
    segmentIndex = 0;
    segmentProgress = 0;
    enemyMesh.position.copy(pathWaypoints[0]);
  }

  function killEnemy() {
    alive = false;
    respawnTimer = RESPAWN_DELAY;
    enemyMesh.visible = false;
  }

  function respawnEnemy() {
    alive = true;
    health = MAX_HEALTH;
    resetPathState();
    enemyMesh.visible = true;
    updateHealthBar();
  }

  function applyDamage(amount) {
    if (!alive) {
      return false;
    }

    health = Math.max(0, health - amount);
    updateHealthBar();
    if (health <= 0) {
      killEnemy();
    }
    return true;
  }

  function moveAlongPath(deltaSeconds) {
    let remaining = ENEMY_SPEED * deltaSeconds;

    while (remaining > 0 && alive) {
      const start = pathWaypoints[segmentIndex];
      const end = pathWaypoints[segmentIndex + 1];
      const segmentLength = start.distanceTo(end);
      const segmentRemaining = segmentLength - segmentProgress;

      if (remaining < segmentRemaining) {
        segmentProgress += remaining;
        remaining = 0;
      } else {
        remaining -= segmentRemaining;
        segmentIndex += 1;
        segmentProgress = 0;

        if (segmentIndex >= pathWaypoints.length - 1) {
          segmentIndex = 0;
          enemyMesh.position.copy(pathWaypoints[0]);
          break;
        }
      }

      const t = segmentLength === 0 ? 0 : segmentProgress / segmentLength;
      enemyMesh.position.lerpVectors(start, end, t);
    }
  }

  function update(deltaSeconds, camera) {
    if (alive) {
      moveAlongPath(deltaSeconds);
      if (camera) {
        healthBarRoot.quaternion.copy(camera.quaternion);
      }
      return;
    }

    respawnTimer -= deltaSeconds;
    if (respawnTimer <= 0) {
      respawnEnemy();
    }
  }

  function applyDamageAtPoint(point, hitRadius, damage) {
    if (!alive) {
      return false;
    }

    const maxHitDistance = ENEMY_RADIUS + hitRadius;
    if (enemyMesh.position.distanceToSquared(point) <= maxHitDistance * maxHitDistance) {
      return applyDamage(damage);
    }

    return false;
  }

  function getTargetInRange(origin, range) {
    if (!alive) {
      return null;
    }

    const distance = origin.distanceTo(enemyMesh.position);
    if (distance > range) {
      return null;
    }

    return {
      mesh: enemyMesh,
      position: enemyMesh.position,
      distance,
      health,
      maxHealth: MAX_HEALTH,
    };
  }

  function getEnemies() {
    return alive ? [enemyMesh] : [];
  }

  resetPathState();
  updateHealthBar();

  return {
    update,
    getEnemies,
    getTargetInRange,
    applyDamageAtPoint,
  };
}
