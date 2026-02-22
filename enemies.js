import * as THREE from "https://esm.sh/three@0.161.0";

const ENEMY_RADIUS = 0.9;
const FAST_ENEMY_RADIUS = 0.6;
const BASE_SPEED = 2.5;

export function createEnemySystem(scene, pathWaypoints) {
  if (!Array.isArray(pathWaypoints) || pathWaypoints.length < 2) {
    throw new Error("Enemy system requires at least two path waypoints.");
  }

  const activeEnemies = [];
  let enemiesToSpawn = [];
  let spawnTimer = 0;
  let enemySpeedMultiplier = 1;

  function upgradeSlowEnemies() {
    enemySpeedMultiplier *= 0.8;
  }

  function startWave(counts) {
    enemiesToSpawn = [];
    for (let type in counts) {
      for (let i = 0; i < counts[type]; i++) {
        enemiesToSpawn.push(type);
      }
    }
    // Shuffle slightly or keep in order. For now, order is fine or interleave them.
    spawnTimer = 1.0;
  }

  function isWaveClear() {
    return activeEnemies.length === 0 && enemiesToSpawn.length === 0;
  }

  function createEnemyMesh(type) {
    const isFast = type === "fast";

    const enemyMesh = new THREE.Group();
    const bodySize = isFast ? 1.0 : 1.6;
    const bodyColor = isFast ? 0xc98282 : 0x82a5c9;
    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(bodySize, bodySize, bodySize),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8, metalness: 0.2 })
    );

    const eyeW = isFast ? 0.6 : 1.0;
    const eyeH = isFast ? 0.2 : 0.3;
    const eyeColor = isFast ? 0xff4d4d : 0x6cd5ff;
    const eyeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(eyeW, eyeH, 0.2),
      new THREE.MeshStandardMaterial({ color: eyeColor, emissive: eyeColor, emissiveIntensity: 2 })
    );
    eyeMesh.position.set(0, isFast ? 0.1 : 0.2, isFast ? 0.5 : 0.8);

    enemyMesh.add(bodyMesh);
    enemyMesh.add(eyeMesh);

    const healthBarRoot = new THREE.Group();
    const healthBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(isFast ? 1.5 : 2.5, 0.28),
      new THREE.MeshBasicMaterial({ color: 0x1f2835, transparent: true, opacity: 0.9, depthTest: false })
    );
    const healthBarFg = new THREE.Mesh(
      new THREE.PlaneGeometry(isFast ? 1.3 : 2.3, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x6bf4ad, transparent: true, depthTest: false })
    );
    healthBarBg.renderOrder = 20;
    healthBarFg.renderOrder = 21;
    healthBarFg.position.z = 0.01;
    healthBarRoot.add(healthBarBg);
    healthBarRoot.add(healthBarFg);
    healthBarRoot.position.set(0, isFast ? 1.2 : 1.9, 0);
    enemyMesh.add(healthBarRoot);

    scene.add(enemyMesh);
    enemyMesh.position.copy(pathWaypoints[0]);

    return {
      mesh: enemyMesh,
      bodyMesh,
      eyeMesh,
      healthBarRoot,
      healthBarFg,
      healthBarBgWidth: isFast ? 1.5 : 2.5,
      healthBarFgWidth: isFast ? 1.3 : 2.3,
      health: isFast ? 60 : 100,
      maxHealth: isFast ? 60 : 100,
      speed: isFast ? BASE_SPEED * 1.8 : BASE_SPEED,
      radius: isFast ? FAST_ENEMY_RADIUS : ENEMY_RADIUS,
      segmentIndex: 0,
      segmentProgress: 0,
      alive: true,
      type
    };
  }

  function updateHealthBar(enemy) {
    const ratio = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));
    enemy.healthBarFg.scale.x = Math.max(0.001, ratio);
    enemy.healthBarFg.position.x = -(1 - ratio) * (enemy.healthBarFgWidth / 2);
    enemy.healthBarFg.material.color.setHSL(0.28 * ratio, 0.85, 0.55);
  }

  function applyDamage(enemy, amount) {
    if (!enemy.alive) return;
    enemy.health = Math.max(0, enemy.health - amount);
    updateHealthBar(enemy);
    if (enemy.health <= 0) {
      enemy.alive = false;
      scene.remove(enemy.mesh);
    }
  }

  function update(deltaSeconds, camera) {
    // Spawn new enemies
    if (enemiesToSpawn.length > 0) {
      spawnTimer -= deltaSeconds;
      if (spawnTimer <= 0) {
        const type = enemiesToSpawn.shift();
        activeEnemies.push(createEnemyMesh(type));
        spawnTimer = 1.2; // Delay between spawns
      }
    }

    // Update existing enemies
    for (let i = activeEnemies.length - 1; i >= 0; i--) {
      const enemy = activeEnemies[i];

      if (!enemy.alive) {
        activeEnemies.splice(i, 1);
        continue;
      }

      // Move along path
      let remaining = enemy.speed * enemySpeedMultiplier * deltaSeconds;
      while (remaining > 0 && enemy.alive) {
        const start = pathWaypoints[enemy.segmentIndex];
        const end = pathWaypoints[enemy.segmentIndex + 1];
        const segmentLength = start.distanceTo(end);
        const segmentRemaining = segmentLength - enemy.segmentProgress;

        if (remaining < segmentRemaining) {
          enemy.segmentProgress += remaining;
          remaining = 0;
        } else {
          remaining -= segmentRemaining;
          enemy.segmentIndex += 1;
          enemy.segmentProgress = 0;

          if (enemy.segmentIndex >= pathWaypoints.length - 1) {
            // Reached end, maybe damage core later, for now just kill it
            enemy.alive = false;
            scene.remove(enemy.mesh);
            break;
          }
        }

        if (enemy.alive) {
          const t = segmentLength === 0 ? 0 : enemy.segmentProgress / segmentLength;
          enemy.mesh.position.lerpVectors(start, end, t);

          const lookTarget = end.clone();
          lookTarget.y = enemy.mesh.position.y;
          enemy.mesh.lookAt(lookTarget);
        }
      }

      if (enemy.alive && camera) {
        enemy.healthBarRoot.lookAt(camera.position);
      }
    }
  }

  function applyDamageAtPoint(point, hitRadius, damage) {
    let hitAny = false;
    for (const enemy of activeEnemies) {
      if (!enemy.alive) continue;
      const maxHitDistance = enemy.radius + hitRadius;
      if (enemy.mesh.position.distanceToSquared(point) <= maxHitDistance * maxHitDistance) {
        applyDamage(enemy, damage);
        hitAny = true;
      }
    }
    return hitAny;
  }

  function getTargetInRange(origin, range) {
    let closest = null;
    let closestDistSq = range * range;

    for (const enemy of activeEnemies) {
      if (!enemy.alive) continue;
      const distSq = origin.distanceToSquared(enemy.mesh.position);
      if (distSq <= closestDistSq) {
        closestDistSq = distSq;
        closest = enemy;
      }
    }

    if (closest) {
      return {
        mesh: closest.mesh,
        position: closest.mesh.position,
        distance: Math.sqrt(closestDistSq),
        health: closest.health,
        maxHealth: closest.maxHealth,
      };
    }
    return null;
  }

  function getEnemies() {
    return activeEnemies.map(e => e.mesh);
  }

  return {
    update,
    getEnemies,
    getTargetInRange,
    applyDamageAtPoint,
    startWave,
    isWaveClear,
    upgradeSlowEnemies
  };
}
