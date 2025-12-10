// Frontend/src/Viewer.jsx
import React, { useEffect, useState, Suspense, useCallback, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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

// SVG Icon Components for Viewer
const ViewerIcons = {
  ZoomIn: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
  ),
  ZoomOut: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
  ),
  ResetCamera: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Undo: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Model3D: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  File: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Material: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  Cursor: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
    </svg>
  ),
  Success: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Info: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Upload: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
};

// Helper to update tweens inside the canvas loop
function CameraAnimator() {
  useFrame(() => TWEEN.update());
  return null;
}

// Maximum undo history size
const MAX_UNDO_HISTORY = 50;

// Background click detector component - FIXED VERSION
function BackgroundClickDetector({ onBackgroundClick, enabled }) {
  const { camera, raycaster, pointer, scene, gl } = useThree();
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleClick = (event) => {
      if (event.button !== 0) return;
      
      const canvas = gl.domElement;
      const rect = canvas.getBoundingClientRect();
      
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }
      
      raycaster.setFromCamera(pointer, camera);
      
      const meshes = [];
      scene.traverse((child) => {
        if (child.isMesh && 
            child.visible && 
            !child.name.includes('Helper') && 
            !child.name.includes('Highlight') &&
            !child.name.includes('Ground') &&
            child.geometry) {
          meshes.push(child);
        }
      });
      
      const intersects = raycaster.intersectObjects(meshes, false);
      
      if (intersects.length === 0) {
        onBackgroundClick?.();
      }
    };
    
    window.addEventListener('pointerup', handleClick);
    return () => window.removeEventListener('pointerup', handleClick);
  }, [enabled, camera, raycaster, pointer, scene, gl, onBackgroundClick]);
  
  return null;
}

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
  
  // Undo History State
  const [undoHistory, setUndoHistory] = useState([]);
  const [undoNotification, setUndoNotification] = useState(null);
  
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
  
  // Refs - Use ref to always have latest models for callbacks
  const modelsRef = useRef(models);
  const selectedModelIdRef = useRef(selectedModelId);
  const modelRefs = useRef({});
  const orbitControlsRef = useRef();
  const cameraRef = useRef();

  // Keep refs in sync with state
  useEffect(() => {
    modelsRef.current = models;
  }, [models]);

  useEffect(() => {
    selectedModelIdRef.current = selectedModelId;
  }, [selectedModelId]);

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

  // =========================================================
  // 🔄 UNDO SYSTEM (Ctrl+Z)
  // =========================================================
  
  const pushToUndoHistory = useCallback((state) => {
    if (!state) return;
    
    setUndoHistory(prev => {
      const newHistory = [...prev, state];
      if (newHistory.length > MAX_UNDO_HISTORY) {
        return newHistory.slice(-MAX_UNDO_HISTORY);
      }
      return newHistory;
    });
  }, []);

  const handleTransformStart = useCallback((state) => {
    pushToUndoHistory(state);
  }, [pushToUndoHistory]);

  const performUndo = useCallback(() => {
    if (undoHistory.length === 0) {
      setUndoNotification({ type: 'warning', message: 'Nothing to undo' });
      setTimeout(() => setUndoNotification(null), 2000);
      return;
    }

    const lastState = undoHistory[undoHistory.length - 1];
    const currentModels = modelsRef.current;
    
    if (lastState.type === 'model') {
      const modelData = currentModels.find(m => m.id === lastState.modelId);
      if (modelData && modelData.scene) {
        modelData.scene.position.copy(lastState.position);
        modelData.scene.rotation.copy(lastState.rotation);
        modelData.scene.scale.copy(lastState.scale);
        modelData.scene.updateMatrixWorld(true);
        
        setUndoNotification({ type: 'success', message: 'Model transform undone' });
      }
    } else if (lastState.type === 'material') {
      const modelData = currentModels.find(m => m.id === lastState.modelId);
      if (modelData && modelData.scene) {
        lastState.meshStates.forEach(meshState => {
          modelData.scene.traverse((child) => {
            if (child.isMesh && child.uuid === meshState.uuid) {
              child.position.copy(meshState.position);
              child.rotation.copy(meshState.rotation);
              child.scale.copy(meshState.scale);
              child.updateMatrixWorld(true);
            }
          });
        });
        
        setUndoNotification({ type: 'success', message: 'Material mesh transform undone' });
      }
    }

    setUndoHistory(prev => prev.slice(0, -1));
    setTimeout(() => setUndoNotification(null), 2000);
  }, [undoHistory]);

  // Clear material selection
  const handleClearMaterialSelection = useCallback(() => {
    setSelectedMaterialId(null);
    setHighlightedMeshes([]);
    setMaterialTransformMode('none');
  }, []);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        performUndo();
      }
      
      if (e.key === 'Escape') {
        if (selectedMaterialId) {
          handleClearMaterialSelection();
        } else if (transformMode !== 'none') {
          setTransformMode('none');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performUndo, selectedMaterialId, transformMode, handleClearMaterialSelection]);

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
        // Clear material selection when loading new model
        setSelectedMaterialId(null);
        setHighlightedMeshes([]);
        setMaterialTransformMode('none');
        setLoading(false);
        setLoadingStatus("");
      })
      .catch((err) => {
        setError(typeof err === 'string' ? err : err.message || 'Failed to load');
        setLoading(false);
        setLoadingStatus("");
      });
  }, []);

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
    if (selectedModelIdRef.current !== modelId) {
      setSelectedModelId(modelId);
      setSelectedMaterialId(null);
      setHighlightedMeshes([]);
      setMaterialTransformMode('none');
    }
  }, []);

  // Handle model deletion
  const handleDeleteModel = useCallback((modelId) => {
    setModels(prev => {
      const remaining = prev.filter(m => m.id !== modelId);
      
      // Update selected model if deleted
      if (selectedModelIdRef.current === modelId) {
        const newSelected = remaining.length > 0 ? remaining[0].id : null;
        setSelectedModelId(newSelected);
      }
      
      return remaining;
    });
    
    delete modelRefs.current[modelId];
    setSelectedMaterialId(null);
    setHighlightedMeshes([]);
    setUndoHistory(prev => prev.filter(state => state.modelId !== modelId));
  }, []);

  // Handle model visibility toggle
  const handleToggleModelVisibility = useCallback((modelId) => {
    setModels(prev => prev.map(m => 
      m.id === modelId ? { ...m, visible: !m.visible } : m
    ));
  }, []);

  // Update model stats
  const updateModelStats = useCallback((modelId) => {
    setModels(prev => {
      const modelData = prev.find(m => m.id === modelId);
      if (modelData && modelRefs.current[modelId]) {
        modelRefs.current[modelId].updateMatrixWorld(true);
        const stats = getModelStats(modelRefs.current[modelId]);
        return prev.map(m => m.id === modelId ? { ...m, stats } : m);
      }
      return prev;
    });
  }, []);

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
    setUndoHistory([]);
    modelRefs.current = {};
  };

  const clearModel = (modelId) => {
    if (modelId) {
      handleDeleteModel(modelId);
    } else {
      clearAllModels();
    }
  };

  // Get selected model - use useMemo to prevent unnecessary recalculations
  const selectedModel = useMemo(() => 
    models.find(m => m.id === selectedModelId),
    [models, selectedModelId]
  );

 // =========================================================
