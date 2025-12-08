// Backend/workers/occtWorker.js
import { parentPort, workerData } from 'worker_threads';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let occtInstance = null;

async function initOCCT() {
    if (occtInstance) return occtInstance;
    try {
        const occtModule = await import('occt-import-js');
        const wasmPath = path.join(__dirname, '..', 'node_modules', 'occt-import-js', 'dist', 'occt-import-js.wasm');
        if (fs.existsSync(wasmPath)) {
            const wasmBinary = await fsp.readFile(wasmPath);
            occtInstance = await occtModule.default({ wasmBinary });
            return occtInstance;
        }
    } catch (e) { 
        throw new Error(`OCCT Init Error: ${e.message}`);
    }
    return null;
}

function getModelBounds(meshes) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    meshes.forEach(mesh => {
        const pos = mesh.positions;
        for (let i = 0; i < pos.length; i += 3) {
            const x = pos[i], y = pos[i+1], z = pos[i+2];
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
            if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
    });

    return {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
        center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
        size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ }
    };
}

function processGeometry(meshes, options = {}) {
    const { preservePosition = true, centerModel = false, groundModel = false, rotateToYUp = false } = options;

    if (preservePosition && !rotateToYUp) return meshes;

    const bounds = getModelBounds(meshes);

    meshes.forEach(mesh => {
        const pos = mesh.positions;
        const norm = mesh.normals;

        for (let i = 0; i < pos.length; i += 3) {
            let x = pos[i], y = pos[i + 1], z = pos[i + 2];

            if (rotateToYUp) {
                const tempY = y;
                y = z;
                z = -tempY;
            }

            if (centerModel) {
                x -= bounds.center.x;
                if (rotateToYUp) {
                    y -= bounds.center.z;
                    z -= -bounds.center.y;
                } else {
                    y -= bounds.center.y;
                    z -= bounds.center.z;
                }
            }

            if (groundModel && !centerModel) {
                if (rotateToYUp) {
                    y -= bounds.min.z;
                } else {
                    y -= bounds.min.y;
                }
            }

            pos[i] = x; pos[i + 1] = y; pos[i + 2] = z;
        }

        if (rotateToYUp && norm) {
            for (let i = 0; i < norm.length; i += 3) {
                const tempY = norm[i + 1];
                norm[i + 1] = norm[i + 2];
                norm[i + 2] = -tempY;
            }
        }
    });

    return meshes;
}

function computeNormals(positions, indices) {
    const normals = new Float32Array(positions.length).fill(0);
    
    if (indices && indices.length > 0) {
        for (let i = 0; i < indices.length; i += 3) {
            const i0 = indices[i] * 3, i1 = indices[i+1] * 3, i2 = indices[i+2] * 3;
            const ux = positions[i1] - positions[i0], uy = positions[i1+1] - positions[i0+1], uz = positions[i1+2] - positions[i0+2];
            const vx = positions[i2] - positions[i0], vy = positions[i2+1] - positions[i0+1], vz = positions[i2+2] - positions[i0+2];
            
            const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;

            normals[i0] += nx; normals[i0+1] += ny; normals[i0+2] += nz;
            normals[i1] += nx; normals[i1+1] += ny; normals[i1+2] += nz;
            normals[i2] += nx; normals[i2+1] += ny; normals[i2+2] += nz;
        }
    } else {
        for (let i = 0; i < positions.length; i += 9) {
            const ux = positions[i+3] - positions[i], uy = positions[i+4] - positions[i+1], uz = positions[i+5] - positions[i+2];
            const vx = positions[i+6] - positions[i], vy = positions[i+7] - positions[i+1], vz = positions[i+8] - positions[i+2];
            
            const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;

            for (let j = 0; j < 3; j++) {
                normals[i+j*3] += nx; normals[i+j*3+1] += ny; normals[i+j*3+2] += nz;
            }
        }
    }

    for (let i = 0; i < normals.length; i += 3) {
        const l = Math.sqrt(normals[i]**2 + normals[i+1]**2 + normals[i+2]**2) || 1;
        normals[i] /= l; normals[i+1] /= l; normals[i+2] /= l;
    }
    return normals;
}

