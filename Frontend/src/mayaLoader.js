// src/loaders/mayaLoader.js
import * as THREE from 'three';

/**
 * Aggressive Maya file geometry extractor
 * Supports both .ma (ASCII) and .mb (Binary)
 */

class MayaAsciiExtractor {
  constructor(content) {
    this.content = content;
    this.meshes = [];
  }

  extract() {
    // Strategy 1: Parse structured mesh data
    this.parseStructuredData();

    // Strategy 2: Extract any number sequences that look like vertices
    if (this.meshes.length === 0) {
      this.extractNumberPatterns();
    }

    return this.meshes;
  }

  parseStructuredData() {
    const lines = this.content.split('\n');
    let currentMesh = null;
    let inVertexBlock = false;
    let vertexData = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Start of mesh node
      if (line.includes('createNode mesh') || line.includes('createNode transform')) {
        if (currentMesh && currentMesh.vertices.length > 0) {
          this.meshes.push(this.finalizeMesh(currentMesh));
        }

        const nameMatch = line.match(/-n\s+"([^"]+)"/);
        currentMesh = {
          name: nameMatch ? nameMatch[1] : `Mesh_${this.meshes.length + 1}`,
          vertices: [],
          faces: []
        };
      }

      // Vertex data (various formats)
      if (line.includes('setAttr') && (
        line.includes('.vt[') ||
        line.includes('.vrts[') ||
        line.includes('.pt[') ||
        line.includes('.pnts[') ||
        line.includes('controlPoints')
      )) {
        const vertices = this.extractVerticesFromLine(line, lines, i);
        if (currentMesh && vertices.length > 0) {
          currentMesh.vertices.push(...vertices);
        }
      }

      // Face data
      if (line.includes('.fc[') || line.includes('.face[')) {
        const faces = this.extractFacesFromLine(line);
        if (currentMesh) {
          currentMesh.faces.push(...faces);
        }
      }
    }

    // Don't forget last mesh
    if (currentMesh && currentMesh.vertices.length > 0) {
      this.meshes.push(this.finalizeMesh(currentMesh));
    }
  }

  extractVerticesFromLine(line, allLines, currentIndex) {
    const vertices = [];

    // Try to get full multi-line attribute
    let fullLine = line;
    let idx = currentIndex + 1;
    while (!fullLine.endsWith(';') && idx < allLines.length) {
      fullLine += ' ' + allLines[idx].trim();
      idx++;
    }

    // Extract all numbers
    const numbers = fullLine.match(/-?\d+\.?\d*(?:e[+-]?\d+)?/g);
    if (!numbers) return vertices;

    // Look for type indicator
    const typeMatch = fullLine.match(/-type\s+"(\w+)"\s+(\d+)/);

    if (typeMatch) {
      const count = parseInt(typeMatch[2]);
      // Find where the count appears in numbers array
      const countIdx = numbers.findIndex(n => parseInt(n) === count);

      if (countIdx !== -1) {
        for (let i = countIdx + 1; i < numbers.length - 2 && vertices.length < count * 3; i += 3) {
          vertices.push(
            parseFloat(numbers[i]),
            parseFloat(numbers[i + 1]),
            parseFloat(numbers[i + 2])
          );
        }
      }
    } else {
      // Try to extract triplets directly
      for (let i = 0; i < numbers.length - 2; i += 3) {
        const x = parseFloat(numbers[i]);
        const y = parseFloat(numbers[i + 1]);
        const z = parseFloat(numbers[i + 2]);

        if (this.isValidCoord(x) && this.isValidCoord(y) && this.isValidCoord(z)) {
          vertices.push(x, y, z);
        }
      }
    }

    return vertices;
  }

  extractFacesFromLine(line) {
    const faces = [];
    const faceMatches = line.matchAll(/f\s+(\d+)((?:\s+\d+)+)/g);

    for (const match of faceMatches) {
      const numVerts = parseInt(match[1]);
      const indices = match[2].trim().split(/\s+/).map(Number);

      // Triangulate polygon
      for (let i = 1; i < numVerts - 1 && i + 1 < indices.length; i++) {
        faces.push(indices[0], indices[i], indices[i + 1]);
      }
    }

    return faces;
  }

  extractNumberPatterns() {
    // Find sequences of numbers that look like vertex data
    const numberPattern = /-?\d+\.\d+/g;
    const allNumbers = [];
    let match;

    while ((match = numberPattern.exec(this.content)) !== null) {
      allNumbers.push(parseFloat(match[0]));
    }

    // Scan for vertex-like sequences
    let i = 0;
    while (i < allNumbers.length - 9) {
      if (this.isValidCoord(allNumbers[i]) &&
          this.isValidCoord(allNumbers[i + 1]) &&
          this.isValidCoord(allNumbers[i + 2])) {

        const vertices = [];
        let j = i;

        while (j < allNumbers.length - 3 && vertices.length < 300000) {
          const x = allNumbers[j];
          const y = allNumbers[j + 1];
          const z = allNumbers[j + 2];

          if (this.isValidCoord(x) && this.isValidCoord(y) && this.isValidCoord(z)) {
            vertices.push(x, y, z);
            j += 3;
          } else {
            break;
          }
        }

        if (vertices.length >= 12 && this.hasVariance(vertices)) {
          this.meshes.push({
            name: `ExtractedMesh_${this.meshes.length + 1}`,
            positions: vertices,
            indices: this.generateIndices(vertices.length / 3)
          });
          i = j;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }
  }

  isValidCoord(v) {
    return typeof v === 'number' && isFinite(v) && !isNaN(v) && Math.abs(v) < 100000;
  }

  hasVariance(positions) {
    if (positions.length < 9) return false;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < Math.min(positions.length, 300); i += 3) {
      minX = Math.min(minX, positions[i]);
      maxX = Math.max(maxX, positions[i]);
      minY = Math.min(minY, positions[i + 1]);
      maxY = Math.max(maxY, positions[i + 1]);
    }

    return (maxX - minX > 0.001) || (maxY - minY > 0.001);
  }

  finalizeMesh(mesh) {
    return {
      name: mesh.name,
      positions: mesh.vertices,
      indices: mesh.faces.length > 0 ? mesh.faces : this.generateIndices(mesh.vertices.length / 3)
    };
  }

  generateIndices(count) {
    const indices = [];
    for (let i = 0; i < count - 2; i += 3) {
      indices.push(i, i + 1, i + 2);
    }
    return indices;
  }
}

