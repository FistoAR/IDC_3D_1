// Components/Model.jsx
import React, { useEffect, useRef, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";

function Model({ scene, transformMode = 'none', onTransformChange, onModelUpdate }) {
  const { camera, gl } = useThree();
  const groupRef = useRef();
  const transformControlsRef = useRef();
  const initialSetupDone = useRef(false);

  // Setup scene on load
  useEffect(() => {
    if (!scene || initialSetupDone.current) return;

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

    // Update world matrix
    scene.updateMatrixWorld(true);

    initialSetupDone.current = true;

    // Notify parent of initial model state
    if (onModelUpdate) {
      onModelUpdate(scene);
    }

  }, [scene, camera, onModelUpdate]);

  // Reset setup flag when scene changes
  useEffect(() => {
    return () => {
      initialSetupDone.current = false;
    };
  }, [scene]);

  // Handle transform changes
  const handleTransformChange = useCallback(() => {
    if (scene) {
      scene.updateMatrixWorld(true);
      if (onModelUpdate) {
        onModelUpdate(scene);
      }
    }
  }, [scene, onModelUpdate]);

  // Setup transform controls event listeners
  useEffect(() => {
    const controls = transformControlsRef.current;
    if (!controls) return;

    const handleDraggingChanged = (event) => {
      onTransformChange?.(event.value);
      
      // Update model when drag ends
      if (!event.value) {
        handleTransformChange();
      }
    };

    const handleObjectChange = () => {
      // Real-time updates during transform
      if (scene) {
        scene.updateMatrixWorld(true);
      }
    };

    controls.addEventListener('dragging-changed', handleDraggingChanged);
    controls.addEventListener('objectChange', handleObjectChange);

    return () => {
      controls.removeEventListener('dragging-changed', handleDraggingChanged);
      controls.removeEventListener('objectChange', handleObjectChange);
    };
  }, [scene, onTransformChange, handleTransformChange]);

  if (!scene) return null;

  return (
    <group ref={groupRef}>
      {transformMode !== 'none' ? (
        <TransformControls
          ref={transformControlsRef}
          mode={transformMode}
          object={scene}
          camera={camera}
          domElement={gl.domElement}
          size={0.7}
          onMouseDown={() => onTransformChange?.(true)}
          onMouseUp={() => {
            onTransformChange?.(false);
            handleTransformChange();
          }}
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