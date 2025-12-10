// Components/Model.jsx
import React, { useEffect, useRef, useCallback, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";

// Static bounding box material - cyan
const createBoundingBoxMaterial = () => new THREE.LineBasicMaterial({
  color: 0x00ffff,
  linewidth: 2,
  transparent: true,
  opacity: 0.8,
  depthTest: false,
  depthWrite: false
});

function Model({ 
  modelId,
  scene, 
  isSelected = false,
  transformMode = 'none', 
  onTransformChange, 
  onModelUpdate,
  onSelect,
  highlightedMeshes = [],
  selectedMaterialId,
  materialTransformMode = 'none',
  onMaterialMeshesUpdate,
  onTransformStart // New prop for undo system
}) {
  const { camera, gl, scene: threeScene } = useThree();
  const groupRef = useRef();
  const transformControlsRef = useRef();
  const materialTransformRef = useRef();
  const initialSetupDone = useRef(false);
  const boundingBoxHelperRef = useRef(null);
  const highlightGroupRef = useRef(null);
  
  // Material mesh group for transforms
  const [materialMeshGroup, setMaterialMeshGroup] = useState(null);
  const originalMatrices = useRef(new Map());
  const prevHighlightKey = useRef('');
  const isDraggingMaterial = useRef(false);
  
  // Selection ring state
  const [selectionRingGeometry, setSelectionRingGeometry] = useState([2.8, 3, 64]);
  const [modelCenter, setModelCenter] = useState([0, -0.02, 0]);

  // Store initial transform for undo
  const transformStartState = useRef(null);

  // Setup scene on load
  useEffect(() => {
    if (!scene || initialSetupDone.current) return;

    scene.position.set(0, 0, 0);
    scene.scale.set(1, 1, 1);
    scene.rotation.set(0, 0, 0);

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 2 / maxDim : 1;
    scene.scale.setScalar(scale);

    box.setFromObject(scene);
    box.getCenter(center);
    box.getSize(size);

    const minY = box.min.y;
    scene.position.x = -center.x;
    scene.position.y = -minY;
    scene.position.z = -center.z;

    const distance = Math.max(size.x, size.y, size.z) * 2.5;
    camera.position.set(distance * 0.8, distance * 0.6, distance * 0.8);
    camera.lookAt(0, size.y / 2, 0);
    camera.updateProjectionMatrix();

    scene.updateMatrixWorld(true);
    initialSetupDone.current = true;

    const ringRadius = Math.max(size.x, size.z) * 0.7;
    setSelectionRingGeometry([ringRadius, ringRadius + 0.15, 64]);
    setModelCenter([0, -0.02, 0]);

    if (onModelUpdate) {
      onModelUpdate(scene);
    }
  }, [scene, camera, onModelUpdate]);

  useEffect(() => {
    return () => {
      initialSetupDone.current = false;
    };
  }, [scene]);

  // Update selection ring
  const updateSelectionRing = useCallback(() => {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const ringRadius = Math.max(size.x, size.z) * 0.7;
    setSelectionRingGeometry([ringRadius, ringRadius + 0.15, 64]);
    setModelCenter([center.x, box.min.y - 0.02, center.z]);
  }, [scene]);

  // Cleanup highlights
  const cleanupHighlights = useCallback(() => {
    if (boundingBoxHelperRef.current) {
      if (boundingBoxHelperRef.current.parent) {
        boundingBoxHelperRef.current.parent.remove(boundingBoxHelperRef.current);
      }
      if (boundingBoxHelperRef.current.geometry) boundingBoxHelperRef.current.geometry.dispose();
      if (boundingBoxHelperRef.current.material) boundingBoxHelperRef.current.material.dispose();
      boundingBoxHelperRef.current = null;
    }

    if (highlightGroupRef.current) {
      if (highlightGroupRef.current.parent) {
        highlightGroupRef.current.parent.remove(highlightGroupRef.current);
      }
      highlightGroupRef.current = null;
    }

    originalMatrices.current.clear();
  }, []);

  // Create highlights when meshes change - ONLY BOUNDING BOX, NO EDGE LINES
  useEffect(() => {
    const meshKey = highlightedMeshes
      .map(h => h?.mesh?.uuid)
      .filter(Boolean)
      .sort()
      .join(',');
    
    if (meshKey === prevHighlightKey.current && meshKey !== '') {
      return;
    }
    
    prevHighlightKey.current = meshKey;
    cleanupHighlights();
    
    // Remove old material mesh group
    if (materialMeshGroup && materialMeshGroup.parent) {
      materialMeshGroup.parent.remove(materialMeshGroup);
    }
    setMaterialMeshGroup(null);

    if (!highlightedMeshes || highlightedMeshes.length === 0) {
      return;
    }

    const validMeshes = highlightedMeshes.filter(({ mesh }) => 
      mesh && mesh.geometry && mesh.parent
    );

    if (validMeshes.length === 0) {
      return;
    }

    // Create highlight group
    const highlightGroup = new THREE.Group();
    highlightGroup.name = 'HighlightGroup';
    highlightGroup.renderOrder = 999;
    threeScene.add(highlightGroup);
    highlightGroupRef.current = highlightGroup;

    const combinedBox = new THREE.Box3();
    
    // Calculate combined bounding box (no edge lines)
    validMeshes.forEach(({ mesh }) => {
      try {
        mesh.updateMatrixWorld(true);
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) {
          const meshBox = mesh.geometry.boundingBox.clone();
          meshBox.applyMatrix4(mesh.matrixWorld);
          combinedBox.union(meshBox);
        }
      } catch (error) {
        console.warn('Error computing bounding box:', error);
      }
    });

    // Create bounding box and pivot group
    if (!combinedBox.isEmpty()) {
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      combinedBox.getCenter(center);
      combinedBox.getSize(size);

      // Bounding box visualization (cyan only)
      const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const boxEdges = new THREE.EdgesGeometry(boxGeometry);
      const boxLines = new THREE.LineSegments(boxEdges, createBoundingBoxMaterial());
      boxLines.position.copy(center);
      boxLines.renderOrder = 1001;
      boxLines.frustumCulled = false;
      highlightGroup.add(boxLines);
      boundingBoxHelperRef.current = boxLines;
      boxGeometry.dispose();

      // Create pivot group for transforms
      const pivotGroup = new THREE.Group();
      pivotGroup.position.copy(center);
      pivotGroup.name = 'MaterialPivotGroup';
      threeScene.add(pivotGroup);
      pivotGroup.updateMatrixWorld(true);

      // Store original relative matrices
      validMeshes.forEach(({ mesh }) => {
        if (mesh) {
          mesh.updateWorldMatrix(true, false);
          const groupWorldInverse = new THREE.Matrix4().copy(pivotGroup.matrixWorld).invert();
          const relativeMatrix = new THREE.Matrix4().multiplyMatrices(groupWorldInverse, mesh.matrixWorld);
          originalMatrices.current.set(mesh.uuid, {
            matrix: relativeMatrix.clone(),
            mesh: mesh
          });
        }
      });

      setMaterialMeshGroup(pivotGroup);
    }

  }, [highlightedMeshes, threeScene, cleanupHighlights, materialMeshGroup]);

  // Cleanup material mesh group
  useEffect(() => {
    return () => {
      if (materialMeshGroup && materialMeshGroup.parent) {
        materialMeshGroup.parent.remove(materialMeshGroup);
      }
    };
  }, [materialMeshGroup]);

  // Apply transforms during drag
  useFrame(() => {
    if (isDraggingMaterial.current && materialMeshGroup && highlightedMeshes.length > 0) {
      materialMeshGroup.updateMatrixWorld(true);
      
      // Update bounding box
      if (boundingBoxHelperRef.current) {
        boundingBoxHelperRef.current.position.copy(materialMeshGroup.position);
        boundingBoxHelperRef.current.quaternion.copy(materialMeshGroup.quaternion);
        boundingBoxHelperRef.current.scale.copy(materialMeshGroup.scale);
      }
      
      // Transform meshes
      originalMatrices.current.forEach(({ matrix: originalMatrix, mesh }) => {
        if (!mesh || !mesh.parent) return;
        
        const newWorldMatrix = new THREE.Matrix4();
        newWorldMatrix.multiplyMatrices(materialMeshGroup.matrixWorld, originalMatrix);
        
        mesh.parent.updateWorldMatrix(true, false);
        const parentInverse = new THREE.Matrix4().copy(mesh.parent.matrixWorld).invert();
        const newLocalMatrix = new THREE.Matrix4().multiplyMatrices(parentInverse, newWorldMatrix);
        
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        const scl = new THREE.Vector3();
        newLocalMatrix.decompose(pos, quat, scl);
        
        mesh.position.copy(pos);
        mesh.quaternion.copy(quat);
        mesh.scale.copy(scl);
        mesh.updateMatrixWorld(true);
      });
    } else if (highlightedMeshes.length > 0 && !isDraggingMaterial.current) {
      // Sync bounding box position when not dragging
      if (boundingBoxHelperRef.current && materialMeshGroup) {
        boundingBoxHelperRef.current.position.copy(materialMeshGroup.position);
        boundingBoxHelperRef.current.quaternion.copy(materialMeshGroup.quaternion);
        boundingBoxHelperRef.current.scale.copy(materialMeshGroup.scale);
      }
    }
  });

  // Handle model transform
  const handleTransformChange = useCallback(() => {
    if (scene) {
      scene.updateMatrixWorld(true);
      updateSelectionRing();
      if (onModelUpdate) {
        onModelUpdate(scene);
      }
    }
  }, [scene, onModelUpdate, updateSelectionRing]);

  // Handle material transform end
  const handleMaterialTransformEnd = useCallback(() => {
    if (!materialMeshGroup || highlightedMeshes.length === 0) return;

    isDraggingMaterial.current = false;

    highlightedMeshes.forEach(({ mesh }) => {
      if (mesh) {
        mesh.updateMatrixWorld(true);
      }
    });
    
    // Recalculate bounding box
    const newBox = new THREE.Box3();
    highlightedMeshes.forEach(({ mesh }) => {
      if (mesh?.geometry) {
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) {
          const meshBox = mesh.geometry.boundingBox.clone();
          meshBox.applyMatrix4(mesh.matrixWorld);
          newBox.union(meshBox);
        }
      }
    });
    
    if (!newBox.isEmpty()) {
      const newCenter = new THREE.Vector3();
      const newSize = new THREE.Vector3();
      newBox.getCenter(newCenter);
      newBox.getSize(newSize);
      
      // Reset pivot
      materialMeshGroup.position.copy(newCenter);
      materialMeshGroup.rotation.set(0, 0, 0);
      materialMeshGroup.scale.set(1, 1, 1);
      materialMeshGroup.updateMatrixWorld(true);

      // Update bounding box
      if (boundingBoxHelperRef.current) {
        boundingBoxHelperRef.current.position.copy(newCenter);
        boundingBoxHelperRef.current.rotation.set(0, 0, 0);
        boundingBoxHelperRef.current.scale.set(1, 1, 1);
        
        const oldGeom = boundingBoxHelperRef.current.geometry;
        const newBoxGeom = new THREE.BoxGeometry(newSize.x, newSize.y, newSize.z);
        boundingBoxHelperRef.current.geometry = new THREE.EdgesGeometry(newBoxGeom);
        oldGeom.dispose();
        newBoxGeom.dispose();
      }

      // Re-store relative matrices
      highlightedMeshes.forEach(({ mesh }) => {
        if (mesh) {
          mesh.updateWorldMatrix(true, false);
          const groupWorldInverse = new THREE.Matrix4().copy(materialMeshGroup.matrixWorld).invert();
          const relativeMatrix = new THREE.Matrix4().multiplyMatrices(groupWorldInverse, mesh.matrixWorld);
          originalMatrices.current.set(mesh.uuid, {
            matrix: relativeMatrix.clone(),
            mesh: mesh
          });
        }
      });
    }

    if (onMaterialMeshesUpdate) {
      onMaterialMeshesUpdate(highlightedMeshes.map(h => h.mesh));
    }
    
  }, [materialMeshGroup, highlightedMeshes, onMaterialMeshesUpdate]);

  // Capture state before transform starts
  const captureTransformState = useCallback(() => {
    if (scene) {
      return {
        type: 'model',
        modelId,
        position: scene.position.clone(),
        rotation: scene.rotation.clone(),
        scale: scene.scale.clone()
      };
    }
    return null;
  }, [scene, modelId]);

  // Capture material mesh state
  const captureMaterialState = useCallback(() => {
    if (highlightedMeshes.length === 0) return null;
    
    const meshStates = [];
    highlightedMeshes.forEach(({ mesh }) => {
      if (mesh) {
        meshStates.push({
          uuid: mesh.uuid,
          position: mesh.position.clone(),
          rotation: mesh.rotation.clone(),
          scale: mesh.scale.clone()
        });
      }
    });
    
    return {
      type: 'material',
      modelId,
      meshStates
    };
  }, [highlightedMeshes, modelId]);

  // Material transform drag handler
  const handleMaterialDraggingChanged = useCallback((event) => {
    if (event.value) {
      // Starting drag - capture state for undo
      const state = captureMaterialState();
      if (state && onTransformStart) {
        onTransformStart(state);
      }
    }
    
    isDraggingMaterial.current = event.value;
    onTransformChange?.(event.value);
    
    if (!event.value) {
      handleMaterialTransformEnd();
    }
  }, [onTransformChange, handleMaterialTransformEnd, captureMaterialState, onTransformStart]);

  // Model transform controls
  useEffect(() => {
    const controls = transformControlsRef.current;
    if (!controls) return;

    const handleDraggingChanged = (event) => {
      if (event.value) {
        // Starting drag - capture state for undo
        const state = captureTransformState();
        if (state && onTransformStart) {
          onTransformStart(state);
        }
      }
      
      onTransformChange?.(event.value);
      if (!event.value) {
        handleTransformChange();
      }
    };

    controls.addEventListener('dragging-changed', handleDraggingChanged);
    return () => controls.removeEventListener('dragging-changed', handleDraggingChanged);
  }, [onTransformChange, handleTransformChange, captureTransformState, onTransformStart]);

  // Material transform controls
  useEffect(() => {
    const controls = materialTransformRef.current;
    if (!controls) return;

    controls.addEventListener('dragging-changed', handleMaterialDraggingChanged);
    return () => controls.removeEventListener('dragging-changed', handleMaterialDraggingChanged);
  }, [handleMaterialDraggingChanged]);

  // Click to select
  const handleClick = (e) => {
    e.stopPropagation();
    onSelect?.();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      cleanupHighlights();
    };
  }, [cleanupHighlights]);

  if (!scene) return null;

  const showModelTransform = transformMode !== 'none' && isSelected && !selectedMaterialId;
  const showMaterialTransform = materialMeshGroup && 
                                 materialTransformMode !== 'none' && 
                                 selectedMaterialId && 
                                 isSelected;

  return (
    <group ref={groupRef} onClick={handleClick}>
      {/* Selection ring for model */}
      {isSelected && (
        <mesh position={modelCenter} rotation={[-Math.PI / 2, 0, 0]} renderOrder={100}>
          <ringGeometry args={selectionRingGeometry} />
          <meshBasicMaterial 
            color="#3b82f6" 
            transparent 
            opacity={0.4} 
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      )}

      {/* Model Transform Controls */}
      {showModelTransform && (
        <TransformControls
          ref={transformControlsRef}
          mode={transformMode}
          object={scene}
          camera={camera}
          domElement={gl.domElement}
          size={0.7}
        />
      )}
      
      {/* Material Transform Controls */}
      {showMaterialTransform && (
        <TransformControls
          ref={materialTransformRef}
          mode={materialTransformMode}
          object={materialMeshGroup}
          camera={camera}
          domElement={gl.domElement}
          size={0.5}
        />
      )}

      <primitive object={scene} />
    </group>
  );
}

export default Model;