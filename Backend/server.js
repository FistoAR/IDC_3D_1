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
const CONFIG = {
    // File cleanup settings
    CLEANUP_INTERVAL_MS: 15 * 60 * 1000,        // Run cleanup every 15 minutes
    MAX_FILE_AGE_MS: 60 * 60 * 1000,            // Delete files older than 1 hour
    MAX_STORAGE_MB: 5 * 1024,                    // Max 5GB storage
    MIN_FREE_SPACE_MB: 500,                      // Keep at least 500MB free
    
    // Upload limits
    MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024,      // 2GB max file size
    MAX_CONCURRENT_JOBS: 5,                      // Max concurrent conversions
    
    // Timeout settings
    REQUEST_TIMEOUT_MS: 30 * 60 * 1000,         // 30 minute timeout
};

app.use(express.json({ limit: '1024mb' }));
app.use(cors({ origin: '*' }));

const uploadsDir = path.join(__dirname, 'uploads');
const convertedDir = path.join(__dirname, 'uploads', 'converted');
const tempDir = path.join(__dirname, 'uploads', 'temp');

// Create directories
[uploadsDir, convertedDir, tempDir].forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
});

app.use('/converted', express.static(convertedDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

const upload = multer({ 
    storage,
    limits: { fileSize: CONFIG.MAX_FILE_SIZE } 
});

// ============================================
// STATE MANAGEMENT
// ============================================
let processingCount = 0;
let occtInstance = null;
let cleanupStats = {
    lastRun: null,
    filesDeleted: 0,
    spaceFreed: 0,
    totalCleanups: 0
};

// Track active files (files currently being processed or recently created)
const activeFiles = new Map(); // filename -> { createdAt, sessionId }

// ============================================
// CLEANUP UTILITIES
// ============================================

/**
 * Get directory size in bytes
 */
async function getDirectorySize(dirPath) {
    let totalSize = 0;
    try {
        const files = await fsp.readdir(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            try {
                const stats = await fsp.stat(filePath);
                if (stats.isFile()) {
                    totalSize += stats.size;
                } else if (stats.isDirectory()) {
                    totalSize += await getDirectorySize(filePath);
                }
            } catch (e) {
                // File might have been deleted
            }
        }
    } catch (e) {
        console.warn(`Could not read directory ${dirPath}:`, e.message);
    }
    return totalSize;
}

/**
 * Get disk free space
 */
async function getFreeDiskSpace() {
    try {
        // For Unix-like systems
        if (process.platform !== 'win32') {
            const { execSync } = await import('child_process');
            const output = execSync(`df -k "${__dirname}" | tail -1 | awk '{print $4}'`).toString().trim();
            return parseInt(output) * 1024; // Convert KB to bytes
        }
        // For Windows, return a large number (we'll rely on directory size limits)
        return 100 * 1024 * 1024 * 1024; // 100GB default
    } catch (e) {
        console.warn('Could not get free disk space:', e.message);
        return 100 * 1024 * 1024 * 1024;
    }
}

/**
 * Get all files with stats in a directory
 */
async function getFilesWithStats(dirPath) {
    const files = [];
    try {
        const entries = await fsp.readdir(dirPath);
        for (const entry of entries) {
            const filePath = path.join(dirPath, entry);
            try {
                const stats = await fsp.stat(filePath);
                if (stats.isFile()) {
                    files.push({
                        name: entry,
                        path: filePath,
                        size: stats.size,
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime,
                        age: Date.now() - stats.mtime.getTime()
                    });
                }
            } catch (e) {
                // File might have been deleted
            }
        }
    } catch (e) {
        console.warn(`Could not read directory ${dirPath}:`, e.message);
    }
    return files;
}

/**
 * Delete a file safely
 */
async function safeDeleteFile(filePath, reason = 'cleanup') {
    try {
        await fsp.unlink(filePath);
        console.log(`   🗑️  Deleted: ${path.basename(filePath)} (${reason})`);
        return true;
    } catch (e) {
        if (e.code !== 'ENOENT') {
            console.warn(`   ⚠️  Failed to delete ${path.basename(filePath)}:`, e.message);
        }
        return false;
    }
}

/**
 * Clean up old files from a directory
 */
async function cleanupDirectory(dirPath, options = {}) {
    const {
        maxAge = CONFIG.MAX_FILE_AGE_MS,
        maxSize = CONFIG.MAX_STORAGE_MB * 1024 * 1024,
        keepActive = true,
        dryRun = false
    } = options;

    const results = {
        filesChecked: 0,
        filesDeleted: 0,
        spaceFreed: 0,
        errors: []
    };

    try {
        const files = await getFilesWithStats(dirPath);
        results.filesChecked = files.length;

        // Sort by age (oldest first)
        files.sort((a, b) => b.age - a.age);

        // Phase 1: Delete files older than maxAge
        for (const file of files) {
            if (file.age > maxAge) {
                // Skip if file is actively being used
                if (keepActive && activeFiles.has(file.name)) {
                    console.log(`   ⏭️  Skipping active file: ${file.name}`);
                    continue;
                }

                if (!dryRun) {
                    const deleted = await safeDeleteFile(file.path, 'age exceeded');
                    if (deleted) {
                        results.filesDeleted++;
                        results.spaceFreed += file.size;
                    }
                } else {
                    console.log(`   [DRY RUN] Would delete: ${file.name} (age: ${Math.round(file.age / 60000)}min)`);
                    results.filesDeleted++;
                    results.spaceFreed += file.size;
                }
            }
        }

        // Phase 2: If still over size limit, delete oldest files
        const currentSize = await getDirectorySize(dirPath);
        if (currentSize > maxSize) {
            const remainingFiles = await getFilesWithStats(dirPath);
            remainingFiles.sort((a, b) => b.age - a.age);

            let sizeToFree = currentSize - maxSize;
            for (const file of remainingFiles) {
                if (sizeToFree <= 0) break;
                
                if (keepActive && activeFiles.has(file.name)) continue;

                if (!dryRun) {
                    const deleted = await safeDeleteFile(file.path, 'storage limit');
                    if (deleted) {
                        results.filesDeleted++;
                        results.spaceFreed += file.size;
                        sizeToFree -= file.size;
                    }
                } else {
                    console.log(`   [DRY RUN] Would delete: ${file.name} (storage limit)`);
                    results.filesDeleted++;
                    results.spaceFreed += file.size;
                    sizeToFree -= file.size;
                }
            }
        }

    } catch (e) {
        results.errors.push(e.message);
        console.error('Cleanup error:', e);
    }

    return results;
}

/**
 * Run full cleanup on all directories
 */
async function runFullCleanup(options = {}) {
    console.log('\n🧹 Starting cleanup...');
    const startTime = Date.now();
    
    const results = {
        uploads: await cleanupDirectory(uploadsDir, options),
        converted: await cleanupDirectory(convertedDir, options),
        temp: await cleanupDirectory(tempDir, { ...options, maxAge: 5 * 60 * 1000 }), // 5 min for temp
        duration: 0,
        timestamp: new Date().toISOString()
    };

    results.duration = Date.now() - startTime;
    
    const totalDeleted = results.uploads.filesDeleted + results.converted.filesDeleted + results.temp.filesDeleted;
    const totalFreed = results.uploads.spaceFreed + results.converted.spaceFreed + results.temp.spaceFreed;

    // Update stats
    cleanupStats.lastRun = new Date().toISOString();
    cleanupStats.filesDeleted += totalDeleted;
    cleanupStats.spaceFreed += totalFreed;
    cleanupStats.totalCleanups++;

    console.log(`✅ Cleanup complete: ${totalDeleted} files deleted, ${(totalFreed / 1024 / 1024).toFixed(2)} MB freed (${results.duration}ms)\n`);

    return results;
}

/**
 * Clear all files (emergency cleanup)
 */
async function clearAllFiles(options = {}) {
    const { keepRecent = false, maxRecentAge = 5 * 60 * 1000 } = options;
    
    console.log('\n⚠️  CLEARING ALL FILES...');
    
    const results = {
        uploads: { filesDeleted: 0, spaceFreed: 0 },
        converted: { filesDeleted: 0, spaceFreed: 0 },
        temp: { filesDeleted: 0, spaceFreed: 0 }
    };

    for (const [dirName, dirPath] of [['uploads', uploadsDir], ['converted', convertedDir], ['temp', tempDir]]) {
        try {
            const files = await getFilesWithStats(dirPath);
            for (const file of files) {
                // Optionally keep recent files
                if (keepRecent && file.age < maxRecentAge) {
                    console.log(`   ⏭️  Keeping recent: ${file.name}`);
                    continue;
                }

                const deleted = await safeDeleteFile(file.path, 'clear all');
                if (deleted) {
                    results[dirName].filesDeleted++;
                    results[dirName].spaceFreed += file.size;
                }
            }
        } catch (e) {
            console.error(`Error clearing ${dirName}:`, e);
        }
    }

    const totalDeleted = Object.values(results).reduce((sum, r) => sum + r.filesDeleted, 0);
    const totalFreed = Object.values(results).reduce((sum, r) => sum + r.spaceFreed, 0);

    console.log(`✅ Cleared: ${totalDeleted} files, ${(totalFreed / 1024 / 1024).toFixed(2)} MB freed\n`);

    return results;
}

/**
 * Clean up orphaned files (files with no corresponding session)
 */
async function cleanupOrphanedFiles() {
    console.log('\n🔍 Cleaning up orphaned files...');
    
    const now = Date.now();
    let orphansDeleted = 0;

    // Clean up activeFiles map (remove old entries)
    for (const [filename, info] of activeFiles.entries()) {
        if (now - info.createdAt > CONFIG.MAX_FILE_AGE_MS) {
            activeFiles.delete(filename);
        }
    }

    // Check for files that are old but not in activeFiles
    const convertedFiles = await getFilesWithStats(convertedDir);
    for (const file of convertedFiles) {
        if (file.age > 10 * 60 * 1000 && !activeFiles.has(file.name)) { // 10 minutes
            const deleted = await safeDeleteFile(file.path, 'orphaned');
            if (deleted) orphansDeleted++;
        }
    }

    console.log(`✅ Orphaned cleanup: ${orphansDeleted} files deleted\n`);
    return orphansDeleted;
}

// ============================================
// SCHEDULED CLEANUP
// ============================================
let cleanupInterval = null;

function startScheduledCleanup() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
    }

    // Initial cleanup on startup
    setTimeout(() => {
        runFullCleanup().catch(console.error);
    }, 5000);

    // Scheduled cleanup
    cleanupInterval = setInterval(() => {
        runFullCleanup().catch(console.error);
    }, CONFIG.CLEANUP_INTERVAL_MS);

    console.log(`📅 Scheduled cleanup every ${CONFIG.CLEANUP_INTERVAL_MS / 60000} minutes`);
}

