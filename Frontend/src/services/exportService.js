// services/exportService.js
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";

/**
 * Clone material preserving all PBR textures
 */
function cloneMaterialWithTextures(material) {
  const cloned = material.clone();
  
  // Clone textures
  const textureProps = [
    'map', 'normalMap', 'roughnessMap', 'metalnessMap',
    'aoMap', 'displacementMap', 'emissiveMap', 'alphaMap',
    'envMap', 'lightMap', 'bumpMap'
  ];
  
  textureProps.forEach(prop => {
    if (material[prop]) {
      cloned[prop] = material[prop].clone();
      cloned[prop].needsUpdate = true;
    }
  });
  
  // Preserve other properties
  if (material.normalScale) {
    cloned.normalScale = material.normalScale.clone();
  }
  
  cloned.needsUpdate = true;
  return cloned;
}

/**
 * Clone object and bake all transformations into geometry
 * Preserves PBR textures
 */
function cloneWithBakedTransforms(object) {
  const clonedObject = new THREE.Group();
  clonedObject.name = object.name || "ExportedModel";

  object.traverse((child) => {
    if (child.isMesh && child.geometry) {
      // Clone geometry
      const clonedGeometry = child.geometry.clone();
      
      // Apply world matrix to geometry (bakes all transformations)
      child.updateWorldMatrix(true, false);
      clonedGeometry.applyMatrix4(child.matrixWorld);
      
      // Clone material(s) with textures
      let clonedMaterial;
      if (Array.isArray(child.material)) {
        clonedMaterial = child.material.map(mat => cloneMaterialWithTextures(mat));
      } else {
        clonedMaterial = cloneMaterialWithTextures(child.material);
      }
      
      // Create new mesh with baked transforms
      const clonedMesh = new THREE.Mesh(clonedGeometry, clonedMaterial);
      clonedMesh.name = child.name;
      
      // Reset transform since it's now baked into geometry
      clonedMesh.position.set(0, 0, 0);
      clonedMesh.rotation.set(0, 0, 0);
      clonedMesh.scale.set(1, 1, 1);
      
      clonedObject.add(clonedMesh);
    }
  });

  return clonedObject;
}

/**
 * Clone object preserving hierarchy and transforms (not baked)
 */
function clonePreservingTransforms(object) {
  const clone = object.clone(true);
  
  // Deep clone materials with textures
  clone.traverse((child) => {
    if (child.isMesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material = child.material.map(mat => cloneMaterialWithTextures(mat));
      } else {
        child.material = cloneMaterialWithTextures(child.material);
      }
    }
  });
  
  clone.updateMatrixWorld(true);
  return clone;
}

/**
 * Export a Three.js scene/object to GLB format
 */
export async function exportToGLB(object, filename = "model", options = {}) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    
    const { bakeTransforms = true, ...exporterOptions } = options;

    const exportObject = bakeTransforms 
      ? cloneWithBakedTransforms(object)
      : clonePreservingTransforms(object);

    const finalOptions = {
      binary: true,
      maxTextureSize: exporterOptions.maxTextureSize || 4096,
      includeCustomExtensions: exporterOptions.includeCustomExtensions || false,
      embedImages: true,
      ...exporterOptions
    };

    exporter.parse(
      exportObject,
      (result) => {
        const blob = new Blob([result], { type: "application/octet-stream" });
        resolve(blob);
      },
      (error) => {
        console.error("GLB Export Error:", error);
        reject(new Error(`Export failed: ${error.message || error}`));
      },
      finalOptions
    );
  });
}

/**
 * Export and download as GLB
 */
export async function downloadAsGLB(object, filename = "model", options = {}) {
  try {
    const blob = await exportToGLB(object, filename, options);
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.glb`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    return { success: true, size: blob.size };
  } catch (error) {
    throw error;
  }
}

/**
 * Export to GLTF (JSON format)
 */
export async function exportToGLTF(object, filename = "model", options = {}) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    
    const { bakeTransforms = true } = options;
    
    const exportObject = bakeTransforms 
      ? cloneWithBakedTransforms(object)
      : clonePreservingTransforms(object);

    exporter.parse(
      exportObject,
      (result) => {
        const output = JSON.stringify(result, null, 2);
        const blob = new Blob([output], { type: "application/json" });
        resolve(blob);
      },
      (error) => {
        reject(new Error(`Export failed: ${error.message || error}`));
      },
      { binary: false, embedImages: true }
    );
  });
}

/**
 * Download as GLTF
 */
export async function downloadAsGLTF(object, filename = "model", options = {}) {
  try {
    const blob = await exportToGLTF(object, filename, options);
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.gltf`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    return { success: true, size: blob.size };
  } catch (error) {
    throw error;
  }
}