function createGLB(meshes, modelBounds = null) {
    let bufferSize = 0;
    const binChunks = [];
    const gltf = { 
        asset: { version: "2.0", generator: "STEP-Converter" }, 
        scenes: [{ nodes: [0] }],
        scene: 0,
        nodes: [], 
        meshes: [], 
        materials: [], 
        accessors: [], 
        bufferViews: [], 
        buffers: [],
        extras: modelBounds ? { originalBounds: modelBounds } : undefined
    };

    const addBuffer = (data, target) => {
        const buf = Buffer.from(data.buffer);
        const pad = (4 - (buf.length % 4)) % 4;
        const padded = pad ? Buffer.concat([buf, Buffer.alloc(pad)]) : buf;
        binChunks.push(padded);
        gltf.bufferViews.push({ buffer: 0, byteOffset: bufferSize, byteLength: buf.length, target });
        bufferSize += padded.length;
        return gltf.bufferViews.length - 1;
    };

    const childNodes = [];

    meshes.forEach((m, i) => {
        gltf.materials.push({
            name: m.name,
            pbrMetallicRoughness: { 
                baseColorFactor: [...(m.color || [0.6, 0.6, 0.6]), 1], 
                metallicFactor: 0.2, 
                roughnessFactor: 0.6 
            },
            doubleSided: true
        });

        const posView = addBuffer(m.positions, 34962);
        const normView = addBuffer(m.normals, 34962);
        const indView = m.indices ? addBuffer(m.indices, 34963) : null;

        let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for(let k = 0; k < m.positions.length; k += 3) {
            min[0] = Math.min(min[0], m.positions[k]); 
            min[1] = Math.min(min[1], m.positions[k+1]); 
            min[2] = Math.min(min[2], m.positions[k+2]);
            max[0] = Math.max(max[0], m.positions[k]); 
            max[1] = Math.max(max[1], m.positions[k+1]); 
            max[2] = Math.max(max[2], m.positions[k+2]);
        }

        const posAcc = gltf.accessors.push({ bufferView: posView, componentType: 5126, count: m.positions.length/3, type: "VEC3", min, max }) - 1;
        const normAcc = gltf.accessors.push({ bufferView: normView, componentType: 5126, count: m.normals.length/3, type: "VEC3" }) - 1;
        const indAcc = m.indices ? gltf.accessors.push({ bufferView: indView, componentType: 5125, count: m.indices.length, type: "SCALAR" }) - 1 : undefined;

        gltf.meshes.push({ name: m.name, primitives: [{ attributes: { POSITION: posAcc, NORMAL: normAcc }, indices: indAcc, material: i }] });
        const nodeIndex = gltf.nodes.push({ mesh: i, name: m.name }) - 1;
        childNodes.push(nodeIndex);
    });

    gltf.nodes.unshift({ name: "Root", children: childNodes.map(idx => idx + 1) });
    gltf.scenes[0].nodes = [0];
    gltf.buffers.push({ byteLength: bufferSize });
    
    const json = Buffer.from(JSON.stringify(gltf));
    const jsonPad = (4 - (json.length % 4)) % 4;
    const bin = Buffer.concat(binChunks);
    
    const total = 12 + 8 + json.length + jsonPad + 8 + bin.length;
    const head = Buffer.alloc(12); 
    head.writeUInt32LE(0x46546C67, 0); 
    head.writeUInt32LE(2, 4); 
    head.writeUInt32LE(total, 8);
    
    const jHead = Buffer.alloc(8); 
    jHead.writeUInt32LE(json.length + jsonPad, 0); 
    jHead.writeUInt32LE(0x4E4F534A, 4);
    const bHead = Buffer.alloc(8); 
    bHead.writeUInt32LE(bin.length, 0); 
    bHead.writeUInt32LE(0x004E4942, 4);

    return Buffer.concat([head, jHead, json, Buffer.alloc(jsonPad, 0x20), bHead, bin]);
}

// Main worker function
async function processSTEPFile() {
    const { filePath, options, sessionId } = workerData;
    
    try {
        // Send progress updates
        parentPort.postMessage({ type: 'progress', phase: 'initializing', percent: 5 });
        
        const occt = await initOCCT();
        if (!occt) throw new Error("OCCT load failed");
        
        parentPort.postMessage({ type: 'progress', phase: 'reading', percent: 15 });
        
        const buffer = await fsp.readFile(filePath);
        
        parentPort.postMessage({ type: 'progress', phase: 'parsing', percent: 30 });
        
        const result = occt.ReadStepFile(new Uint8Array(buffer));
        if (!result.success) throw new Error("STEP parse failed");

        parentPort.postMessage({ type: 'progress', phase: 'processing', percent: 50 });

        let meshes = result.meshes.map((m, i) => ({
            name: m.name || `Part_${i}`,
            positions: new Float32Array(m.attributes.position.array),
            indices: m.index ? new Uint32Array(m.index.array) : null,
            normals: m.attributes.normal ? new Float32Array(m.attributes.normal.array) : null,
            color: m.color ? [m.color[0], m.color[1], m.color[2]] : null
        }));

        const modelBounds = getModelBounds(meshes);
        
        parentPort.postMessage({ type: 'progress', phase: 'geometry', percent: 65 });
        
        meshes = processGeometry(meshes, options);

        meshes.forEach(m => {
            if (!m.normals) m.normals = computeNormals(m.positions, m.indices);
        });

        parentPort.postMessage({ type: 'progress', phase: 'creating_glb', percent: 80 });

        const glb = createGLB(meshes, modelBounds);
        
        parentPort.postMessage({ type: 'progress', phase: 'complete', percent: 100 });

        // Send result
        parentPort.postMessage({ 
            type: 'result',
            success: true,
            glbBuffer: glb,
            meshCount: meshes.length,
            bounds: modelBounds,
            size: glb.length
        });

    } catch (error) {
        parentPort.postMessage({ 
            type: 'error',
            error: error.message 
        });
    }
}

processSTEPFile();