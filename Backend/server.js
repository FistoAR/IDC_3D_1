import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import dotenv from "dotenv";

// Load environment variables FIRST
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.API_PORT || process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Directories
const uploadsDir = path.join(__dirname, 'uploads');
const convertedDir = path.join(__dirname, 'uploads', 'converted');

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(convertedDir, { recursive: true });

app.use('/converted', express.static(convertedDir));
app.use('/uploads', express.static(uploadsDir));

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }
});

// ============================================
// OCCT for STEP files
// ============================================

let occtInstance = null;

async function initOCCT() {
    if (occtInstance) return occtInstance;
    try {
        const occtModule = await import('occt-import-js');
        const wasmPath = path.join(__dirname, 'node_modules', 'occt-import-js', 'dist', 'occt-import-js.wasm');
        
        if (!fs.existsSync(wasmPath)) {
            console.warn('⚠️ OCCT WASM not found. Run: npm install occt-import-js');
            return null;
        }

        occtInstance = await occtModule.default({
            wasmBinary: fs.readFileSync(wasmPath)
        });
        return occtInstance;
    } catch (e) {
        console.warn('⚠️ OCCT not available:', e.message);
        return null;
    }
}

// ============================================
// Utility Functions
// ============================================

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
            processTriangle(indices[i], indices[i+1], indices[i+2]);
        }
    } else {
        for (let i = 0; i < positions.length / 9; i++) {
            processTriangle(i * 3, i * 3 + 1, i * 3 + 2);
        }
    }

    for (let i = 0; i < normals.length; i += 3) {
        const x = normals[i], y = normals[i+1], z = normals[i+2];
        const len = Math.sqrt(x*x + y*y + z*z) || 1;
        normals[i] = x/len; normals[i+1] = y/len; normals[i+2] = z/len;
    }
    return normals;
}

/**
 * Generate UV coordinates using triplanar box projection
 * This works well for CAD models without existing UVs
 */
function generateUVs(positions, normals) {
    const vertexCount = positions.length / 3;
    const uvs = new Float32Array(vertexCount * 2);
    
    // Calculate bounding box for normalization
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    for (let i = 0; i < positions.length; i += 3) {
        minX = Math.min(minX, positions[i]);
        maxX = Math.max(maxX, positions[i]);
        minY = Math.min(minY, positions[i + 1]);
        maxY = Math.max(maxY, positions[i + 1]);
        minZ = Math.min(minZ, positions[i + 2]);
        maxZ = Math.max(maxZ, positions[i + 2]);
    }
    
    const sizeX = maxX - minX || 1;
    const sizeY = maxY - minY || 1;
    const sizeZ = maxZ - minZ || 1;
    const maxSize = Math.max(sizeX, sizeY, sizeZ);
    
    for (let i = 0; i < vertexCount; i++) {
        const px = positions[i * 3];
        const py = positions[i * 3 + 1];
        const pz = positions[i * 3 + 2];
        
        // Get normal for this vertex
        const nx = Math.abs(normals[i * 3]);
        const ny = Math.abs(normals[i * 3 + 1]);
        const nz = Math.abs(normals[i * 3 + 2]);
        
        let u, v;
        
        // Triplanar projection based on dominant normal direction
        if (nx >= ny && nx >= nz) {
            // Project from X axis (use Y and Z)
            u = (pz - minZ) / maxSize;
            v = (py - minY) / maxSize;
        } else if (ny >= nx && ny >= nz) {
            // Project from Y axis (use X and Z)
            u = (px - minX) / maxSize;
            v = (pz - minZ) / maxSize;
        } else {
            // Project from Z axis (use X and Y)
            u = (px - minX) / maxSize;
            v = (py - minY) / maxSize;
        }
        
        uvs[i * 2] = u;
        uvs[i * 2 + 1] = v;
    }
    
    return uvs;
}

