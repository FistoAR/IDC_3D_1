import * as THREE from "three";

let occtInstance = null;

async function initOCCT() {
  if (occtInstance) return occtInstance;

  const occtModule = await import('occt-import-js');
  occtInstance = await occtModule.default({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/occt-import-js@0.0.12/dist/${file}`
  });

  return occtInstance;
}

export async function loadSTEPFile(file, onProgress) {
  try {
    onProgress?.('Initializing STEP loader...');
    const occt = await initOCCT();

    onProgress?.('Reading file...');
    const buffer = await file.arrayBuffer();

    onProgress?.('Parsing geometry...');
    let result;
    try {
      result = occt.ReadStepFile(new Uint8Array(buffer));
    } catch {
      result = occt.ReadStepFile(new Uint8Array(buffer), null);
    }

    if (!result?.success || !result.meshes?.length) {
      throw new Error('Failed to parse STEP file');
    }

    onProgress?.(`Building model (${result.meshes.length} parts)...`);

    const group = new THREE.Group();
    group.name = 'STEP_Model';

    const colors = [0x3B82F6, 0x10B981, 0xF59E0B, 0xEF4444, 0x8B5CF6, 0xEC4899];

    for (let i = 0; i < result.meshes.length; i++) {
      const m = result.meshes[i];
      if (!m.attributes?.position?.array?.length) continue;

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(m.attributes.position.array, 3));

      if (m.attributes?.normal?.array?.length) {
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(m.attributes.normal.array, 3));
      } else {
        geometry.computeVertexNormals();
      }

      if (m.index?.array?.length) {
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(m.index.array), 1));
      }

      let color = new THREE.Color(colors[i % colors.length]);
      if (m.color?.length >= 3) {
        color = new THREE.Color(m.color[0], m.color[1], m.color[2]);
      }

      const material = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.3,
        roughness: 0.6,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = m.name || `Part_${i + 1}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      group.add(mesh);
    }

    if (group.children.length === 0) {
      throw new Error('No valid geometry');
    }

    onProgress?.('Complete!');
    return group;

  } catch (error) {
    console.error('STEP error:', error);
    throw error;
  }
}

export default loadSTEPFile;