function stopScheduledCleanup() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        console.log('⏹️  Scheduled cleanup stopped');
    }
}

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
    } catch (e) { 
        console.warn('⚠️ OCCT Init Error:', e.message); 
    }
    return null;
}

/**
 * Release OCCT instance to free memory
 */
function releaseOCCT() {
    if (occtInstance) {
        occtInstance = null;
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        console.log('🧹 OCCT instance released');
    }
}

// ============================================
// GEOMETRY PROCESSING OPTIONS
// ============================================

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

function processGeometry(meshes, options = {}) {
    const {
        preservePosition = true,
        centerModel = false,
        groundModel = false,
        rotateToYUp = false
    } = options;

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

            pos[i] = x;
            pos[i + 1] = y;
            pos[i + 2] = z;
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
        
        const nodeIndex = gltf.nodes.push({ 
            mesh: i, 
            name: m.name 
        }) - 1;
        
        childNodes.push(nodeIndex);
    });

    gltf.nodes.unshift({ 
        name: "Root",
        children: childNodes.map(idx => idx + 1)
    });

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

// Health check with detailed status
app.get('/api/health', async (req, res) => {
    try {
        const uploadsSize = await getDirectorySize(uploadsDir);
        const convertedSize = await getDirectorySize(convertedDir);
        const freeSpace = await getFreeDiskSpace();
        
        const uploadsFiles = await getFilesWithStats(uploadsDir);
        const convertedFiles = await getFilesWithStats(convertedDir);

        res.json({ 
            status: processingCount >= CONFIG.MAX_CONCURRENT_JOBS ? 'busy' : 'ok',
            activeJobs: processingCount,
            maxJobs: CONFIG.MAX_CONCURRENT_JOBS,
            storage: {
                uploads: {
                    files: uploadsFiles.length,
                    sizeMB: (uploadsSize / 1024 / 1024).toFixed(2)
                },
                converted: {
                    files: convertedFiles.length,
                    sizeMB: (convertedSize / 1024 / 1024).toFixed(2)
                },
                totalMB: ((uploadsSize + convertedSize) / 1024 / 1024).toFixed(2),
                maxMB: CONFIG.MAX_STORAGE_MB,
                freeSpaceMB: (freeSpace / 1024 / 1024).toFixed(2)
            },
            cleanup: cleanupStats,
            uptime: process.uptime()
        });
    } catch (e) {
        res.json({ 
            status: 'error',
            error: e.message,
            activeJobs: processingCount
        });
    }
});