/**
 * Export to OBJ format
 */
export async function downloadAsOBJ(object, filename = "model", options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { bakeTransforms = true } = options;
      
      let output = "# Exported from 3D CAD Viewer\n";
      output += "# PBR textures not supported in OBJ format\n\n";
      
      let vertexOffset = 1;
      let normalOffset = 1;
      let uvOffset = 1;

      const exportObject = bakeTransforms 
        ? cloneWithBakedTransforms(object)
        : object;

      exportObject.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const geometry = child.geometry;
          const position = geometry.attributes.position;
          const normal = geometry.attributes.normal;
          const uv = geometry.attributes.uv;

          if (!position) return;

          output += `# Mesh: ${child.name || 'unnamed'}\n`;
          output += `g ${child.name || 'mesh'}\n`;

          const matrix = bakeTransforms ? new THREE.Matrix4() : child.matrixWorld;
          const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
          const tempVertex = new THREE.Vector3();
          const tempNormal = new THREE.Vector3();

          // Vertices
          for (let i = 0; i < position.count; i++) {
            tempVertex.set(
              position.getX(i),
              position.getY(i),
              position.getZ(i)
            );
            if (!bakeTransforms) {
              tempVertex.applyMatrix4(matrix);
            }
            output += `v ${tempVertex.x.toFixed(6)} ${tempVertex.y.toFixed(6)} ${tempVertex.z.toFixed(6)}\n`;
          }

          // UVs
          if (uv) {
            for (let i = 0; i < uv.count; i++) {
              output += `vt ${uv.getX(i).toFixed(6)} ${uv.getY(i).toFixed(6)}\n`;
            }
          }

          // Normals
          if (normal) {
            for (let i = 0; i < normal.count; i++) {
              tempNormal.set(
                normal.getX(i),
                normal.getY(i),
                normal.getZ(i)
              );
              if (!bakeTransforms) {
                tempNormal.applyMatrix3(normalMatrix).normalize();
              }
              output += `vn ${tempNormal.x.toFixed(6)} ${tempNormal.y.toFixed(6)} ${tempNormal.z.toFixed(6)}\n`;
            }
          }

          // Faces
          const index = geometry.index;
          if (index) {
            for (let i = 0; i < index.count; i += 3) {
              const a = index.getX(i) + vertexOffset;
              const b = index.getX(i + 1) + vertexOffset;
              const c = index.getX(i + 2) + vertexOffset;
              
              if (normal && uv) {
                const ua = index.getX(i) + uvOffset;
                const ub = index.getX(i + 1) + uvOffset;
                const uc = index.getX(i + 2) + uvOffset;
                const na = index.getX(i) + normalOffset;
                const nb = index.getX(i + 1) + normalOffset;
                const nc = index.getX(i + 2) + normalOffset;
                output += `f ${a}/${ua}/${na} ${b}/${ub}/${nb} ${c}/${uc}/${nc}\n`;
              } else if (normal) {
                output += `f ${a}//${a - vertexOffset + normalOffset} ${b}//${b - vertexOffset + normalOffset} ${c}//${c - vertexOffset + normalOffset}\n`;
              } else {
                output += `f ${a} ${b} ${c}\n`;
              }
            }
          } else {
            for (let i = 0; i < position.count; i += 3) {
              const a = i + vertexOffset;
              const b = i + 1 + vertexOffset;
              const c = i + 2 + vertexOffset;
              output += `f ${a} ${b} ${c}\n`;
            }
          }

          vertexOffset += position.count;
          if (normal) normalOffset += normal.count;
          if (uv) uvOffset += uv.count;
          
          output += "\n";
        }
      });

      const blob = new Blob([output], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.obj`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      resolve({ success: true, size: blob.size });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Export to STL format
 */
export async function downloadAsSTL(object, filename = "model", options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { binary = true, bakeTransforms = true } = options;
      
      const exportObject = bakeTransforms 
        ? cloneWithBakedTransforms(object)
        : object;

      const triangles = [];
      
      exportObject.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const geometry = child.geometry;
          const position = geometry.attributes.position;
          const index = geometry.index;
          
          if (!position) return;
          
          const matrix = bakeTransforms ? new THREE.Matrix4() : child.matrixWorld;
          
          const getVertex = (idx) => {
            const v = new THREE.Vector3(
              position.getX(idx),
              position.getY(idx),
              position.getZ(idx)
            );
            if (!bakeTransforms) {
              v.applyMatrix4(matrix);
            }
            return v;
          };
          
          const addTriangle = (a, b, c) => {
            const vA = getVertex(a);
            const vB = getVertex(b);
            const vC = getVertex(c);
            
            const edge1 = new THREE.Vector3().subVectors(vB, vA);
            const edge2 = new THREE.Vector3().subVectors(vC, vA);
            const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
            
            triangles.push({ normal, vertices: [vA, vB, vC] });
          };
          
          if (index) {
            for (let i = 0; i < index.count; i += 3) {
              addTriangle(index.getX(i), index.getX(i + 1), index.getX(i + 2));
            }
          } else {
            for (let i = 0; i < position.count; i += 3) {
              addTriangle(i, i + 1, i + 2);
            }
          }
        }
      });

      let blob;
      
      if (binary) {
        const bufferSize = 84 + triangles.length * 50;
        const buffer = new ArrayBuffer(bufferSize);
        const dataView = new DataView(buffer);
        
        const header = "Exported from 3D CAD Viewer - PBR";
        for (let i = 0; i < 80; i++) {
          dataView.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
        }
        
        dataView.setUint32(80, triangles.length, true);
        
        let offset = 84;
        for (const tri of triangles) {
          dataView.setFloat32(offset, tri.normal.x, true); offset += 4;
          dataView.setFloat32(offset, tri.normal.y, true); offset += 4;
          dataView.setFloat32(offset, tri.normal.z, true); offset += 4;
          
          for (const v of tri.vertices) {
            dataView.setFloat32(offset, v.x, true); offset += 4;
            dataView.setFloat32(offset, v.y, true); offset += 4;
            dataView.setFloat32(offset, v.z, true); offset += 4;
          }
          
          dataView.setUint16(offset, 0, true); offset += 2;
        }
        
        blob = new Blob([buffer], { type: "application/octet-stream" });
      } else {
        let output = "solid exported\n";
        
        for (const tri of triangles) {
          output += `  facet normal ${tri.normal.x.toFixed(6)} ${tri.normal.y.toFixed(6)} ${tri.normal.z.toFixed(6)}\n`;
          output += "    outer loop\n";
          for (const v of tri.vertices) {
            output += `      vertex ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}\n`;
          }
          output += "    endloop\n";
          output += "  endfacet\n";
        }
        
        output += "endsolid exported\n";
        blob = new Blob([output], { type: "text/plain" });
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.stl`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      resolve({ success: true, size: blob.size });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get model statistics
 */
