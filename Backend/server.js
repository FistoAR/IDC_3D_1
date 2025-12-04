// Backend/server.js
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// CONFIGURATION
// ============================================
app.use(express.json({ limit: '1024mb' }));
app.use(cors({ origin: '*' }));

const uploadsDir = path.join(__dirname, 'uploads');
const convertedDir = path.join(__dirname, 'uploads', 'converted');

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(convertedDir, { recursive: true });

app.use('/converted', express.static(convertedDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

const upload = multer({ 
    storage,
    limits: { fileSize: 2 * 1024 * 1024 * 1024 } 
});

let processingCount = 0;
let occtInstance = null;

// ============================================
// INIT OCCT
// ============================================
async function initOCCT() {
    if (occtInstance) return occtInstance;
    try {
        const occtModule = await import('occt-import-js');
        const wasmPath = path.join(__dirname, 'node_modules', 'occt-import-js', 'dist', 'occt-import-js.wasm');
        if (fs.existsSync(wasmPath)) {
            const wasmBinary = await fsp.readFile(wasmPath);
            occtInstance = await occtModule.default({ wasmBinary });
            console.log("✅ OCCT Library Initialized");
            return occtInstance;
        }
    } catch (e) { console.warn('⚠️ OCCT Init Error:', e.message); }
    return null;
}

// ============================================
// GEOMETRY PROCESSING OPTIONS
// ============================================

/**
 * Get model bounds without modifying geometry
 */
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
        center: {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
            z: (minZ + maxZ) / 2
        },
        size: {
            x: maxX - minX,
            y: maxY - minY,
            z: maxZ - minZ
        }
    };
}

/**
 * Process geometry with options
 * @param {Array} meshes - Array of mesh objects
 * @param {Object} options - Processing options
 * @param {boolean} options.preservePosition - Keep original position (default: true)
 * @param {boolean} options.centerModel - Center the model at origin
 * @param {boolean} options.groundModel - Place model on ground (Y=0)
 * @param {boolean} options.rotateToYUp - Rotate from Z-up to Y-up
 */