function generateColor(index) {
    const colors = [
        { r: 0.9, g: 0.3, b: 0.2 },  // Red
        { r: 0.2, g: 0.6, b: 0.9 },  // Blue
        { r: 0.3, g: 0.8, b: 0.3 },  // Green
        { r: 0.9, g: 0.7, b: 0.2 },  // Orange
        { r: 0.7, g: 0.2, b: 0.8 },  // Purple
        { r: 0.2, g: 0.8, b: 0.8 },  // Cyan
        { r: 0.9, g: 0.4, b: 0.6 },  // Pink
        { r: 0.5, g: 0.5, b: 0.5 },  // Gray
        { r: 0.8, g: 0.8, b: 0.3 },  // Yellow
        { r: 0.4, g: 0.3, b: 0.7 }   // Indigo
    ];
    return colors[index % colors.length];
}

// ============================================
// GLB Creator - WITH UV SUPPORT
// ============================================

function createGLB(meshes) {
    const gltf = {
        asset: { version: "2.0", generator: "NodeJS-CAD-Converter-Pro" },
        scene: 0,
        scenes: [{ nodes: [] }],
        nodes: [],
        meshes: [],
        accessors: [],
        bufferViews: [],
        buffers: [{ byteLength: 0 }],
        materials: []
    };

    const binChunks = [];
    let offset = 0;
    const pad = (n) => (4 - (n % 4)) % 4;

    meshes.forEach((m, i) => {
        const color = m.color || generateColor(i);
        gltf.materials.push({
            name: `Material_${i}`,
            pbrMetallicRoughness: { 
                baseColorFactor: [color.r, color.g, color.b, 1], 
                metallicFactor: 0.2, 
                roughnessFactor: 0.6 
            },
            doubleSided: true
        });

        // Positions
        const positions = new Float32Array(m.positions);
        const posBuf = Buffer.from(positions.buffer);
        let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for(let k = 0; k < positions.length; k += 3) {
            for(let d = 0; d < 3; d++) {
                min[d] = Math.min(min[d], positions[k + d]);
                max[d] = Math.max(max[d], positions[k + d]);
            }
        }

        gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: posBuf.length, target: 34962 });
        const posAccIdx = gltf.accessors.length;
        gltf.accessors.push({ 
            bufferView: gltf.bufferViews.length - 1, 
            componentType: 5126, 
            count: positions.length / 3, 
            type: "VEC3", 
            min, 
            max 
        });
        binChunks.push(posBuf);
        offset += posBuf.length;
        const posPad = pad(posBuf.length);
        if (posPad) {
            binChunks.push(Buffer.alloc(posPad));
            offset += posPad;
        }

        // Normals
        const normals = m.normals instanceof Float32Array ? m.normals : new Float32Array(m.normals);
        const normBuf = Buffer.from(normals.buffer);
        gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: normBuf.length, target: 34962 });
        const normAccIdx = gltf.accessors.length;
        gltf.accessors.push({ 
            bufferView: gltf.bufferViews.length - 1, 
            componentType: 5126, 
            count: normals.length / 3, 
            type: "VEC3" 
        });
        binChunks.push(normBuf);
        offset += normBuf.length;
        const normPad = pad(normBuf.length);
        if (normPad) {
            binChunks.push(Buffer.alloc(normPad));
            offset += normPad;
        }

        // ============================================
        // UV COORDINATES - NEW ADDITION
        // ============================================
        let uvAccIdx = null;
        const uvs = m.uvs ? new Float32Array(m.uvs) : generateUVs(positions, normals);
        const uvBuf = Buffer.from(uvs.buffer);
        
        gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: uvBuf.length, target: 34962 });
        uvAccIdx = gltf.accessors.length;
        gltf.accessors.push({ 
            bufferView: gltf.bufferViews.length - 1, 
            componentType: 5126, 
            count: uvs.length / 2, 
            type: "VEC2" 
        });
        binChunks.push(uvBuf);
        offset += uvBuf.length;
        const uvPad = pad(uvBuf.length);
        if (uvPad) {
            binChunks.push(Buffer.alloc(uvPad));
            offset += uvPad;
        }

        // Indices (optional)
        let indAccIdx = null;
        if (m.indices && m.indices.length > 0) {
            const indices = new Uint32Array(m.indices);
            const indBuf = Buffer.from(indices.buffer);
            gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: indBuf.length, target: 34963 });
            indAccIdx = gltf.accessors.length;
            gltf.accessors.push({ 
                bufferView: gltf.bufferViews.length - 1, 
                componentType: 5125, 
                count: indices.length, 
                type: "SCALAR" 
            });
            binChunks.push(indBuf);
            offset += indBuf.length;
            const indPad = pad(indBuf.length);
            if (indPad) {
                binChunks.push(Buffer.alloc(indPad));
                offset += indPad;
            }
        }

        const primitive = { 
            attributes: { 
                POSITION: posAccIdx, 
                NORMAL: normAccIdx,
                TEXCOORD_0: uvAccIdx  // Add UV attribute
            }, 
            material: i 
        };
        if (indAccIdx !== null) {
            primitive.indices = indAccIdx;
        }

        gltf.meshes.push({ name: m.name, primitives: [primitive] });
        gltf.nodes.push({ name: m.name, mesh: gltf.meshes.length - 1 });
        gltf.scenes[0].nodes.push(gltf.nodes.length - 1);
    });

    gltf.buffers[0].byteLength = offset;

    const jsonStr = JSON.stringify(gltf);
    const jsonBuf = Buffer.from(jsonStr);
    const binBuf = Buffer.concat(binChunks);
    
    const jsonPadLen = pad(jsonBuf.length);
    const binPadLen = pad(binBuf.length);
    const totalLen = 12 + 8 + jsonBuf.length + jsonPadLen + 8 + binBuf.length + binPadLen;

    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546C67, 0); // glTF magic
    header.writeUInt32LE(2, 4); // version
    header.writeUInt32LE(totalLen, 8);

    const jsonChunkHeader = Buffer.alloc(8);
    jsonChunkHeader.writeUInt32LE(jsonBuf.length + jsonPadLen, 0);
    jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // JSON

    const binChunkHeader = Buffer.alloc(8);
    binChunkHeader.writeUInt32LE(binBuf.length + binPadLen, 0);
    binChunkHeader.writeUInt32LE(0x004E4942, 4); // BIN

    return Buffer.concat([
        header, 
        jsonChunkHeader, jsonBuf, Buffer.alloc(jsonPadLen, 0x20), 
        binChunkHeader, binBuf, Buffer.alloc(binPadLen, 0)
    ]);
}