// Manual cleanup endpoint
app.post('/api/cleanup', async (req, res) => {
    try {
        const options = {
            maxAge: req.body?.maxAge || CONFIG.MAX_FILE_AGE_MS,
            dryRun: req.body?.dryRun === true
        };

        console.log(`🧹 Manual cleanup requested (dryRun: ${options.dryRun})`);
        const results = await runFullCleanup(options);
        
        res.json({
            success: true,
            results,
            stats: cleanupStats
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Clear all files endpoint (requires confirmation)
app.post('/api/clear-all', async (req, res) => {
    try {
        const { confirm, keepRecent } = req.body || {};
        
        if (confirm !== 'DELETE_ALL_FILES') {
            return res.status(400).json({ 
                error: 'Confirmation required. Send { "confirm": "DELETE_ALL_FILES" }' 
            });
        }

        if (processingCount > 0) {
            return res.status(409).json({ 
                error: `Cannot clear files while ${processingCount} jobs are processing` 
            });
        }

        console.log('⚠️  Clear all files requested');
        const results = await clearAllFiles({ keepRecent: !!keepRecent });
        
        res.json({
            success: true,
            results
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete specific file
app.delete('/api/file/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        
        // Check both directories
        const convertedPath = path.join(convertedDir, filename);
        const uploadsPath = path.join(uploadsDir, filename);
        
        let deleted = false;
        let location = null;

        if (fs.existsSync(convertedPath)) {
            await safeDeleteFile(convertedPath, 'user request');
            deleted = true;
            location = 'converted';
            activeFiles.delete(filename);
        } else if (fs.existsSync(uploadsPath)) {
            await safeDeleteFile(uploadsPath, 'user request');
            deleted = true;
            location = 'uploads';
            activeFiles.delete(filename);
        }

        if (deleted) {
            res.json({ success: true, filename, location });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// List files endpoint
app.get('/api/files', async (req, res) => {
    try {
        const convertedFiles = await getFilesWithStats(convertedDir);
        const uploadsFiles = await getFilesWithStats(uploadsDir);

        res.json({
            converted: convertedFiles.map(f => ({
                name: f.name,
                sizeMB: (f.size / 1024 / 1024).toFixed(2),
                age: Math.round(f.age / 60000),
                url: `/converted/${f.name}`,
                isActive: activeFiles.has(f.name)
            })),
            uploads: uploadsFiles.map(f => ({
                name: f.name,
                sizeMB: (f.size / 1024 / 1024).toFixed(2),
                age: Math.round(f.age / 60000)
            }))
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Convert endpoint
app.post('/api/convert', upload.single('file'), async (req, res) => {
    // Check if at max capacity
    if (processingCount >= CONFIG.MAX_CONCURRENT_JOBS) {
        if (req.file) await fsp.unlink(req.file.path).catch(() => {});
        return res.status(503).json({ 
            error: 'Server busy. Please try again.',
            activeJobs: processingCount,
            maxJobs: CONFIG.MAX_CONCURRENT_JOBS
        });
    }

    processingCount++;
    req.setTimeout(CONFIG.REQUEST_TIMEOUT_MS); 
    res.setTimeout(CONFIG.REQUEST_TIMEOUT_MS);
    const file = req.file;
    const sessionId = uuidv4();

    if (!file) { 
        processingCount--; 
        return res.status(400).json({ error: 'No file' }); 
    }
    
    console.log(`\n📂 Processing: ${file.originalname} (Session: ${sessionId})`);

    const options = {
        preservePosition: req.body?.preservePosition !== 'false',
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

            modelBounds = getModelBounds(meshes);
            console.log(`   📏 Original bounds:`, modelBounds);

            meshes = processGeometry(meshes, options);

            meshes.forEach(m => {
                if (!m.normals) m.normals = computeNormals(m.positions, m.indices);
            });

        } else {
            const outName = `${uuidv4()}.glb`;
            const outPath = path.join(convertedDir, outName);
            await fsp.rename(file.path, outPath);
            
            // Track this file
            activeFiles.set(outName, { createdAt: Date.now(), sessionId });
            
            processingCount--;
            return res.json({ 
                success: true, 
                url: `/converted/${outName}`, 
                originalFile: true,
                sessionId
            });
        }

        const glb = createGLB(meshes, modelBounds);
        const outName = `${sessionId}.glb`;
        const outPath = path.join(convertedDir, outName);
        
        await fsp.writeFile(outPath, glb);
        await fsp.unlink(file.path).catch(() => {});

        // Track this file
        activeFiles.set(outName, { createdAt: Date.now(), sessionId });

        // Clear meshes to free memory
        meshes = null;

        processingCount--;
        console.log(`   ✅ Done. Size: ${(glb.length/1024/1024).toFixed(2)} MB`);
        
        res.json({ 
            success: true, 
            url: `/converted/${outName}`, 
            size: glb.length, 
            meshCount: meshes?.length || 0,
            bounds: modelBounds,
            options,
            sessionId
        });

    } catch (e) {
        console.error("Error:", e);
        processingCount--;
        if (file) await fsp.unlink(file.path).catch(() => {});
        res.status(500).json({ error: e.message });
    }
});

// Session cleanup endpoint (for frontend to call when user leaves/closes model)
app.post('/api/session/:sessionId/cleanup', async (req, res) => {
    try {
        const { sessionId } = req.params;
        let filesDeleted = 0;

        // Find and delete files associated with this session
        for (const [filename, info] of activeFiles.entries()) {
            if (info.sessionId === sessionId) {
                const filePath = path.join(convertedDir, filename);
                const deleted = await safeDeleteFile(filePath, `session ${sessionId} cleanup`);
                if (deleted) {
                    filesDeleted++;
                    activeFiles.delete(filename);
                }
            }
        }

        res.json({ 
            success: true, 
            sessionId, 
            filesDeleted 
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Cleanup on model clear (called from frontend)
app.post('/api/cleanup-model', async (req, res) => {
    try {
        const { url, sessionId } = req.body;
        let deleted = false;

        if (url) {
            const filename = path.basename(url);
            const filePath = path.join(convertedDir, filename);
            deleted = await safeDeleteFile(filePath, 'model clear');
            activeFiles.delete(filename);
        }

        if (sessionId) {
            // Also cleanup any files from this session
            for (const [filename, info] of activeFiles.entries()) {
                if (info.sessionId === sessionId) {
                    const filePath = path.join(convertedDir, filename);
                    await safeDeleteFile(filePath, 'session clear');
                    activeFiles.delete(filename);
                }
            }
        }

        res.json({ success: true, deleted });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// MEMORY MANAGEMENT
// ============================================

// Monitor memory usage
function getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
        heapUsedMB: (usage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (usage.heapTotal / 1024 / 1024).toFixed(2),
        rssMB: (usage.rss / 1024 / 1024).toFixed(2),
        externalMB: (usage.external / 1024 / 1024).toFixed(2)
    };
}

app.get('/api/memory', (req, res) => {
    res.json({
        memory: getMemoryUsage(),
        system: {
            totalMB: (os.totalmem() / 1024 / 1024).toFixed(2),
            freeMB: (os.freemem() / 1024 / 1024).toFixed(2),
            cpus: os.cpus().length
        }
    });
});

// Force garbage collection (if --expose-gc flag is used)
app.post('/api/gc', (req, res) => {
    if (global.gc) {
        const before = getMemoryUsage();
        global.gc();
        const after = getMemoryUsage();
        res.json({
            success: true,
            before,
            after,
            freedMB: (parseFloat(before.heapUsedMB) - parseFloat(after.heapUsedMB)).toFixed(2)
        });
    } else {
        res.status(400).json({ 
            error: 'Garbage collection not exposed. Start server with --expose-gc flag.' 
        });
    }
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
async function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    stopScheduledCleanup();
    
    // Wait for active jobs to complete (with timeout)
    const maxWait = 30000; // 30 seconds
    const startWait = Date.now();
    
    while (processingCount > 0 && (Date.now() - startWait) < maxWait) {
        console.log(`Waiting for ${processingCount} active jobs...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (processingCount > 0) {
        console.warn(`⚠️  Force shutting down with ${processingCount} active jobs`);
    }

    // Run final cleanup
    console.log('Running final cleanup...');
    await runFullCleanup({ maxAge: 0 }).catch(console.error);

    // Release OCCT
    releaseOCCT();

    console.log('Shutdown complete');
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit, try to continue
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit, try to continue
});

// ============================================
// START SERVER
// ============================================
initOCCT();
startScheduledCleanup();

app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📁 Uploads: ${uploadsDir}`);
    console.log(`📁 Converted: ${convertedDir}`);
    console.log(`⚙️  Config: Max ${CONFIG.MAX_STORAGE_MB}MB storage, ${CONFIG.MAX_FILE_AGE_MS/60000}min file age`);
    console.log(`💾 Memory: ${JSON.stringify(getMemoryUsage())}\n`);
});