function processGeometry(meshes, options = {}) {
    const {
        preservePosition = true,  // DEFAULT: Keep original position
        centerModel = false,
        groundModel = false,
        rotateToYUp = false
    } = options;

    // If preserving original position, just return meshes as-is
    if (preservePosition && !rotateToYUp) {
        console.log("   📍 Preserving original position");
        return meshes;
    }

    const bounds = getModelBounds(meshes);
    console.log(`   📐 Model bounds: ${JSON.stringify(bounds.size)}`);

    meshes.forEach(mesh => {
        const pos = mesh.positions;
        const norm = mesh.normals;

        for (let i = 0; i < pos.length; i += 3) {
            let x = pos[i], y = pos[i + 1], z = pos[i + 2];

            // Optional: Rotate from Z-up (CAD) to Y-up (WebGL)
            if (rotateToYUp) {
                const tempY = y;
                y = z;
                z = -tempY;
            }

            // Optional: Center model
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

            // Optional: Ground model (place on Y=0)
            if (groundModel && !centerModel) {
                if (rotateToYUp) {
                    y -= bounds.min.z;
                } else {
                    y -= bounds.min.y;
                }
            }

            pos[i] = x;
            pos[i + 1] = y;
            pos[i + 2] = z;
        }

        // Also rotate normals if rotating axes
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
            
            const nx = uy * vz - uz * vy;
            const ny = uz * vx - ux * vz;
            const nz = ux * vy - uy * vx;

            normals[i0] += nx; normals[i0+1] += ny; normals[i0+2] += nz;
            normals[i1] += nx; normals[i1+1] += ny; normals[i1+2] += nz;
            normals[i2] += nx; normals[i2+1] += ny; normals[i2+2] += nz;
        }
    } else {
        for (let i = 0; i < positions.length; i += 9) {
            const ux = positions[i+3] - positions[i], uy = positions[i+4] - positions[i+1], uz = positions[i+5] - positions[i+2];
            const vx = positions[i+6] - positions[i], vy = positions[i+7] - positions[i+1], vz = positions[i+8] - positions[i+2];
            
            const nx = uy * vz - uz * vy;
            const ny = uz * vx - ux * vz;
            const nz = ux * vy - uy * vx;

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
        scenes: [{ nodes: [0] }], // Root node
        scene: 0,
        nodes: [], 
        meshes: [], 
        materials: [], 
        accessors: [], 
        bufferViews: [], 
        buffers: [],
        // Add extras for bounds info
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

    // Create root node that contains all meshes
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

        const posAcc = gltf.accessors.push({ 
            bufferView: posView, 
            componentType: 5126, 
            count: m.positions.length/3, 
            type: "VEC3", 
            min, 
            max 
        }) - 1;
        
        const normAcc = gltf.accessors.push({ 
            bufferView: normView, 
            componentType: 5126, 
            count: m.normals.length/3, 
            type: "VEC3" 
        }) - 1;
        
        const indAcc = m.indices ? gltf.accessors.push({ 
            bufferView: indView, 
            componentType: 5125, 
            count: m.indices.length, 
            type: "SCALAR" 
        }) - 1 : undefined;

        gltf.meshes.push({ 
            name: m.name, 
            primitives: [{ 
                attributes: { POSITION: posAcc, NORMAL: normAcc }, 
                indices: indAcc, 
                material: i 
            }] 
        });
        
        // Create node for this mesh (index starts at 1 because 0 is root)
        const nodeIndex = gltf.nodes.push({ 
            mesh: i, 
            name: m.name 
        }) - 1;
        
        childNodes.push(nodeIndex);
    });

    // Update root node with children
    gltf.nodes.unshift({ 
        name: "Root",
        children: childNodes.map(idx => idx + 1) // Adjust indices after inserting root
    });

    // Fix node indices (they shifted by 1)
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

// ============================================
// API ROUTES
// ============================================
app.get('/api/health', (req, res) => res.json({ 
    status: processingCount > 0 ? 'busy' : 'ok',
    activeJobs: processingCount 
}));

app.post('/api/convert', upload.single('file'), async (req, res) => {
    processingCount++;
    req.setTimeout(30 * 60 * 1000); 
    res.setTimeout(30 * 60 * 1000);
    const file = req.file;

    if (!file) { 
        processingCount--; 
        return res.status(400).json({ error: 'No file' }); 
    }
    
    console.log(`\n📂 Processing: ${file.originalname}`);

    // Parse options from request body
    const options = {
        preservePosition: req.body?.preservePosition !== 'false', // Default: true
        centerModel: req.body?.centerModel === 'true',
        groundModel: req.body?.groundModel === 'true',
        rotateToYUp: req.body?.rotateToYUp === 'true'
    };
    
    console.log(`   ⚙️ Options:`, options);

    try {
        let meshes = [];
        let modelBounds = null;
        
        if (['.step', '.stp'].includes(path.extname(file.originalname).toLowerCase())) {
            const occt = await initOCCT();
            if (!occt) throw new Error("OCCT load failed");
            
            const buffer = await fsp.readFile(file.path);
            const result = occt.ReadStepFile(new Uint8Array(buffer));
            if (!result.success) throw new Error("Parse failed");

            meshes = result.meshes.map((m, i) => ({
                name: m.name || `Part_${i}`,
                positions: new Float32Array(m.attributes.position.array),
                indices: m.index ? new Uint32Array(m.index.array) : null,
                normals: m.attributes.normal ? new Float32Array(m.attributes.normal.array) : null,
                color: m.color ? [m.color[0], m.color[1], m.color[2]] : null
            }));

            // Get original bounds BEFORE any processing
            modelBounds = getModelBounds(meshes);
            console.log(`   📏 Original bounds:`, modelBounds);

            // Process geometry with options (default: preserve original position)
            meshes = processGeometry(meshes, options);

            // Compute normals where missing
            meshes.forEach(m => {
                if (!m.normals) m.normals = computeNormals(m.positions, m.indices);
            });

        } else {
            const outName = `${uuidv4()}.glb`;
            await fsp.rename(file.path, path.join(convertedDir, outName));
            processingCount--;
            return res.json({ success: true, url: `/converted/${outName}`, originalFile: true });
        }

        const glb = createGLB(meshes, modelBounds);
        const outName = `${uuidv4()}.glb`;
        await fsp.writeFile(path.join(convertedDir, outName), glb);
        await fsp.unlink(file.path).catch(() => {});

        processingCount--;
        console.log(`   ✅ Done. Size: ${(glb.length/1024/1024).toFixed(2)} MB`);
        
        res.json({ 
            success: true, 
            url: `/converted/${outName}`, 
            size: glb.length, 
            meshCount: meshes.length,
            bounds: modelBounds,
            options: options
        });

    } catch (e) {
        console.error("Error:", e);
        processingCount--;
        if(file) await fsp.unlink(file.path).catch(() => {});
        res.status(500).json({ error: e.message });
    }
});

initOCCT();
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));