// 📦 EXPORT - EXPORTS ALL UPLOADED MODELS WITH CHANGES
// =========================================================
const handleExport = async (format = 'glb') => {
  const currentModels = modelsRef.current;
  
  if (currentModels.length === 0) {
    setError("No model to export");
    return;
  }

  setIsExporting(true);
  setExportStatus(`Preparing ${format.toUpperCase()} export...`);
  
  try {
    // Always export all models with their changes
    const visibleModels = currentModels.filter(m => m.visible !== false);
    
    if (visibleModels.length === 0) {
      throw new Error("No visible models to export");
    }
    
    const exportOptions = { bakeTransforms };
    
    let result;
    
    // Pass the array of models directly to export functions
    // They will handle combining and cloning with all changes preserved
    switch (format) {
      case 'gltf': 
        result = await downloadAsGLTF(visibleModels, "export", exportOptions); 
        break;
      case 'obj': 
        result = await downloadAsOBJ(visibleModels, "export", exportOptions); 
        break;
      case 'stl': 
        result = await downloadAsSTL(visibleModels, "export", exportOptions); 
        break;
      case 'glb': 
      default: 
        result = await downloadAsGLB(visibleModels, "export", exportOptions); 
        break;
    }
    
    const sizeStr = result.size > 1024 * 1024 
      ? `${(result.size / 1024 / 1024).toFixed(2)} MB` 
      : `${(result.size / 1024).toFixed(1)} KB`;
    
    const modelCount = visibleModels.length;
    setExportStatus(`✓ Exported ${modelCount} model${modelCount > 1 ? 's' : ''} (${sizeStr})`);
    setTimeout(() => setExportStatus(""), 3000);
  } catch (err) {
    console.error("Export error:", err);
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
  // 🎯 MATERIAL SELECTION & HIGHLIGHTING - FIXED VERSION
  // =========================================================
  const handleSelectMaterial = useCallback((materialUuid, modelId = null) => {
    if (!materialUuid) {
      setSelectedMaterialId(null);
      setHighlightedMeshes([]);
      return;
    }

    setSelectedMaterialId(materialUuid);
    
    // Use ref to get latest models
    const currentModels = modelsRef.current;
    const currentSelectedModelId = selectedModelIdRef.current;
    
    const targetModels = modelId 
      ? currentModels.filter(m => m.id === modelId)
      : (currentSelectedModelId ? currentModels.filter(m => m.id === currentSelectedModelId) : currentModels);
    
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
    
    // Auto-select model if none selected
    if (meshesToHighlight.length > 0 && !currentSelectedModelId) {
      setSelectedModelId(meshesToHighlight[0].modelId);
    }
  }, []); // No dependencies - uses refs

  const handleMaterialMeshesUpdate = useCallback((meshes) => {
    const currentSelectedModelId = selectedModelIdRef.current;
    if (currentSelectedModelId) {
      updateModelStats(currentSelectedModelId);
    }
  }, [updateModelStats]);

  // =========================================================
  // 🖱️ BACKGROUND CLICK - CLEAR SELECTION
  // =========================================================
  const handleBackgroundClick = useCallback(() => {
    if (selectedMaterialId && materialTransformMode === 'none') {
      handleClearMaterialSelection();
      setUndoNotification({ type: 'info', message: 'Selection cleared' });
      setTimeout(() => setUndoNotification(null), 1500);
    }
  }, [selectedMaterialId, materialTransformMode, handleClearMaterialSelection]);

  // =========================================================
  // 🖱️ DIRECT MESH CLICK HANDLER (3D Selection) - FIXED
  // =========================================================
  const handleMeshClick = useCallback((clickData) => {
    const { materialUuid, modelId, mesh } = clickData;
    
    if (!materialUuid) return;
    
    const currentSelectedModelId = selectedModelIdRef.current;
    
    if (modelId && modelId !== currentSelectedModelId) {
      setSelectedModelId(modelId);
    }
    
    // Call handleSelectMaterial with the new model context
    handleSelectMaterial(materialUuid, modelId);
    
    const materialName = mesh?.material?.name || 'Material';
    setUndoNotification({ 
      type: 'success', 
      message: `Selected: ${materialName}` 
    });
    setTimeout(() => setUndoNotification(null), 1500);
    
  }, [handleSelectMaterial]);

  // =========================================================
  // 🎥 FOCUS ON MATERIAL ANIMATION
  // =========================================================
  const handleFocusOnMaterial = useCallback((materialUuid) => {
    const currentModels = modelsRef.current;
    
    if (currentModels.length === 0 || !orbitControlsRef.current || !cameraRef.current) return;

    TWEEN.removeAll();
    setIsFocusing(true);

    const box = new THREE.Box3();
    let found = false;

    currentModels.forEach(modelData => {
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
  }, [handleSelectMaterial]);

  // Format number with K/M suffix
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Check if material picking should be enabled
  const isMaterialPickingEnabled = transformMode === 'none';

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
        undoHistoryCount={undoHistory.length}
        onUndo={performUndo}
      />

      <div className="flex-1 relative overflow-hidden">
        {models.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <div className="w-24 h-24 rounded-2xl bg-gray-800/50 flex items-center justify-center mx-auto mb-4">
                <div className="text-gray-600">
                  <ViewerIcons.Upload />
                </div>
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
          onPointerMissed={() => {
            if (selectedMaterialId && materialTransformMode === 'none') {
              handleClearMaterialSelection();
            }
          }}
        >
          <CameraAnimator />
          <CameraController zoom={zoom} resetCamera={resetCamera} />
          
          <BackgroundClickDetector 
            onBackgroundClick={handleBackgroundClick}
            enabled={selectedMaterialId !== null && materialTransformMode === 'none'}
          />
          
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
                  onTransformStart={handleTransformStart}
                  onMeshClick={handleMeshClick}
                  enableMaterialPicking={isMaterialPickingEnabled && selectedModelId === modelData.id}
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

        {/* Notification Toast */}
        {undoNotification && (
          <div className={`absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg backdrop-blur-sm z-50 transition-all animate-fadeIn ${
            undoNotification.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/50 text-green-400'
              : undoNotification.type === 'info'
                ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                : 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400'
          }`}>
            <div className="flex items-center gap-2 text-sm">
              {undoNotification.type === 'success' && <ViewerIcons.Success />}
              {undoNotification.type === 'info' && <ViewerIcons.Info />}
              {undoNotification.type === 'warning' && <ViewerIcons.Warning />}
              {undoNotification.message}
            </div>
          </div>
        )}

        {/* Stats Panel - Top Left */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {models.length > 0 && (
            <div className="px-3 py-2 bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <div className="text-blue-400">
                  <ViewerIcons.Model3D />
                </div>
                <span>{models.length} Model{models.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
          
          {selectedModel && (
            <div className="px-3 py-2 bg-gray-800/90 backdrop-blur-sm rounded-lg border border-blue-500/30">
              <div className="flex items-center gap-2">
                <div className="text-blue-400">
                  <ViewerIcons.File />
                </div>
                <p className="text-xs text-blue-400 font-medium truncate max-w-40">
                  {selectedModel.fileName}
                </p>
              </div>
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

          {/* Material Selection Indicator */}
          {selectedMaterialId && (
            <div className="px-3 py-2 bg-purple-500/20 backdrop-blur-sm rounded-lg border border-purple-500/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-purple-400">
                    <ViewerIcons.Material />
                  </div>
                  <span className="text-xs text-purple-300">
                    {highlightedMeshes.length} mesh{highlightedMeshes.length !== 1 ? 'es' : ''} selected
                  </span>
                </div>
                <button
                  onClick={handleClearMaterialSelection}
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                  title="Clear selection (ESC or click outside)"
                >
                  <ViewerIcons.Close />
                </button>
              </div>
              <p className="text-[10px] text-purple-400/60 mt-1">
                Click outside to deselect
              </p>
            </div>
          )}

          {/* Material Picking Mode Indicator */}
          {!selectedMaterialId && isMaterialPickingEnabled && selectedModelId && (
            <div className="px-3 py-2 bg-cyan-500/20 backdrop-blur-sm rounded-lg border border-cyan-500/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                <div className="text-cyan-400">
                  <ViewerIcons.Cursor />
                </div>
                <span className="text-xs text-cyan-400">
                  Click mesh to select
                </span>
              </div>
            </div>
          )}

          {/* Undo History Indicator */}
          {undoHistory.length > 0 && (
            <div className="px-3 py-2 bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-gray-400">
                    <ViewerIcons.Undo />
                  </div>
                  <span className="text-xs text-gray-400">
                    {undoHistory.length} step{undoHistory.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-700/50 rounded">Ctrl+Z</span>
              </div>
            </div>
          )}
        </div>

        {/* Transform Mode Indicator - Top Right */}
        {models.length > 0 && transformMode !== 'none' && !selectedMaterialId && (
          <div className="absolute top-4 right-4 px-3 py-2 bg-gray-800/90 rounded-lg border border-green-500/30">
            <p className="text-xs text-gray-300">
              <span className="font-bold text-green-400 capitalize">{transformMode}</span> mode
              {selectedModel && <span className="text-gray-500 ml-2">({selectedModel.fileName})</span>}
            </p>
          </div>
        )}

        {/* Material Transform Mode Indicator */}
        {selectedMaterialId && materialTransformMode !== 'none' && (
          <div className="absolute top-4 right-4 px-3 py-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <p className="text-xs text-purple-300">
              <span className="font-bold text-purple-400 capitalize">{materialTransformMode}</span> material meshes
              <span className="text-purple-400/60 ml-2">({highlightedMeshes.length})</span>
            </p>
          </div>
        )}

        {/* Keyboard Shortcuts Hint */}
        {models.length > 0 && (
          <div className="absolute bottom-20 right-4 text-[10px] text-gray-600 space-y-1 text-right">
            <div className="flex items-center justify-end gap-1">
              <span>ESC</span>
              <span className="text-gray-700">-</span>
              <span>Clear selection</span>
            </div>
            <div className="flex items-center justify-end gap-1">
              <span>Ctrl+Z</span>
              <span className="text-gray-700">-</span>
              <span>Undo</span>
            </div>
          </div>
        )}

        {/* Zoom Controls */}
        {models.length > 0 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <button 
              onClick={handleZoomIn} 
              className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition-colors text-white flex items-center justify-center"
              title="Zoom In"
            >
              <ViewerIcons.ZoomIn />
            </button>
            <button 
              onClick={handleZoomOut} 
              className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition-colors text-white flex items-center justify-center"
              title="Zoom Out"
            >
              <ViewerIcons.ZoomOut />
            </button>
            <button 
              onClick={handleResetCamera} 
              className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition-colors text-white flex items-center justify-center"
              title="Reset Camera"
            >
              <ViewerIcons.ResetCamera />
            </button>
            <div className="h-px bg-gray-700 my-1" />
            <button 
              onClick={performUndo}
              disabled={undoHistory.length === 0}
              className={`p-2.5 rounded-lg transition-colors flex items-center justify-center ${
                undoHistory.length > 0 
                  ? 'bg-gray-800/80 hover:bg-gray-700/80 text-white' 
                  : 'bg-gray-800/40 text-gray-600 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <ViewerIcons.Undo />
            </button>
            {selectedMaterialId && (
              <button 
                onClick={handleClearMaterialSelection}
                className="p-2.5 bg-purple-500/30 hover:bg-purple-500/50 rounded-lg transition-colors text-purple-300 flex items-center justify-center"
                title="Clear Material Selection (ESC)"
              >
                <ViewerIcons.Close />
              </button>
            )}
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

      {/* CSS Animations */}
      <style jsx="true">{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}