// ============================================
// OBJ Parser - WITH UV SUPPORT
// ============================================
class OBJParser {
    constructor(buffer) {
        this.buffer = buffer;
    }
    parse() {
        const text = this.buffer.toString('utf-8');
        const lines = text.split('\n');
        
        const vertices = [];
        const normals = [];
        const texCoords = [];
        const faces = [];
        
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const cmd = parts[0];
            
            if (cmd === 'v') {
                vertices.push(
                    parseFloat(parts[1]) || 0,
                    parseFloat(parts[2]) || 0,
                    parseFloat(parts[3]) || 0
                );
            } else if (cmd === 'vn') {
                normals.push(
                    parseFloat(parts[1]) || 0,
                    parseFloat(parts[2]) || 0,
                    parseFloat(parts[3]) || 0
                );
            } else if (cmd === 'vt') {
                texCoords.push(
                    parseFloat(parts[1]) || 0,
                    parseFloat(parts[2]) || 0
                );
            } else if (cmd === 'f') {
                const faceData = [];
                for (let i = 1; i < parts.length; i++) {
                    const indices = parts[i].split('/');
                    faceData.push({
                        v: parseInt(indices[0]) - 1,
                        vt: indices[1] ? parseInt(indices[1]) - 1 : -1,
                        vn: indices[2] ? parseInt(indices[2]) - 1 : -1
                    });
                }
                // Triangulate
                for (let i = 1; i < faceData.length - 1; i++) {
                    faces.push(faceData[0], faceData[i], faceData[i + 1]);
                }
            }
        }

