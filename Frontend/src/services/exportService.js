// services/exportService.js
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";

/**
 * Deep clone a texture with all its properties
 */
function cloneTexture(texture) {
  if (!texture) return null;
  
  const cloned = texture.clone();
  cloned.needsUpdate = true;
  
  // Preserve texture settings
  cloned.wrapS = texture.wrapS;
  cloned.wrapT = texture.wrapT;
  cloned.repeat.copy(texture.repeat);
  cloned.offset.copy(texture.offset);
  cloned.center.copy(texture.center);
  cloned.rotation = texture.rotation;
  cloned.minFilter = texture.minFilter;
  cloned.magFilter = texture.magFilter;
  cloned.flipY = texture.flipY;
  cloned.encoding = texture.encoding;
  
  return cloned;
}

/**
 * Clone material preserving ALL properties and textures
 */
function cloneMaterialComplete(material) {
  if (!material) return null;
  
  const cloned = material.clone();
  
  // Clone all texture properties
  const textureProps = [
    'map', 'normalMap', 'roughnessMap', 'metalnessMap',
    'aoMap', 'displacementMap', 'emissiveMap', 'alphaMap',
    'envMap', 'lightMap', 'bumpMap', 'clearcoatMap',
    'clearcoatNormalMap', 'clearcoatRoughnessMap',
    'sheenColorMap', 'sheenRoughnessMap', 
    'transmissionMap', 'thicknessMap', 'specularMap',
    'specularColorMap', 'iridescenceMap', 'iridescenceThicknessMap'
  ];
  
  textureProps.forEach(prop => {
    if (material[prop]) {
      cloned[prop] = cloneTexture(material[prop]);
    }
  });
  
  // Clone color properties
  if (material.color) cloned.color = material.color.clone();
  if (material.emissive) cloned.emissive = material.emissive.clone();
  if (material.sheenColor) cloned.sheenColor = material.sheenColor.clone();
  if (material.specularColor) cloned.specularColor = material.specularColor.clone();
  if (material.attenuationColor) cloned.attenuationColor = material.attenuationColor.clone();
  
  // Clone vector properties
  if (material.normalScale) cloned.normalScale = material.normalScale.clone();
  if (material.clearcoatNormalScale) cloned.clearcoatNormalScale = material.clearcoatNormalScale.clone();
  
  // Preserve numeric properties
  const numericProps = [
    'opacity', 'metalness', 'roughness', 'envMapIntensity',
    'emissiveIntensity', 'bumpScale', 'displacementScale',
    'displacementBias', 'clearcoat', 'clearcoatRoughness',
    'sheen', 'sheenRoughness', 'transmission', 'thickness',
    'attenuationDistance', 'ior', 'reflectivity', 'iridescence',
    'iridescenceIOR', 'aoMapIntensity', 'lightMapIntensity'
  ];
  
  numericProps.forEach(prop => {
    if (material[prop] !== undefined) {
      cloned[prop] = material[prop];
    }
  });
  
  // Preserve other properties
  cloned.transparent = material.transparent;
  cloned.wireframe = material.wireframe;
  cloned.side = material.side;
  cloned.visible = material.visible;
  cloned.depthTest = material.depthTest;
  cloned.depthWrite = material.depthWrite;
  
  cloned.needsUpdate = true;
  return cloned;
}

/**
 * Deep clone a mesh with geometry, materials, and transforms
 */
function cloneMeshComplete(mesh) {
  if (!mesh || !mesh.geometry) return null;
  
  // Clone geometry
  const clonedGeometry = mesh.geometry.clone();
  
  // Clone material(s)
  let clonedMaterial;
  if (Array.isArray(mesh.material)) {
    clonedMaterial = mesh.material.map(mat => cloneMaterialComplete(mat));
  } else {
    clonedMaterial = cloneMaterialComplete(mesh.material);
  }
  
  const clonedMesh = new THREE.Mesh(clonedGeometry, clonedMaterial);
  clonedMesh.name = mesh.name;
  
  // Copy local transform
  clonedMesh.position.copy(mesh.position);
  clonedMesh.quaternion.copy(mesh.quaternion);
  clonedMesh.scale.copy(mesh.scale);
  
  // Copy other properties
  clonedMesh.visible = mesh.visible;
  clonedMesh.castShadow = mesh.castShadow;
  clonedMesh.receiveShadow = mesh.receiveShadow;
  clonedMesh.frustumCulled = mesh.frustumCulled;
  clonedMesh.renderOrder = mesh.renderOrder;
  
  if (mesh.userData) {
    try {
      clonedMesh.userData = JSON.parse(JSON.stringify(mesh.userData));
    } catch (e) {
      clonedMesh.userData = { ...mesh.userData };
    }
  }
  
  return clonedMesh;
}

