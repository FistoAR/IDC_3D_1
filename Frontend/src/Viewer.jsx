// Frontend/src/Viewer.jsx
import React, { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import TWEEN from '@tweenjs/tween.js';

import LoaderFallback from "./Components/LoaderFallback";
import Model from "./Components/Model";
import Ground from "./Components/Ground";
import CameraController from "./Components/CameraController";
import Sidebar from "./Components/Sidebar";
import Toolbar from "./Components/Toolbar";
import ModelList from "./Components/ModelList";
import { loadModel } from "./modelLoader";
import { downloadAsGLB, downloadAsGLTF, downloadAsOBJ, downloadAsSTL, getModelStats } from "./services/exportService";

// Helper to update tweens inside the canvas loop
function CameraAnimator() {
  useFrame(() => TWEEN.update());
  return null;
}

// Helper function to clone scene with independent materials
const cloneSceneWithIndependentMaterials = (sourceScene) => {
  const clonedScene = sourceScene.clone(true);
  
  // Create new materials for each mesh with color variation
  clonedScene.traverse((child) => {
    if (child.isMesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material = child.material.map(mat => {
          const newMat = mat.clone();
          newMat.uuid = THREE.MathUtils.generateUUID();
          
          // Vary the color to make it visually distinct
          if (newMat.color) {
            const hsl = {};
            newMat.color.getHSL(hsl);
            // Shift hue by 10-30 degrees
            hsl.h = (hsl.h + 0.05 + Math.random() * 0.1) % 1;
            hsl.s = Math.min(1, Math.max(0, hsl.s + (Math.random() - 0.5) * 0.2));
            hsl.l = Math.min(1, Math.max(0, hsl.l + (Math.random() - 0.5) * 0.1));
            newMat.color.setHSL(hsl.h, hsl.s, hsl.l);
          }
          
          // Clone textures if they exist (for PBR)
          if (newMat.map) newMat.map = newMat.map.clone();
          if (newMat.normalMap) newMat.normalMap = newMat.normalMap.clone();
          if (newMat.roughnessMap) newMat.roughnessMap = newMat.roughnessMap.clone();
          if (newMat.metalnessMap) newMat.metalnessMap = newMat.metalnessMap.clone();
          if (newMat.aoMap) newMat.aoMap = newMat.aoMap.clone();
          
          newMat.needsUpdate = true;
          return newMat;
        });
      } else {
        const newMat = child.material.clone();
        newMat.uuid = THREE.MathUtils.generateUUID();
        
        if (newMat.color) {
          const hsl = {};
          newMat.color.getHSL(hsl);
          hsl.h = (hsl.h + 0.05 + Math.random() * 0.1) % 1;
          hsl.s = Math.min(1, Math.max(0, hsl.s + (Math.random() - 0.5) * 0.2));
          hsl.l = Math.min(1, Math.max(0, hsl.l + (Math.random() - 0.5) * 0.1));
          newMat.color.setHSL(hsl.h, hsl.s, hsl.l);
        }
        
        if (newMat.map) newMat.map = newMat.map.clone();
        if (newMat.normalMap) newMat.normalMap = newMat.normalMap.clone();
        if (newMat.roughnessMap) newMat.roughnessMap = newMat.roughnessMap.clone();
        if (newMat.metalnessMap) newMat.metalnessMap = newMat.metalnessMap.clone();
        if (newMat.aoMap) newMat.aoMap = newMat.aoMap.clone();
        
        newMat.needsUpdate = true;
        child.material = newMat;
      }
    }
  });
  
  return clonedScene;
};

