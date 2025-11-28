import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";

function Model({ scene, transformMode = 'none', onTransformChange }) {
  const { camera } = useThree();
  const groupRef = useRef();

  useEffect(() => {
    if (!scene) return;

    // Reset transformations
    scene.position.set(0, 0, 0);
    scene.scale.set(1, 1, 1);
    scene.rotation.set(0, 0, 0);

    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Scale to fit
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 2 / maxDim : 1;
    scene.scale.setScalar(scale);

    // Recalculate after scaling
    box.setFromObject(scene);
    box.getCenter(center);
    box.getSize(size);

    // Position on ground
    const minY = box.min.y;
    scene.position.x = -center.x;
    scene.position.y = -minY;
    scene.position.z = -center.z;

    // Adjust camera
    const distance = Math.max(size.x, size.y, size.z) * 2.5;
    camera.position.set(distance * 0.8, distance * 0.6, distance * 0.8);
    camera.lookAt(0, size.y / 2, 0);
    camera.updateProjectionMatrix();

  }, [scene, camera]);

  if (!scene) return null;

  return (
    <group ref={groupRef}>
      {transformMode !== 'none' ? (
        <TransformControls
          mode={transformMode}
          onMouseDown={() => onTransformChange?.(true)}
          onMouseUp={() => onTransformChange?.(false)}
        >
          <primitive object={scene} />
        </TransformControls>
      ) : (
        <primitive object={scene} />
      )}
    </group>
  );
}

export default Model;