class MayaBinaryExtractor {
  constructor(buffer) {
    this.buffer = buffer;
    this.float32 = new Float32Array(buffer);
    this.uint8 = new Uint8Array(buffer);
    this.dataView = new DataView(buffer);
  }

  extract() {
    const meshes = [];

    // Try IFF chunk parsing
    const iffMeshes = this.parseIFFChunks();
    meshes.push(...iffMeshes);

    // Fallback to float scanning
    if (meshes.length === 0) {
      const scanMeshes = this.scanForVertices();
      meshes.push(...scanMeshes);
    }

    return meshes;
  }

  parseIFFChunks() {
    const meshes = [];
    let offset = 0;

    try {
      while (offset < this.buffer.byteLength - 8) {
        const tag = String.fromCharCode(
          this.uint8[offset],
          this.uint8[offset + 1],
          this.uint8[offset + 2],
          this.uint8[offset + 3]
        );

        // Check for IFF form
        if (tag === 'FOR4' || tag === 'FOR8' || tag === '4ROF' || tag === '8ROF') {
          const littleEndian = tag.startsWith('4') || tag.startsWith('8');
          const size = this.dataView.getUint32(offset + 4, littleEndian);

          if (size > 0 && size < this.buffer.byteLength - offset) {
            const chunkData = this.extractFromChunk(offset + 8, Math.min(size, 1000000));
            if (chunkData.positions.length >= 9) {
              meshes.push({
                name: `IFF_Mesh_${meshes.length + 1}`,
                ...chunkData
              });
            }
          }

          offset += 8 + size;
        } else {
          offset += 4;
        }
      }
    } catch (e) {
      console.warn('IFF parsing error:', e.message);
    }

    return meshes;
  }

