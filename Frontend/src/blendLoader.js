// src/loaders/blendLoader.js
import * as THREE from 'three';

/**
 * Aggressive Blender .blend file geometry extractor
 * Uses multiple strategies to find and extract mesh data
 */

class BlendFileExtractor {
  constructor(buffer) {
    this.buffer = buffer;
    this.uint8 = new Uint8Array(buffer);
    this.float32 = new Float32Array(buffer);
    this.int32 = new Int32Array(buffer);
    this.dataView = new DataView(buffer);
    this.littleEndian = true;
    this.pointerSize = 8;
    this.version = '';
  }

  extract() {
    // Validate and parse header
    if (!this.parseHeader()) {
      console.warn('Invalid or unsupported Blender file header');
    }

    const meshes = [];

    // Strategy 1: Find mesh data via block structure
    const blockMeshes = this.extractFromBlocks();
    meshes.push(...blockMeshes);

    // Strategy 2: Scan for vertex patterns in float data
    if (meshes.length === 0 || this.getTotalVertices(meshes) < 10) {
      console.log('Block extraction yielded few results, scanning for patterns...');
      const patternMeshes = this.extractFromPatterns();
      meshes.push(...patternMeshes);
    }

    // Strategy 3: Deep scan with multiple vertex strides
    if (meshes.length === 0 || this.getTotalVertices(meshes) < 10) {
      console.log('Pattern scan yielded few results, deep scanning...');
      const deepMeshes = this.deepScan();
      meshes.push(...deepMeshes);
    }

    // Deduplicate and filter
    return this.filterAndCleanMeshes(meshes);
  }

  getTotalVertices(meshes) {
    return meshes.reduce((sum, m) => sum + (m.positions?.length || 0) / 3, 0);
  }

  parseHeader() {
    try {
      const magic = String.fromCharCode(...this.uint8.slice(0, 7));
      if (magic !== 'BLENDER') {
        return false;
      }

      this.pointerSize = this.uint8[7] === 95 ? 4 : 8; // '_' = 32bit
      this.littleEndian = this.uint8[8] === 118; // 'v' = little endian
      this.version = String.fromCharCode(...this.uint8.slice(9, 12));

      console.log(`Blender v${this.version[0]}.${this.version.slice(1)}, ${this.pointerSize * 8}bit, ${this.littleEndian ? 'LE' : 'BE'}`);
      return true;
    } catch {
      return false;
    }
  }

  extractFromBlocks() {
    const meshes = [];
    let offset = 12; // After header

    try {
      while (offset < this.buffer.byteLength - 24) {
        const code = String.fromCharCode(...this.uint8.slice(offset, offset + 4)).replace(/\0/g, '');
        
        if (code === 'ENDB') break;

        const blockSize = this.dataView.getInt32(offset + 4, this.littleEndian);
        
        if (blockSize <= 0 || blockSize > this.buffer.byteLength - offset) {
          offset += 4;
          continue;
        }

        const headerSize = 4 + 4 + this.pointerSize + 4 + 4;
        const dataStart = offset + headerSize;
        const dataEnd = dataStart + blockSize;

        // Look for mesh blocks
        if (code === 'ME' || code === 'DATA' || code === 'OB') {
          const extracted = this.extractGeometryFromRange(dataStart, dataEnd);
          if (extracted.positions.length >= 9) {
            meshes.push({
              name: `${code}_Mesh_${meshes.length + 1}`,
              ...extracted
            });
          }
        }

        offset = dataEnd;
      }
    } catch (e) {
      console.warn('Block parsing error:', e.message);
    }

    return meshes;
  }

  extractFromPatterns() {
    const meshes = [];
    const scanned = new Set();
    
    // Look for common vertex patterns
    for (let i = 0; i < this.float32.length - 12; i++) {
      if (scanned.has(Math.floor(i / 1000))) continue;

      // Check for vertex-like triplets
      if (this.isLikelyVertexStart(i)) {
        const result = this.extractVertexSequence(i);
        
        if (result.count >= 8) {
          meshes.push({
            name: `Pattern_Mesh_${meshes.length + 1}`,
            positions: result.positions,
            indices: []
          });
          
          // Skip past extracted region
          i += result.count * 3;
          scanned.add(Math.floor(i / 1000));
        }
      }
    }

    return meshes;
  }