/**
 * Recursively clone an object and all its children
 */
function cloneObjectDeep(object) {
  if (!object) return null;
  
  let cloned;
  
  if (object.isMesh) {
    cloned = cloneMeshComplete(object);
  } else if (object.isGroup || object.isObject3D || object.isScene) {
    cloned = new THREE.Group();
    cloned.name = object.name;
    cloned.position.copy(object.position);
    cloned.quaternion.copy(object.quaternion);
    cloned.scale.copy(object.scale);
  } else {
    cloned = object.clone(false);
  }
  
  if (!cloned) return null;
  
  // Clone children recursively
  object.children.forEach(child => {
    const clonedChild = cloneObjectDeep(child);
    if (clonedChild) {
      cloned.add(clonedChild);
    }
  });
  
  return cloned;
}

/**
 * Clone and bake transforms into geometry
 */
function cloneWithBakedTransforms(object) {
  const result = new THREE.Group();
  result.name = object.name || "ExportedModel";
  
  object.updateMatrixWorld(true);
  
  object.traverse((child) => {
    if (child.isMesh && child.geometry) {
      // Clone geometry and apply world matrix
      const clonedGeometry = child.geometry.clone();
      child.updateWorldMatrix(true, false);
      clonedGeometry.applyMatrix4(child.matrixWorld);
      
      // Clone materials
      let clonedMaterial;
      if (Array.isArray(child.material)) {
        clonedMaterial = child.material.map(mat => cloneMaterialComplete(mat));
      } else {
        clonedMaterial = cloneMaterialComplete(child.material);
      }
      
      const clonedMesh = new THREE.Mesh(clonedGeometry, clonedMaterial);
      clonedMesh.name = child.name;
      
      // Reset transform (now baked into geometry)
      clonedMesh.position.set(0, 0, 0);
      clonedMesh.rotation.set(0, 0, 0);
      clonedMesh.scale.set(1, 1, 1);
      
      result.add(clonedMesh);
    }
  });
  
  return result;
}

/**
 * Clone preserving hierarchy and transforms
 */
function clonePreservingHierarchy(object) {
  return cloneObjectDeep(object);
}

/**
 * Prepare models for export - combines multiple models into one group
 */
export function prepareModelsForExport(models, options = {}) {
  const { bakeTransforms = true } = options;
  
  if (!models || models.length === 0) {
    throw new Error("No models to export");
  }
  
  // Filter visible models
  const visibleModels = models.filter(m => m.scene && m.visible !== false);
  
  if (visibleModels.length === 0) {
    throw new Error("No visible models to export");
  }
  
  // If single model, return it directly
  if (visibleModels.length === 1) {
    const model = visibleModels[0];
    model.scene.updateMatrixWorld(true);
    
    if (bakeTransforms) {
      return {
        scene: cloneWithBakedTransforms(model.scene),
        fileName: model.fileName?.replace(/\.[^/.]+$/, "") || "model"
      };
    } else {
      return {
        scene: clonePreservingHierarchy(model.scene),
        fileName: model.fileName?.replace(/\.[^/.]+$/, "") || "model"
      };
    }
  }
  
  // Multiple models - combine into group
  const combinedGroup = new THREE.Group();
  combinedGroup.name = "CombinedModels";
  
  visibleModels.forEach((modelData, index) => {
    modelData.scene.updateMatrixWorld(true);
    
    let modelClone;
    if (bakeTransforms) {
      modelClone = cloneWithBakedTransforms(modelData.scene);
    } else {
      modelClone = clonePreservingHierarchy(modelData.scene);
    }
    
    modelClone.name = modelData.fileName?.replace(/\.[^/.]+$/, "") || `Model_${index + 1}`;
    combinedGroup.add(modelClone);
  });
  
  combinedGroup.updateMatrixWorld(true);
  
  return {
    scene: combinedGroup,
    fileName: "combined_models"
  };
}

/**
 * Export to GLB format
 */