export default function Viewer() {
  // Multi-Model State
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  // View State
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [bgColor, setBgColor] = useState("rgba(26, 26, 46, 1)");
  const [showGrid, setShowGrid] = useState(true);
  const [showBase, setShowBase] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [resetCamera, setResetCamera] = useState(false);
  
  // Animation State
  const [isFocusing, setIsFocusing] = useState(false);
  
  // Transform State
  const [transformMode, setTransformMode] = useState('none');
  const [isTransforming, setIsTransforming] = useState(false);
  
  // Material Selection State
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [highlightedMeshes, setHighlightedMeshes] = useState([]);
  const [materialTransformMode, setMaterialTransformMode] = useState('none');
  
  // Lighting & Shadow State
  const [lights, setLights] = useState({
    ambient: { intensity: 0.4, visible: true },
    directional: { intensity: 1.5, position: [5, 10, 5], color: "#ffffff", visible: true },
    point: { intensity: 1.0, position: [-5, 5, -5], color: "#ffffff", visible: false },
    environment: { preset: "city", visible: true, blur: 0.8, intensity: 1.0 },
    shadows: { enabled: true, opacity: 0.4, blur: 2.0 }
  });

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [bakeTransforms, setBakeTransforms] = useState(true);
  
  // Total Stats for all models
  const [totalStats, setTotalStats] = useState({
    vertices: 0,
    triangles: 0,
    meshes: 0,
    materials: 0,
    models: 0
  });
  
  // Refs
  const modelRefs = useRef({});
  const orbitControlsRef = useRef();
  const cameraRef = useRef();

  // Calculate total stats whenever models change
  useEffect(() => {
    let vertices = 0;
    let triangles = 0;
    let meshes = 0;
    let materials = new Set();
    
    models.forEach(modelData => {
      if (modelData.scene) {
        modelData.scene.traverse((child) => {
          if (child.isMesh) {
            meshes++;
            if (child.geometry) {
              const geo = child.geometry;
              vertices += geo.attributes.position?.count || 0;
              if (geo.index) {
                triangles += geo.index.count / 3;
              } else if (geo.attributes.position) {
                triangles += geo.attributes.position.count / 3;
              }
            }
            if (child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach(m => materials.add(m.uuid));
            }
          }
        });
      }
    });
    
    setTotalStats({
      vertices: Math.round(vertices),
      triangles: Math.round(triangles),
      meshes,
      materials: materials.size,
      models: models.length
    });
  }, [models]);

  // Generate unique ID for each model
  const generateModelId = () => `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // File Processing
  const processFile = useCallback((file) => {
    setError("");
    setWarning("");
    setLoading(true);
    setLoadingStatus("Starting...");
    
    loadModel(file, (status) => setLoadingStatus(status))
      .then((scene) => {
        const modelId = generateModelId();
        const stats = getModelStats(scene);
        
        const newModel = {
          id: modelId,
          scene: scene,
          fileName: file.name,
          stats: stats,
          visible: true,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1]
        };
        
        setModels(prev => [...prev, newModel]);
        setSelectedModelId(modelId);
        setLoading(false);
        setLoadingStatus("");
      })
      .catch((err) => {
        setError(typeof err === 'string' ? err : err.message || 'Failed to load');
        setLoading(false);
        setLoadingStatus("");
      });
  }, []);

  // Process multiple files
  const processMultipleFiles = useCallback((files) => {
    Array.from(files).forEach((file, index) => {
      setTimeout(() => processFile(file), index * 100);
    });
  }, [processFile]);

  const handleFile = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (files.length === 1) {
        processFile(files[0]);
      } else {
        processMultipleFiles(files);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      if (files.length === 1) {
        processFile(files[0]);
      } else {
        processMultipleFiles(files);
      }
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  // Apply wireframe to all models
  useEffect(() => {
    models.forEach(modelData => {
      if (modelData.scene) {
        modelData.scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => mat.wireframe = wireframe);
          }
        });
      }
    });
  }, [wireframe, models]);

  // Handle model selection
  const handleSelectModel = useCallback((modelId) => {
    setSelectedModelId(modelId);
    // Clear material selection when selecting a different model
    setSelectedMaterialId(null);
    setHighlightedMeshes([]);
    setMaterialTransformMode('none');
  }, []);

  // Handle model deletion
  const handleDeleteModel = useCallback((modelId) => {
    setModels(prev => prev.filter(m => m.id !== modelId));
    if (selectedModelId === modelId) {
      const remaining = models.filter(m => m.id !== modelId);
      setSelectedModelId(remaining.length > 0 ? remaining[0].id : null);
    }
    delete modelRefs.current[modelId];
    
    // Clear material selection if it belongs to deleted model
    setSelectedMaterialId(null);
    setHighlightedMeshes([]);
  }, [selectedModelId, models]);

  // Handle model visibility toggle
  const handleToggleModelVisibility = useCallback((modelId) => {
    setModels(prev => prev.map(m => 
      m.id === modelId ? { ...m, visible: !m.visible } : m
    ));
  }, []);

  // Handle model duplication with independent materials
  const handleDuplicateModel = useCallback((modelId) => {
    const modelToDuplicate = models.find(m => m.id === modelId);
    if (modelToDuplicate) {
      const clonedScene = cloneSceneWithIndependentMaterials(modelToDuplicate.scene);
      
      // Offset position
      const offset = 1.5;
      clonedScene.position.x += offset;
      
      const newModel = {
        id: generateModelId(),
        scene: clonedScene,
        fileName: `${modelToDuplicate.fileName} (copy)`,
        stats: getModelStats(clonedScene),
        visible: true,
        position: [
          modelToDuplicate.position[0] + offset, 
          modelToDuplicate.position[1], 
          modelToDuplicate.position[2]
        ],
        rotation: [...modelToDuplicate.rotation],
        scale: [...modelToDuplicate.scale]
      };
      
      setModels(prev => [...prev, newModel]);
      setSelectedModelId(newModel.id);
    }
  }, [models]);

  // Update model stats
  const updateModelStats = useCallback((modelId) => {
    const modelData = models.find(m => m.id === modelId);
    if (modelData && modelRefs.current[modelId]) {
      modelRefs.current[modelId].updateMatrixWorld(true);
      const stats = getModelStats(modelRefs.current[modelId]);
      setModels(prev => prev.map(m => 
        m.id === modelId ? { ...m, stats } : m
      ));
    }
  }, [models]);

  const handleResetCamera = () => {
    setResetCamera(true);
    setZoom(100);
    setTimeout(() => setResetCamera(false), 100);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 20));

  const clearAllModels = () => {
    setModels([]);
    setSelectedModelId(null);
    setTransformMode('none');
    setZoom(100);
    setError("");
    setWarning("");
    setSelectedMaterialId(null);
    setHighlightedMeshes([]);
    setMaterialTransformMode('none');
    modelRefs.current = {};
  };

  const clearModel = (modelId) => {
    if (modelId) {
      handleDeleteModel(modelId);
    } else {
      clearAllModels();
    }
  };

  // Get selected model
  const selectedModel = models.find(m => m.id === selectedModelId);

  // Handle Export
  const handleExport = async (format = 'glb') => {
    const exportTarget = selectedModel?.scene || (models.length === 1 ? models[0].scene : null);
    
    if (!exportTarget && models.length > 1) {
      const group = new THREE.Group();
      models.forEach(m => {
        if (m.scene && m.visible) {
          group.add(m.scene.clone());
        }
      });
      
      setIsExporting(true);
      setExportStatus(`Preparing ${format.toUpperCase()} export...`);
      
      try {
        group.updateMatrixWorld(true);
        const baseName = "combined_models";
        const exportOptions = { bakeTransforms };
        
        let result;
        switch (format) {
          case 'gltf': result = await downloadAsGLTF(group, baseName, exportOptions); break;
          case 'obj': result = await downloadAsOBJ(group, baseName, exportOptions); break;
          case 'stl': result = await downloadAsSTL(group, baseName, exportOptions); break;
          case 'glb': default: result = await downloadAsGLB(group, baseName, exportOptions); break;
        }
        
        const sizeStr = result.size > 1024 * 1024 
          ? `${(result.size / 1024 / 1024).toFixed(2)} MB` 
          : `${(result.size / 1024).toFixed(1)} KB`;
        setExportStatus(`✓ Export complete! (${sizeStr})`);
        setTimeout(() => setExportStatus(""), 3000);
      } catch (err) {
        setError(`Export failed: ${err.message}`);
        setExportStatus("");
      } finally {
        setIsExporting(false);
      }
      return;
    }

    if (!exportTarget) { 
      setError("No model to export"); 
      return; 
    }

    setIsExporting(true);
    setExportStatus(`Preparing ${format.toUpperCase()} export...`);
    
    try {
      exportTarget.updateMatrixWorld(true);
      const baseName = selectedModel?.fileName 
        ? selectedModel.fileName.replace(/\.[^/.]+$/, "") 
        : "model";
      const exportOptions = { bakeTransforms };
      
      let result;
      switch (format) {
        case 'gltf': result = await downloadAsGLTF(exportTarget, baseName, exportOptions); break;
        case 'obj': result = await downloadAsOBJ(exportTarget, baseName, exportOptions); break;
        case 'stl': result = await downloadAsSTL(exportTarget, baseName, exportOptions); break;
        case 'glb': default: result = await downloadAsGLB(exportTarget, baseName, exportOptions); break;
      }
      
      const sizeStr = result.size > 1024 * 1024 
        ? `${(result.size / 1024 / 1024).toFixed(2)} MB` 
        : `${(result.size / 1024).toFixed(1)} KB`;
      setExportStatus(`✓ Export complete! (${sizeStr})`);
      setTimeout(() => setExportStatus(""), 3000);
    } catch (err) {
      setError(`Export failed: ${err.message}`);
      setExportStatus("");
    } finally {
      setIsExporting(false);
    }
  };

  const handleModelUpdate = useCallback((modelId, updatedModel) => {
    modelRefs.current[modelId] = updatedModel;
    updateModelStats(modelId);
  }, [updateModelStats]);

  // =========================================================
  // 🎯 MATERIAL SELECTION & HIGHLIGHTING
  // =========================================================
  const handleSelectMaterial = useCallback((materialUuid, modelId = null) => {
    if (!materialUuid) {
      setSelectedMaterialId(null);
      setHighlightedMeshes([]);
      return;
    }

    setSelectedMaterialId(materialUuid);
    
    const targetModels = modelId 
      ? models.filter(m => m.id === modelId)
      : (selectedModelId ? models.filter(m => m.id === selectedModelId) : models);
    
    const meshesToHighlight = [];
    
    targetModels.forEach(modelData => {
      if (modelData.scene) {
        modelData.scene.traverse((child) => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            if (mats.some(m => m.uuid === materialUuid)) {
              meshesToHighlight.push({
                mesh: child,
                modelId: modelData.id
              });
            }
          }
        });
      }
    });
    
    setHighlightedMeshes(meshesToHighlight);
    
    // Auto-select the model containing this material
    if (meshesToHighlight.length > 0 && !selectedModelId) {
      setSelectedModelId(meshesToHighlight[0].modelId);
    }
  }, [models, selectedModelId]);

  const handleMaterialMeshesUpdate = useCallback((meshes) => {
    if (selectedModelId) {
      updateModelStats(selectedModelId);
    }
  }, [selectedModelId, updateModelStats]);

  // Clear material selection
  const handleClearMaterialSelection = useCallback(() => {
    setSelectedMaterialId(null);
    setHighlightedMeshes([]);
    setMaterialTransformMode('none');
  }, []);

  // =========================================================
  // 🎥 FOCUS ON MATERIAL ANIMATION
  // =========================================================
  const handleFocusOnMaterial = useCallback((materialUuid) => {
    if (models.length === 0 || !orbitControlsRef.current || !cameraRef.current) return;

    TWEEN.removeAll();
    setIsFocusing(true);

    const box = new THREE.Box3();
    let found = false;

    models.forEach(modelData => {
      if (modelData.scene) {
        modelData.scene.traverse((child) => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            if (mats.some(m => m.uuid === materialUuid)) {
              found = true;
              child.geometry.computeBoundingBox();
              const geomBox = child.geometry.boundingBox.clone();
              geomBox.applyMatrix4(child.matrixWorld);
              box.union(geomBox);
            }
          }
        });
      }
    });

    if (!found || box.isEmpty()) {
      setIsFocusing(false);
      return;
    }

    const center = new THREE.Vector3();
    box.getCenter(center);
    
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fitOffset = maxDim * 2.0;
    
    const camera = cameraRef.current;
    const controls = orbitControlsRef.current;

    const currentPos = camera.position.clone();
    const currentTarget = controls.target.clone();

    const direction = new THREE.Vector3().subVectors(currentPos, currentTarget).normalize();
    const newPos = new THREE.Vector3().copy(center).add(direction.multiplyScalar(fitOffset));

    const start = { 
      x: currentPos.x, y: currentPos.y, z: currentPos.z,
      tx: currentTarget.x, ty: currentTarget.y, tz: currentTarget.z
    };
    
    const end = { 
      x: newPos.x, y: newPos.y, z: newPos.z,
      tx: center.x, ty: center.y, tz: center.z
    };

    new TWEEN.Tween(start)
      .to(end, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        camera.position.set(start.x, start.y, start.z);
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.set(start.tx, start.ty, start.tz);
          orbitControlsRef.current.update();
        }
      })
      .onComplete(() => {
        setIsFocusing(false);
      })
      .start();

    handleSelectMaterial(materialUuid);
  }, [models, handleSelectMaterial]);

  // Format number with K/M suffix
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900 text-white">
      <Sidebar
        loading={loading}
        loadingStatus={loadingStatus}
        fileName={selectedModel?.fileName || ""}
        error={error}
        warning={warning}
        models={models}
        selectedModelId={selectedModelId}
        onSelectModel={handleSelectModel}
        onDeleteModel={handleDeleteModel}
        onDuplicateModel={handleDuplicateModel}
        onToggleVisibility={handleToggleModelVisibility}
        model={selectedModel?.scene}
        isDragging={isDragging}
        transformMode={transformMode}
        setTransformMode={setTransformMode}
        zoom={zoom}
        setZoom={setZoom}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleResetCamera={handleResetCamera}
        wireframe={wireframe}
        setWireframe={setWireframe}
        autoRotate={autoRotate}
        setAutoRotate={setAutoRotate}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showBase={showBase}
        setShowBase={setShowBase}
        bgColor={bgColor}
        setBgColor={setBgColor}
        handleFile={handleFile}
        handleDrop={handleDrop}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        clearModel={clearModel}
        clearAllModels={clearAllModels}
        onExport={handleExport}
        isExporting={isExporting}
        exportStatus={exportStatus}
        bakeTransforms={bakeTransforms}
        setBakeTransforms={setBakeTransforms}
        modelStats={selectedModel?.stats}
        totalStats={totalStats}
        lights={lights}
        setLights={setLights}
        onFocusMaterial={handleFocusOnMaterial}
        selectedMaterialId={selectedMaterialId}
        onSelectMaterial={handleSelectMaterial}
        onClearMaterialSelection={handleClearMaterialSelection}
        materialTransformMode={materialTransformMode}
        setMaterialTransformMode={setMaterialTransformMode}
      />

      <div className="flex-1 relative overflow-hidden">
        {models.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <div className="w-24 h-24 rounded-2xl bg-gray-800/50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-400 mb-2">No Models Loaded</h2>
              <p className="text-sm text-gray-500 mb-4">Upload STEP, OBJ, FBX, or GLTF files</p>
              <p className="text-xs text-gray-600">Drag & drop multiple files to load them together</p>
            </div>
          </div>
        )}
        
        <Canvas 
          camera={{ position: [3, 2, 3], fov: 50, near: 0.1, far: 1000 }}
          style={{ background: bgColor }}
          shadows={lights.shadows.enabled}
          onCreated={({ camera }) => { cameraRef.current = camera; }}
        >
          <CameraAnimator />
          <CameraController zoom={zoom} resetCamera={resetCamera} />
          
          {lights.ambient.visible && <ambientLight intensity={lights.ambient.intensity} />}
          {lights.directional.visible && (
            <directionalLight 
              intensity={lights.directional.intensity} 
              position={lights.directional.position} 
              color={lights.directional.color}
              castShadow={lights.shadows.enabled}
              shadow-mapSize={[2048, 2048]}
              shadow-bias={-0.0001}
            />
          )}
          {lights.point.visible && (
            <pointLight 
              position={lights.point.position} 
              intensity={lights.point.intensity} 
              color={lights.point.color} 
            />
          )}
          {lights.environment.visible && (
            <Environment 
              preset={lights.environment.preset} 
              blur={lights.environment.blur} 
              background={false} 
              environmentIntensity={lights.environment.intensity} 
            />
          )}

          <Suspense fallback={<LoaderFallback />}>
            {models.map((modelData) => (
              modelData.visible && (
                <Model 
                  key={modelData.id}
                  modelId={modelData.id}
                  scene={modelData.scene}
                  isSelected={selectedModelId === modelData.id}
                  transformMode={selectedModelId === modelData.id ? transformMode : 'none'}
                  onTransformChange={setIsTransforming}
                  onModelUpdate={(updated) => handleModelUpdate(modelData.id, updated)}
                  onSelect={() => handleSelectModel(modelData.id)}
                  highlightedMeshes={selectedModelId === modelData.id ? highlightedMeshes.filter(h => h.modelId === modelData.id) : []}
                  selectedMaterialId={selectedModelId === modelData.id ? selectedMaterialId : null}
                  materialTransformMode={selectedModelId === modelData.id ? materialTransformMode : 'none'}
                  onMaterialMeshesUpdate={handleMaterialMeshesUpdate}
                />
              )
            ))}
          </Suspense>

          <Ground 
            showBase={showBase} 
            shadowEnabled={lights.shadows.enabled} 
            shadowOpacity={lights.shadows.opacity} 
            shadowBlur={lights.shadows.blur} 
          />
          {showGrid && <gridHelper args={[10, 10, "#374151", "#1f2937"]} position={[0, 0, 0]} />}

          <OrbitControls 
            makeDefault
            ref={orbitControlsRef}
            autoRotate={!isFocusing && autoRotate && transformMode === 'none' && materialTransformMode === 'none'}
            autoRotateSpeed={2}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={0.5}
            maxDistance={50}
            target={[0, 0.5, 0]}
            enabled={!isTransforming}
          />
        </Canvas>

        {/* Stats Panel - Top Left */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {models.length > 0 && (
            <div className="px-3 py-2 bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>{models.length} Model{models.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
          
          {selectedModel && (
            <div className="px-3 py-2 bg-gray-800/90 backdrop-blur-sm rounded-lg border border-blue-500/30">
              <p className="text-xs text-blue-400 font-medium truncate max-w-48">
                📄 {selectedModel.fileName}
              </p>
            </div>
          )}
          
          {models.length > 0 && (
            <div className="px-3 py-2 bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700/50">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-gray-400">Vertices:</span>
                  <span className="text-white font-medium">{formatNumber(totalStats.vertices)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <span className="text-gray-400">Triangles:</span>
                  <span className="text-white font-medium">{formatNumber(totalStats.triangles)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  <span className="text-gray-400">Meshes:</span>
                  <span className="text-white font-medium">{totalStats.meshes}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  <span className="text-gray-400">Materials:</span>
                  <span className="text-white font-medium">{totalStats.materials}</span>
                </div>
              </div>
            </div>
          )}

          {selectedMaterialId && (
            <div className="px-3 py-2 bg-purple-500/20 backdrop-blur-sm rounded-lg border border-purple-500/50">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-purple-300">
                  🎨 Material Selected ({highlightedMeshes.length} mesh{highlightedMeshes.length !== 1 ? 'es' : ''})
                </span>
                <button
                  onClick={handleClearMaterialSelection}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Transform Mode Indicator */}
        {models.length > 0 && transformMode !== 'none' && !selectedMaterialId && (
          <div className="absolute top-4 right-4 px-3 py-2 bg-gray-800/90 rounded-lg border border-green-500/30">
            <p className="text-xs text-gray-300">
              <span className="font-bold text-green-400">{transformMode}</span> mode
              {selectedModel && <span className="text-gray-500 ml-2">({selectedModel.fileName})</span>}
            </p>
          </div>
        )}

        {/* Material Transform Mode Indicator */}
        {selectedMaterialId && materialTransformMode !== 'none' && (
          <div className="absolute top-4 right-4 px-3 py-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <p className="text-xs text-purple-300">
              <span className="font-bold text-purple-400">{materialTransformMode}</span> material meshes
            </p>
          </div>
        )}

        {/* Zoom Controls */}
        {models.length > 0 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <button 
              onClick={handleZoomIn} 
              className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition-colors text-white"
            >
              +
            </button>
            <button 
              onClick={handleZoomOut} 
              className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition-colors text-white"
            >
              -
            </button>
            <button 
              onClick={handleResetCamera} 
              className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition-colors text-white"
            >
              ↺
            </button>
          </div>
        )}

        <Toolbar
          model={models.length > 0}
          autoRotate={autoRotate}
          setAutoRotate={setAutoRotate}
          wireframe={wireframe}
          setWireframe={setWireframe}
          transformMode={transformMode}
          setTransformMode={setTransformMode}
          clearModel={clearAllModels}
          onExport={handleExport}
          isExporting={isExporting}
          modelsCount={models.length}
        />
      </div>
    </div>
  );
}