export function getModelStats(object) {
  let vertices = 0;
  let triangles = 0;
  let meshCount = 0;
  let textureCount = 0;
  
  const boundingBox = new THREE.Box3();
  
  object.traverse((child) => {
    if (child.isMesh && child.geometry) {
      meshCount++;
      const position = child.geometry.attributes.position;
      if (position) {
        vertices += position.count;
        const index = child.geometry.index;
        triangles += index ? index.count / 3 : position.count / 3;
      }
      
      // Count textures
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].forEach(prop => {
            if (mat[prop]) textureCount++;
          });
        });
      }
      
      child.geometry.computeBoundingBox();
      if (child.geometry.boundingBox) {
        const worldBox = child.geometry.boundingBox.clone();
        worldBox.applyMatrix4(child.matrixWorld);
        boundingBox.union(worldBox);
      }
    }
  });
  
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  
  return {
    vertices,
    triangles: Math.floor(triangles),
    meshCount,
    textureCount,
    boundingBox: {
      min: boundingBox.min,
      max: boundingBox.max,
      size
    }
  };
}

export default { 
  exportToGLB, 
  downloadAsGLB, 
  exportToGLTF, 
  downloadAsGLTF, 
  downloadAsOBJ,
  downloadAsSTL,
  getModelStats 
};