        if (vertices.length < 9) return [];

        const positions = [];
        const finalNormals = [];
        const finalUVs = [];
        
        for (const face of faces) {
            positions.push(
                vertices[face.v * 3],
                vertices[face.v * 3 + 1],
                vertices[face.v * 3 + 2]
            );
            
            if (face.vt >= 0 && texCoords.length > 0) {
                finalUVs.push(
                    texCoords[face.vt * 2] || 0,
                    texCoords[face.vt * 2 + 1] || 0
                );
            }
            
            if (face.vn >= 0 && normals.length > 0) {
                finalNormals.push(
                    normals[face.vn * 3] || 0,
                    normals[face.vn * 3 + 1] || 0,
                    normals[face.vn * 3 + 2] || 0
                );
            }
        }

        const computedNormals = finalNormals.length === positions.length 
            ? finalNormals 
            : Array.from(computeNormals(new Float32Array(positions), null));

        return [{
            name: 'OBJ_Mesh',
            positions: positions,
            normals: computedNormals,
            uvs: finalUVs.length === (positions.length / 3) * 2 ? finalUVs : null,
            indices: null,
            color: { r: 0.7, g: 0.7, b: 0.7 }
        }];
    }
}

// ============================================
// STL Parser
// ============================================
class STLParser {
    constructor(buffer) {
        this.buffer = buffer;
    }
    parse() {
        const header = this.buffer.slice(0, 80).toString('utf-8');
        if (header.startsWith('solid') && this.buffer.indexOf('\n') < 100) {
            return this.parseAscii();
        }
        return this.parseBinary();
    }

    parseAscii() {
        const text = this.buffer.toString('utf-8');
        const positions = [];
        const normals = [];
        
        const vertexRegex = /vertex\s+(-?\d+\.?\d*(?:e[+-]?\d+)?)\s+(-?\d+\.?\d*(?:e[+-]?\d+)?)\s+(-?\d+\.?\d*(?:e[+-]?\d+)?)/gi;
        const normalRegex = /facet\s+normal\s+(-?\d+\.?\d*(?:e[+-]?\d+)?)\s+(-?\d+\.?\d*(?:e[+-]?\d+)?)\s+(-?\d+\.?\d*(?:e[+-]?\d+)?)/gi;
        
        let match;
        while ((match = vertexRegex.exec(text)) !== null) {
            positions.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
        }
        
        while ((match = normalRegex.exec(text)) !== null) {
            for (let i = 0; i < 3; i++) {
                normals.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
            }
        }

        if (positions.length < 9) return [];

        return [{
            name: 'STL_Mesh',
            positions,
            normals: normals.length === positions.length ? normals : Array.from(computeNormals(new Float32Array(positions), null)),
            uvs: null, // STL doesn't have UVs, will be generated
            indices: null,
            color: { r: 0.8, g: 0.8, b: 0.8 }
        }];
    }

    parseBinary() {
        const triangleCount = this.buffer.readUInt32LE(80);
        const positions = [];
        const normals = [];
        
        let offset = 84;
        for (let i = 0; i < triangleCount && offset < this.buffer.length - 50; i++) {
            const nx = this.buffer.readFloatLE(offset);
            const ny = this.buffer.readFloatLE(offset + 4);
            const nz = this.buffer.readFloatLE(offset + 8);
            offset += 12;
            
            for (let v = 0; v < 3; v++) {
                positions.push(
                    this.buffer.readFloatLE(offset),
                    this.buffer.readFloatLE(offset + 4),
                    this.buffer.readFloatLE(offset + 8)
                );
                normals.push(nx, ny, nz);
                offset += 12;
            }
            
            offset += 2;
        }

        if (positions.length < 9) return [];

        return [{
            name: 'STL_Mesh',
            positions,
            normals,
            uvs: null, // Will be generated
            indices: null,
            color: { r: 0.8, g: 0.8, b: 0.8 }
        }];
    }
}