  extractFromChunk(start, maxSize) {
    const positions = [];
    const floatStart = Math.ceil(start / 4);
    const floatEnd = Math.min(floatStart + maxSize / 4, this.float32.length);

    for (let i = floatStart; i < floatEnd - 3; i++) {
      const x = this.float32[i];
      const y = this.float32[i + 1];
      const z = this.float32[i + 2];

      if (this.isValid(x) && this.isValid(y) && this.isValid(z)) {
        let count = 0;
        const temp = [];

        for (let j = i; j < floatEnd - 3 && count < 50000; j += 3) {
          const vx = this.float32[j];
          const vy = this.float32[j + 1];
          const vz = this.float32[j + 2];

          if (this.isValid(vx) && this.isValid(vy) && this.isValid(vz)) {
            temp.push(vx, vy, vz);
            count++;
          } else {
            break;
          }
        }

        if (count >= 4) {
          return {
            positions: temp,
            indices: this.generateIndices(count)
          };
        }
      }
    }

    return { positions: [], indices: [] };
  }

  scanForVertices() {
    const meshes = [];
    let i = 0;

    while (i < this.float32.length - 9) {
      if (this.isValid(this.float32[i]) &&
          this.isValid(this.float32[i + 1]) &&
          this.isValid(this.float32[i + 2])) {

        const positions = [];
        let j = i;

        while (j < this.float32.length - 3 && positions.length < 300000) {
          const x = this.float32[j];
          const y = this.float32[j + 1];
          const z = this.float32[j + 2];

          if (this.isValid(x) && this.isValid(y) && this.isValid(z)) {
            positions.push(x, y, z);
            j += 3;
          } else {
            break;
          }
        }

        if (positions.length >= 24 && this.hasVariance(positions)) {
          meshes.push({
            name: `Scan_Mesh_${meshes.length + 1}`,
            positions,
            indices: this.generateIndices(positions.length / 3)
          });
          i = j;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }

    meshes.sort((a, b) => b.positions.length - a.positions.length);
    return meshes.slice(0, 10);
  }

  isValid(v) {
    return isFinite(v) && !isNaN(v) && Math.abs(v) < 100000 && (Math.abs(v) > 1e-10 || v === 0);
  }

  hasVariance(positions) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < Math.min(positions.length, 300); i += 3) {
      minX = Math.min(minX, positions[i]);
      maxX = Math.max(maxX, positions[i]);
      minY = Math.min(minY, positions[i + 1]);
      maxY = Math.max(maxY, positions[i + 1]);
    }

    return (maxX - minX > 0.001) || (maxY - minY > 0.001);
  }

  generateIndices(count) {
    const indices = [];
    for (let i = 0; i < count - 2; i += 3) {
      indices.push(i, i + 1, i + 2);
    }
    return indices;
  }
}

function createMesh(data, color) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));

  if (data.indices?.length > 0) {
    const maxIdx = Math.max(...data.indices);
    if (maxIdx < data.positions.length / 3) {
      geometry.setIndex(data.indices);
    }
  }

  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.2,
    roughness: 0.7,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = data.name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

export async function loadMayaFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isBinary = file.name.toLowerCase().endsWith('.mb');

    reader.onload = (e) => {
      try {
        onProgress?.('Extracting Maya geometry...');

        let meshData;
        if (isBinary) {
          const extractor = new MayaBinaryExtractor(e.target.result);
          meshData = extractor.extract();
        } else {
          const extractor = new MayaAsciiExtractor(e.target.result);
          meshData = extractor.extract();
        }

        console.log(`Extracted ${meshData.length} meshes from Maya file`);

        if (meshData.length === 0) {
          throw new Error(
            'Could not extract geometry from Maya file.\n\n' +
            'Please export from Maya:\n' +
            '1. File → Export All\n' +
            '2. Choose FBX or OBJ format\n' +
            '3. Upload the exported file'
          );
        }

        onProgress?.('Building 3D model...');

        const group = new THREE.Group();
        group.name = file.name.replace(/\.(ma|mb)$/i, '');

        const colors = [0x6366F1, 0x10B981, 0xF59E0B, 0xEF4444, 0x8B5CF6, 0x06B6D4];

        meshData.forEach((data, idx) => {
          try {
            const mesh = createMesh(data, colors[idx % colors.length]);
            group.add(mesh);
            console.log(`✓ ${data.name}: ${data.positions.length / 3} vertices`);
          } catch (err) {
            console.warn(`✗ ${data.name} failed:`, err.message);
          }
        });

        if (group.children.length === 0) {
          throw new Error('No valid geometry created');
        }

        // Center
        const box = new THREE.Box3().setFromObject(group);
        group.position.sub(box.getCenter(new THREE.Vector3()));

        onProgress?.('Complete!');
        resolve(group);

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));

    if (isBinary) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
}

export default loadMayaFile;