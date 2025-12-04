// Backend/occt-worker.js
import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processSTEP(filePath) {
    try {
        parentPort.postMessage({ type: 'progress', stage: 'loading', percent: 5 });
        
        // Load OCCT
        const occtModule = await import('occt-import-js');
        const wasmPath = path.join(__dirname, 'node_modules', 'occt-import-js', 'dist', 'occt-import-js.wasm');
        
        parentPort.postMessage({ type: 'progress', stage: 'initializing', percent: 10 });
        
        const wasmBinary = fs.readFileSync(wasmPath);
        const occt = await occtModule.default({ wasmBinary });
        
        parentPort.postMessage({ type: 'progress', stage: 'reading', percent: 15 });
        
        // Read file
        const fileBuffer = fs.readFileSync(filePath);
        
        parentPort.postMessage({ type: 'progress', stage: 'parsing', percent: 20 });
        
        // Parse STEP - This is the slow part
        const result = occt.ReadStepFile(new Uint8Array(fileBuffer));
        
        if (!result.success) {
            throw new Error('OCCT failed to parse STEP file');
        }
        
        parentPort.postMessage({ type: 'progress', stage: 'processing', percent: 60 });
        
        // Process meshes
        const meshes = [];
        const totalMeshes = result.meshes.length;
        
        for (let i = 0; i < totalMeshes; i++) {
            const m = result.meshes[i];
            const positions = m.attributes.position.array;
            
            let normals;
            if (m.attributes.normal?.array) {
                normals = m.attributes.normal.array;
            } else {
                normals = computeNormals(positions, m.index?.array);
            }
            
            meshes.push({
                name: m.name || `Part_${i}`,
                positions: Array.from(positions),
                normals: Array.from(normals),
                indices: m.index?.array ? Array.from(m.index.array) : null,
                color: m.color ? { r: m.color[0], g: m.color[1], b: m.color[2] } : null
            });
            
            // Progress update every 10 meshes
            if (i % 10 === 0) {
                const meshProgress = 60 + (i / totalMeshes) * 30;
                parentPort.postMessage({ type: 'progress', stage: 'processing', percent: Math.round(meshProgress), mesh: i, total: totalMeshes });
            }
        }
        
        parentPort.postMessage({ type: 'progress', stage: 'complete', percent: 95 });
        parentPort.postMessage({ type: 'result', meshes });
        
    } catch (error) {
        parentPort.postMessage({ type: 'error', message: error.message });
    }
}

function computeNormals(positions, indices) {
    const normals = new Float32Array(positions.length);
    
    const processTriangle = (i0, i1, i2) => {
        const ax = positions[i0 * 3], ay = positions[i0 * 3 + 1], az = positions[i0 * 3 + 2];
        const bx = positions[i1 * 3], by = positions[i1 * 3 + 1], bz = positions[i1 * 3 + 2];
        const cx = positions[i2 * 3], cy = positions[i2 * 3 + 1], cz = positions[i2 * 3 + 2];
        
        const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
        const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
        
        const nx = e1y * e2z - e1z * e2y;
        const ny = e1z * e2x - e1x * e2z;
        const nz = e1x * e2y - e1y * e2x;
        
        normals[i0 * 3] += nx; normals[i0 * 3 + 1] += ny; normals[i0 * 3 + 2] += nz;
        normals[i1 * 3] += nx; normals[i1 * 3 + 1] += ny; normals[i1 * 3 + 2] += nz;
        normals[i2 * 3] += nx; normals[i2 * 3 + 1] += ny; normals[i2 * 3 + 2] += nz;
    };
    
    if (indices?.length) {
        for (let i = 0; i < indices.length; i += 3) {
            processTriangle(indices[i], indices[i + 1], indices[i + 2]);
        }
    } else {
        for (let i = 0; i < positions.length / 9; i++) {
            processTriangle(i * 3, i * 3 + 1, i * 3 + 2);
        }
    }
    
    for (let i = 0; i < normals.length; i += 3) {
        const x = normals[i], y = normals[i + 1], z = normals[i + 2];
        const len = Math.sqrt(x * x + y * y + z * z) || 1;
        normals[i] /= len; normals[i + 1] /= len; normals[i + 2] /= len;
    }
    
    return normals;
}

// Start processing
processSTEP(workerData.filePath);