  deepScan() {
    const meshes = [];
    
    // Try different potential vertex strides (in floats)
    const strides = [3, 4, 5, 6, 8, 10, 12];
    
    for (const stride of strides) {
      const candidates = this.scanWithStride(stride);
      
      for (const candidate of candidates) {
        if (candidate.positions.length >= 24) { // At least 8 vertices
          meshes.push({
            name: `DeepScan_S${stride}_${meshes.length + 1}`,
            positions: candidate.positions,
            indices: []
          });
        }
      }
      
      if (meshes.length > 0) break; // Found something, stop
    }

    return meshes;
  }

  scanWithStride(strideFloats) {
    const candidates = [];
    const minVertices = 8;
    let i = 0;

    while (i < this.float32.length - strideFloats * minVertices) {
      const positions = [];
      let j = i;

      while (j < this.float32.length - strideFloats) {
        const x = this.float32[j];
        const y = this.float32[j + 1];
        const z = this.float32[j + 2];

        if (this.isValidCoordinate(x) && this.isValidCoordinate(y) && this.isValidCoordinate(z)) {
          positions.push(x, y, z);
          j += strideFloats;
        } else {
          break;
        }

        // Limit to prevent huge arrays
        if (positions.length > 300000) break;
      }

      if (positions.length >= minVertices * 3) {
        // Verify this looks like real geometry
        if (this.hasGeometricVariance(positions)) {
          candidates.push({ positions, startIndex: i });
          i = j;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }

    // Return top candidates by size
    candidates.sort((a, b) => b.positions.length - a.positions.length);
    return candidates.slice(0, 3);
  }

  extractGeometryFromRange(start, end) {
    const positions = [];
    const byteLength = end - start;
    
    if (byteLength < 36) return { positions: [], indices: [] };

    // Create float view of this range
    const alignedStart = Math.ceil(start / 4) * 4;
    const floatStart = alignedStart / 4;
    const floatEnd = Math.floor(end / 4);

    for (let i = floatStart; i < floatEnd - 3; i++) {
      const x = this.float32[i];
      const y = this.float32[i + 1];
      const z = this.float32[i + 2];

      if (this.isValidCoordinate(x) && this.isValidCoordinate(y) && this.isValidCoordinate(z)) {
        // Check if this starts a sequence
        let count = 0;
        let j = i;
        const tempPositions = [];

        while (j < floatEnd - 3 && count < 100000) {
          const vx = this.float32[j];
          const vy = this.float32[j + 1];
          const vz = this.float32[j + 2];

          if (this.isValidCoordinate(vx) && this.isValidCoordinate(vy) && this.isValidCoordinate(vz)) {
            tempPositions.push(vx, vy, vz);
            count++;
            j += 3;
          } else {
            break;
          }
        }

        if (count >= 4 && this.hasGeometricVariance(tempPositions)) {
          return { positions: tempPositions, indices: [] };
        }
      }
    }

    return { positions: [], indices: [] };
  }

  isLikelyVertexStart(floatIndex) {
    // Check if this looks like the start of vertex data
    const x = this.float32[floatIndex];
    const y = this.float32[floatIndex + 1];
    const z = this.float32[floatIndex + 2];

    if (!this.isValidCoordinate(x) || !this.isValidCoordinate(y) || !this.isValidCoordinate(z)) {
      return false;
    }

    // Check next few triplets
    let validCount = 0;
    for (let i = 0; i < 5; i++) {
      const idx = floatIndex + i * 3;
      if (idx + 3 > this.float32.length) break;

      const vx = this.float32[idx];
      const vy = this.float32[idx + 1];
      const vz = this.float32[idx + 2];

      if (this.isValidCoordinate(vx) && this.isValidCoordinate(vy) && this.isValidCoordinate(vz)) {
        validCount++;
      }
    }

    return validCount >= 4;
  }

  extractVertexSequence(startIndex) {
    const positions = [];
    let i = startIndex;

    while (i < this.float32.length - 3 && positions.length < 500000) {
      const x = this.float32[i];
      const y = this.float32[i + 1];
      const z = this.float32[i + 2];

      if (this.isValidCoordinate(x) && this.isValidCoordinate(y) && this.isValidCoordinate(z)) {
        positions.push(x, y, z);
        i += 3;
      } else {
        break;
      }
    }

    return { positions, count: positions.length / 3 };
  }

  isValidCoordinate(value) {
    return (
      typeof value === 'number' &&
      isFinite(value) &&
      !isNaN(value) &&
      Math.abs(value) < 50000 &&
      Math.abs(value) > 1e-10 || value === 0
    );
  }

  hasGeometricVariance(positions) {
    if (positions.length < 9) return false;

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

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;

    // Must have some variance in at least 2 dimensions
    const hasX = rangeX > 0.0001;
    const hasY = rangeY > 0.0001;
    const hasZ = rangeZ > 0.0001;

    return (hasX && hasY) || (hasX && hasZ) || (hasY && hasZ);
  }

  filterAndCleanMeshes(meshes) {
    // Remove duplicates and tiny meshes
    const validMeshes = [];
    const seenBounds = new Set();

    for (const mesh of meshes) {
      if (!mesh.positions || mesh.positions.length < 9) continue;

      // Create a simple hash of bounding box
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      for (let i = 0; i < Math.min(mesh.positions.length, 300); i += 3) {
        minX = Math.min(minX, mesh.positions[i]);
        maxX = Math.max(maxX, mesh.positions[i]);
        minY = Math.min(minY, mesh.positions[i + 1]);
        maxY = Math.max(maxY, mesh.positions[i + 1]);
        minZ = Math.min(minZ, mesh.positions[i + 2]);
        maxZ = Math.max(maxZ, mesh.positions[i + 2]);
      }

      const hash = `${minX.toFixed(2)}_${maxX.toFixed(2)}_${minY.toFixed(2)}_${maxY.toFixed(2)}_${mesh.positions.length}`;

      if (!seenBounds.has(hash)) {
        seenBounds.add(hash);
        
        // Generate indices
        mesh.indices = this.generateIndices(mesh.positions.length / 3);
        validMeshes.push(mesh);
      }
    }

    // Sort by vertex count (largest first)
    validMeshes.sort((a, b) => b.positions.length - a.positions.length);

    // Return top meshes
    return validMeshes.slice(0, 20);
  }

  generateIndices(vertexCount) {
    const indices = [];
    
    // Generate triangle indices
    for (let i = 0; i < vertexCount - 2; i += 3) {
      indices.push(i, i + 1, i + 2);
    }

    return indices;
  }
}

/**
 * Create Three.js mesh from extracted data
 */
function createMesh(data, color) {
  const geometry = new THREE.BufferGeometry();

  // Set positions
  const positions = new Float32Array(data.positions);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Set indices if available
  if (data.indices && data.indices.length > 0) {
    geometry.setIndex(data.indices);
  }

  // Compute normals and bounds
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  // Create material
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.2,
    roughness: 0.7,
    side: THREE.DoubleSide,
    flatShading: data.positions.length < 1000
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = data.name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Main loader function
 */
export async function loadBlendFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(`Reading: ${Math.round((e.loaded / e.total) * 100)}%`);
      }
    };

