// Frontend/src/modelLoader.js
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { convertFile } from "./services/converterService";

// 1. Define Format Info for the UI (This was missing)
export const FORMAT_INFO = [
    { ext: ".step/.stp", name: "STEP", color: "bg-red-500/10 text-red-400 border border-red-500/20", icon: "🔧", requiresConversion: true },
    // { ext: ".blend", name: "Blender", color: "bg-orange-500/10 text-orange-400 border border-orange-500/20", icon: "🎨", requiresConversion: true },
    // { ext: ".ma/.mb", name: "Maya", color: "bg-pink-500/10 text-pink-400 border border-pink-500/20", icon: "🎭", requiresConversion: true },
    { ext: ".fbx", name: "FBX", color: "bg-purple-500/10 text-purple-400 border border-purple-500/20", icon: "🎬", requiresConversion: false },
    { ext: ".glb/.gltf", name: "GLTF", color: "bg-blue-500/10 text-blue-400 border border-blue-500/20", icon: "🌐", requiresConversion: false },
    { ext: ".obj", name: "OBJ", color: "bg-green-500/10 text-green-400 border border-green-500/20", icon: "📦", requiresConversion: false },
    { ext: ".stl", name: "STL", color: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", icon: "📐", requiresConversion: false },
];

// 2. Define Supported Extensions List
export const SUPPORTED_EXTENSIONS = [
    ".step", ".stp", ".blend", ".ma", ".mb", 
    ".gltf", ".glb", ".fbx", ".obj", ".stl", ".dae", ".ply"
];

// Formats that must go to the server
const COMPLEX_FORMATS = ['.step', '.stp', '.blend', '.ma', '.mb'];

// Formats handled locally in browser
const WEB_FORMATS = ['.gltf', '.glb', '.fbx', '.obj', '.stl', '.dae', '.ply'];

function setupMaterials(object) {
    object.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Add default material if needed
            if (!child.material.map && !child.material.color) {
                child.material = new THREE.MeshStandardMaterial({
                    color: 0x6366F1,
                    metalness: 0.2,
                    roughness: 0.5
                });
            }
        }
    });
    return object;
}

async function loadGLB(url) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    return setupMaterials(gltf.scene);
}

export async function loadModel(file, onProgress) {
    const filename = file.name.toLowerCase();
    const ext = '.' + filename.split('.').pop();

    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        throw new Error(`Unsupported file extension: ${ext}`);
    }

    try {
        // 1. Handle Complex Formats (Server Conversion)
        if (COMPLEX_FORMATS.includes(ext)) {
            onProgress?.(`Uploading ${ext.toUpperCase()} for conversion...`);
            
            // Upload to server
            const result = await convertFile(file, (pct) => {
                 onProgress?.(`Converting on server: ${pct}%`);
            });

            onProgress?.('Downloading converted model...');
            // Load the resulting GLB
            return await loadGLB(result.url);
        }

        // 2. Handle Web Formats (Local Loading)
        if (WEB_FORMATS.includes(ext)) {
            onProgress?.(`Parsing ${ext.toUpperCase()} locally...`);
            const objectUrl = URL.createObjectURL(file);
            let model;

            try {
                if (ext === '.glb' || ext === '.gltf') {
                    model = await loadGLB(objectUrl);
                } else if (ext === '.fbx') {
                    const fbx = await new FBXLoader().loadAsync(objectUrl);
                    model = setupMaterials(fbx);
                } else if (ext === '.obj') {
                    const obj = await new OBJLoader().loadAsync(objectUrl);
                    model = setupMaterials(obj);
                } else if (ext === '.stl') {
                    const geo = await new STLLoader().loadAsync(objectUrl);
                    const mat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.5, roughness: 0.5 });
                    model = new THREE.Mesh(geo, mat);
                    setupMaterials(model);
                }
            } finally {
                URL.revokeObjectURL(objectUrl);
            }
            return model;
        }

    } catch (error) {
        console.error("Loader Error:", error);
        throw new Error(`Failed to load model: ${error.message}`);
    }
}