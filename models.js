import * as THREE from "https://esm.sh/three@0.161.0";
import { GLTFLoader } from "https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

export const models = {};

const modelPaths = {
    weapon_gun: "./kenney_space-kit/Models/GLTF format/weapon_gun.glb",
    weapon_rifle: "./kenney_space-kit/Models/GLTF format/weapon_rifle.glb", // just in case
    turret_single: "./kenney_space-kit/Models/GLTF format/turret_single.glb",
    turret_double: "./kenney_space-kit/Models/GLTF format/turret_double.glb",
    machine_barrelLarge: "./kenney_space-kit/Models/GLTF format/machine_barrelLarge.glb",
    alien: "./kenney_space-kit/Models/GLTF format/alien.glb",
    craft_speederA: "./kenney_space-kit/Models/GLTF format/craft_speederA.glb",
    craft_miner: "./kenney_space-kit/Models/GLTF format/craft_miner.glb",
};

export async function loadModels() {
    const promises = Object.entries(modelPaths).map(async ([name, path]) => {
        return new Promise((resolve, reject) => {
            loader.load(
                path,
                (gltf) => {
                    const clips = Array.isArray(gltf.animations) ? gltf.animations : [];

                    // Add cast/receive shadow to all meshes
                    gltf.scene.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    // Center model in X/Z by translating CHILDREN but keep Y at base
                    const box = new THREE.Box3().setFromObject(gltf.scene);
                    const center = box.getCenter(new THREE.Vector3());
                    gltf.scene.children.forEach(child => {
                        child.position.x -= center.x;
                        child.position.z -= center.z;
                    });

                    gltf.scene.userData.animationClips = clips;
                    models[name] = gltf.scene;
                    resolve();
                },
                undefined,
                (err) => reject(err)
            );
        });
    });

    await Promise.all(promises);
}

// Utility to clone a model (GLTF objects need to be cloned if used multiple times)
export function getModel(name) {
    if (!models[name]) return null;
    const source = models[name];
    const clone = source.clone(true);
    if (Array.isArray(source.userData.animationClips)) {
        clone.userData.animationClips = source.userData.animationClips.map((clip) => clip.clone());
    }
    return clone;
}