    reader.onload = (e) => {
      try {
        onProgress?.('Extracting geometry from Blender file...');

        const extractor = new BlendFileExtractor(e.target.result);
        const meshData = extractor.extract();

        console.log(`Extracted ${meshData.length} meshes`);

        if (meshData.length === 0) {
          throw new Error(
            'Could not extract geometry from this Blender file.\n\n' +
            'This may be because:\n' +
            '• The file uses a newer/unsupported format\n' +
            '• The geometry is stored in a complex way\n' +
            '• The file contains no mesh data\n\n' +
            'Please export from Blender:\n' +
            '1. Open file in Blender\n' +
            '2. File → Export → glTF 2.0 (.glb/.gltf)\n' +
            '3. Upload the exported file'
          );
        }

        onProgress?.('Building 3D objects...');

        const group = new THREE.Group();
        group.name = file.name.replace(/\.blend$/i, '');

        const colors = [
          0x6366F1, 0x10B981, 0xF59E0B, 0xEF4444,
          0x8B5CF6, 0x06B6D4, 0xEC4899, 0x14B8A6,
          0xF97316, 0x8B5CF6, 0x84CC16, 0x0EA5E9
        ];

        let totalVertices = 0;

        meshData.forEach((data, index) => {
          try {
            const mesh = createMesh(data, colors[index % colors.length]);
            group.add(mesh);
            totalVertices += data.positions.length / 3;
            console.log(`✓ ${data.name}: ${data.positions.length / 3} vertices`);
          } catch (err) {
            console.warn(`✗ Failed to create ${data.name}:`, err.message);
          }
        });

        if (group.children.length === 0) {
          throw new Error('Failed to create any valid 3D objects');
        }

        // Center the model
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        group.position.sub(center);

        console.log(`Total: ${group.children.length} meshes, ${totalVertices} vertices`);
        onProgress?.(`Loaded ${group.children.length} objects`);

        resolve(group);

      } catch (error) {
        console.error('Blend loading error:', error);
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export default loadBlendFile;