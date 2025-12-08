// Components/Model.jsx
import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";

// Highlight material for boundary effect
const createHighlightMaterial = () => new THREE.LineBasicMaterial({
  color: 0xff00ff,
  linewidth: 2,
  transparent: true,
  opacity: 0.8,
  depthTest: false,
  depthWrite: false
});

// Bounding box material
const createBoundingBoxMaterial = () => new THREE.LineBasicMaterial({
  color: 0x00ffff,
  linewidth: 2,
  transparent: true,
  opacity: 0.6,
  depthTest: false,
  depthWrite: false
});

// Helper for applying matrix transforms to meshes
const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _tempMatrix = new THREE.Matrix4();
const _tempWorldMatrix = new THREE.Matrix4();

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
  onMaterialMeshesUpdate
}) {
  const { camera, gl, scene: threeScene } = useThree();
  const groupRef = useRef();
  const transformControlsRef = useRef();
  const materialTransformRef = useRef();
  const initialSetupDone = useRef(false);
  const edgeLineRefs = useRef([]);
  const boundingBoxHelperRef = useRef(null);
  const highlightGroupRef = useRef(null);
  
  // Material mesh group for transforms
  const [materialMeshGroup, setMaterialMeshGroup] = useState(null);
  const materialMeshesCenter = useRef(new THREE.Vector3());
  const originalMatrices = useRef(new Map());
  const prevHighlightedMeshesRef = useRef([]);

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

    if (onModelUpdate) {
      onModelUpdate(scene);
    }
  }, [scene, camera, onModelUpdate]);

  useEffect(() => {
    return () => {
      initialSetupDone.current = false;
    };
  }, [scene]);

  // Cleanup function for highlight elements
  const cleanupHighlights = useCallback(() => {
    // Clear edge lines
    edgeLineRefs.current.forEach(line => {
      if (line) {
        if (line.parent) {
          line.parent.remove(line);
        }
        if (line.geometry) line.geometry.dispose();
        if (line.material) line.material.dispose();
      }
    });
    edgeLineRefs.current = [];

    // Clear bounding box
    if (boundingBoxHelperRef.current) {
      if (boundingBoxHelperRef.current.parent) {
        boundingBoxHelperRef.current.parent.remove(boundingBoxHelperRef.current);
      }
      if (boundingBoxHelperRef.current.geometry) {
        boundingBoxHelperRef.current.geometry.dispose();
      }
      if (boundingBoxHelperRef.current.material) {
        boundingBoxHelperRef.current.material.dispose();
      }
      boundingBoxHelperRef.current = null;
    }

    // Clear highlight group
    if (highlightGroupRef.current) {
      if (highlightGroupRef.current.parent) {
        highlightGroupRef.current.parent.remove(highlightGroupRef.current);
      }
      highlightGroupRef.current = null;
    }

    originalMatrices.current.clear();
  }, []);

  // Handle highlighted meshes - Create edge lines and bounding box
  useEffect(() => {
    // Check if highlightedMeshes actually changed
    const meshUuids = highlightedMeshes.map(h => h.mesh?.uuid).filter(Boolean).sort().join(',');
    const prevMeshUuids = prevHighlightedMeshesRef.current.map(h => h.mesh?.uuid).filter(Boolean).sort().join(',');
    
    if (meshUuids === prevMeshUuids && meshUuids !== '') {
      return;
    }
    
    prevHighlightedMeshesRef.current = highlightedMeshes;
    
    // Cleanup previous highlights
    cleanupHighlights();
    
    // Detach material transform controls
    if (materialTransformRef.current) {
      materialTransformRef.current.detach();
    }
    setMaterialMeshGroup(null);

    if (!highlightedMeshes || highlightedMeshes.length === 0) {
      return;
    }

    // Validate meshes
    const validMeshes = highlightedMeshes.filter(({ mesh }) => 
      mesh && mesh.geometry && mesh.parent
    );

    if (validMeshes.length === 0) {
      return;
    }

    // Create highlight group in the three.js scene (not the model scene)
    const highlightGroup = new THREE.Group();
    highlightGroup.name = 'HighlightGroup';
    highlightGroup.renderOrder = 999;
    threeScene.add(highlightGroup);
    highlightGroupRef.current = highlightGroup;

    // Calculate combined bounding box for all highlighted meshes
    const combinedBox = new THREE.Box3();
    
    validMeshes.forEach(({ mesh }) => {
      try {
        // Create edge geometry
        const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
        const line = new THREE.LineSegments(edges, createHighlightMaterial());
        
        // Copy world transform
        mesh.updateMatrixWorld(true);
        line.matrixAutoUpdate = false;
        line.matrix.copy(mesh.matrixWorld);
        line.renderOrder = 1000;
        line.frustumCulled = false;
        
        // Add to highlight group
        highlightGroup.add(line);
        edgeLineRefs.current.push(line);

        // Expand combined bounding box
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) {
          const meshBox = mesh.geometry.boundingBox.clone();
          meshBox.applyMatrix4(mesh.matrixWorld);
          combinedBox.union(meshBox);
        }
      } catch (error) {
        console.warn('Error creating edge highlight for mesh:', error);
      }
    });

    // Create bounding box helper and transform group
    if (!combinedBox.isEmpty()) {
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      combinedBox.getCenter(center);
      combinedBox.getSize(size);
      
      materialMeshesCenter.current.copy(center);

      // Create box geometry for bounding box
      const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const boxEdges = new THREE.EdgesGeometry(boxGeometry);
      const boxLines = new THREE.LineSegments(boxEdges, createBoundingBoxMaterial());
      boxLines.position.copy(center);
      boxLines.renderOrder = 1001;
      boxLines.frustumCulled = false;

      highlightGroup.add(boxLines);
      boundingBoxHelperRef.current = boxLines;
      boxGeometry.dispose();

      // Create transform group at the center of the meshes
      const group = new THREE.Group();
      group.position.copy(center);
      group.name = 'MaterialTransformGroup';
      group.updateMatrixWorld(true);
      setMaterialMeshGroup(group);

      // Store initial matrices relative to the group for transform application
      validMeshes.forEach(({ mesh }) => {
        if (mesh) {
          mesh.updateWorldMatrix(true, false);
          const relativeMatrix = new THREE.Matrix4();
          relativeMatrix.copy(group.matrixWorld).invert();
          relativeMatrix.multiply(mesh.matrixWorld);
          originalMatrices.current.set(mesh.uuid, relativeMatrix.clone());
        }
      });
    }

    return () => {
      cleanupHighlights();
      if (materialTransformRef.current) {
        materialTransformRef.current.detach();
      }
    };
  }, [highlightedMeshes, threeScene, cleanupHighlights]);

  // Attach/detach transform control for material group
  useEffect(() => {
    if (!materialTransformRef.current) return;

    if (materialMeshGroup && materialTransformMode !== 'none' && selectedMaterialId && isSelected) {
      materialTransformRef.current.attach(materialMeshGroup);
      materialTransformRef.current.setMode(materialTransformMode);
    } else {
      materialTransformRef.current.detach();
    }
  }, [materialTransformMode, materialMeshGroup, selectedMaterialId, isSelected]);

  // Animate highlight edges
  useFrame(({ clock }) => {
    const pulse = Math.sin(clock.elapsedTime * 3) * 0.3 + 0.7;
    
    // Pulse edge lines
    edgeLineRefs.current.forEach(line => {
      if (line && line.material) {
        line.material.opacity = pulse;
      }
    });

    // Pulse bounding box
    if (boundingBoxHelperRef.current && boundingBoxHelperRef.current.material) {
      boundingBoxHelperRef.current.material.opacity = 0.4 + Math.sin(clock.elapsedTime * 2) * 0.2;
    }

    // Update edge line and bounding box positions/transforms during material transform
    if (materialTransformMode !== 'none' && materialMeshGroup && highlightedMeshes.length > 0) {
      materialMeshGroup.updateMatrixWorld(true);
      
      // The bounding box follows the transform group
      if (boundingBoxHelperRef.current) {
        boundingBoxHelperRef.current.position.copy(materialMeshGroup.position);
        boundingBoxHelperRef.current.rotation.copy(materialMeshGroup.rotation);
        boundingBoxHelperRef.current.scale.copy(materialMeshGroup.scale);
      }
      
      // Update highlighted meshes based on group transform
      highlightedMeshes.forEach(({ mesh }, index) => {
        if (!mesh) return;
        
        const originalMatrix = originalMatrices.current.get(mesh.uuid);
        if (originalMatrix) {
          // New World Matrix = Group World Matrix * Original Relative Matrix
          _tempWorldMatrix.copy(materialMeshGroup.matrixWorld).multiply(originalMatrix);
          
          // Get the parent's inverse world matrix
          const parentWorldInverse = _tempMatrix.identity();
          if (mesh.parent) {
            mesh.parent.updateWorldMatrix(true, false);
            parentWorldInverse.copy(mesh.parent.matrixWorld).invert();
          }

          // Calculate the new local matrix: Parent World Inverse * New World Matrix
          const newLocalMatrix = parentWorldInverse.multiply(_tempWorldMatrix);

          // Decompose the new local matrix to update mesh's local properties
          newLocalMatrix.decompose(_position, _quaternion, _scale);
          
          // Apply new local transform to the mesh
          mesh.position.copy(_position);
          mesh.quaternion.copy(_quaternion);
          mesh.scale.copy(_scale);
          mesh.updateWorldMatrix(true, false);
        }
        
        // Update corresponding edge line
        if (edgeLineRefs.current[index]) {
          mesh.updateMatrixWorld(true);
          edgeLineRefs.current[index].matrix.copy(mesh.matrixWorld);
        }
      });
    } else {
      // When not transforming, just update edge line positions
      highlightedMeshes.forEach(({ mesh }, index) => {
        if (mesh && edgeLineRefs.current[index]) {
          mesh.updateMatrixWorld(true);
          edgeLineRefs.current[index].matrix.copy(mesh.matrixWorld);
        }
      });
    }
  });

  // Handle transform changes for model
  const handleTransformChange = useCallback(() => {
    if (scene) {
      scene.updateMatrixWorld(true);
      if (onModelUpdate) {
        onModelUpdate(scene);
      }
    }
  }, [scene, onModelUpdate]);

  // Handle material mesh transform end (commit changes)
  const handleMaterialTransformEnd = useCallback(() => {
    if (!materialMeshGroup || highlightedMeshes.length === 0) return;

    // 1. Update the local transform of each mesh
    highlightedMeshes.forEach(({ mesh }) => {
      if (mesh) {
        mesh.updateMatrixWorld(true);
        mesh.matrix.compose(mesh.position, mesh.quaternion, mesh.scale);
        mesh.matrixWorldNeedsUpdate = true;
      }
    });
    
    // 2. Reset the transform group and recalculate
    const newBox = new THREE.Box3();
    highlightedMeshes.forEach(({ mesh }) => {
      if (mesh && mesh.geometry) {
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
      materialMeshesCenter.current.copy(newCenter);
      
      // Reset and reposition the transform group
      materialMeshGroup.position.copy(newCenter);
      materialMeshGroup.rotation.set(0, 0, 0);
      materialMeshGroup.scale.set(1, 1, 1);
      materialMeshGroup.updateMatrixWorld(true);

      // Update bounding box
      if (boundingBoxHelperRef.current) {
        boundingBoxHelperRef.current.position.copy(newCenter);
        boundingBoxHelperRef.current.rotation.set(0, 0, 0);
        boundingBoxHelperRef.current.scale.set(1, 1, 1);
        
        // Update bounding box geometry to new size
        const oldGeom = boundingBoxHelperRef.current.geometry;
        const newBoxGeom = new THREE.BoxGeometry(newSize.x, newSize.y, newSize.z);
        const newEdges = new THREE.EdgesGeometry(newBoxGeom);
        boundingBoxHelperRef.current.geometry = newEdges;
        oldGeom.dispose();
        newBoxGeom.dispose();
      }

      // Re-store new original relative matrices
      highlightedMeshes.forEach(({ mesh }) => {
        if (mesh) {
          mesh.updateWorldMatrix(true, false);
          const relativeMatrix = new THREE.Matrix4();
          relativeMatrix.copy(materialMeshGroup.matrixWorld).invert();
          relativeMatrix.multiply(mesh.matrixWorld);
          originalMatrices.current.set(mesh.uuid, relativeMatrix.clone());
        }
      });
    }

    // 3. Notify parent of mesh updates
    if (onMaterialMeshesUpdate) {
      onMaterialMeshesUpdate(highlightedMeshes.map(h => h.mesh));
    }
    
  }, [materialMeshGroup, highlightedMeshes, onMaterialMeshesUpdate]);

  // Setup transform controls event listeners
  useEffect(() => {
    const controls = transformControlsRef.current;
    if (!controls) return;

    const handleDraggingChanged = (event) => {
      onTransformChange?.(event.value);
      if (!event.value) {
        handleTransformChange();
      }
    };

    const handleObjectChange = () => {
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
  
  // Setup material transform controls event listeners
  useEffect(() => {
    const controls = materialTransformRef.current;
    if (!controls) return;
    
    const handleDraggingChanged = (event) => {
      onTransformChange?.(event.value);
      if (!event.value) {
        handleMaterialTransformEnd();
      }
    };

    controls.addEventListener('dragging-changed', handleDraggingChanged);

    return () => {
      controls.removeEventListener('dragging-changed', handleDraggingChanged);
    };
  }, [onTransformChange, handleMaterialTransformEnd]);

  // Handle click to select
  const handleClick = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupHighlights();
    };
  }, [cleanupHighlights]);

  if (!scene) return null;

  const isModelTransformActive = transformMode !== 'none' && isSelected && !selectedMaterialId;
  const isMaterialTransformActive = materialMeshGroup && materialTransformMode !== 'none' && selectedMaterialId && isSelected;

  return (
    <group ref={groupRef} onClick={handleClick}>
      {/* Selection indicator ring */}
      {isSelected && (
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.8, 3, 64]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
        </mesh>
      )}

      {/* Model Transform Controls */}
      {isModelTransformActive && (
        <TransformControls
          ref={transformControlsRef}
          mode={transformMode}
          object={scene}
          camera={camera}
          domElement={gl.domElement}
          size={0.7}
          onMouseDown={() => onTransformChange?.(true)}
          onMouseUp={() => onTransformChange?.(false)}
        />
      )}
      
      {/* Material Transform Controls */}
      {isMaterialTransformActive && (
        <TransformControls
          ref={materialTransformRef}
          mode={materialTransformMode}
          object={materialMeshGroup}
          camera={camera}
          domElement={gl.domElement}
          size={0.5}
        />
      )}

      {/* Render the model scene */}
      <primitive object={scene} />
      
      {/* Render the material mesh group for transforms (invisible pivot) */}
      {materialMeshGroup && <primitive object={materialMeshGroup} />}
    </group>
  );
}

export default Model;