export async function exportToGLB(object, options = {}) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    
    const finalOptions = {
      binary: true,
      maxTextureSize: options.maxTextureSize || 4096,
      includeCustomExtensions: options.includeCustomExtensions || false,
      embedImages: true,
      onlyVisible: true,
    };

    exporter.parse(
      object,
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
 * Export to GLTF format
 */
export async function exportToGLTF(object, options = {}) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();

    exporter.parse(
      object,
      (result) => {
        const output = JSON.stringify(result, null, 2);
        const blob = new Blob([output], { type: "application/json" });
        resolve(blob);
      },
      (error) => {
        reject(new Error(`Export failed: ${error.message || error}`));
      },
      { binary: false, embedImages: true, onlyVisible: true }
    );
  });
}

/**
 * Download as GLB - handles both single model and multiple models
 */
export async function downloadAsGLB(objectOrModels, filename = "model", options = {}) {
  try {
    let exportScene, exportName;
    
    // Check if it's an array of models or a single object
    if (Array.isArray(objectOrModels)) {
      const prepared = prepareModelsForExport(objectOrModels, options);
      exportScene = prepared.scene;
      exportName = prepared.fileName;
    } else {
      // Single object
      const { bakeTransforms = true } = options;
      objectOrModels.updateMatrixWorld(true);
      
      if (bakeTransforms) {
        exportScene = cloneWithBakedTransforms(objectOrModels);
      } else {
        exportScene = clonePreservingHierarchy(objectOrModels);
      }
      exportName = filename;
    }
    
    const blob = await exportToGLB(exportScene, options);
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportName}.glb`;
    
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
 * Download as GLTF
 */
export async function downloadAsGLTF(objectOrModels, filename = "model", options = {}) {
  try {
    let exportScene, exportName;
    
    if (Array.isArray(objectOrModels)) {
      const prepared = prepareModelsForExport(objectOrModels, options);
      exportScene = prepared.scene;
      exportName = prepared.fileName;
    } else {
      const { bakeTransforms = true } = options;
      objectOrModels.updateMatrixWorld(true);
      
      if (bakeTransforms) {
        exportScene = cloneWithBakedTransforms(objectOrModels);
      } else {
        exportScene = clonePreservingHierarchy(objectOrModels);
      }
      exportName = filename;
    }
    
    const blob = await exportToGLTF(exportScene, options);
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportName}.gltf`;
    
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
 * Download as OBJ
 */
export async function downloadAsOBJ(objectOrModels, filename = "model", options = {}) {
  return new Promise((resolve, reject) => {
    try {
      let exportScene, exportName;
      
      if (Array.isArray(objectOrModels)) {
        const prepared = prepareModelsForExport(objectOrModels, options);
        exportScene = prepared.scene;
        exportName = prepared.fileName;
      } else {
        const { bakeTransforms = true } = options;
        objectOrModels.updateMatrixWorld(true);
        
        if (bakeTransforms) {
          exportScene = cloneWithBakedTransforms(objectOrModels);
        } else {
          exportScene = clonePreservingHierarchy(objectOrModels);
        }
        exportName = filename;
      }
      
      let objOutput = "# Exported from 3D Viewer\n";
      objOutput += `# File: ${exportName}\n\n`;
      
      let mtlOutput = "# Material Library\n";
      mtlOutput += `# File: ${exportName}.mtl\n\n`;
      
      let vertexOffset = 1;
      let normalOffset = 1;
      let uvOffset = 1;
      const materials = new Map();
      
      exportScene.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const geometry = child.geometry;
          const position = geometry.attributes.position;
          const normal = geometry.attributes.normal;
          const uv = geometry.attributes.uv;
          
          if (!position) return;
          
          // Handle material
          const mat = Array.isArray(child.material) ? child.material[0] : child.material;
          const matName = mat?.name || `material_${materials.size}`;
          
          if (mat && !materials.has(mat.uuid)) {
            materials.set(mat.uuid, matName);
            
            mtlOutput += `newmtl ${matName}\n`;
            if (mat.color) {
              mtlOutput += `Kd ${mat.color.r.toFixed(4)} ${mat.color.g.toFixed(4)} ${mat.color.b.toFixed(4)}\n`;
            }
            if (mat.emissive) {
              mtlOutput += `Ke ${mat.emissive.r.toFixed(4)} ${mat.emissive.g.toFixed(4)} ${mat.emissive.b.toFixed(4)}\n`;
            }
            if (mat.opacity !== undefined) {
              mtlOutput += `d ${mat.opacity.toFixed(4)}\n`;
            }
            mtlOutput += `\n`;
          }
          
          objOutput += `# Mesh: ${child.name || 'unnamed'}\n`;
          objOutput += `g ${child.name || 'mesh'}\n`;
          if (mat) {
            objOutput += `usemtl ${materials.get(mat.uuid) || matName}\n`;
          }
          
          // Vertices
          for (let i = 0; i < position.count; i++) {
            objOutput += `v ${position.getX(i).toFixed(6)} ${position.getY(i).toFixed(6)} ${position.getZ(i).toFixed(6)}\n`;
          }
          
          // UVs
          if (uv) {
            for (let i = 0; i < uv.count; i++) {
              objOutput += `vt ${uv.getX(i).toFixed(6)} ${uv.getY(i).toFixed(6)}\n`;
            }
          }
          
          // Normals
          if (normal) {
            for (let i = 0; i < normal.count; i++) {
              objOutput += `vn ${normal.getX(i).toFixed(6)} ${normal.getY(i).toFixed(6)} ${normal.getZ(i).toFixed(6)}\n`;
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
                objOutput += `f ${a}/${ua}/${na} ${b}/${ub}/${nb} ${c}/${uc}/${nc}\n`;
              } else if (normal) {
                const na = index.getX(i) + normalOffset;
                const nb = index.getX(i + 1) + normalOffset;
                const nc = index.getX(i + 2) + normalOffset;
                objOutput += `f ${a}//${na} ${b}//${nb} ${c}//${nc}\n`;
              } else {
                objOutput += `f ${a} ${b} ${c}\n`;
              }
            }
          } else {
            for (let i = 0; i < position.count; i += 3) {
              const a = i + vertexOffset;
              const b = i + 1 + vertexOffset;
              const c = i + 2 + vertexOffset;
              objOutput += `f ${a} ${b} ${c}\n`;
            }
          }
          
          vertexOffset += position.count;
          if (normal) normalOffset += normal.count;
          if (uv) uvOffset += uv.count;
          
          objOutput += "\n";
        }
      });
      
      // Add MTL reference
      objOutput = `mtllib ${exportName}.mtl\n\n` + objOutput;
      
      // Download OBJ
      const objBlob = new Blob([objOutput], { type: "text/plain" });
      const objUrl = URL.createObjectURL(objBlob);
      const objLink = document.createElement("a");
      objLink.href = objUrl;
      objLink.download = `${exportName}.obj`;
      document.body.appendChild(objLink);
      objLink.click();
      document.body.removeChild(objLink);
      URL.revokeObjectURL(objUrl);
      
      // Download MTL
      const mtlBlob = new Blob([mtlOutput], { type: "text/plain" });
      const mtlUrl = URL.createObjectURL(mtlBlob);
      const mtlLink = document.createElement("a");
      mtlLink.href = mtlUrl;
      mtlLink.download = `${exportName}.mtl`;
      document.body.appendChild(mtlLink);
      mtlLink.click();
      document.body.removeChild(mtlLink);
      URL.revokeObjectURL(mtlUrl);
      
      resolve({ success: true, size: objBlob.size + mtlBlob.size });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Download as STL
 */
export async function downloadAsSTL(objectOrModels, filename = "model", options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { binary = true } = options;
      
      let exportScene, exportName;
      
      if (Array.isArray(objectOrModels)) {
        const prepared = prepareModelsForExport(objectOrModels, options);
        exportScene = prepared.scene;
        exportName = prepared.fileName;
      } else {
        const { bakeTransforms = true } = options;
        objectOrModels.updateMatrixWorld(true);
        
        if (bakeTransforms) {
          exportScene = cloneWithBakedTransforms(objectOrModels);
        } else {
          exportScene = clonePreservingHierarchy(objectOrModels);
        }
        exportName = filename;
      }
      
      const triangles = [];
      
      exportScene.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const geometry = child.geometry;
          const position = geometry.attributes.position;
          const index = geometry.index;
          
          if (!position) return;
          
          const getVertex = (idx) => {
            return new THREE.Vector3(
              position.getX(idx),
              position.getY(idx),
              position.getZ(idx)
            );
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
        
        const header = `Exported from 3D Viewer - ${exportName}`;
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
      link.download = `${exportName}.stl`;
      
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
  const materialSet = new Set();
  
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
      
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          materialSet.add(mat.uuid);
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
    meshes: meshCount,
    meshCount,
    materials: materialSet.size,
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
  exportToGLTF,
  downloadAsGLB, 
  downloadAsGLTF, 
  downloadAsOBJ,
  downloadAsSTL,
  getModelStats,
  prepareModelsForExport,
  cloneMaterialComplete,
  cloneWithBakedTransforms,
  clonePreservingHierarchy
};