// ============================================
// API Endpoints
// ============================================
app.post('/api/convert', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const inputPath = req.file.path;
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📁 Processing: ${originalName}`);
    console.log(`   Size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Format: ${ext.toUpperCase()}`);

    try {
        const buffer = fs.readFileSync(inputPath);
        let meshes = [];

        if (['.step', '.stp'].includes(ext)) {
            console.log('   🔧 Using OCCT Library for STEP...');
            const occt = await initOCCT();
            if (!occt) throw new Error("OCCT Library not initialized. Run: npm install occt-import-js");
            
            const result = occt.ReadStepFile(new Uint8Array(buffer));
            if (!result.success) throw new Error("OCCT failed to parse STEP file");
            
            result.meshes.forEach((m, i) => {
                const pos = new Float32Array(m.attributes.position.array);
                const ind = m.index ? Array.from(m.index.array) : null;
                const normArray = m.attributes.normal ? 
                    Array.from(m.attributes.normal.array) : 
                    Array.from(computeNormals(pos, ind));
                
                meshes.push({
                    name: m.name || `STEP_Part_${i}`,
                    positions: Array.from(pos),
                    normals: normArray,
                    uvs: null, // STEP files don't have UVs, will be generated
                    indices: ind,
                    color: m.color ? 
                        { r: m.color[0], g: m.color[1], b: m.color[2] } : 
                        generateColor(i)
                });
            });
            console.log(`   ✅ OCCT extracted ${meshes.length} parts`);
        }

        else if (ext === '.obj') {
            console.log('   📐 Parsing OBJ file...');
            const parser = new OBJParser(buffer);
            meshes = parser.parse();
            console.log(`   ✅ Parsed ${meshes.length} meshes from OBJ`);
        }

        else if (ext === '.stl') {
            console.log('   🔺 Parsing STL file...');
            const parser = new STLParser(buffer);
            meshes = parser.parse();
            console.log(`   ✅ Parsed ${meshes.length} meshes from STL`);
        }

        else if (['.glb', '.gltf'].includes(ext)) {
            console.log('   📤 GLB/GLTF pass-through...');
            const outputFilename = `${uuidv4()}${ext}`;
            const outputPath = path.join(convertedDir, outputFilename);
            fs.renameSync(inputPath, outputPath);
            
            return res.json({
                success: true,
                url: `/converted/${outputFilename}`,
                format: ext.toUpperCase().slice(1),
                originalName,
                passthrough: true
            });
        }

        else if (ext === '.fbx') {
            console.log('   ⚠️ FBX files require external tools for full conversion');
            const outputFilename = `${uuidv4()}.fbx`;
            const outputPath = path.join(convertedDir, outputFilename);
            fs.renameSync(inputPath, outputPath);
            
            return res.json({
                success: true,
                url: `/converted/${outputFilename}`,
                format: 'FBX',
                originalName,
                passthrough: true,
                warning: 'FBX passed through. Use Three.js FBXLoader on client.'
            });
        }

        else {
            throw new Error(`Unsupported format: ${ext}`);
        }

        if (meshes.length === 0) {
            throw new Error("No geometry found in file. The file may be empty or corrupted.");
        }

        meshes = meshes.filter(m => {
            if (!m.positions || m.positions.length < 9) return false;
            for (let i = 0; i < Math.min(m.positions.length, 100); i++) {
                if (!Number.isFinite(m.positions[i])) return false;
            }
            return true;
        });

        if (meshes.length === 0) {
            throw new Error("No valid geometry found after validation.");
        }

        console.log(`   💾 Generating GLB with ${meshes.length} mesh(es) + UVs...`);
        
        let totalVertices = 0;
        let totalTriangles = 0;
        meshes.forEach(m => {
            totalVertices += m.positions.length / 3;
            totalTriangles += m.indices ? m.indices.length / 3 : m.positions.length / 9;
        });
        console.log(`   📊 Total: ${totalVertices.toLocaleString()} vertices, ${Math.floor(totalTriangles).toLocaleString()} triangles`);

        const glbBuffer = createGLB(meshes);
        const outputFilename = `${uuidv4()}.glb`;
        const outputPath = path.join(convertedDir, outputFilename);
        
        fs.writeFileSync(outputPath, glbBuffer);
        
        if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
        }

        console.log(`   ✅ GLB saved: ${outputFilename} (${(glbBuffer.length / 1024).toFixed(1)} KB)`);
        console.log(`${'='.repeat(60)}\n`);

        res.json({
            success: true,
            url: `/converted/${outputFilename}`,
            format: 'GLB',
            size: glbBuffer.length,
            originalName,
            meshCount: meshes.length,
            vertices: totalVertices,
            triangles: Math.floor(totalTriangles),
            hasUVs: true
        });

    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        
        if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
        }
        
        res.status(500).json({ 
            error: error.message,
            format: ext,
            suggestion: getSuggestion(ext, error.message)
        });
    }
});

function getSuggestion(ext, errorMsg) {
    const suggestions = {
        '.fbx': 'FBX requires Autodesk libraries. Consider exporting as GLB from your 3D software.',
        '.step': 'Ensure occt-import-js is installed: npm install occt-import-js',
        '.stp': 'Ensure occt-import-js is installed: npm install occt-import-js'
    };
    return suggestions[ext] || 'Try exporting as GLB, OBJ, or STL from your 3D software.';
}

app.get('/api/health', async (req, res) => {
    const occt = await initOCCT();
    res.json({
        status: 'ok',
        version: '2.6.0',
        capabilities: {
            step: !!occt,
            obj: true,
            stl: true,
            glb: true,
            gltf: true,
            fbx: 'passthrough',
            uvGeneration: true
        },
        mode: "Pure JavaScript - Optimized Parsers with UV Support"
    });
});

app.get('/api/formats', (req, res) => {
    res.json({
        supported: [
            { ext: '.step, .stp', name: 'STEP', status: 'full', library: 'occt-import-js', uvs: 'auto-generated' },
            { ext: '.obj', name: 'Wavefront OBJ', status: 'full', library: 'native', uvs: 'preserved or auto-generated' },
            { ext: '.stl', name: 'STL', status: 'full', library: 'native', uvs: 'auto-generated' },
            { ext: '.glb, .gltf', name: 'glTF', status: 'passthrough', library: 'native', uvs: 'preserved' },
            { ext: '.fbx', name: 'FBX', status: 'passthrough', library: 'client-side', uvs: 'preserved' }
        ],
        output: 'GLB (Binary glTF 2.0) with UV coordinates'
    });
});

setInterval(() => {
    const maxAge = 60 * 60 * 1000;
    const now = Date.now();
    [convertedDir, uploadsDir].forEach(dir => {
        if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach(file => {
                const filePath = path.join(dir, file);
                try {
                    const stat = fs.statSync(filePath);
                    if (stat.isFile() && now - stat.mtimeMs > maxAge) {
                        fs.unlinkSync(filePath);
                        console.log(`🧹 Cleaned up: ${file}`);
                    }
                } catch (e) {}
            });
        }
    });
}, 30 * 60 * 1000);

initOCCT()
    .then(occt => console.log(occt ? '✅ OCCT initialized' : '⚠️ OCCT not available'))
    .catch(e => console.log('⚠️ OCCT init error:', e.message));

app.listen(PORT || 5000, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 CAD Converter Server v2.6 - With UV Support`);
    console.log(`   Port: ${PORT || 5000}`);
    console.log(`   Mode: Pure JavaScript + Auto UV Generation`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\n📋 Supported formats:`);
    console.log(`   ✅ STEP/STP - via occt-import-js + auto UVs`);
    console.log(`   ✅ OBJ - native parser + UV preservation`);
    console.log(`   ✅ STL - native parser + auto UVs`);
    console.log(`   ✅ GLB/GLTF - passthrough`);
    console.log(`   ⚠️ FBX - passthrough (use client loader)`);
    console.log(`\n🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Convert endpoint: POST http://localhost:${PORT}/api/convert`);
    console.log('');
});