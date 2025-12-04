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
import { loadModel } from "./modelLoader";
import { downloadAsGLB, downloadAsGLTF, downloadAsOBJ, downloadAsSTL, getModelStats } from "./services/exportService";

// Helper to update tweens inside the canvas loop
function CameraAnimator() {
  useFrame(() => TWEEN.update());
  return null;
}

export default function Viewer() {
  // Model State
  const [model, setModel] = useState(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  // View State
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [bgColor, setBgColor] = useState("rgba(26, 26, 46, 1)");
  const [showGrid, setShowGrid] = useState(true);
  const [showBase, setShowBase] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [resetCamera, setResetCamera] = useState(false);
  
  // Animation State (Prevents conflicts between AutoRotate and Focus)
  const [isFocusing, setIsFocusing] = useState(false);
  
  // Transform State
  const [transformMode, setTransformMode] = useState('none');
  const [isTransforming, setIsTransforming] = useState(false);
  
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
  const [modelStats, setModelStats] = useState(null);
  
  // Refs
  const modelRef = useRef(null);
  const orbitControlsRef = useRef();
  const cameraRef = useRef();

  // File Processing
  const processFile = useCallback((file) => {
    setError("");
    setWarning("");
    setLoading(true);
    setLoadingStatus("Starting...");
    setFileName(file.name);
    
    loadModel(file, (status) => setLoadingStatus(status))
      .then((scene) => {
        setModel(scene);
        setLoading(false);
        setLoadingStatus("");
        const stats = getModelStats(scene);
        setModelStats(stats);
      })
      .catch((err) => {
        setError(typeof err === 'string' ? err : err.message || 'Failed to load');
        setLoading(false);
        setLoadingStatus("");
      });
  }, []);

  const handleFile = (e) => { const file = e.target.files?.[0]; if (file) processFile(file); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) processFile(file); };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  useEffect(() => {
    if (model) {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => mat.wireframe = wireframe);
        }
      });
    }
  }, [wireframe, model]);

  const updateModelStats = useCallback(() => {
    if (modelRef.current) {
      modelRef.current.updateMatrixWorld(true);
      const stats = getModelStats(modelRef.current);
      setModelStats(stats);
    }
  }, []);

  const handleResetCamera = () => {
    setResetCamera(true);
    setZoom(100);
    setTimeout(() => setResetCamera(false), 100);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 20));

  const clearModel = () => {
    setModel(null);
    setFileName("");
    setTransformMode('none');
    setZoom(100);
    setError("");
    setWarning("");
    setModelStats(null);
    modelRef.current = null;
  };

  const handleExport = async (format = 'glb') => {
    const exportTarget = modelRef.current || model;
    if (!exportTarget) { setError("No model to export"); return; }
    setIsExporting(true);
    setExportStatus(`Preparing ${format.toUpperCase()} export...`);
    try {
      exportTarget.updateMatrixWorld(true);
      const baseName = fileName ? fileName.replace(/\.[^/.]+$/, "") : "model";
      const exportOptions = { bakeTransforms };
      setExportStatus(`Generating ${format.toUpperCase()} file...`);
      let result;
      switch (format) {
        case 'gltf': result = await downloadAsGLTF(exportTarget, baseName, exportOptions); break;
        case 'obj': result = await downloadAsOBJ(exportTarget, baseName, exportOptions); break;
        case 'stl': result = await downloadAsSTL(exportTarget, baseName, exportOptions); break;
        case 'glb': default: result = await downloadAsGLB(exportTarget, baseName, exportOptions); break;
      }
      const sizeStr = result.size > 1024 * 1024 ? `${(result.size / 1024 / 1024).toFixed(2)} MB` : `${(result.size / 1024).toFixed(1)} KB`;
      setExportStatus(`✓ Export complete! (${sizeStr})`);
      setTimeout(() => setExportStatus(""), 3000);
    } catch (err) {
      setError(`Export failed: ${err.message}`);
      setExportStatus("");
    } finally {
      setIsExporting(false);
    }
  };

  const handleModelUpdate = useCallback((updatedModel) => {
    modelRef.current = updatedModel;
    updateModelStats();
  }, [updateModelStats]);

  // =========================================================
  // 🎥 FOCUS ON MATERIAL ANIMATION (FIXED)
  // =========================================================
  const handleFocusOnMaterial = useCallback((materialUuid) => {
    if (!model || !orbitControlsRef.current || !cameraRef.current) return;

    // 1. Stop existing Tweens and set Focusing state
    TWEEN.removeAll();
    setIsFocusing(true);

    const box = new THREE.Box3();
    let found = false;

    // 2. Find all meshes using this material
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        if (mats.some(m => m.uuid === materialUuid)) {
          found = true;
          const geomBox = child.geometry.boundingBox.clone();
          geomBox.applyMatrix4(child.matrixWorld);
          box.union(geomBox);
        }
      }
    });

    if (!found || box.isEmpty()) {
      setIsFocusing(false);
      return;
    }

    // 3. Calculate positions
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fitOffset = maxDim * 2.0; // Multiplier to fit in view
    
    const camera = cameraRef.current;
    const controls = orbitControlsRef.current;

    const currentPos = camera.position.clone();
    const currentTarget = controls.target.clone();

    // Direction vector
    const direction = new THREE.Vector3().subVectors(currentPos, currentTarget).normalize();
    const newPos = new THREE.Vector3().copy(center).add(direction.multiplyScalar(fitOffset));

    // 4. Animate using a single object for sync
    const start = { 
      x: currentPos.x, y: currentPos.y, z: currentPos.z,
      tx: currentTarget.x, ty: currentTarget.y, tz: currentTarget.z
    };
    
    const end = { 
      x: newPos.x, y: newPos.y, z: newPos.z,
      tx: center.x, ty: center.y, tz: center.z
    };

    new TWEEN.Tween(start)
      .to(end, 1000) // 1 second animation
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        // Update Camera
        camera.position.set(start.x, start.y, start.z);
        
        // Update Target
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.set(start.tx, start.ty, start.tz);
          orbitControlsRef.current.update(); // CRITICAL for smooth OrbitControls update
        }
      })
      .onComplete(() => {
        setIsFocusing(false); // Re-enable AutoRotate if it was on
      })
      .start();

  }, [model]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900 text-white">
      <Sidebar
        loading={loading}
        loadingStatus={loadingStatus}
        fileName={fileName}
        error={error}
        warning={warning}
        model={model}
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
        onExport={handleExport}
        isExporting={isExporting}
        exportStatus={exportStatus}
        bakeTransforms={bakeTransforms}
        setBakeTransforms={setBakeTransforms}
        modelStats={modelStats}
        lights={lights}
        setLights={setLights}
        onFocusMaterial={handleFocusOnMaterial}
      />

      <div className="flex-1 relative overflow-hidden">
        {!model && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <div className="w-24 h-24 rounded-2xl bg-gray-800/50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-400 mb-2">No Model Loaded</h2>
              <p className="text-sm text-gray-500 mb-4">Upload STEP, Blender, Maya, or GLTF files</p>
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
          {lights.point.visible && <pointLight position={lights.point.position} intensity={lights.point.intensity} color={lights.point.color} />}
          {lights.environment.visible && <Environment preset={lights.environment.preset} blur={lights.environment.blur} background={false} environmentIntensity={lights.environment.intensity} />}

          <Suspense fallback={<LoaderFallback />}>
            {model && (
              <Model 
                scene={model} 
                transformMode={transformMode}
                onTransformChange={setIsTransforming}
                onModelUpdate={handleModelUpdate}
              />
            )}
          </Suspense>

          <Ground showBase={showBase} shadowEnabled={lights.shadows.enabled} shadowOpacity={lights.shadows.opacity} shadowBlur={lights.shadows.blur} />
          {showGrid && <gridHelper args={[10, 10, "#374151", "#1f2937"]} position={[0, 0, 0]} />}

          <OrbitControls 
            makeDefault // Important for Drei to manage control state
            ref={orbitControlsRef}
            // Disable autoRotate while we are focusing on a material so they don't fight
            autoRotate={!isFocusing && autoRotate && transformMode === 'none'}
            autoRotateSpeed={2}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={0.5}
            maxDistance={20}
            target={[0, 0.5, 0]}
            enabled={!isTransforming}
          />
        </Canvas>

        {model && transformMode !== 'none' && (
          <div className="absolute top-4 right-4 px-3 py-2 bg-gray-800/90 rounded-lg">
            <p className="text-xs text-gray-300"><span className="font-bold text-green-400">{transformMode}</span> mode</p>
          </div>
        )}

        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {model && fileName && <div className="px-3 py-1.5 bg-gray-800/80 rounded-lg"><p className="text-xs text-gray-300 truncate max-w-48">📄 {fileName}</p></div>}
          {modelStats && <div className="px-3 py-1.5 bg-gray-800/80 rounded-lg"><p className="text-xs text-gray-300">📊 {modelStats.vertices.toLocaleString()} verts</p></div>}
        </div>

        {model && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <button onClick={handleZoomIn} className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition-colors">+</button>
            <button onClick={handleZoomOut} className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition-colors">-</button>
            <button onClick={handleResetCamera} className="p-2.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition-colors">↺</button>
          </div>
        )}

        <Toolbar
          model={model}
          autoRotate={autoRotate}
          setAutoRotate={setAutoRotate}
          wireframe={wireframe}
          setWireframe={setWireframe}
          transformMode={transformMode}
          setTransformMode={setTransformMode}
          clearModel={clearModel}
          onExport={handleExport}
          isExporting={isExporting}
        />
      </div>
    </div>
  );
}