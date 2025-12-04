// utils/modelUtils.js
import * as THREE from 'three';

export const normalizeModel = (scene) => {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  // 1. Scale logic: Fit into a 10x10x10 box (approx view size)
  const maxDim = Math.max(size.x, size.y, size.z);
  const targetSize = 5; // Target size in world units
  const scale = targetSize / maxDim;
  
  scene.scale.setScalar(scale);

  // 2. Center logic: Move to (0,0,0) and sit on floor (Y=0)
  // We need to recalculate box after scaling to get precise center
  scene.updateMatrixWorld();
  const newBox = new THREE.Box3().setFromObject(scene);
  newBox.getCenter(center);
  
  scene.position.sub(center); // Move center to 0,0,0
  scene.position.y += (newBox.max.y - newBox.min.y) / 2; // Move up so bottom touches 0

  return scene;
};

export const getModelStats = (object) => {
  let vertices = 0;
  let triangles = 0;

  object.traverse((child) => {
    if (child.isMesh && child.geometry) {
      vertices += child.geometry.attributes.position.count;
      if (child.geometry.index) {
        triangles += child.geometry.index.count / 3;
      } else {
        triangles += child.geometry.attributes.position.count / 3;
      }
    }
  });

  return { 
    vertices: Math.round(vertices), 
    triangles: Math.round(triangles) 
  };
};