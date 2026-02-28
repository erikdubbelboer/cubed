import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

export const models = {};

const modelPaths = {
    gate_complex: "./kenney_space-kit/Models/GLTF format/gate_complex.glb",
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
